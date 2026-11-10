---
title: getLibraryUploadAlbum
summary: "One album of your uploads"
auth: required
order: 6
---

# `getLibraryUploadAlbum`

<MethodInfo />

One album of uploaded songs: `title`, `type`, `thumbnails`, `trackCount`, `duration`, `duration_seconds`, `audioPlaylistId` and `tracks`.

```ts
const [first] = await ytm.getLibraryUploadAlbums({ limit: 1 });
if (first) {
  const album = await ytm.getLibraryUploadAlbum(first.browseId);
  console.log(album.title, album.tracks.map((t) => t.title));
}
```

## Reference

```ts
getLibraryUploadAlbum(browseId: string, options?: CallOptions): Promise<UploadedAlbum>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `browseId` | `string` | yes | the album's `browseId` from `getLibraryUploadAlbums` |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`UploadedAlbum`](/reference/interfaces/UploadedAlbum).

## Coming from ytmusicapi

This is `get_library_upload_album` in ytmusicapi. See the [migration guide](/guide/migration).
