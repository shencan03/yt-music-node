import { parseAuth, type AuthInput, type ParsedAuth } from "./auth/index.ts";
import { getAuthorization, sapisidFromCookie } from "./auth/browser.ts";
import {
  DEFAULT_TIMEOUT_MS,
  SUPPORTED_LANGUAGES,
  SUPPORTED_LOCATIONS,
  USER_AGENT,
  YTMUSIC_INIT_HEADERS,
  YTM_BASE_API,
  YTM_DOMAIN,
  YTM_PARAMS,
  YTM_PARAMS_KEY,
  type Language,
  type Location,
} from "./constants.ts";
import {
  buildContext,
  type AuthType,
  type ClientContext,
  type GetRequestOptions,
  type RawRequestOptions,
  type RequestOptions,
} from "./context.ts";
import { browsingMethods, type BrowsingMethods } from "./endpoints/browsing.ts";
import { exploreMethods, type ExploreMethods } from "./endpoints/explore.ts";
import { libraryMethods, type LibraryMethods } from "./endpoints/library.ts";
import { playlistMethods, type PlaylistMethods } from "./endpoints/playlists.ts";
import { podcastMethods, type PodcastMethods } from "./endpoints/podcasts.ts";
import { searchMethods, type SearchMethods } from "./endpoints/search.ts";
import { uploadMethods, type UploadMethods } from "./endpoints/uploads.ts";
import { watchMethods, type WatchMethods } from "./endpoints/watch.ts";
import { YTMusicUserError } from "./errors.ts";
import {
  abortable,
  parseJsonResponse,
  resolveRetry,
  send,
  type FetchLike,
  type HttpConfig,
  type HttpHooks,
  type HttpResponse,
  type RetryOptions,
} from "./http.ts";
import { createTranslator, type Translator } from "./i18n/index.ts";
import type { JsonObject } from "./types/json.ts";

/** Receives non-fatal warnings, such as a failed visitor-data lookup. */
export interface Logger {
  /** Called with a human-readable warning. */
  warn(message: string): void;
}

/** Options of the {@link YTMusic} constructor. All are optional. */
export interface YTMusicOptions {
  /**
   * Browser request headers of a logged-in YouTube Music session (see `parseBrowserHeaders` and the
   * `browser` CLI command), as an object or JSON string. Use {@link YTMusic.fromAuthFile} for files.
   */
  auth?: AuthInput;
  /** Language of returned data. Default: `"en"`. */
  language?: Language;
  /** Location (`gl`) of the user. Default: determined by the server. */
  location?: Location;
  /**
   * Brand account user id, to send requests on behalf of a brand account.
   * Found at https://myaccount.google.com/brandaccounts (the id in `/b/<user_id>/`).
   */
  user?: string;
  /**
   * Visitor data to send as `X-Goog-Visitor-Id`. When omitted, it is fetched from the
   * YouTube Music homepage once, on the first request.
   */
  visitorData?: string;
  /** Custom fetch implementation, e.g. for proxies (undici `ProxyAgent`), testing or recording. */
  fetch?: FetchLike;
  /** Per-attempt timeout in milliseconds. Default: 30000. */
  timeoutMs?: number;
  /** Retries on 429/5xx/network errors for read requests. A number sets the retry count. Default: disabled. */
  retry?: number | RetryOptions | false;
  hooks?: HttpHooks;
  /** User-Agent header for unauthenticated requests (browser auth uses the browser's). Default: a recent desktop Firefox. */
  userAgent?: string;
  /** Receives non-fatal warnings. Default: `console`. */
  logger?: Logger;
}

const LANGUAGES: ReadonlySet<string> = new Set(SUPPORTED_LANGUAGES);
const LOCATIONS: ReadonlySet<string> = new Set(SUPPORTED_LOCATIONS);
const VISITOR_DATA_REGEX = /ytcfg\.set\s*\(\s*({.+?})\s*\)\s*;/;

