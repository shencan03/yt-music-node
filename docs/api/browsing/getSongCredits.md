---
title: getSongCredits
summary: "A song's performers, writers and producers"
auth: none
order: 11
---

# `getSongCredits`

<MethodInfo />

Who performed, wrote and produced a song. Pass a track's `creditsBrowseId` (`MPTC…`) from an album or playlist. Known sections use fixed keys (`performed_by`, `written_by`, `produced_by`, `music_metadata_provided_by`, …), each with the `localized_title` and the names in `data`. Anything else goes into `other_sections`.

```ts
const album = await ytm.getAlbum("MPREb_4pL8gzRtw1p");
const track = album.tracks.find((t) => t.creditsBrowseId);
const credits = await ytm.getSongCredits(track!.creditsBrowseId!);
console.log(credits.written_by?.data);
```

## Reference

```ts
getSongCredits(browseId: string, options?: CallOptions): Promise<SongCredits>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `browseId` | `string` | yes | the track's `creditsBrowseId` (`MPTC…`), from album and playlist tracks |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`SongCredits`](/reference/interfaces/SongCredits).

### Errors

Throws `YTMusicUserError` when `browseId` doesn't start with `MPTC`.

## Example output

<details class="example"><summary>Example output</summary>

<<< @/examples/song-credits.json

</details>

## Coming from ytmusicapi

This is `get_song_credits` in ytmusicapi. See the [migration guide](/guide/migration).
