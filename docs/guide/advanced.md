# Advanced usage

## Raw requests

`ytm.request(endpoint, body)` sends any InnerTube request with the client's context, auth and settings, and returns the parsed JSON. Use it for endpoints the library doesn't wrap, or to look at the raw response behind a method:

```ts
import { YTMusic, nav } from "yt-music-node";

const ytm = new YTMusic();

const response = await ytm.request("browse", { browseId: "FEmusic_explore" });
const firstTitle = nav(
  response,
  ["contents", "singleColumnBrowseResultsRenderer", "tabs", 0, "tabRenderer", "content", "sectionListRenderer",
    "contents", 0, "musicCarouselShelfRenderer", "header", "musicCarouselShelfBasicHeaderRenderer", "title", "runs", 0, "text"],
  true,
);
console.log(firstTitle);
```

`request` takes the same options as other calls (`signal`), plus:

| Option | Description |
|---|---|
| `client` | send as another InnerTube client, e.g. `MOBILE_CLIENT` (the Android app) |
| `additionalParams` | extra query string, e.g. `&ctoken=…` for legacy continuations |
| `retry` | `false` to never retry this request (do this for anything that changes state) |

See [Raw requests](/api/raw) for the reference.

### The mobile client

Some data is only returned to the apps. `getLyrics({ timestamps: true })` uses the Android client for this. Do the same for your own requests:

```ts
import { MOBILE_CLIENT, YTMusic } from "yt-music-node";

const ytm = new YTMusic();
const raw = await ytm.request("browse", { browseId: "FEmusic_home" }, { client: MOBILE_CLIENT });
```

Upstream's `with yt.as_mobile():` changes the client for every request on that instance. Here the override applies to one request only, so concurrent calls don't interfere.

## Navigating responses

InnerTube responses are deeply nested. `nav(root, path, noneIfAbsent?)` follows a path of keys and indices:

```ts
import { nav } from "yt-music-node";

const data = { a: { b: [{ c: "found" }] } };

nav(data, ["a", "b", 0, "c"]); // "found"
nav(data, ["a", "b", -1, "c"]); // negative indices count from the end
nav(data, ["a", "x"], true); // null: missing paths return null with noneIfAbsent
// nav(data, ["a", "x"]) throws YTMusicNavigationError naming the missing key
```

`findObjectByKey(list, key, nested?)` and `findObjectsByKey(…)` find the renderers in a list that have a given key, for example the shelf of a given type in a section list.

## Recording responses

When a method breaks after a layout change, a recording of the raw response is the fastest way to a fix. `hooks.onResponse` sees every response body:

```ts
import { writeFileSync } from "node:fs";
import { YTMusic } from "yt-music-node";

let n = 0;
const ytm = new YTMusic({
  hooks: {
    onResponse: ({ url, status, text }) => {
      if (!url.includes("/youtubei/v1/")) return;
      const endpoint = new URL(url).pathname.split("/v1/")[1]!.replaceAll("/", "_");
      writeFileSync(`recording-${++n}-${endpoint}-${status}.json`, text);
    },
  },
});

await ytm.getArtist("UCmMUZbaYdNH0bEd1PAlAqsA").catch((error) => console.error(error));
```

::: warning Check recordings before sharing
Signed-in responses contain your account name, playlists and listening history. Record with a signed-out client when you can, and read a recording before attaching it to an issue.
:::

To turn a recording into a regression test, see [contributing: testing](/contributing/testing#golden-tests).

## Testing your code

Pass a fake `fetch` to test code that uses the library without the network:

```ts
import { YTMusic, type FetchLike } from "yt-music-node";

const calls: string[] = [];
const fakeFetch: FetchLike = async (url, init) => {
  calls.push(`${init.method} ${new URL(url).pathname}`);
  return new Response(JSON.stringify({ actions: [] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};

// visitorData skips the homepage lookup, so only your requests reach the fake
const ytm = new YTMusic({ fetch: fakeFetch, visitorData: "test" });
await ytm.request("music/get_search_suggestions", { input: "x" });
console.log(calls); // [ 'POST /youtubei/v1/music/get_search_suggestions' ]
```

To return realistic data, record real responses with [hooks](#recording-responses) and serve them from the fake.

## Streaming URLs

`getSong` returns the `player` response, including `streamingData`. Many formats carry a `signatureCipher` instead of a plain URL. Turning it into a playable URL requires running parts of YouTube's `base.js` player script. This library doesn't do that, and neither does ytmusicapi. `getBasejsUrl()` and `getSignatureTimestamp()` give you the inputs a deciphering library needs:

```ts
import { YTMusic } from "yt-music-node";

const ytm = new YTMusic();
const signatureTimestamp = await ytm.getSignatureTimestamp();
const song = await ytm.getSong("hpSrLjc5SMs", { signatureTimestamp });
console.log(song.playabilityStatus?.status, Object.keys(song.streamingData ?? {}));
```

## Brand accounts and several Google accounts

See [multiple accounts](/authentication/multiple-accounts).

## Concurrency and rate limits

Calls on one client can run concurrently. YouTube rate-limits aggressive clients with HTTP 429, so:

- Run a few requests at a time, not hundreds. A simple queue is enough:

```ts
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!);
    }
  });
  await Promise.all(workers);
  return results;
}

const ids = ["MPREb_4pL8gzRtw1p", "MPREb_n1AxZ9F8rF7"];
const albums = await mapLimit(ids, 3, (id) => ytm.getAlbum(id));
```

- Turn on [`retry`](/guide/configuration#retries): it backs off and honors `Retry-After`.
- Writes to an account are rate-limited more strictly than reads. Space out bulk edits.
