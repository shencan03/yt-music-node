---
title: getPodcast
summary: "A podcast and its episodes"
auth: optional
order: 3
---

# `getPodcast`

<MethodInfo />

A podcast and its episodes. The `MPSP` prefix of the id is optional. Signed in, `saved` tells whether it's in your library.

```ts
const channel = await ytm.getChannel("UCGwuxdEeCf0TIA2RbPOj-8g");
const podcast = await ytm.getPodcast(channel.podcasts!.results[0]!.podcastId!, { limit: 10 });
for (const episode of podcast.episodes) console.log(episode.date, episode.title, episode.duration);
```

## Reference

```ts
getPodcast(playlistId: string, options?: { limit?: number | null }): Promise<Podcast>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `playlistId` | `string` | yes | the podcast's playlist id (`PL…`), with or without the `MPSP` prefix |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `limit` | `number \| null` | `100` | episodes to aim for; `null` for all |
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`Podcast`](/reference/interfaces/Podcast).

## Example output

<details class="example"><summary>Example output</summary>

<<< @/examples/podcast.json

</details>

## Coming from ytmusicapi

This is `get_podcast` in ytmusicapi. See the [migration guide](/guide/migration).
