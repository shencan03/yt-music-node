---
title: removePlaylistItems
summary: "Remove items from a playlist"
auth: required
write: true
order: 8
---

# `removePlaylistItems`

<MethodInfo />

Removes items from a playlist you own. Pass tracks from `getPlaylist`: each needs its `videoId` and `setVideoId`, so one occurrence of a song can be removed while others stay.

```ts
const playlistId = "PLxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
const playlist = await ytm.getPlaylist(playlistId);
const toRemove = playlist.tracks.filter((t) => t.isAvailable === false);
if (toRemove.length > 0) await ytm.removePlaylistItems(playlistId, toRemove);
```

## Reference

```ts
removePlaylistItems(playlistId: string, videos: { videoId?: string | null; setVideoId?: string | null }[], options?: CallOptions): Promise<WriteStatus>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `playlistId` | `string` | yes | the playlist id. A `VL` prefix is stripped. |
| `videos` | `{ videoId?: string \| null; setVideoId?: string \| null }[]` | yes | items from `getPlaylist(…).tracks`; each needs its `setVideoId` |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`WriteStatus`](/reference/type-aliases/WriteStatus).

### Errors

Throws `YTMusicUserError` when no item has a `setVideoId`, which usually means the playlist isn't yours.

## Coming from ytmusicapi

This is `remove_playlist_items` in ytmusicapi. See the [migration guide](/guide/migration).
