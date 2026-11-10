---
title: getLikedSongs
summary: "Your liked songs"
auth: required
order: 2
---

# `getLikedSongs`

<MethodInfo />

Your "Liked music" playlist (`LM`), as a `Playlist`. `limit` defaults to `100`; pass `null` for everything.

```ts
const liked = await ytm.getLikedSongs({ limit: null });
console.log(`${liked.tracks.length} liked songs`);
```

## Reference

```ts
getLikedSongs(options?: { limit?: number | null }): Promise<Playlist>
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `limit` | `number \| null` | `100` | tracks to aim for; `null` for all |
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`Playlist`](/reference/interfaces/Playlist).

## Coming from ytmusicapi

This is `get_liked_songs` in ytmusicapi. See the [migration guide](/guide/migration).
