---
title: getArtistAlbums
summary: "All albums or singles of an artist"
auth: none
order: 3
---

# `getArtistAlbums`

<MethodInfo />

Every album, single or show of an artist. Pass the `browseId` and `params` of the artist's `albums`, `singles` or `shows` section.

```ts
const artist = await ytm.getArtist("UCmMUZbaYdNH0bEd1PAlAqsA");
const { browseId, params } = artist.albums!;
const albums = await ytm.getArtistAlbums(browseId!, params!, { order: "Recency", limit: null });
```

Results have no `artists` key: they all belong to the artist you asked for.

## Reference

```ts
getArtistAlbums(channelId: string, params: string, options?: ArtistAlbumsOptions): Promise<AlbumSummary[]>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `channelId` | `string` | yes | the section's `browseId`, from `getArtist(…).albums`, `.singles` or `.shows` |
| `params` | `string` | yes | the `params` of the section, from the page that lists it |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `limit` | `number \| null` | `100` | albums to aim for; `null` for all |
| `order` | `"Recency"` \| `"Popularity"` \| `"Alphabetical order"` | page order | sort order |
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`AlbumSummary`](/reference/interfaces/AlbumSummary)`[]`.

### Errors

Throws `YTMusicUserError` for an unknown `order`.

## Example output

<details class="example"><summary>Example output</summary>

<<< @/examples/artist-albums.json

</details>

## Coming from ytmusicapi

This is `get_artist_albums` in ytmusicapi. See the [migration guide](/guide/migration).
