---
title: joinCollaborativePlaylist
summary: "Join a collaborative playlist"
auth: required
write: true
order: 9
---

# `joinCollaborativePlaylist`

<MethodInfo />

Joins a collaborative playlist with the token from its invite link: the `jct` parameter in `…/playlist?list=PL…&jct=…`.

```ts
const link = new URL("https://music.youtube.com/playlist?list=PLxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx&jct=abc123");
await ytm.joinCollaborativePlaylist(link.searchParams.get("list")!, link.searchParams.get("jct")!);
```

::: info Not tested live
This method is tested against a fake server only, because a live test needs a second account.
:::

## Reference

```ts
joinCollaborativePlaylist(playlistId: string, joinCollaborationToken: string, options?: CallOptions): Promise<WriteStatus>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `playlistId` | `string` | yes | the playlist id. A `VL` prefix is stripped. |
| `joinCollaborationToken` | `string` | yes | the token from the invite link |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`WriteStatus`](/reference/type-aliases/WriteStatus).

## Coming from ytmusicapi

This is `join_collaborative_playlist` in ytmusicapi. See the [migration guide](/guide/migration).
