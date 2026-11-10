---
title: deletePlaylist
summary: "Delete a playlist"
auth: required
write: true
order: 6
---

# `deletePlaylist`

<MethodInfo />

Deletes a playlist you own. Returns `"STATUS_SUCCEEDED"`.

```ts
const id = await ytm.createPlaylist("Scratch", "");
if (typeof id === "string") console.log(await ytm.deletePlaylist(id)); // "STATUS_SUCCEEDED"
```

## Reference

```ts
deletePlaylist(playlistId: string, options?: CallOptions): Promise<WriteStatus>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `playlistId` | `string` | yes | the playlist id. A `VL` prefix is stripped. |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`WriteStatus`](/reference/type-aliases/WriteStatus).

## Coming from ytmusicapi

This is `delete_playlist` in ytmusicapi. See the [migration guide](/guide/migration).
