# Playlists

Reading any public playlist works signed out. Creating and editing needs auth, and editing only works on playlists you own (or collaborate on).

## `getPlaylist`

<MethodInfo name="getPlaylist" auth="optional" />

```ts
getPlaylist(playlistId: string, options?: GetPlaylistOptions): Promise<Playlist>
```

A playlist and its tracks. Takes any playlist id: `PL…`, `RDCLAK…`, album playlists (`OLAK5uy_…`), chart playlists, and `VL`-prefixed browse ids.

| Option | Type | Default | Description |
|---|---|---|---|
| `limit` | `number \| null` | `100` | tracks to aim for; `null` for all |
| `related` | `boolean` | `false` | also fetch related playlists (`related`) |
| `suggestionsLimit` | `number` | `0` | for your own playlists: how many suggested songs to fetch (`suggestions`, 7 per request) |

| Result key | Description |
|---|---|
| `id`, `title`, `description`, `thumbnails`, `author`, `year`, `privacy` | header |
| `owned` | `true` for your own playlists. Their tracks then have `setVideoId`s for editing. |
| `views` | view count as a number (`2500000`, not `"2.5M"`) |
| `trackCount`, `duration`, `duration_seconds` | totals. `duration_seconds` sums the tracks fetched. |
| `tracks` | songs with `videoId`, `title`, `artists`, `album`, `duration`, `likeStatus`, `inLibrary`, `isAvailable`, `feedbackTokens` and, when owned, `setVideoId` |
| `collaborators` | for collaborative playlists |
| `related`, `suggestions` | when requested |

```ts
const playlist = await ytm.getPlaylist("PLQwVIlKxHM6qv-o99iX9R85og7IzF9YS_", { limit: null });
console.log(`${playlist.title}: ${playlist.tracks.length} of ${playlist.trackCount} tracks, ${playlist.duration}`);
```

<details class="example"><summary>Example output: <code>getPlaylist("PLQwVIlKxHM6qv-o99iX9R85og7IzF9YS_", { limit: 5 })</code></summary>

<<< @/examples/playlist.json

</details>

## `getLikedSongs`

<MethodInfo name="getLikedSongs" auth="required" />

```ts
getLikedSongs(options?: { limit?: number | null }): Promise<Playlist>
```

Your "Liked music" playlist (`LM`), as a `Playlist`. `limit` defaults to `100`; pass `null` for everything.

```ts
const liked = await ytm.getLikedSongs({ limit: null });
console.log(`${liked.tracks.length} liked songs`);
```

## `getSavedEpisodes`

<MethodInfo name="getSavedEpisodes" auth="required" />

```ts
getSavedEpisodes(options?: { limit?: number | null }): Promise<Playlist>
```

Your "Episodes for later" (`SE`), as a `Playlist`. `limit` defaults to `100`.

## `createPlaylist`

<MethodInfo name="createPlaylist" auth="required" write />

```ts
createPlaylist(title: string, description: string, options?: CreatePlaylistOptions): Promise<string | JsonObject>
```

Creates a playlist and returns its id.

| Option | Type | Default | Description |
|---|---|---|---|
| `privacyStatus` | `"PUBLIC"` \| `"PRIVATE"` \| `"UNLISTED"` | `"PRIVATE"` | who can see it |
| `videoIds` | `string[]` | – | songs to add |
| `sourcePlaylist` | `string` | – | a playlist to copy all items from |

```ts
const id = await ytm.createPlaylist("Road trip", "Songs for the drive", {
  privacyStatus: "UNLISTED",
  videoIds: ["hpSrLjc5SMs", "9mWr4c_ig54"],
});
```

HTML tags in the description are stripped (YouTube rejects them). **Throws** `YTMusicUserError` when the title contains `<` or `>`, and `YTMusicGatedError` when YouTube refuses to create it. If YouTube's response has no playlist id, the whole response is returned.

::: tip New playlists need a moment
Right after creation, `getPlaylist` can briefly return a playlist without contents. Wait a second or two before reading it back.
:::

## `editPlaylist`

<MethodInfo name="editPlaylist" auth="required" write />

```ts
editPlaylist(playlistId: string, options: EditPlaylistOptions): Promise<WriteStatus | { status: string; joinCollaborationToken: string | null }>
```

Changes a playlist you own. Pass only the options you want to change. They are applied in one request.

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

## `deletePlaylist`

<MethodInfo name="deletePlaylist" auth="required" write />

```ts
deletePlaylist(playlistId: string, options?: CallOptions): Promise<WriteStatus>
```

Deletes a playlist you own. Returns `"STATUS_SUCCEEDED"`.

## `addPlaylistItems`

<MethodInfo name="addPlaylistItems" auth="required" write />

```ts
addPlaylistItems(playlistId: string, options: AddPlaylistItemsOptions): Promise<AddPlaylistItemsResult | JsonObject>
```

Adds songs, or all items of another playlist, to a playlist you own.

| Option | Type | Default | Description |
|---|---|---|---|
| `videoIds` | `string[]` | – | songs to add |
| `sourcePlaylist` | `string` | – | add every item of this playlist |
| `duplicates` | `boolean` | `false` | allow songs that are already in the playlist |

On success, it returns `{ status: "STATUS_SUCCEEDED", playlistEditResults }`, where `playlistEditResults` maps each added `videoId` to its new `setVideoId`. You can use those to move or remove the items right away.

```ts
const result = await ytm.addPlaylistItems("PLxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", {
  videoIds: ["hpSrLjc5SMs"],
});
if ("playlistEditResults" in result) console.log(result.playlistEditResults);
```

**Throws** `YTMusicUserError` without `videoIds` or `sourcePlaylist`, or when `videoIds` repeats an id while `duplicates` is `false`. YouTube answered `STATUS_FAILED` in the live tests when `sourcePlaylist` overlapped the target. Use `videoIds` in that case.

## `removePlaylistItems`

<MethodInfo name="removePlaylistItems" auth="required" write />

```ts
removePlaylistItems(playlistId: string, videos: { videoId?: string | null; setVideoId?: string | null }[], options?: CallOptions): Promise<WriteStatus>
```

Removes items from a playlist you own. Pass tracks from `getPlaylist`: each needs its `videoId` and `setVideoId`, so one occurrence of a song can be removed while others stay.

```ts
const playlistId = "PLxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
const playlist = await ytm.getPlaylist(playlistId);
const toRemove = playlist.tracks.filter((t) => t.isAvailable === false);
if (toRemove.length > 0) await ytm.removePlaylistItems(playlistId, toRemove);
```

**Throws** `YTMusicUserError` when no item has a `setVideoId`, which usually means the playlist isn't yours.

## `joinCollaborativePlaylist`

<MethodInfo name="joinCollaborativePlaylist" auth="required" write />

```ts
joinCollaborativePlaylist(playlistId: string, joinCollaborationToken: string, options?: CallOptions): Promise<WriteStatus>
```

Joins a collaborative playlist with the token from its invite link: the `jct` parameter in `…/playlist?list=PL…&jct=…`.

```ts
const link = new URL("https://music.youtube.com/playlist?list=PLxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx&jct=abc123");
await ytm.joinCollaborativePlaylist(link.searchParams.get("list")!, link.searchParams.get("jct")!);
```

Tested against a fake server only, because a live test needs a second account.

## `ratePlaylist`

Saving a playlist or album to your library is a rating. See [`ratePlaylist`](/api/library#rateplaylist).
