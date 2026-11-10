/** Base class for every error thrown by this library. */
export class YTMusicError extends Error {
  override name = "YTMusicError";
}

/** Invalid usage of the library (bad arguments, missing authentication, ...). */
export class YTMusicUserError extends YTMusicError {
  override name = "YTMusicUserError";
}

/** Details attached to a {@link YTMusicServerError}. */
export interface ServerErrorDetails {
  /** HTTP status code, if a response was received. */
  status?: number;
  /** HTTP reason phrase. */
  statusText?: string;
  /** Machine-readable status from the InnerTube error payload, e.g. `"INVALID_ARGUMENT"`. */
  reason?: string;
  /** Parsed JSON error body, or a truncated text body when the response was not JSON. */
  body?: unknown;
  /** Request URL (without query string). */
  url?: string;
}

/** Error caused by the YouTube Music backend: non-2xx status, unparseable response, network failure. */
export class YTMusicServerError extends YTMusicError {
  override name = "YTMusicServerError";
  readonly status: number | undefined;
  readonly statusText: string | undefined;
  readonly reason: string | undefined;
  readonly body: unknown;
  readonly url: string | undefined;

  /**
   * Creates a server error. Thrown by the library; you only construct one in tests or custom fetches.
   * @param message human-readable description
   * @param details response details
   * @param options standard error options, e.g. `cause`
   */
  constructor(message: string, details: ServerErrorDetails = {}, options?: ErrorOptions) {
    super(message, options);
    this.status = details.status;
    this.statusText = details.statusText;
    this.reason = details.reason;
    this.body = details.body;
    this.url = details.url;
  }
}

/** The backend did not perform a write request and asked for interaction with a dialog instead. */
export class YTMusicGatedError extends YTMusicServerError {
  override name = "YTMusicGatedError";
}

/**
 * A response did not have the expected structure — usually a YouTube Music layout change.
 * Equivalent to the KeyError/IndexError raised by upstream's `nav()`.
 */
export class YTMusicNavigationError extends YTMusicError {
  override name = "YTMusicNavigationError";
  readonly path: readonly PropertyKey[];
  readonly key: PropertyKey;

  /**
   * Creates a navigation error. Thrown by {@link nav}; you only construct one in tests.
   * @param path the full path that was followed
   * @param key the key that was missing
   * @param found the value the key was looked up on (previewed in the message)
   */
  constructor(path: readonly PropertyKey[], key: PropertyKey, found: unknown) {
    super(
      `Unable to find ${JSON.stringify(String(key))} using path ${JSON.stringify(path.map(String))} on ${preview(found)}`,
    );
    this.path = path;
    this.key = key;
  }
}

function preview(value: unknown): string {
  let text: string;
  try {
    text = JSON.stringify(value) ?? String(value);
  } catch {
    text = String(value);
  }
  return text.length > 300 ? `${text.slice(0, 300)}…` : text;
}
