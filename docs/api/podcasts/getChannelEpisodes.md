---
title: getChannelEpisodes
summary: "All episodes of a channel"
auth: none
order: 2
---

# `getChannelEpisodes`

<MethodInfo />

All episodes of a channel. Pass the channel id and the `params` of the channel's `episodes` section.

```ts
const channelId = "UCGwuxdEeCf0TIA2RbPOj-8g";
const channel = await ytm.getChannel(channelId);
const episodes = await ytm.getChannelEpisodes(channelId, channel.episodes!.params!);
```

## Reference

```ts
getChannelEpisodes(channelId: string, params: string, options?: CallOptions): Promise<EpisodeSummary[]>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `channelId` | `string` | yes | the podcast channel id (`UC…`) |
| `params` | `string` | yes | the `params` of the section, from the page that lists it |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`EpisodeSummary`](/reference/interfaces/EpisodeSummary)`[]`.

## Coming from ytmusicapi

This is `get_channel_episodes` in ytmusicapi. See the [migration guide](/guide/migration).
