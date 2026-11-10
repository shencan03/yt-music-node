---
title: getSavedEpisodes
summary: "Your episodes for later"
auth: required
order: 3
---

# `getSavedEpisodes`

<MethodInfo />

Your "Episodes for later" (`SE`), as a `Playlist`. `limit` defaults to `100`.

```ts
const later = await ytm.getSavedEpisodes({ limit: null });
console.log(later.tracks.map((episode) => episode.title));
```

## Reference

```ts
getSavedEpisodes(options?: { limit?: number | null }): Promise<Playlist>
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `limit` | `number \| null` | `100` | episodes to aim for; `null` for all |
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`Playlist`](/reference/interfaces/Playlist).

## Coming from ytmusicapi

This is `get_saved_episodes` in ytmusicapi. See the [migration guide](/guide/migration).
