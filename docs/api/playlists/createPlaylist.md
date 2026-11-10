---
title: createPlaylist
summary: "Create a playlist"
auth: required
write: true
order: 4
---

# `createPlaylist`

<MethodInfo />

Creates a playlist and returns its id.

```ts
const id = await ytm.createPlaylist("Road trip", "Songs for the drive", {
  privacyStatus: "UNLISTED",
  videoIds: ["hpSrLjc5SMs", "9mWr4c_ig54"],
});
```

HTML tags in the description are stripped (YouTube rejects them).

::: tip New playlists need a moment
Right after creation, `getPlaylist` can briefly return a playlist without contents. Wait a second or two before reading it back.
:::

## Reference

```ts
createPlaylist(title: string, description: string, options?: CreatePlaylistOptions): Promise<string | JsonObject>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `title` | `string` | yes | the playlist title |
| `description` | `string` | yes | the playlist description; `""` for none |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `privacyStatus` | `"PUBLIC"` \| `"PRIVATE"` \| `"UNLISTED"` | `"PRIVATE"` | who can see it |
| `videoIds` | `string[]` | – | songs to add |
| `sourcePlaylist` | `string` | – | a playlist to copy all items from |
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of the new playlist's id (`string`). If YouTube's response has no playlist id, the whole response ([`JsonObject`](/reference/interfaces/JsonObject)) is returned instead.

### Errors

Throws `YTMusicUserError` when the title contains `<` or `>`, and `YTMusicGatedError` when YouTube refuses to create it.

## Coming from ytmusicapi

This is `create_playlist` in ytmusicapi. See the [migration guide](/guide/migration).
