---
title: editSongLibraryStatus
summary: "Add or remove songs from the library"
auth: required
write: true
order: 10
---

# `editSongLibraryStatus`

<MethodInfo />

Adds songs to your library, or removes them, without liking them. Tracks from albums, playlists and library listings have `feedbackTokens: { add, remove }`. Pass `add` tokens to add and `remove` tokens to remove.

```ts
const album = await ytm.getAlbum("MPREb_4pL8gzRtw1p");
const tokens = album.tracks.map((t) => t.feedbackTokens?.add).filter((t): t is string => Boolean(t));
await ytm.editSongLibraryStatus(tokens); // add the whole album to the library
```

## Reference

```ts
editSongLibraryStatus(feedbackTokens: string[], options?: CallOptions): Promise<any>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `feedbackTokens` | `string[]` | yes | the `add` or `remove` token of each song's `feedbackTokens` |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of YouTube's raw response, typed `any`. When YouTube refuses the change, the method throws [`YTMusicGatedError`](/guide/errors#ytmusicgatederror) instead, so you don't need to inspect it.

## Coming from ytmusicapi

This is `edit_song_library_status` in ytmusicapi. See the [migration guide](/guide/migration).
