---
title: getAlbum
summary: "An album and its tracks"
auth: optional
order: 7
---

# `getAlbum`

<MethodInfo />

An album and its tracks. `browseId` starts with `MPRE`. If you have an `OLAK5uy_…` playlist id instead, convert it with [`getAlbumBrowseId`](/api/browsing/getAlbumBrowseId).

```ts
const album = await ytm.getAlbum("MPREb_4pL8gzRtw1p");
console.log(`${album.title} (${album.year}), ${album.trackCount} tracks, ${album.duration}`);
for (const track of album.tracks) {
  console.log(track.trackNumber, track.title, track.isAvailable ? "" : "(unavailable)");
}
```

Unavailable (greyed-out) tracks have `isAvailable: false` and `trackNumber: null`. Which tracks are unavailable depends on your location.

## Reference

```ts
getAlbum(browseId: string, options?: CallOptions): Promise<Album>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `browseId` | `string` | yes | the album's `browseId` (`MPREb_…`), e.g. from a search result or `getArtist(…).albums` |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`Album`](/reference/interfaces/Album).

| Result key | Description |
|---|---|
| `title`, `type` (`"Album"`, `"Single"`, `"EP"`), `year`, `artists`, `description`, `thumbnails`, `isExplicit` | header |
| `trackCount`, `duration`, `duration_seconds` | totals |
| `audioPlaylistId` | `OLAK5uy_…`: play it with `getWatchPlaylist`, save it with `ratePlaylist` |
| `likeStatus` | whether you saved the album (`LIKE`) |
| `tracks` | tracks with `trackNumber`, `videoId`, `duration`, `isAvailable`, `feedbackTokens` (add to or remove from library) and `creditsBrowseId`. `album` is the album title. |
| `other_versions`, `related_recommendations` | other editions and "Releases for you", when shown |

### Errors

Throws `YTMusicUserError` when `browseId` doesn't start with `MPRE`.

## Example output

<details class="example"><summary>Example output: <code>getAlbum("MPREb_4pL8gzRtw1p")</code></summary>

<<< @/examples/album.json

</details>

## Coming from ytmusicapi

This is `get_album` in ytmusicapi. See the [migration guide](/guide/migration).
