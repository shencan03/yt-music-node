---
title: addPlaylistItems
summary: "Add songs or a whole playlist"
auth: required
write: true
order: 7
---

# `addPlaylistItems`

<MethodInfo />

Adds songs, or all items of another playlist, to a playlist you own.

```ts
const result = await ytm.addPlaylistItems("PLxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", {
  videoIds: ["hpSrLjc5SMs"],
});
if ("playlistEditResults" in result) console.log(result.playlistEditResults);
```

## Reference

```ts
addPlaylistItems(playlistId: string, options: AddPlaylistItemsOptions): Promise<AddPlaylistItemsResult | JsonObject>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `playlistId` | `string` | yes | the playlist id. A `VL` prefix is stripped. |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `videoIds` | `string[]` | – | songs to add |
| `sourcePlaylist` | `string` | – | add every item of this playlist |
| `duplicates` | `boolean` | `false` | allow songs that are already in the playlist |
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`AddPlaylistItemsResult`](/reference/interfaces/AddPlaylistItemsResult)` | `[`JsonObject`](/reference/interfaces/JsonObject). On success, that is `{ status: "STATUS_SUCCEEDED", playlistEditResults }`, where `playlistEditResults` maps each added `videoId` to its new `setVideoId`. You can use those to move or remove the items right away.

### Errors

Throws `YTMusicUserError` without `videoIds` or `sourcePlaylist`, or when `videoIds` repeats an id while `duplicates` is `false`. YouTube answered `STATUS_FAILED` in the live tests when `sourcePlaylist` overlapped the target. Use `videoIds` in that case.

## Coming from ytmusicapi

This is `add_playlist_items` in ytmusicapi. See the [migration guide](/guide/migration).
