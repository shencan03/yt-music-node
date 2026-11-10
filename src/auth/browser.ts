/** Browser (cookie) authentication. Port of ytmusicapi/auth/browser.py and helpers.py. */
import { YTMUSIC_INIT_HEADERS } from "../constants.ts";
import { YTMusicError, YTMusicUserError } from "../errors.ts";

/** Cookie names that carry the SAPISID, in order of preference. */
const SAPISID_COOKIES = ["__Secure-3PAPISID", "SAPISID", "__Secure-1PAPISID"];

/** Splits a `cookie` header into name/value pairs. The first occurrence of a name wins. */
export function parseCookie(rawCookie: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const part of rawCookie.replace(/"/g, "").split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const name = part.slice(0, index).trim();
    if (name && !(name in cookies)) cookies[name] = part.slice(index + 1).trim();
  }
  return cookies;
}

/**
 * The SAPISID value used for the authorization hash. Upstream only reads `__Secure-3PAPISID`;
 * `SAPISID` and `__Secure-1PAPISID` hold the same value and are used as fallbacks.
 */
export function sapisidFromCookie(rawCookie: string): string {
  const cookies = parseCookie(rawCookie);
  for (const name of SAPISID_COOKIES) {
    const value = cookies[name];
    if (value) return value;
  }
  throw new YTMusicUserError("Your cookie is missing the required value __Secure-3PAPISID");
}

async function sha1Hex(text: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * The `SAPISIDHASH` authorization value for the current time.
 * @param auth SAPISID and origin, separated by a space
 */
export async function getAuthorization(auth: string, now: number = Date.now()): Promise<string> {
  const timestamp = String(Math.floor(now / 1000));
  return `SAPISIDHASH ${timestamp}_${await sha1Hex(`${timestamp} ${auth}`)}`;
}

/**
 * Parses request headers copied from the browser's network tab (Firefox, or Chrome/Edge in either
 * the "name: value" or the alternating-lines format) into the headers used for browser auth.
 * Port of `setup_browser`.
 */
export function parseBrowserHeaders(headersRaw: string): Record<string, string> {
  const userHeaders: Record<string, string> = {};
  let chromeRememberedKey = "";
  try {
    for (const content of headersRaw.split("\n").map((line) => line.replace(/\r$/, ""))) {
      const header = content.split(": ");
      // nothing was split or chromium pseudo headers
      if (header[0]!.startsWith(":")) continue;
      // chrome "copy-paste in separate lines" format
      if (header[0]!.endsWith(":")) chromeRememberedKey = content.replace(/:/g, "");
      if (header.length === 1) {
        if (chromeRememberedKey) {
          userHeaders[chromeRememberedKey] = header[0]!;
          // support chrome format with or without colons for headers
          // and handle corner case of "Decoded:" multi-line header
          if (!header[0]!.endsWith(":") && (chromeRememberedKey !== "Decoded" || header[0] === "}")) {
            chromeRememberedKey = "";
          }
        } else {
          // set key when header does not end in colon
          chromeRememberedKey = header[0]!;
        }
        continue;
      }
      userHeaders[header[0]!.toLowerCase()] = header.slice(1).join(": ");
    }
  } catch (error) {
    throw new YTMusicError(`Error parsing your input, please try again. Full error: ${String(error)}`, { cause: error });
  }

  const present = new Set(Object.keys(userHeaders).map((k) => k.toLowerCase()));
  const missing = ["cookie", "x-goog-authuser"].filter((k) => !present.has(k));
  if (missing.length > 0) {
    throw new YTMusicUserError(
      `The following entries are missing in your headers: ${missing.join(", ")}. ` +
        "Please try a different request (such as /browse) and make sure you are logged in.",
    );
  }

  const ignore = new Set(["host", "content-length", "accept-encoding"]);
  for (const key of Object.keys(userHeaders)) {
    if (key.startsWith("sec") || ignore.has(key)) delete userHeaders[key];
  }
  return { ...userHeaders, ...YTMUSIC_INIT_HEADERS };
}

