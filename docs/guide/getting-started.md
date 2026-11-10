# Getting started

## Install

::: code-group

```sh [npm]
npm install yt-music-node
```

```sh [pnpm]
pnpm add yt-music-node
```

```sh [yarn]
yarn add yt-music-node
```

```sh [bun]
bun add yt-music-node
```

<!-- no-check -->
```ts [deno]
import { YTMusic } from "npm:yt-music-node";
```

:::

Requires Node.js 22 or later. The package has no runtime dependencies. Bun and Deno should work but are not tested.

## First calls

Create a client and call methods on it. Every method is async.

```ts
import { YTMusic } from "yt-music-node";

const ytm = new YTMusic();

// search the catalog
const songs = await ytm.search("daft punk get lucky", { filter: "songs", limit: 5 });
for (const song of songs) {
  console.log(`${song.title} – ${song.artists?.map((a) => a.name).join(", ")} (${song.duration})`);
}

// follow ids from one result into the next call
const artist = await ytm.getArtist(songs[0]!.artists![0]!.id!);
console.log(artist.name, artist.subscribers);

const albumId = artist.albums?.results[0]?.browseId;
if (albumId) {
  const album = await ytm.getAlbum(albumId);
  console.log(album.title, album.tracks.map((t) => t.title));
}
```

The client is cheap to create and holds no connection. Create one and reuse it: it caches the visitor id it fetches on its first request.

### CommonJS

```js
const { YTMusic } = require("yt-music-node");

(async () => {
  const ytm = new YTMusic();
  console.log(await ytm.getSearchSuggestions("taylor"));
})();
```

## Options at a glance

```ts
import { YTMusic } from "yt-music-node";

const ytm = new YTMusic({
  language: "de", // language of returned text, e.g. section titles and "views"
  location: "DE", // country for charts and availability
  timeoutMs: 15_000, // per attempt
  retry: 2, // retry reads on 429/5xx/network errors
});
```

[Configuration](/guide/configuration) covers every option.

## Cancel a call

Every method takes a `signal` in its options. Aborting it stops the request and any continuation requests:

```ts
const controller = new AbortController();
setTimeout(() => controller.abort(), 5_000);

const albums = await ytm.search("beatles", { filter: "albums", signal: controller.signal });
```

`AbortSignal.timeout(ms)` works too:

```ts
const home = await ytm.getHome({ limit: 10, signal: AbortSignal.timeout(10_000) });
```

## Sign in

Library, playlists, ratings, history and uploads need an account. Save request headers from your browser once:

```sh
npx yt-music-node browser
npx yt-music-node verify
```

Then load them:

```ts
import { YTMusic } from "yt-music-node";

const ytm = await YTMusic.fromAuthFile("browser.json");
const playlists = await ytm.getLibraryPlaylists({ limit: null });
```

The [authentication guide](/authentication/browser) walks through it step by step.

## TypeScript

Options and results are fully typed. Import the types you need:

```ts
import { YTMusic, type SearchResult, type Album } from "yt-music-node";

function trackLine(track: Album["tracks"][number]): string {
  return `${track.trackNumber ?? "–"}. ${track.title} (${track.duration ?? "?"})`;
}

const ytm = new YTMusic();
const album: Album = await ytm.getAlbum("MPREb_4pL8gzRtw1p");
console.log(album.tracks.map(trackLine).join("\n"));

const results: SearchResult[] = await ytm.search("eminem");
console.log(results.map((r) => r.resultType));
```

Absent values are `null`, as Python's `None` is in ytmusicapi. TypeScript makes you handle them. The [type reference](/reference/) documents every type.

## Next

- [Core concepts](/guide/concepts): which id goes where, limits and pagination
- [Recipes](/guide/recipes): complete scripts for common tasks
- [API](/api/): every method, with real example output
