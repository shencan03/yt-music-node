# Configuration

All options are optional. They're fixed when you create the client.

```ts
import { YTMusic } from "yt-music-node";

const ytm = new YTMusic({
  auth: undefined, // browser request headers (object or JSON string)
  language: "en",
  location: "US",
  user: undefined, // brand account id
  visitorData: undefined,
  fetch: globalThis.fetch,
  timeoutMs: 30_000,
  retry: false,
  hooks: {},
  userAgent: undefined,
  logger: console,
});
```

| Option | Default | Description |
|---|---|---|
| `auth` | – | Browser request headers of a signed-in session, as an object or JSON string. Prefer [`YTMusic.fromAuthFile`](#ytmusic-fromauthfile). See [Authentication](/authentication/). |
| `language` | `"en"` | Language of returned text. One of `SUPPORTED_LANGUAGES`: `ar`, `cs`, `de`, `en`, `es`, `fr`, `hi`, `it`, `ja`, `ko`, `nl`, `pt`, `ru`, `tr`, `ur`, `zh_CN`, `zh_TW`. |
| `location` | server's choice | Country code (`gl`) from `SUPPORTED_LOCATIONS`, e.g. `"US"`, `"DE"`, `"IN"`. |
| `user` | – | Brand account id, to act on behalf of a brand account. See [multiple accounts](/authentication/multiple-accounts). |
| `visitorData` | fetched once | Value for the `X-Goog-Visitor-Id` header. When omitted, it is read from the homepage on the first request. Pass it to skip that lookup (useful in serverless functions). |
| `fetch` | `globalThis.fetch` | Your own `fetch`, for proxies, logging or tests. See [below](#proxies-and-custom-fetch). |
| `timeoutMs` | `30000` | Timeout of each HTTP attempt. Uploads use their own default of 10 minutes. |
| `retry` | `false` | Retries for reads on 408/429/5xx and network errors. A number sets the retry count, an object sets the details. Writes are never retried. |
| `hooks` | `{}` | `onRequest` / `onResponse` callbacks for every attempt. |
| `userAgent` | a recent desktop Firefox | `User-Agent` of signed-out requests. Signed-in requests use your browser's. |
| `logger` | `console` | Receives non-fatal warnings (`warn(message)`). |

Invalid `language`, `location`, `timeoutMs` or `auth` values throw [`YTMusicUserError`](/guide/errors#ytmusicusererror) right away.

## `YTMusic.fromAuthFile`

```ts
import { YTMusic } from "yt-music-node";

const ytm = await YTMusic.fromAuthFile("browser.json", { language: "en", retry: 2 });
```

Reads an auth file written by [`npx yt-music-node browser`](/guide/cli) and creates a client with it. The file format is ytmusicapi's `browser.json`, so files work in both libraries. It takes every option except `auth`. Node.js, Bun and Deno only.

## Timeouts and cancellation

`timeoutMs` limits each attempt. For an overall deadline across retries and continuation pages, pass a signal:

```ts
const playlist = await ytm.getPlaylist("PL4fGSI1pDJn6puJdseH2Rt9sMvt9E2M4i", {
  limit: null,
  signal: AbortSignal.timeout(60_000),
});
```

When you abort, the call rejects with the signal's reason (an `AbortError` or `TimeoutError` `DOMException`), not with a library error. A per-attempt timeout becomes a `YTMusicServerError` ("Request timed out after …ms") and is retried when retries are on.

## Retries

```ts
import { YTMusic } from "yt-music-node";

const ytm = new YTMusic({ retry: 3 }); // up to 3 retries per read request

const tuned = new YTMusic({
  retry: { retries: 4, minDelayMs: 250, maxDelayMs: 5_000 },
});
```

- **What is retried.** Reads that fail with HTTP 408, 429, 500, 502, 503, 504, a network error or a timeout.
- **Delay.** Exponential backoff with full jitter, starting at `minDelayMs` (default 500 ms) and capped at `maxDelayMs` (default 10 s). A `Retry-After` header is honored, up to `maxDelayMs`.
- **Never retried.** Writes (creating playlists, rating, history, uploads, …) and anything that already got a non-retryable response, such as 400 or 404.

## Proxies and custom fetch

Pass any function compatible with `fetch(url, init)`. To route requests through a proxy, use undici's `ProxyAgent`:

<!-- no-check -->
```ts
import { ProxyAgent, fetch as undiciFetch } from "undici";
import { YTMusic } from "yt-music-node";

const dispatcher = new ProxyAgent("http://user:pass@proxy.example:8080");
const ytm = new YTMusic({
  fetch: (url, init) => undiciFetch(url, { ...init, dispatcher }) as unknown as Promise<Response>,
});
```

A custom fetch also makes tests easy: return canned `Response` objects and assert on the requests. See [advanced usage](/guide/advanced#testing-your-code).

## Hooks

`hooks` observe every HTTP attempt, including retries and continuation pages:

```ts
import { YTMusic } from "yt-music-node";

const ytm = new YTMusic({
  hooks: {
    onRequest: ({ method, url, attempt }) => console.debug(`→ ${method} ${new URL(url).pathname} #${attempt}`),
    onResponse: ({ status, durationMs, url }) => console.debug(`← ${status} ${new URL(url).pathname} ${durationMs}ms`),
  },
});
```

| Event | Fields |
|---|---|
| `onRequest` | `method`, `url`, `headers`, `body`, `attempt` (0 for the first) |
| `onResponse` | `method`, `url`, `status`, `durationMs`, `attempt`, `text` (the raw body) |

::: danger Hooks see credentials
For a signed-in client, `onRequest`'s `headers` contain your cookie and authorization. Don't log headers, and don't send them anywhere.
:::

`onResponse`'s `text` is the raw JSON. That makes hooks the easiest way to [record fixtures](/guide/advanced#recording-responses) when a layout changes.

## Logger

The library logs one kind of warning: when it can't read the visitor id from the homepage, it continues without one. Route it to your logger, or silence it:

```ts
import { YTMusic } from "yt-music-node";

const quiet = new YTMusic({ logger: { warn: () => {} } });
```

## Serverless and edge functions

In a short-lived function, every cold start pays for the visitor-id lookup. Fetch it once, store it, and pass it in:

```ts
import { YTMusic, extractVisitorData } from "yt-music-node";

// once, e.g. at deploy time
const html = await (await fetch("https://music.youtube.com")).text();
const visitorData = extractVisitorData(html);

// per invocation
const ytm = new YTMusic({ visitorData });
```

The client only needs `fetch` and Web Crypto, so it should run in other runtimes that have them. Only Node.js is tested. `fromAuthFile` and uploads from a file path need a file system.