/**
 * Allows automated interactions with YouTube Music by emulating the web client's requests.
 * Permits both authenticated and unauthenticated requests.
 *
 * All methods are async. Every method accepts an `AbortSignal` through its options.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging -- methods are attached below
export class YTMusic implements ClientContext {
  readonly language: Language;
  readonly location: Location | undefined;
  readonly user: string | undefined;
  readonly authType: AuthType;
  /** @internal translator for localized section titles */
  readonly t: Translator;

  readonly #http: HttpConfig;
  readonly #userAgent: string;
  readonly #logger: Logger;
  readonly #params: string;
  readonly #authHeaders: Record<string, string>;
  readonly #sapisid: string | undefined;
  readonly #origin: string | undefined;
  #visitorData: Promise<string | undefined> | undefined;
  readonly #memo = new Map<string, { expires: number; value: Promise<unknown> }>();

  /**
   * Creates a client. Without `auth`, only public data is available. Nothing is requested until the
   * first call.
   * @throws {@link YTMusicUserError} for invalid `auth`, `language` or `location`
   */
  constructor(options: YTMusicOptions = {}) {
    const language = options.language ?? "en";
    if (!LANGUAGES.has(language)) {
      throw new YTMusicUserError(`Language not supported. Supported languages are ${SUPPORTED_LANGUAGES.join(", ")}.`);
    }
    if (options.location && !LOCATIONS.has(options.location)) {
      throw new YTMusicUserError("Location not supported. Check the FAQ for supported locations.");
    }
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    if (!(timeoutMs > 0)) throw new YTMusicUserError("timeoutMs must be a positive number.");

    this.language = language;
    this.location = options.location || undefined;
    this.user = options.user || undefined;
    this.t = createTranslator(language);
    this.#userAgent = options.userAgent ?? USER_AGENT;
    this.#logger = options.logger ?? console;
    if (options.visitorData) this.#visitorData = Promise.resolve(options.visitorData);

    const fetchImpl = options.fetch ?? globalThis.fetch;
    if (typeof fetchImpl !== "function") {
      throw new YTMusicUserError("No fetch implementation available. Pass one via the `fetch` option.");
    }
    this.#http = { fetch: fetchImpl, timeoutMs, retry: resolveRetry(options.retry), hooks: options.hooks ?? {} };

    const auth: ParsedAuth | undefined = options.auth === undefined ? undefined : parseAuth(options.auth);
    this.authType = auth?.type ?? "unauthorized";
    this.#authHeaders = auth?.headers ?? {};
    this.#params = YTM_PARAMS;

    if (auth?.type === "browser") {
      this.#params += YTM_PARAMS_KEY;
      this.#sapisid = sapisidFromCookie(this.#authHeaders.cookie ?? "");
      this.#origin = this.#authHeaders.origin ?? this.#authHeaders["x-origin"] ?? YTM_DOMAIN;
    }
  }

  /**
   * Creates a client from an auth file written by the `browser` CLI command (compatible with
   * ytmusicapi's `browser.json`). Node.js, Bun and Deno only.
   */
  static async fromAuthFile(path: string, options: Omit<YTMusicOptions, "auth"> = {}): Promise<YTMusic> {
    const fs = await import("node:fs/promises");
    return new YTMusic({ ...options, auth: await fs.readFile(path, "utf8") });
  }

  /**
   * Sends a raw InnerTube request, e.g. `ytm.request("browse", { browseId: "FEmusic_home" })`.
   * Escape hatch for endpoints this library does not wrap (yet). Returns the parsed JSON response.
   */
  request(endpoint: string, body: JsonObject = {}, options: RequestOptions = {}): Promise<any> {
    return this.sendRequest(endpoint, body, options);
  }

  /** @internal POST to `youtubei/v1/<endpoint>`; `body` is not mutated. */
  async sendRequest(endpoint: string, body: JsonObject = {}, options: RequestOptions = {}): Promise<any> {
    const url = YTM_BASE_API + endpoint + this.#params + (options.additionalParams ?? "");
    const payload = {
      ...body,
      ...buildContext({ language: this.language, location: this.location, user: this.user, client: options.client }),
    };
    const headers = await this.#headers(options.signal);
    const response = await send(this.#http, url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: options.signal,
      retryable: options.retry ?? true,
    });
    return parseJsonResponse(response);
  }

  /** @internal GET with the client's headers; the response is returned whatever its status. */
  async sendGetRequest(url: string, options: GetRequestOptions = {}): Promise<HttpResponse> {
    return send(this.#http, withParams(url, options.params), {
      method: "GET",
      headers: await this.#headers(options.signal),
      signal: options.signal,
      retryable: options.retry ?? true,
    });
  }

  /** @internal any request with the client's (auth) headers plus `options.headers`; `null` removes a header */
  async sendRawRequest(url: string, options: RawRequestOptions): Promise<HttpResponse> {
    const headers = await this.#headers(options.signal);
    for (const [name, value] of Object.entries(options.headers ?? {})) {
      if (value === null) headers.delete(name);
      else headers.set(name, value);
    }
    return send(this.#http, url, {
      method: options.method,
      headers,
      body: options.body,
      signal: options.signal,
      retryable: options.retry ?? false,
      timeoutMs: options.timeoutMs,
    });
  }

  /** @internal a header from the user's browser auth headers */
  authHeader(name: string): string | null {
    return this.#authHeaders[name.toLowerCase()] ?? null;
  }

  /** @internal throws if the client has no credentials */
  checkAuth(): void {
    if (this.authType === "unauthorized") {
      throw new YTMusicUserError("Please provide authentication before using this function");
    }
  }

  /** @internal per-client TTL cache, see {@link ClientContext.memo} */
  memo<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
    const cached = this.#memo.get(key);
    if (cached && cached.expires > Date.now()) return cached.value as Promise<T>;
    const value = fn();
    this.#memo.set(key, { expires: Date.now() + ttlMs, value });
    value.catch(() => {
      if (this.#memo.get(key)?.value === value) this.#memo.delete(key);
    });
    return value;
  }

  /** Headers for unauthenticated requests (and the visitor id lookup). */
  #initHeaders(): Headers {
    const headers = new Headers({ ...YTMUSIC_INIT_HEADERS, "user-agent": this.#userAgent });
    // consent cookie, see https://policies.google.com/technologies/cookies
    headers.set("cookie", "SOCS=CAI");
    return headers;
  }

  async #headers(signal?: AbortSignal): Promise<Headers> {
    const headers = this.authType === "browser" ? new Headers(this.#authHeaders) : this.#initHeaders();
    if (!headers.has("cookie")) headers.set("cookie", "SOCS=CAI");

    if (!headers.has("x-goog-visitor-id")) {
      const visitorData = await abortable(this.#getVisitorData(), signal);
      if (visitorData) headers.set("x-goog-visitor-id", visitorData);
    }

    // the SAPISIDHASH contains a timestamp, so it is recomputed for every request
    if (this.authType === "browser") {
      headers.set("authorization", await getAuthorization(`${this.#sapisid} ${this.#origin}`));
    }
    return headers;
  }

  /**
   * Fetches the visitor id once and shares the pending promise between concurrent first requests.
   * A failed fetch is not cached, so the next request tries again.
   */
  #getVisitorData(): Promise<string | undefined> {
    this.#visitorData ??= this.#fetchVisitorData().catch((error: unknown) => {
      this.#visitorData = undefined;
      throw error;
    });
    return this.#visitorData;
  }

  async #fetchVisitorData(): Promise<string | undefined> {
    // not tied to any caller's signal: the result is shared between requests
    const response = await send(this.#http, YTM_DOMAIN, { method: "GET", headers: this.#initHeaders(), retryable: true });
    const visitorData = extractVisitorData(response.text);
    if (!visitorData) {
      // upstream silently sends an empty X-Goog-Visitor-Id in this case
      this.#logger.warn(
        `yt-music-node: could not read visitor data from ${YTM_DOMAIN} (HTTP ${response.status}); ` +
          "continuing without X-Goog-Visitor-Id. Pass `visitorData` to skip this lookup.",
      );
    }
    return visitorData;
  }
}

