---
title: getLibraryUploadArtists
summary: "Artists of your uploads"
auth: required
order: 4
---

# `getLibraryUploadArtists`

<MethodInfo />

Artists of your uploaded songs. Use their `browseId` with `getLibraryUploadArtist`.

```ts
const artists = await ytm.getLibraryUploadArtists({ limit: null });
console.log(artists.map((a) => `${a.artist} (${a.songs ?? "?"})`));
```

## Reference

```ts
getLibraryUploadArtists(options?: LibraryOptions): Promise<LibraryArtist[]>
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

This is `get_library_upload_artists` in ytmusicapi. See the [migration guide](/guide/migration).
