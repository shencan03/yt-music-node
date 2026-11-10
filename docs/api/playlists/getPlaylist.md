---
title: getPlaylist
summary: "A playlist and its tracks"
auth: optional
order: 1
---

# `getPlaylist`

<MethodInfo />

A playlist and its tracks. Takes any playlist id: `PL…`, `RDCLAK…`, album playlists (`OLAK5uy_…`), chart playlists, and `VL`-prefixed browse ids.

```ts
const playlist = await ytm.getPlaylist("PLQwVIlKxHM6qv-o99iX9R85og7IzF9YS_", { limit: null });
console.log(`${playlist.title}: ${playlist.tracks.length} of ${playlist.trackCount} tracks, ${playlist.duration}`);
```

## Reference

```ts
getPlaylist(playlistId: string, options?: GetPlaylistOptions): Promise<Playlist>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `playlistId` | `string` | yes | the playlist id. A `VL` prefix is stripped. |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `limit` | `number \| null` | `100` | tracks to aim for; `null` for all |
| `related` | `boolean` | `false` | also fetch related playlists (`related`) |
| `suggestionsLimit` | `number` | `0` | for your own playlists: how many suggested songs to fetch (`suggestions`, 7 per request) |
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`Playlist`](/reference/interfaces/Playlist).

| Result key | Description |
|---|---|
| `id`, `title`, `description`, `thumbnails`, `author`, `year`, `privacy` | header |
| `owned` | `true` for your own playlists. Their tracks then have `setVideoId`s for editing. |
| `views` | view count as a number (`2500000`, not `"2.5M"`) |
| `trackCount`, `duration`, `duration_seconds` | totals. `duration_seconds` sums the tracks fetched. |
| `tracks` | songs with `videoId`, `title`, `artists`, `album`, `duration`, `likeStatus`, `inLibrary`, `isAvailable`, `feedbackTokens` and, when owned, `setVideoId` |
| `collaborators` | for collaborative playlists |
| `related`, `suggestions` | when requested |

## Example output

<details class="example"><summary>Example output: <code>getPlaylist("PLQwVIlKxHM6qv-o99iX9R85og7IzF9YS_", { limit: 5 })</code></summary>

<<< @/examples/playlist.json

</details>

## Coming from ytmusicapi

This is `get_playlist` in ytmusicapi. See the [migration guide](/guide/migration).
