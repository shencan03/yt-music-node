import { YTMusicServerError } from "./errors.ts";

/** The subset of `fetch` the client uses. Pass your own to add proxies, logging or test fakes. */
export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

/** Retry behavior for read requests on 429, 5xx and network errors. */
export interface RetryOptions {
  /** Number of retries after the first attempt. Default: 2 when retries are enabled. */
  retries?: number;
  /** Base delay for exponential backoff (full jitter). Default: 500ms. */
  minDelayMs?: number;
  /** Upper bound for a single delay, including `Retry-After`. Default: 10s. */
  maxDelayMs?: number;
}

/** Request bodies: JSON/form strings, or binary data for uploads. */
export type RequestBody = string | Blob | Uint8Array<ArrayBuffer>;

/** Passed to {@link HttpHooks.onRequest} before each attempt. */
export interface RequestEvent {
  method: string;
  url: string;
  /** Includes credentials (cookie/authorization) for authenticated clients. */
  headers: Headers;
  body: RequestBody | undefined;
  attempt: number;
}

/** Passed to {@link HttpHooks.onResponse} after each attempt that got a response. */
export interface ResponseEvent {
  method: string;
  url: string;
  status: number;
  durationMs: number;
  attempt: number;
  text: string;
}

/** Callbacks around every HTTP request, e.g. for logging or recording fixtures. */
export interface HttpHooks {
  /** Called before every attempt. Useful for logging and debugging. */
  onRequest?(event: RequestEvent): void;
  /** Called after every attempt that received a response. Useful for capturing test fixtures. */
  onResponse?(event: ResponseEvent): void;
}

export interface HttpConfig {
  fetch: FetchLike;
  timeoutMs: number;
  retry: Required<RetryOptions>;
  hooks: HttpHooks;
}

/** A fully read response. Bodies are small JSON/HTML documents, so they are read eagerly. */
export interface HttpResponse {
  status: number;
  statusText: string;
  ok: boolean;
  headers: Headers;
  url: string;
  text: string;
}

export interface SendOptions {
  method: "GET" | "POST";
  headers: Headers;
  body?: RequestBody | undefined;
  signal?: AbortSignal | undefined;
  /** Whether retries are allowed for this request. */
  retryable: boolean;
  /** Overrides the client's per-attempt timeout, e.g. for uploads. */
  timeoutMs?: number | undefined;
}

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

export function resolveRetry(retry: number | RetryOptions | false | undefined): Required<RetryOptions> {
  const defaults = { retries: 0, minDelayMs: 500, maxDelayMs: 10_000 };
  if (retry === undefined || retry === false) return defaults;
  if (typeof retry === "number") return { ...defaults, retries: retry };
  return { ...defaults, retries: 2, ...retry };
}

/**
 * Sends a request with a per-attempt timeout, caller abort support and optional retries.
 *
 * - Abort by the caller rethrows the signal's reason (standard `AbortError` semantics).
 * - Timeouts and network failures become {@link YTMusicServerError} with the original as `cause`.
 * - Non-2xx responses are returned, not thrown; callers decide (see {@link parseJsonResponse}).
 */
export async function send(config: HttpConfig, url: string, options: SendOptions): Promise<HttpResponse> {
  const { retries } = config.retry;
  const userSignal = options.signal;

  for (let attempt = 0; ; attempt++) {
    userSignal?.throwIfAborted();
    const canRetry = options.retryable && attempt < retries;
    const timeoutMs = options.timeoutMs ?? config.timeoutMs;
    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = userSignal ? AbortSignal.any([userSignal, timeout]) : timeout;

    config.hooks.onRequest?.({
      method: options.method,
      url,
      headers: options.headers,
      body: options.body,
      attempt,
    });
    const started = Date.now();

    let response: Response;
    let text: string;
    try {
      const init: RequestInit = { method: options.method, headers: options.headers, signal };
      if (options.body !== undefined) init.body = options.body;
      response = await config.fetch(url, init);
      text = await response.text();
    } catch (error) {
      if (userSignal?.aborted) throw userSignal.reason;
      const timedOut = timeout.aborted;
      const message = timedOut
        ? `Request timed out after ${timeoutMs}ms`
        : `Network error: ${(error as Error)?.message ?? String(error)}`;
      if (canRetry) {
        await sleep(backoff(config.retry, attempt), userSignal);
        continue;
      }
      throw new YTMusicServerError(message, { url: stripQuery(url) }, { cause: error });
    }

    config.hooks.onResponse?.({
      method: options.method,
      url,
      status: response.status,
      durationMs: Date.now() - started,
      attempt,
      text,
    });

    if (canRetry && RETRYABLE_STATUS.has(response.status)) {
      const delay = retryAfterMs(response.headers.get("retry-after")) ?? backoff(config.retry, attempt);
      await sleep(Math.min(delay, config.retry.maxDelayMs), userSignal);
      continue;
    }

    return {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: response.headers,
      url,
      text,
    };
  }
}

/**
 * Parses an InnerTube JSON response, checking the status first.
 *
 * Upstream calls `json.loads` before checking the status, so an HTML 429/5xx page raises a
 * JSONDecodeError, and an error payload without `message` raises a TypeError.
 */
export function parseJsonResponse(response: HttpResponse): any {
  let data: any;
  let parsed = false;
  try {
    data = response.text === "" ? {} : JSON.parse(response.text);
    parsed = true;
  } catch {
    // handled below
  }

  if (!response.ok) {
    const error = parsed ? data?.error : undefined;
    let message = `Server returned HTTP ${response.status}${response.statusText ? `: ${response.statusText}` : ""}.`;
    if (typeof error?.message === "string") message += ` ${error.message}`;
    throw new YTMusicServerError(message, {
      status: response.status,
      statusText: response.statusText,
      reason: typeof error?.status === "string" ? error.status : undefined,
      body: parsed ? data : truncate(response.text),
      url: stripQuery(response.url),
    });
  }

  if (!parsed) {
    throw new YTMusicServerError("Server returned a response that is not valid JSON.", {
      status: response.status,
      body: truncate(response.text),
      url: stripQuery(response.url),
    });
  }
  return data;
}

function backoff(retry: Required<RetryOptions>, attempt: number): number {
  const cap = Math.min(retry.maxDelayMs, retry.minDelayMs * 2 ** attempt);
  return Math.round(Math.random() * cap);
}

/** Parses a `Retry-After` header (delta-seconds or HTTP date) into milliseconds. */
export function retryAfterMs(value: string | null, now: number = Date.now()): number | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 1000;
  const date = Date.parse(trimmed);
  return Number.isNaN(date) ? undefined : Math.max(0, date - now);
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal!.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/** Rejects with the signal's reason when it aborts, without cancelling the shared `promise`. */
export function abortable<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

/** Drops the query string, which may contain API keys or continuation tokens. */
export function stripQuery(url: string): string {
  const index = url.indexOf("?");
  return index === -1 ? url : url.slice(0, index);
}

function truncate(text: string, max = 1000): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
