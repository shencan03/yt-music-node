---
title: getUserPlaylists
summary: "All playlists of a user"
auth: none
order: 5
---

# `getUserPlaylists`

<MethodInfo />

All playlists of a user. Pass the `browseId` and `params` of the user's `playlists` section. Returns `[]` when the user has none.

```ts
const user = await ytm.getUser("UC44hbeRoCZVVMVg5z0FfIww");
if (user.playlists?.params) {
  const all = await ytm.getUserPlaylists(user.playlists.browseId!, user.playlists.params);
}
```

## Reference

```ts
getUserPlaylists(channelId: string, params: string, options?: CallOptions): Promise<PlaylistSummary[]>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `channelId` | `string` | yes | the section's `browseId`, from `getUser(…).playlists` |
| `params` | `string` | yes | the `params` of the section, from the page that lists it |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`PlaylistSummary`](/reference/interfaces/PlaylistSummary)`[]`.

## Coming from ytmusicapi

This is `get_user_playlists` in ytmusicapi. See the [migration guide](/guide/migration).
