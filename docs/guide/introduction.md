# Introduction

yt-music-node is a Node.js library for YouTube Music. It searches the catalog, reads artists, albums, lyrics and charts, and, when you sign in, manages your playlists, library and uploads.

```ts
import { YTMusic } from "yt-music-node";

const ytm = new YTMusic();
const songs = await ytm.search("wonderwall", { filter: "songs" });
```

## What you can do

| Without signing in | Signed in |
|---|---|
| Search, with filters and suggestions | Search your library and uploads |
| Artists, albums, songs, credits, users | Your songs, albums, artists, playlists and podcasts |
| Lyrics, including timed lyrics | Like and dislike songs, save albums and playlists |
| "Up next" queues and radios | Create, edit and delete playlists |
| Explore, moods, genres and charts | Read and edit your play history |
| Podcasts, channels and episodes | Subscriptions and account info |
| Public playlists | Upload and delete your own songs |

Every method is listed in the [API reference](/api/).

## How it works

YouTube Music has no public API. This library sends the same requests the YouTube Music website sends and turns the responses into plain, typed objects. To sign in, you copy the request headers from your browser once; see [Authentication](/authentication/).

## Requirements

- Node.js 22 or later
- No other dependencies

## Things to know

- **It's unofficial.** YouTube can change its internal API at any time, which can break a method until a fix is released. Pin the version you use.
- **No audio downloads.** You get song data and metadata, not playable audio files.
- **It's a port of [ytmusicapi](https://github.com/sigma67/ytmusicapi)**, the Python library. Results have the same fields, so if you've used it, the [migration guide](/guide/migration) maps every method.

## Next steps

- [Installation](/guide/installation)
- [Your first script](/guide/getting-started)
