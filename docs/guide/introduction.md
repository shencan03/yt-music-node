# Introduction

yt-music-node is an unofficial YouTube Music API client for Node.js. It is a TypeScript port of the Python library [ytmusicapi](https://github.com/sigma67/ytmusicapi) by sigma67, synced at upstream commit `488dbf3` (2026-11-04).

It works like the YouTube Music website does. It sends the same requests to YouTube Music's internal API (InnerTube) and turns the deeply nested responses into plain, typed objects.

## What you can do

| Without an account | With your account ([set up auth](/authentication/)) |
|---|---|
| Search the catalog, with filters and suggestions | Search your library and uploads |
| Artists, albums, songs, credits, users | Your library: songs, albums, artists, playlists, podcasts |
| Lyrics, including timed lyrics | Like and dislike songs, save albums and playlists |
| "Up next" queues and radios | Create, edit and delete playlists and their items |
| Explore, moods and genres, charts | Play history: read, add, remove |
| Podcasts, channels and episodes | Subscriptions, taste profile, account info |
| Public playlists | Upload and delete your own songs |

The [API overview](/api/) lists every method.

## How it relates to ytmusicapi

The port keeps what makes ytmusicapi useful and changes what doesn't fit JavaScript:

- **Same results.** Result objects have ytmusicapi's keys and nesting (`videoId`, `browseId`, `duration_seconds`, …). Its documentation and community answers still apply. The golden tests run upstream's recorded responses through this library and compare the output with upstream's expected output.
- **JavaScript naming.** Methods are camelCase (`get_artist` → `getArtist`), and optional parameters move into an options object. The [migration guide](/guide/migration) maps every method.
- **Fixed bugs.** The port fixes more than 30 upstream bugs, for example wrong view counts (`"2.5M views"` parsed as `25`), crashes on unplayable tracks and limits that fetched far too much. See [behavior differences](/guide/migration#behavior-differences).
- **Node-native extras.** An `AbortSignal` on every call, timeouts, opt-in retries, request hooks and a pluggable `fetch`. See [configuration](/guide/configuration).

## Status

| | |
|---|---|
| Endpoints | all 61 ytmusicapi methods, plus `request()` for raw calls |
| Authentication | request headers from a signed-in browser session (cookie based) |
| Runtimes | Node.js ≥ 22 (the CI matrix covers 22, 24 and 26). ESM and CommonJS. Bun and Deno should work (no Node-only APIs outside `fromAuthFile` and file uploads) but aren't tested |
| Tests | offline unit and golden tests, a nightly live suite and an authenticated suite; see the [coverage matrix](/api/coverage) |

::: warning It's an unofficial API
YouTube Music doesn't publish or support this API, and it can change any day. When YouTube changes a page layout, a method may throw [`YTMusicNavigationError`](/guide/errors#ytmusicnavigationerror) until a fix ships. The nightly live tests usually catch this within a day. Use it for personal projects, tools and research, and follow YouTube's terms of service.
:::

## Next steps

- [Getting started](/guide/getting-started): install the package and make your first calls
- [Core concepts](/guide/concepts): ids, result shapes, limits and pagination
- [Authentication](/authentication/): sign in with your account
