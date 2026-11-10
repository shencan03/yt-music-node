---
title: getLibraryUploadAlbums
summary: "Albums of your uploads"
auth: required
order: 3
---

# `getLibraryUploadAlbums`

<MethodInfo />

Albums of your uploaded songs. Use their `browseId` with `getLibraryUploadAlbum`.

```ts
const albums = await ytm.getLibraryUploadAlbums({ limit: null });
console.log(albums.map((a) => a.title));
```

## Reference

```ts
getLibraryUploadAlbums(options?: LibraryOptions): Promise<AlbumSummary[]>
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `limit` | `number \| null` | `25` | items to aim for; `null` for all |
| `order` | `"a_to_z"` \| `"z_to_a"` \| `"recently_added"` | library order | sort order |
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`AlbumSummary`](/reference/interfaces/AlbumSummary)`[]`.

An empty library section returns `[]`.

## Coming from ytmusicapi

This is `get_library_upload_albums` in ytmusicapi. See the [migration guide](/guide/migration).
