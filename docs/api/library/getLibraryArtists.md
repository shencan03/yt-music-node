---
title: getLibraryArtists
summary: "Artists in your library"
auth: required
order: 4
---

# `getLibraryArtists`

<MethodInfo />

Artists of the songs in your library, with `browseId`, `artist` (the name), `songs` (count text) and `thumbnails`.

```ts
const artists = await ytm.getLibraryArtists({ limit: null });
console.log(artists.map((a) => `${a.artist} (${a.songs ?? "?"})`));
```

## Reference

```ts
getLibraryArtists(options?: LibraryOptions): Promise<LibraryArtist[]>
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `limit` | `number \| null` | `25` | items to aim for; `null` for all |
| `order` | `"a_to_z"` \| `"z_to_a"` \| `"recently_added"` | library order | sort order |
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`LibraryArtist`](/reference/interfaces/LibraryArtist)`[]`.

An empty library section returns `[]`.

## Coming from ytmusicapi

This is `get_library_artists` in ytmusicapi. See the [migration guide](/guide/migration).
