---
title: getChannel
summary: "A podcast channel"
auth: none
order: 1
---

# `getChannel`

<MethodInfo />

A podcast channel page: `title`, `thumbnails`, and `episodes` and `podcasts` sections.

```ts
const channel = await ytm.getChannel("UCGwuxdEeCf0TIA2RbPOj-8g");
console.log(channel.title, channel.podcasts?.results.map((p) => p.title));
```

## Reference

```ts
getChannel(channelId: string, options?: CallOptions): Promise<Channel>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `channelId` | `string` | yes | the podcast channel id (`UC…`) |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`Channel`](/reference/interfaces/Channel).

## Example output

<details class="example"><summary>Example output</summary>

<<< @/examples/channel.json

</details>

## Coming from ytmusicapi

This is `get_channel` in ytmusicapi. See the [migration guide](/guide/migration).
