---
title: getEpisode
summary: "One podcast episode"
auth: optional
order: 4
---

# `getEpisode`

<MethodInfo />

One episode: title, author, date, duration, `progressPercentage` (how much you've listened to, when signed in), `saved`, and the description as text and runs (with links and timestamps). The `MPED` prefix of the id is optional.

```ts
const episode = await ytm.getEpisode("KNkyHCLOr1o");
console.log(episode.title, episode.duration);
console.log(episode.description?.text);
```

To play an episode, pass its `videoId` to [`getWatchPlaylist`](/api/watch/getWatchPlaylist) or [`getSong`](/api/browsing/getSong).

## Reference

```ts
getEpisode(videoId: string, options?: CallOptions): Promise<Episode>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `videoId` | `string` | yes | the song, video or episode id (11 characters) |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`Episode`](/reference/interfaces/Episode).

## Example output

<details class="example"><summary>Example output</summary>

<<< @/examples/episode.json

</details>

## Coming from ytmusicapi

This is `get_episode` in ytmusicapi. See the [migration guide](/guide/migration).
