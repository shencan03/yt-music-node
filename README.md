# yt-music-node

Unofficial YouTube Music API for Node.js: a TypeScript port of the Python [ytmusicapi](https://github.com/sigma67/ytmusicapi).

**[Documentation](https://shencan03.github.io/yt-music-node/)** · [Getting started](https://shencan03.github.io/yt-music-node/guide/getting-started) · [API](https://shencan03.github.io/yt-music-node/api/) · [Authentication](https://shencan03.github.io/yt-music-node/authentication/) · [Migrating from ytmusicapi](https://shencan03.github.io/yt-music-node/guide/migration)

- Every ytmusicapi endpoint (61 methods): search, artists, albums, lyrics, charts, podcasts, library, playlists, history, uploads, plus raw InnerTube requests
- The same result shapes (keys) as ytmusicapi, with complete TypeScript types
- Sign in with request headers from your browser, compatible with ytmusicapi's `browser.json`
- `AbortSignal` on every call, timeouts, opt-in retries that never repeat a write, request hooks, pluggable `fetch`
- Node.js ≥ 22, zero runtime dependencies, ESM and CommonJS
- Fixes more than 30 upstream bugs ([behavior differences](https://shencan03.github.io/yt-music-node/guide/migration#behavior-differences))

## Install

```sh
npm install yt-music-node
```

## Usage

```ts
import { YTMusic } from "yt-music-node";

const ytm = new YTMusic();

const [song] = await ytm.search("oasis wonderwall", { filter: "songs" });
const album = await ytm.getAlbum(song.album.id);
console.log(album.title, album.year, album.tracks.map((t) => t.title));

const watch = await ytm.getWatchPlaylist({ videoId: song.videoId });
const lyrics = await ytm.getLyrics(watch.lyrics, { timestamps: true });

const charts = await ytm.getCharts({ country: "US" });
```

Optional parameters go in an options object, which also takes a `signal`:

```ts
await ytm.search("beatles", { filter: "albums", signal: AbortSignal.timeout(5_000) });
```

## Your account

Library, playlist editing, ratings, history and uploads need an account. Save request headers from your browser once, check them, and load them:

```sh
pbpaste | npx yt-music-node browser   # macOS; see the auth guide for other systems
npx yt-music-node verify    # ✓ browser auth works: signed in as …
```

```ts
const me = await YTMusic.fromAuthFile("browser.json");
const liked = await me.getLikedSongs({ limit: null });
```

The [authentication guide](https://shencan03.github.io/yt-music-node/authentication/browser) walks through it step by step for Firefox and Chrome/Edge. The file holds your Google session cookie: keep it out of git and treat it like a password ([why](https://shencan03.github.io/yt-music-node/authentication/security)).

## Coming from ytmusicapi

Method names are camelCase and optional parameters move into an options object. Results keep ytmusicapi's keys, so code that reads them needs few changes:

| ytmusicapi | yt-music-node |
|---|---|
| `YTMusic("browser.json")` | `await YTMusic.fromAuthFile("browser.json")` |
| `yt.search(q, filter="songs", limit=10)` | `await ytm.search(q, { filter: "songs", limit: 10 })` |
| `yt.get_playlist(id, limit=None)` | `await ytm.getPlaylist(id, { limit: null })` |
| `ytmusicapi browser` | `npx yt-music-node browser` |

Every method is mapped in the [migration guide](https://shencan03.github.io/yt-music-node/guide/migration).

## Development

```sh
npm install
npm run check       # typecheck + lint + offline tests
npm run test:live   # tests against music.youtube.com, signed out
npm run test:auth   # tests against your account (test/.auth/browser.json); every change is undone
npm run docs:dev    # the documentation site
npm run build
```

Changes go through pull requests reviewed by a maintainer; see [CONTRIBUTING.md](CONTRIBUTING.md). The [contributing guide](https://shencan03.github.io/yt-music-node/contributing/) covers the layout, the test suites and how to sync with upstream.

## Disclaimer

This project is not affiliated with, endorsed by or connected to Google or YouTube. It uses YouTube Music's internal API, which can change at any time. Use it in line with YouTube's terms of service.

## License

MIT. Contains code derived from ytmusicapi © sigma67 (MIT).
