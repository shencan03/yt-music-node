---
title: addHistoryItem
summary: "Add a song to your play history"
auth: required
write: true
order: 14
---

# `addHistoryItem`

<MethodInfo />

Records a play in your history. Pass the result of [`getSong`](/api/browsing/getSong), fetched with the **same client**. Returns the HTTP response: status `204` means success.

```ts
const song = await ytm.getSong("hpSrLjc5SMs");
const response = await ytm.addHistoryItem(song);
console.log(response.status); // 204
```

## Reference

```ts
addHistoryItem(song: { playbackTracking: unknown }, options?: CallOptions): Promise<HttpResponse>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `song` | `{ playbackTracking: unknown }` | yes | the result of `getSong(videoId)`; its `playbackTracking` is used |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`HttpResponse`](/reference/interfaces/HttpResponse).

## Coming from ytmusicapi

This is `add_history_item` in ytmusicapi. See the [migration guide](/guide/migration).
