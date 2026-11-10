---
title: Your first script
---

# Your first script

This page builds a small script one step at a time: search for a song, open its artist, then list one of the artist's albums. It shows the pattern you use with every part of the API: **each result carries the ids for the next call.**

You need the package [installed](/guide/installation). No account is needed.

## 1. Create a client

```ts
import { YTMusic } from "yt-music-node";

const ytm = new YTMusic();
```

A client holds your settings and nothing else. It's cheap to create and opens no connection. Create one and reuse it for every call.

## 2. Search

```ts
const songs = await ytm.search("daft punk get lucky", { filter: "songs", limit: 5 });

for (const song of songs) {
  console.log(`${song.title} – ${song.artists?.map((a) => a.name).join(", ")} (${song.duration})`);
}
// one line per song: title – artists (duration)
```

Every method is async and returns plain objects. `filter: "songs"` limits the results to songs. Without a filter you get mixed results, and each has a `resultType` saying what it is. See [`search`](/api/search/search) for every filter.

## 3. Follow an id to the artist

Each song's `artists` list holds the artist's `id`. Pass it to [`getArtist`](/api/browsing/getArtist):

<!-- no-check -->
```ts
const artistId = songs[0]?.artists?.[0]?.id;
if (!artistId) throw new Error("no artist id");

const artist = await ytm.getArtist(artistId);
console.log(artist.name, artist.subscribers);
```

## 4. Follow an id to an album

The artist page has sections (`albums`, `singles`, `videos`, …). Each item in a section has a `browseId`, which [`getAlbum`](/api/browsing/getAlbum) takes:

<!-- no-check -->
```ts
const albumId = artist.albums?.results[0]?.browseId;
if (albumId) {
  const album = await ytm.getAlbum(albumId);
  console.log(album.title, album.year);
  console.log(album.tracks.map((t) => t.title));
}
```

Values YouTube doesn't send are `null`, and TypeScript makes you check for them. That's why the examples use `?.`.

## The whole script

```ts [first-script.ts]
import { YTMusic } from "yt-music-node";

const ytm = new YTMusic();

const songs = await ytm.search("daft punk get lucky", { filter: "songs", limit: 5 });
const artistId = songs[0]?.artists?.[0]?.id;
if (!artistId) throw new Error("no artist id");

const artist = await ytm.getArtist(artistId);
console.log(artist.name, artist.subscribers);

const albumId = artist.albums?.results[0]?.browseId;
if (albumId) {
  const album = await ytm.getAlbum(albumId);
  console.log(album.title, album.tracks.map((t) => t.title));
}
```

## Cancel a call

Every method takes a `signal` in its options. `AbortSignal.timeout(ms)` gives a call a deadline:

```ts
const home = await ytm.getHome({ limit: 10, signal: AbortSignal.timeout(10_000) });
```

## Sign in for your own data

Your library, playlists, ratings, history and uploads need an account. Save the request headers from your browser once:

```sh
npx yt-music-node browser   # paste request headers from your browser, then Ctrl+D
npx yt-music-node verify    # ✓ browser auth works: signed in as …
```

Then create the client from the saved file:

```ts
import { YTMusic } from "yt-music-node";

const me = await YTMusic.fromAuthFile("browser.json");
const playlists = await me.getLibraryPlaylists({ limit: null });
```

The [authentication guide](/authentication/browser) walks through it step by step.

## Next steps

- [Core concepts](/guide/concepts): which id goes where, result shapes, limits and pagination
- [Handling errors](/guide/errors): what can go wrong and what to catch
- [Guides](/guide/recipes): complete scripts for common tasks
- [API reference](/api/): every method, with real example output
