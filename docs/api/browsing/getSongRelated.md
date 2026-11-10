---
title: getSongRelated
summary: "Related content for a song"
auth: none
order: 10
---

# `getSongRelated`

<MethodInfo />

The "Related" tab of the player: shelves such as "You might also like", "Recommended playlists" and "Similar artists". Pass the `related` browseId from [`getWatchPlaylist`](/api/watch/getWatchPlaylist).

```ts
const watch = await ytm.getWatchPlaylist({ videoId: "hpSrLjc5SMs", limit: 1 });
const related = await ytm.getSongRelated(watch.related!);
console.log(related.map((shelf) => shelf.title));
```

## Reference

```ts
getSongRelated(browseId: string, options?: CallOptions): Promise<HomeSection[]>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `browseId` | `string` | yes | the `related` id (`MPTRt_…`) from `getWatchPlaylist` |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`HomeSection`](/reference/interfaces/HomeSection)`[]`.

## Example output

<details class="example"><summary>Example output</summary>

<<< @/examples/song-related.json

</details>

## Coming from ytmusicapi

This is `get_song_related` in ytmusicapi. See the [migration guide](/guide/migration).
