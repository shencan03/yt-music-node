---
title: rateSong
summary: "Like or dislike a song"
auth: required
write: true
order: 8
---

# `rateSong`

<MethodInfo />

Likes (`"LIKE"`) or dislikes (`"DISLIKE"`) a song, or removes the rating (`"INDIFFERENT"`, the default). Liking a song adds it to "Liked music".

```ts
await ytm.rateSong("hpSrLjc5SMs", "LIKE");
await ytm.rateSong("hpSrLjc5SMs", "INDIFFERENT"); // undo
```

## Reference

```ts
rateSong(videoId: string, rating?: LikeStatus, options?: CallOptions): Promise<any>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `videoId` | `string` | yes | the song, video or episode id (11 characters) |
| `rating` | `LikeStatus` | no | `"LIKE"`, `"DISLIKE"` or `"INDIFFERENT"` (removes the rating). Default `"INDIFFERENT"`. |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of YouTube's raw response, typed `any`. When YouTube refuses the change, the method throws [`YTMusicGatedError`](/guide/errors#ytmusicgatederror) instead, so you don't need to inspect it.

### Errors

Throws `YTMusicUserError` for an invalid rating.

## Coming from ytmusicapi

This is `rate_song` in ytmusicapi. See the [migration guide](/guide/migration).
