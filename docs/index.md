---
layout: page
title: yt-music-node
titleTemplate: Unofficial YouTube Music API for Node.js
---

<div class="home vp-doc">

<HomeHero>

```ts [search.ts]
import { YTMusic } from "yt-music-node";

const ytm = new YTMusic();

const [song] = await ytm.search("wonderwall", { filter: "songs" });
console.log(song?.title, song?.artists?.map((a) => a.name));

// every result carries the ids for the next call
const album = await ytm.getAlbum(song!.album!.id!);
console.log(album.title, album.year, album.tracks.length);

// signed in: your own library
const me = await YTMusic.fromAuthFile("browser.json");
const liked = await me.getLikedSongs({ limit: 50 });
```

</HomeHero>

<section class="home-section">

## What it covers

<div class="home-columns">
<div>

### Without an account

- Search, with filters and suggestions
- Artists, albums, songs, credits and users
- Lyrics, including timed lyrics
- "Up next" queues and radios
- Explore, moods, genres and charts
- Podcasts, channels and episodes

</div>
<div>

### With your account

- Your library: songs, albums, artists, playlists, podcasts
- Create, edit and delete playlists
- Like and dislike songs, save albums
- Play history and subscriptions
- Upload your own songs

[Set up authentication](/authentication/), which takes about two minutes.

</div>
</div>

</section>

<section class="home-section">

## Start here

<div class="home-links">

[**Getting started**<br>Install the package and write your first script.](/guide/introduction)

[**Guides**<br>Complete scripts for search, playlists, uploads and servers.](/guide/recipes)

[**API reference**<br>Every method, with its options and real example output.](/api/)

[**Coming from ytmusicapi?**<br>Same result keys. The migration guide maps every method.](/guide/migration)

</div>

</section>

<section class="home-section home-facts">

All 61 ytmusicapi methods plus raw InnerTube requests · Node.js 22+ · ESM and CommonJS · full TypeScript types · no runtime dependencies · MIT

yt-music-node uses the same private API as the YouTube Music website. It isn't affiliated with Google or YouTube, and YouTube can change that API at any time, so pin a version and watch the [releases](https://github.com/shencan03/yt-music-node/releases).

</section>

</div>
