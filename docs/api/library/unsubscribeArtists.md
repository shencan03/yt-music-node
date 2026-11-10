---
title: unsubscribeArtists
summary: "Unsubscribe from artists"
auth: required
write: true
order: 12
---

# `unsubscribeArtists`

<MethodInfo />

Unsubscribes from one or more artists.

```ts
await ytm.unsubscribeArtists(["UCmMUZbaYdNH0bEd1PAlAqsA"]);
```

## Reference

```ts
unsubscribeArtists(channelIds: string[], options?: CallOptions): Promise<any>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `channelIds` | `string[]` | yes | channel ids of the artists |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of YouTube's raw response, typed `any`. It isn't checked for success.

## Coming from ytmusicapi

This is `unsubscribe_artists` in ytmusicapi. See the [migration guide](/guide/migration).