// Endpoint methods live in src/endpoints/* and are attached to the prototype; declaration merging
// adds their signatures to the class type.
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface YTMusic
  extends BrowsingMethods,
    SearchMethods,
    WatchMethods,
    ExploreMethods,
    LibraryMethods,
    PlaylistMethods,
    PodcastMethods,
    UploadMethods {}

for (const methods of [
  browsingMethods,
  searchMethods,
  watchMethods,
  exploreMethods,
  libraryMethods,
  playlistMethods,
  podcastMethods,
  uploadMethods,
]) {
  for (const [name, fn] of Object.entries(methods)) {
    Object.defineProperty(YTMusic.prototype, name, { value: fn, writable: true, configurable: true, enumerable: false });
  }
}

/** Extracts `VISITOR_DATA` from the first `ytcfg.set({...});` call in a YouTube Music page. */
export function extractVisitorData(html: string): string | undefined {
  const match = VISITOR_DATA_REGEX.exec(html);
  if (!match) return undefined;
  try {
    const value = JSON.parse(match[1]!)?.VISITOR_DATA;
    return typeof value === "string" && value ? value : undefined;
  } catch {
    return undefined;
  }
}

function withParams(url: string, params?: Record<string, string | number | boolean>): string {
  if (!params) return url;
  const target = new URL(url);
  for (const [key, value] of Object.entries(params)) target.searchParams.set(key, String(value));
  return target.toString();
}
