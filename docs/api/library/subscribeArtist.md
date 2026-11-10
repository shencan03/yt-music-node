---
title: subscribeArtist
summary: "Subscribe to an artist"
auth: required
write: true
order: 11
---

# `subscribeArtist`

<MethodInfo />

Subscribes to an artist. Use the artist's `channelId` (from `getArtist`).

```ts
const artist = await ytm.getArtist("UCmMUZbaYdNH0bEd1PAlAqsA");
if (!artist.subscribed) await ytm.subscribeArtist(artist.channelId);
```

## Reference

```ts
subscribeArtist(channelId: string, options?: CallOptions): Promise<any>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `channelId` | `string` | yes | the artist's `channelId` from `getArtist` |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of YouTube's raw response, typed `any`. It isn't checked for success.

## Coming from ytmusicapi

This is `subscribe_artist` in ytmusicapi. See the [migration guide](/guide/migration).
