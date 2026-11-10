---
title: ratePlaylist
summary: "Save or unsave a playlist or album"
auth: required
write: true
order: 9
---

# `ratePlaylist`

<MethodInfo />

`"LIKE"` saves a playlist or album to your library, `"INDIFFERENT"` removes it. For albums, pass the `audioPlaylistId`.

```ts
const album = await ytm.getAlbum("MPREb_4pL8gzRtw1p");
await ytm.ratePlaylist(album.audioPlaylistId!, "LIKE"); // save the album
```

## Reference

```ts
ratePlaylist(playlistId: string, rating?: LikeStatus, options?: CallOptions): Promise<any>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `playlistId` | `string` | yes | the playlist id, or an album's `audioPlaylistId` |
| `rating` | `LikeStatus` | no | `"LIKE"` saves it to your library, `"INDIFFERENT"` removes it. Default `"INDIFFERENT"`. |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of YouTube's raw response, typed `any`. When YouTube refuses the change, the method throws [`YTMusicGatedError`](/guide/errors#ytmusicgatederror) instead, so you don't need to inspect it.

## Coming from ytmusicapi

This is `rate_playlist` in ytmusicapi. See the [migration guide](/guide/migration).
