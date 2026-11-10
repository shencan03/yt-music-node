# Library & account

Everything here needs auth.

## Library listings

All listings take the same options:

| Option | Type | Default | Description |
|---|---|---|---|
| `limit` | `number \| null` | `25` | items to aim for; `null` for all |
| `order` | `"a_to_z"` \| `"z_to_a"` \| `"recently_added"` | library order | sort order (not for `getLibraryPlaylists`) |

An empty library section returns `[]`.

## `getLibraryPlaylists`

<MethodInfo name="getLibraryPlaylists" auth="required" />

```ts
getLibraryPlaylists(options?: { limit?: number | null }): Promise<LibraryPlaylist[]>
```

Playlists in your library: your own and saved ones, including "Liked music" (`LM`) and "Episodes for later" (`SE`). Each has `playlistId`, `title`, `thumbnails` and, when shown, `count` and `author`.

```ts
const playlists = await ytm.getLibraryPlaylists({ limit: null });
console.log(playlists.map((p) => `${p.title} (${p.count ?? "?"})`));
```

## `getLibrarySongs`

<MethodInfo name="getLibrarySongs" auth="required" />

```ts
getLibrarySongs(options?: LibrarySongsOptions): Promise<PlaylistItem[]>
```

Songs in your library. Takes the [listing options](#library-listings) plus:

| Option | Type | Default | Description |
|---|---|---|---|
| `validateResponses` | `boolean` | `false` | re-request pages that come back short. YouTube occasionally returns incomplete pages. This is slower but more reliable for full exports. |

```ts
const songs = await ytm.getLibrarySongs({ limit: null, order: "recently_added", validateResponses: true });
```

## `getLibraryAlbums`

<MethodInfo name="getLibraryAlbums" auth="required" />

```ts
getLibraryAlbums(options?: LibraryOptions): Promise<AlbumSummary[]>
```

Albums in your library, with `browseId`, `title`, `artists`, `year`, `type` and `thumbnails`.

## `getLibraryArtists`

<MethodInfo name="getLibraryArtists" auth="required" />

```ts
getLibraryArtists(options?: LibraryOptions): Promise<LibraryArtist[]>
```

Artists of the songs in your library, with `browseId`, `artist` (the name), `songs` (count text) and `thumbnails`.

## `getLibrarySubscriptions`

<MethodInfo name="getLibrarySubscriptions" auth="required" />

```ts
getLibrarySubscriptions(options?: LibraryOptions): Promise<LibraryArtist[]>
```

Artists you subscribe to, with `subscribers` (count text).

## `getLibraryPodcasts`

<MethodInfo name="getLibraryPodcasts" auth="required" />

```ts
getLibraryPodcasts(options?: LibraryOptions): Promise<PodcastSummary[]>
```

Podcasts in your library. For new episodes of the podcasts you follow, see [`getEpisodesPlaylist`](/api/podcasts#getepisodesplaylist).

## `getLibraryChannels`

<MethodInfo name="getLibraryChannels" auth="required" />

```ts
getLibraryChannels(options?: LibraryOptions): Promise<LibraryArtist[]>
```

Podcast channels you subscribe to.

## `rateSong`

<MethodInfo name="rateSong" auth="required" write />

```ts
rateSong(videoId: string, rating?: LikeStatus, options?: CallOptions): Promise<any>
```

Likes (`"LIKE"`) or dislikes (`"DISLIKE"`) a song, or removes the rating (`"INDIFFERENT"`, the default). Liking a song adds it to "Liked music".

```ts
await ytm.rateSong("hpSrLjc5SMs", "LIKE");
await ytm.rateSong("hpSrLjc5SMs", "INDIFFERENT"); // undo
```

Returns YouTube's response. **Throws** `YTMusicUserError` for an invalid rating, and `YTMusicGatedError` when YouTube refuses.

## `ratePlaylist`

<MethodInfo name="ratePlaylist" auth="required" write />

```ts
ratePlaylist(playlistId: string, rating?: LikeStatus, options?: CallOptions): Promise<any>
```

`"LIKE"` saves a playlist or album to your library, `"INDIFFERENT"` removes it. For albums, pass the `audioPlaylistId`.

```ts
const album = await ytm.getAlbum("MPREb_4pL8gzRtw1p");
await ytm.ratePlaylist(album.audioPlaylistId!, "LIKE"); // save the album
```

## `editSongLibraryStatus`

<MethodInfo name="editSongLibraryStatus" auth="required" write />

```ts
editSongLibraryStatus(feedbackTokens: string[], options?: CallOptions): Promise<any>
```

Adds songs to your library, or removes them, without liking them. Tracks from albums, playlists and library listings have `feedbackTokens: { add, remove }`. Pass `add` tokens to add and `remove` tokens to remove.

```ts
const album = await ytm.getAlbum("MPREb_4pL8gzRtw1p");
const tokens = album.tracks.map((t) => t.feedbackTokens?.add).filter((t): t is string => Boolean(t));
await ytm.editSongLibraryStatus(tokens); // add the whole album to the library
```

## `subscribeArtist`

<MethodInfo name="subscribeArtist" auth="required" write />

```ts
subscribeArtist(channelId: string, options?: CallOptions): Promise<any>
```

Subscribes to an artist. Use the artist's `channelId` (from `getArtist`).

## `unsubscribeArtists`

<MethodInfo name="unsubscribeArtists" auth="required" write />

```ts
unsubscribeArtists(channelIds: string[], options?: CallOptions): Promise<any>
```

Unsubscribes from one or more artists.

## `getHistory`

<MethodInfo name="getHistory" auth="required" />

```ts
getHistory(options?: CallOptions): Promise<HistoryItem[]>
```

Your play history, newest first. Each item is a track plus `played` (the group it's in, e.g. `"Today"`, `"Yesterday"`) and the `feedbackToken` to remove it.

```ts
const history = await ytm.getHistory();
for (const item of history.slice(0, 10)) console.log(item.played, item.title);
```

## `addHistoryItem`

<MethodInfo name="addHistoryItem" auth="required" write />

```ts
addHistoryItem(song: { playbackTracking: unknown }, options?: CallOptions): Promise<HttpResponse>
```

Records a play in your history. Pass the result of [`getSong`](/api/browsing#getsong), fetched with the **same client**. Returns the HTTP response: status `204` means success.

```ts
const song = await ytm.getSong("hpSrLjc5SMs");
const response = await ytm.addHistoryItem(song);
console.log(response.status); // 204
```

## `removeHistoryItems`

<MethodInfo name="removeHistoryItems" auth="required" write />

```ts
removeHistoryItems(feedbackTokens: string[], options?: CallOptions): Promise<any>
```

Removes entries from your history, using their `feedbackToken`s from `getHistory`. Doesn't work for brand accounts.

```ts
const history = await ytm.getHistory();
const today = history.filter((h) => h.played === "Today" && h.feedbackToken).map((h) => h.feedbackToken!);
await ytm.removeHistoryItems(today);
```

## `getAccountInfo`

<MethodInfo name="getAccountInfo" auth="required" />

```ts
getAccountInfo(options?: CallOptions): Promise<AccountInfo>
```

The signed-in account: `accountName`, `channelHandle` (e.g. `"@name"`, or `null`) and `accountPhotoUrl`. [`npx yt-music-node verify`](/guide/cli#verify) uses this to check a session.

```ts
const { accountName, channelHandle } = await ytm.getAccountInfo();
```
