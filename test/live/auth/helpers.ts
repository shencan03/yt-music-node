/**
 * Shared setup for authenticated live tests. Run with `npm run test:auth` after creating
 * `test/.auth/browser.json` (see README → Authentication). Never log header or cookie values.
 */
import { existsSync } from "node:fs";
import { describe } from "vitest";
import { YTMusic, type YTMusicOptions } from "../../../src/index.ts";

export const AUTH_FILE = process.env.YTM_AUTH_FILE;

/** `describe` that only runs when an auth file is configured. */
export const authed: typeof describe = describe.skipIf(!AUTH_FILE || !existsSync(AUTH_FILE)) as typeof describe;

/** Prefix of everything the tests create, so leftovers of a crashed run can be found and removed. */
export const TEST_PREFIX = "yt-music-node test";

export const SAMPLE = {
  /** Oasis - Wonderwall */
  video: "hpSrLjc5SMs",
  /** Eminem - Revival */
  album: "MPREb_4pL8gzRtw1p",
  albumPlaylist: "OLAK5uy_nMr9h2VlS-2PULNz3M3XVXQj_P3C2bqaY",
  /** a public playlist to like/unlike */
  publicPlaylist: "OLAK5uy_l3g4WcHZsEx_QuEDZzWEiyFzZl6pL0xZ4",
};

/** Delay between requests, so the test run looks like a person and doesn't trigger rate limits. */
const REQUEST_GAP_MS = 350;

function pacedFetch(): typeof fetch {
  let last = 0;
  let queue: Promise<unknown> = Promise.resolve();
  return ((input: string | URL | Request, init?: RequestInit) => {
    const run = queue.then(async () => {
      const wait = last + REQUEST_GAP_MS - Date.now();
      if (wait > 0) await sleep(wait);
      last = Date.now();
    });
    queue = run;
    return run.then(() => fetch(input, init));
  }) as typeof fetch;
}

let client: Promise<YTMusic> | undefined;

export function getClient(options: Omit<YTMusicOptions, "auth"> = {}): Promise<YTMusic> {
  client ??= YTMusic.fromAuthFile(AUTH_FILE!, { retry: 2, fetch: pacedFetch(), ...options });
  return client;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Re-runs `fn` until `check` passes, for reads after writes (YTM is eventually consistent).
 * Returns the last value; the caller asserts on it.
 */
export async function eventually<T>(
  fn: () => Promise<T>,
  check: (value: T) => boolean,
  { tries = 6, delayMs = 2000 } = {},
): Promise<T> {
  // errors are retried too: e.g. a just-created playlist is briefly served without contents
  for (let i = 1; ; i++) {
    try {
      const value = await fn();
      if (check(value) || i >= tries) return value;
    } catch (error) {
      if (i >= tries) throw error;
    }
    await sleep(delayMs);
  }
}

export function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}
