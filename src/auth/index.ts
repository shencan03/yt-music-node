/** Auth input parsing and type detection. Port of ytmusicapi/auth/auth_parse.py (browser auth). */
import type { AuthType } from "../context.ts";
import { YTMusicUserError } from "../errors.ts";

/** Browser request headers, as an object or a JSON string. */
export type AuthInput = string | Record<string, unknown>;

/** Result of {@link parseAuth}. */
export interface ParsedAuth {
  type: Exclude<AuthType, "unauthorized">;
  /** Lower-cased header names. */
  headers: Record<string, string>;
}

/** Headers that must not be replayed from a saved browser session. */
const DROPPED_HEADERS = new Set(["host", "content-length", "content-encoding", "accept-encoding", "connection"]);

/**
 * Percent-encodes characters outside printable ASCII, which are not valid in HTTP headers
 * (upstream: `quote(header, safe=printable)`).
 */
export function encodeHeaderValue(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[^\x20-\x7e\t\n\r\x0b\x0c]/gu, (char) => encodeURIComponent(char));
}

/**
 * Parses auth input (browser request headers as an object or JSON string) and detects its type.
 * Header names are lower-cased, and headers that must not be replayed (`host`, `content-length`, …)
 * are dropped.
 * @throws {@link YTMusicUserError} when the input is not valid JSON or has no session cookie
 */
export function parseAuth(auth: AuthInput): ParsedAuth {
  let input: Record<string, unknown>;
  if (typeof auth === "string") {
    if (!auth.trim().startsWith("{")) {
      throw new YTMusicUserError(
        "Invalid auth JSON string provided. To read an auth file, use `await YTMusic.fromAuthFile(path)`.",
      );
    }
    try {
      input = JSON.parse(auth);
    } catch (error) {
      throw new YTMusicUserError(`Invalid auth JSON string provided: ${(error as Error).message}`, { cause: error });
    }
  } else {
    input = auth;
  }
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new YTMusicUserError("Invalid auth provided: expected an object of browser request headers.");
  }

  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    const name = key.toLowerCase();
    if (typeof value !== "string" || DROPPED_HEADERS.has(name)) continue;
    headers[name] = encodeHeaderValue(value);
  }
  return { type: determineAuthType(headers), headers };
}

/**
 * Browser auth needs the session cookie. Upstream falls back to another auth type for anything
 * unrecognized, which fails later with a misleading error.
 */
export function determineAuthType(headers: Record<string, string>): ParsedAuth["type"] {
  if (headers.cookie) return "browser";
  throw new YTMusicUserError(
    "Could not determine the auth type: browser request headers with a `cookie` are required. " +
      "Create them with `npx yt-music-node browser`.",
  );
}
