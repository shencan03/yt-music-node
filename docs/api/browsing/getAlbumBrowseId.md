---
title: getAlbumBrowseId
summary: "Find an album's `browseId` from its playlist id"
auth: none
order: 8
---

# `getAlbumBrowseId`

<MethodInfo />

Converts an album's playlist id (`OLAK5uy_…`) to its `browseId` (`MPREb_…`), or `null` if the playlist isn't an album.

```ts
const browseId = await ytm.getAlbumBrowseId("OLAK5uy_nMr9h2VlS-2PULNz3M3XVXQj_P3C2bqaY");
// "MPREb_4pL8gzRtw1p"
```

## Reference

```ts
getAlbumBrowseId(audioPlaylistId: string, options?: CallOptions): Promise<string | null>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `audioPlaylistId` | `string` | yes | the album's playlist id (`OLAK5uy_…`) |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of `string | null`.

## Coming from ytmusicapi

This is `get_album_browse_id` in ytmusicapi. See the [migration guide](/guide/migration).
