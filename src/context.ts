import type { HttpResponse, RequestBody } from "./http.ts";
import type { Translator } from "./i18n/index.ts";
import type { JsonObject } from "./types/json.ts";

/** InnerTube client identity sent in `context.client`. */
export interface ClientInfo {
  clientName: string;
  clientVersion: string;
}

/** The Android app client, used where the web client returns less data (e.g. timestamped lyrics). */
export const MOBILE_CLIENT: ClientInfo = { clientName: "ANDROID_MUSIC", clientVersion: "7.21.50" };

/**
 * How a client authenticates: `"unauthorized"` without auth, `"browser"` with browser request
 * headers.
 */
export type AuthType = "unauthorized" | "browser";

/** Options of {@link buildContext}. */
export interface ContextOptions {
  language: string;
  location?: string | undefined;
  /** Brand account id (`onBehalfOfUser`). */
  user?: string | undefined;
  /** Replaces the default `WEB_REMIX` client for one request (upstream: `as_mobile()`). */
  client?: ClientInfo | undefined;
}

/** `1.YYYYMMDD.01.00`, the version format the web client uses. */
export function webClientVersion(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `1.${y}${m}${d}.01.00`;
}

/**
 * Builds a fresh InnerTube `context` for one request.
 *
 * Upstream builds a single mutable context at construction time and mutates it in `as_mobile()`,
 * which is not safe under concurrency. Building it per request also keeps `clientVersion` current in
 * long-running processes.
 */
export function buildContext(options: ContextOptions, now: Date = new Date()): { context: JsonObject } {
  const client: JsonObject = {
    clientName: "WEB_REMIX",
    clientVersion: webClientVersion(now),
    ...options.client,
    hl: options.language,
  };
  if (options.location) client.gl = options.location;

  const user: JsonObject = {};
  if (options.user) user.onBehalfOfUser = options.user;

  return { context: { client, user } };
}

/** Options of {@link YTMusic.request} and {@link ClientContext.sendRequest}. */
export interface RequestOptions {
  /** Extra query string appended to the endpoint URL, e.g. continuation params (`&ctoken=...`). */
  additionalParams?: string;
  /** Aborts the request (including retries). */
  signal?: AbortSignal;
  /** Send this request as a different InnerTube client, e.g. {@link MOBILE_CLIENT}. */
  client?: ClientInfo;
  /**
   * Whether this request may be retried on 429/5xx/network errors (when retries are enabled).
   * Write endpoints pass `false`, so a request that may already have been applied is never repeated.
   * Default: `true`.
   */
  retry?: boolean;
}

/** Options of {@link ClientContext.sendGetRequest}. */
export interface GetRequestOptions {
  params?: Record<string, string | number | boolean> | undefined;
  signal?: AbortSignal | undefined;
  /** Whether the request may be retried (when retries are enabled). Default: `true`. */
  retry?: boolean | undefined;
}

/**
 * Options of {@link ClientContext.sendRawRequest}, for requests outside the InnerTube API (e.g.
 * uploads).
 */
export interface RawRequestOptions {
  method: "GET" | "POST";
  /** Added to (or, with `null`, removed from) the client's headers. */
  headers?: Record<string, string | null>;
  body?: RequestBody;
  signal?: AbortSignal | undefined;
  /** Default: `false`. */
  retry?: boolean;
  /** Overrides the client's per-attempt timeout. */
  timeoutMs?: number | undefined;
}

/**
 * What endpoint implementations (src/endpoints/*) may use from the client.
 * Kept as an interface so endpoints can be unit-tested against a fake.
 */
export interface ClientContext {
  /** Language of returned data. */
  readonly language: string;
  /** How the client authenticates. */
  readonly authType: AuthType;
  /** Translates upstream gettext ids into {@link language}. */
  readonly t: Translator;
  /**
   * A `POST` to the InnerTube API, e.g. `sendRequest("browse", { browseId })`. The client's context
   * is added to the body. Resolves with the parsed JSON response.
   */
  sendRequest(endpoint: string, body?: JsonObject, options?: RequestOptions): Promise<any>;
  /** A `GET` with the client's headers, e.g. for HTML pages. */
  sendGetRequest(url: string, options?: GetRequestOptions): Promise<HttpResponse>;
  /** A request to any URL with the client's (auth) headers, e.g. for uploads. */
  sendRawRequest(url: string, options: RawRequestOptions): Promise<HttpResponse>;
  /** A header from the user's auth headers, or `null`. */
  authHeader(name: string): string | null;
  /** Throws a `YTMusicUserError` when the client has no auth. */
  checkAuth(): void;
  /**
   * Caches the result of `fn` under `key` for `ttlMs`. Concurrent callers share one pending call;
   * failures are not cached.
   */
  memo<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T>;
}

/** Options every endpoint method accepts. */
export interface CallOptions {
  /** Aborts the call, including continuation requests and retries. */
  signal?: AbortSignal;
}

/** Options of methods that return a list of items. */
export interface LimitOptions extends CallOptions {
  /** Number of items to aim for; `null` returns all. The default depends on the method. */
  limit?: number | null;
}
