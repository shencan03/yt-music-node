# Raw requests and responses

For what the methods don't cover: send any InnerTube request, read values out of the raw response, and get the inputs for streaming.

## Send a raw request

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

[`request`](/api/raw/request) in the API reference lists every option and some useful endpoints.

### The mobile client

Some data is only returned to the apps. `getLyrics({ timestamps: true })` uses the Android client for this. Do the same for your own requests:

```ts
import { MOBILE_CLIENT, YTMusic } from "yt-music-node";

const ytm = new YTMusic();
const raw = await ytm.request("browse", { browseId: "FEmusic_home" }, { client: MOBILE_CLIENT });
```

Upstream's `with yt.as_mobile():` changes the client for every request on that instance. Here the override applies to one request only, so concurrent calls don't interfere.

## Navigate a response

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

## Streaming URLs

`getSong` returns the `player` response, including `streamingData`. Many formats carry a `signatureCipher` instead of a plain URL. Turning it into a playable URL requires running parts of YouTube's `base.js` player script. This library doesn't do that, and neither does ytmusicapi. `getBasejsUrl()` and `getSignatureTimestamp()` give you the inputs a deciphering library needs:

```ts
import { YTMusic } from "yt-music-node";

const ytm = new YTMusic();
const signatureTimestamp = await ytm.getSignatureTimestamp();
const song = await ytm.getSong("hpSrLjc5SMs", { signatureTimestamp });
console.log(song.playabilityStatus?.status, Object.keys(song.streamingData ?? {}));
```

## Next steps

- [`request`](/api/raw/request): the reference
- [Test your code](/guide/testing): record responses with hooks
- [Limitations](/guide/limitations): what the library doesn't do
