---
title: editPlaylist
summary: "Rename, reorder, privacy, collaboration"
auth: required
write: true
order: 5
---

# `editPlaylist`

<MethodInfo />

Changes a playlist you own. Pass only the options you want to change. They are applied in one request.

```ts
const playlistId = "PLxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
await ytm.editPlaylist(playlistId, { title: "Road trip 2026", privacyStatus: "PUBLIC" });

// move the last track to the top
const playlist = await ytm.getPlaylist(playlistId);
const last = playlist.tracks.at(-1)!;
const first = playlist.tracks[0]!;
await ytm.editPlaylist(playlistId, { moveItem: [last.setVideoId!, first.setVideoId!] });

// invite collaborators
const result = await ytm.editPlaylist(playlistId, { collaboration: true });
if (typeof result === "object" && "joinCollaborationToken" in result) {
  console.log(`https://music.youtube.com/playlist?list=${playlistId}&jct=${result.joinCollaborationToken}`);
}
```

## Reference

```ts
editPlaylist(playlistId: string, options: EditPlaylistOptions): Promise<WriteStatus | { status: string; joinCollaborationToken: string | null }>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `playlistId` | `string` | yes | the playlist id. A `VL` prefix is stripped. |

### Options

| Option | Type | Description |
|---|---|---|
| `title` | `string` | new title |
| `description` | `string` | new description |
| `privacyStatus` | `"PUBLIC"` \| `"PRIVATE"` \| `"UNLISTED"` | new privacy |
| `moveItem` | `setVideoId` or `[setVideoId, beforeSetVideoId]` | move an item to the end, or before another item |
| `addPlaylistId` | `string` | append all items of another playlist |
| `addToTop` | `boolean` | whether new items go to the top |
| `sortOrder` | `"MANUAL"` \| `"NEWEST_FIRST"` \| `"NEWEST_LAST"` \| `"TOP_VOTED"` | sort order |
| `collaboration` | `boolean` | `true` turns on collaboration and returns the invite token, `false` turns it off |
| `voteOption` | `"EVERYONE_CAN_VOTE"` \| `"COLLABORATORS_ONLY"` \| `"OFF"` | who can vote on items. `COLLABORATORS_ONLY` needs collaboration on. |
| `signal` | `AbortSignal` | cancels the call |

### Returns

A promise of [`WriteStatus`](/reference/type-aliases/WriteStatus)` | { status: string; joinCollaborationToken: string | null }`.

## Coming from ytmusicapi

This is `edit_playlist` in ytmusicapi. See the [migration guide](/guide/migration).
