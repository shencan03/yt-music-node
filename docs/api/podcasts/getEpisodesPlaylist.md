---
title: getEpisodesPlaylist
summary: "New episodes, or your episodes for later"
auth: required
order: 5
---

# `getEpisodesPlaylist`

<MethodInfo />

An episode playlist:

| Id | Playlist |
|---|---|
| `"RDPN"` (default) | **New episodes** of the podcasts you follow. Needs auth, and the account must follow at least one podcast. |
| `"SE"` | **Episodes for later** (also available in playlist form as [`getSavedEpisodes`](/api/playlists/getSavedEpisodes)). Needs auth. |

```ts
import { YTMusic } from "yt-music-node";

const ytm = await YTMusic.fromAuthFile("browser.json");
const fresh = await ytm.getEpisodesPlaylist();
console.log(fresh.episodes.map((e) => e.title));
```

## Reference

```ts
getEpisodesPlaylist(playlistId?: string, options?: CallOptions): Promise<EpisodesPlaylist>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `playlistId` | `string` | no | `"RDPN"` (new episodes, the default) or `"SE"` (episodes for later) |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`EpisodesPlaylist`](/reference/interfaces/EpisodesPlaylist).

### Errors

Throws `YTMusicServerError` with an explanation when YouTube returns no contents, for example `RDPN` on an account that follows no podcasts.

## Coming from ytmusicapi

This is `get_episodes_playlist` in ytmusicapi. See the [migration guide](/guide/migration).
