---
title: getLibraryUploadSongs
summary: "Your uploaded songs"
auth: required
order: 2
---

# `getLibraryUploadSongs`

<MethodInfo />

Your uploaded songs, with `entityId` (to delete), `videoId` (to play), `title`, `artists`, `album`, `duration`, `duration_seconds`, `likeStatus` and `thumbnails`.

```ts
const uploads = await ytm.getLibraryUploadSongs({ limit: null, order: "recently_added" });
```

## Reference

```ts
getLibraryUploadSongs(options?: LibraryOptions): Promise<UploadedSong[]>
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `limit` | `number \| null` | `25` | items to aim for; `null` for all |
| `order` | `"a_to_z"` \| `"z_to_a"` \| `"recently_added"` | library order | sort order |
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`UploadedSong`](/reference/interfaces/UploadedSong)`[]`.

## Coming from ytmusicapi

This is `get_library_upload_songs` in ytmusicapi. See the [migration guide](/guide/migration).
