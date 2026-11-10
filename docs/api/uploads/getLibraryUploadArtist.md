---
title: getLibraryUploadArtist
summary: "Uploads by one artist"
auth: required
order: 5
---

# `getLibraryUploadArtist`

<MethodInfo />

Your uploaded songs by one artist. `limit` defaults to `25`.

```ts
const [artist] = await ytm.getLibraryUploadArtists({ limit: 1 });
if (artist) {
  const songs = await ytm.getLibraryUploadArtist(artist.browseId, { limit: null });
  console.log(artist.artist, songs.map((s) => s.title));
}
```

## Reference

```ts
getLibraryUploadArtist(browseId: string, options?: { limit?: number | null }): Promise<UploadedSong[]>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `browseId` | `string` | yes | the artist's `browseId` from `getLibraryUploadArtists` |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `limit` | `number \| null` | `25` | items to aim for; `null` for all |
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`UploadedSong`](/reference/interfaces/UploadedSong)`[]`.

## Coming from ytmusicapi

This is `get_library_upload_artist` in ytmusicapi. See the [migration guide](/guide/migration).
