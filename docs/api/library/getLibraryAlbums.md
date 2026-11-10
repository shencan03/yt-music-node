---
title: getLibraryAlbums
summary: "Albums in your library"
auth: required
order: 3
---

# `getLibraryAlbums`

<MethodInfo />

Albums in your library, with `browseId`, `title`, `artists`, `year`, `type` and `thumbnails`.

```ts
const albums = await ytm.getLibraryAlbums({ limit: null, order: "a_to_z" });
for (const album of albums) console.log(album.year, album.title);
```

## Reference

```ts
getLibraryAlbums(options?: LibraryOptions): Promise<AlbumSummary[]>
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

This is `get_library_albums` in ytmusicapi. See the [migration guide](/guide/migration).
