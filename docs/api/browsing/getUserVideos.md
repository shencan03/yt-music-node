---
title: getUserVideos
summary: "All videos of a user"
auth: none
order: 6
---

# `getUserVideos`

<MethodInfo />

All videos of a user. Pass the `browseId` and `params` of the user's `videos` section. Returns `[]` when the user has none.

```ts
const user = await ytm.getUser("UC44hbeRoCZVVMVg5z0FfIww");
if (user.videos?.browseId && user.videos.params) {
  const videos = await ytm.getUserVideos(user.videos.browseId, user.videos.params);
  console.log(videos.map((v) => `${v.title} (${v.views})`));
}
```

## Reference

```ts
getUserVideos(channelId: string, params: string, options?: CallOptions): Promise<VideoSummary[]>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `channelId` | `string` | yes | the section's `browseId`, from `getUser(…).videos` |
| `params` | `string` | yes | the `params` of the section, from the page that lists it |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`VideoSummary`](/reference/interfaces/VideoSummary)`[]`.

## Coming from ytmusicapi

This is `get_user_videos` in ytmusicapi. See the [migration guide](/guide/migration).
