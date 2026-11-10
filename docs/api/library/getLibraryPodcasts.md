---
title: getLibraryPodcasts
summary: "Podcasts in your library"
auth: required
order: 6
---

# `getLibraryPodcasts`

<MethodInfo />

Podcasts in your library. For new episodes of the podcasts you follow, see [`getEpisodesPlaylist`](/api/podcasts/getEpisodesPlaylist).

```ts
const podcasts = await ytm.getLibraryPodcasts({ limit: null });
console.log(podcasts.map((p) => `${p.title} by ${p.channel.name}`));
```

## Reference

```ts
getLibraryPodcasts(options?: LibraryOptions): Promise<PodcastSummary[]>
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `limit` | `number \| null` | `25` | items to aim for; `null` for all |
| `order` | `"a_to_z"` \| `"z_to_a"` \| `"recently_added"` | library order | sort order |
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`PodcastSummary`](/reference/interfaces/PodcastSummary)`[]`.

An empty library section returns `[]`.

## Coming from ytmusicapi

This is `get_library_podcasts` in ytmusicapi. See the [migration guide](/guide/migration).
