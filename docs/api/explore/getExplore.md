---
title: getExplore
summary: "New releases, trending and moods"
auth: none
order: 1
---

# `getExplore`

<MethodInfo />

The Explore page: new releases, trending songs, moods and genres. Which sections exist depends on your location (see [Returns](#returns)).

```ts
const explore = await ytm.getExplore();
console.log(explore.new_releases?.map((a) => a.title));
console.log(explore.trending?.items.slice(0, 5).map((t) => `${t.rank}. ${t.title}`));
```

## Reference

```ts
getExplore(options?: CallOptions): Promise<Explore>
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`Explore`](/reference/interfaces/Explore).

| Key | Contents |
|---|---|
| `new_releases` | new albums and singles |
| `moods_and_genres` | categories, with `params` for [`getMoodPlaylists`](/api/explore/getMoodPlaylists) |
| `top_songs` | `{ playlist, items }`: the top songs chart (not in every country) |
| `trending` | `{ playlist, items }`: trending songs and videos, each with `rank` and `trend` |
| `new_videos` | new music videos |
| `top_episodes` | top podcast episodes (some countries) |

## Example output

<details class="example"><summary>Example output</summary>

<<< @/examples/explore.json

</details>

## Coming from ytmusicapi

This is `get_explore` in ytmusicapi. See the [migration guide](/guide/migration).
