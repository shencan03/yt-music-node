---
title: getLibraryPlaylists
summary: "Playlists in your library"
auth: required
order: 1
---

# `getLibraryPlaylists`

<MethodInfo />

Playlists in your library: your own and saved ones, including "Liked music" (`LM`) and "Episodes for later" (`SE`). Each has `playlistId`, `title`, `thumbnails` and, when shown, `count` and `author`.

```ts
const playlists = await ytm.getLibraryPlaylists({ limit: null });
console.log(playlists.map((p) => `${p.title} (${p.count ?? "?"})`));
```

## Reference

```ts
getLibraryPlaylists(options?: { limit?: number | null }): Promise<LibraryPlaylist[]>
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `limit` | `number \| null` | `25` | items to aim for; `null` for all |
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`LibraryPlaylist`](/reference/interfaces/LibraryPlaylist)`[]`.

## Coming from ytmusicapi

This is `get_library_playlists` in ytmusicapi. See the [migration guide](/guide/migration).
