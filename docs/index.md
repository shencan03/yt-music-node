---
layout: home

hero:
  name: yt-music-node
  text: YouTube Music, from Node.js
  tagline: Search, browse, read charts and lyrics, manage playlists and your library, and upload songs, with typed results and zero dependencies. A TypeScript port of ytmusicapi.
  image:
    src: /logo.svg
    alt: yt-music-node
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: API
      link: /api/
    - theme: alt
      text: Set up auth
      link: /authentication/

features:
  - icon: 🔎
    title: Every ytmusicapi endpoint
    details: All 61 methods (search, artists, albums, lyrics, charts, podcasts, library, playlists, history, uploads) plus raw InnerTube requests for anything else.
    link: /api/
    linkText: Browse the API
  - icon: 🧩
    title: Same results as Python
    details: Results keep ytmusicapi's keys, so its knowledge carries over. Golden tests compare the parsers against upstream's expected output.
    link: /guide/migration
    linkText: Migrating from ytmusicapi
  - icon: 🔐
    title: Your account, safely
    details: Sign in with request headers from your browser in about two minutes. The verify command confirms the setup without printing any credentials.
    link: /authentication/
    linkText: Authentication guide
  - icon: 🛡️
    title: Made for Node
    details: Async with an AbortSignal on every call, timeouts, opt-in retries that never repeat a write, request hooks and a pluggable fetch for proxies.
    link: /guide/configuration
    linkText: Configuration
  - icon: 📦
    title: Zero dependencies
    details: Node.js 22+. ESM and CommonJS. Complete TypeScript types for every option and result.
    link: /reference/
    linkText: Type reference
  - icon: ✅
    title: Tested against the real thing
    details: Over 200 offline tests, a nightly live suite against music.youtube.com and an authenticated suite that undoes every change it makes.
    link: /api/coverage
    linkText: Coverage matrix
---

<div class="vp-doc" style="max-width: 1152px; margin: 64px auto 0; padding: 0 24px">

## Thirty seconds

```sh
npm install yt-music-node
```

```ts
import { YTMusic } from "yt-music-node";

const ytm = new YTMusic();

const [song] = await ytm.search("oasis wonderwall", { filter: "songs" });
console.log(song?.title, "by", song?.artists?.map((a) => a.name).join(", "));
// Wonderwall by Oasis

const album = await ytm.getAlbum(song!.album!.id!);
console.log(album.title, album.year, `${album.trackCount} tracks`);
```

Sign in to reach your library, edit playlists, rate songs or upload music:

```sh
npx yt-music-node browser   # paste request headers from your browser
npx yt-music-node verify    # ✓ browser auth works: signed in as …
```

```ts
import { YTMusic } from "yt-music-node";

const me = await YTMusic.fromAuthFile("browser.json");
const liked = await me.getLikedSongs({ limit: 50 });
```

::: warning Unofficial
yt-music-node talks to the same private API the YouTube Music website uses. It is not affiliated with Google or YouTube. YouTube can change that API at any time, so pin a version and watch the releases.
:::

</div>
