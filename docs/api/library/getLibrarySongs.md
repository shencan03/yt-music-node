---
title: getLibrarySongs
summary: "Songs in your library"
auth: required
order: 2
---

# `getLibrarySongs`

<MethodInfo />

Songs in your library.

```ts
const songs = await ytm.getLibrarySongs({ limit: null, order: "recently_added", validateResponses: true });
```

## Reference

```ts
getLibrarySongs(options?: LibrarySongsOptions): Promise<PlaylistItem[]>
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `limit` | `number \| null` | `25` | items to aim for; `null` for all |
| `order` | `"a_to_z"` \| `"z_to_a"` \| `"recently_added"` | library order | sort order |
| `validateResponses` | `boolean` | `false` | re-request pages that come back short. YouTube occasionally returns incomplete pages. This is slower but more reliable for full exports. |
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`PlaylistItem`](/reference/interfaces/PlaylistItem)`[]`.

## Coming from ytmusicapi

This is `get_library_songs` in ytmusicapi. See the [migration guide](/guide/migration).
