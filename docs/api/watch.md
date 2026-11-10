# Watch playlists

## `getWatchPlaylist`

<MethodInfo name="getWatchPlaylist" auth="optional" />

```ts
getWatchPlaylist(options: WatchPlaylistOptions): Promise<WatchPlaylist>
```

The "Up next" queue for a song, a playlist, or a song within a playlist, as the player shows it. It also returns the `browseId`s for the song's lyrics and related content, which makes it the starting point for [`getLyrics`](/api/browsing#getlyrics) and [`getSongRelated`](/api/browsing#getsongrelated).

| Option | Type | Default | Description |
|---|---|---|---|
| `videoId` | `string` | – | the song to start with |
| `playlistId` | `string` | – | the playlist to play: a playlist id, an album's `audioPlaylistId`, a radio id. `VL` prefixes are stripped. |
| `limit` | `number` | `25` | minimum number of tracks; more pages are fetched until it's reached |
| `radio` | `boolean` | `false` | a radio based on the song or playlist (different on every call) |
| `shuffle` | `boolean` | `false` | shuffle the playlist (needs `playlistId`) |
| `signal` | `AbortSignal` | – | cancels the call |

Pass `videoId`, `playlistId` or both.

| Result key | Description |
|---|---|
| `tracks` | the queue: `videoId`, `title`, `length`, `artists`, `album`, `year`, `likeStatus`, `inLibrary`, `videoType`, `feedbackTokens`, `thumbnail`, and `counterpart` (the matching music video or audio track, when there is one) |
| `playlistId` | the id of the queue, e.g. `RDAMVM…` for a song's radio |
| `lyrics` | browseId for `getLyrics`, or `null` |
| `related` | browseId for `getSongRelated`, or `null` |

```ts
const queue = await ytm.getWatchPlaylist({ videoId: "hpSrLjc5SMs", limit: 10 });
console.log(queue.tracks.map((t) => `${t.title} (${t.length})`));

// an album, shuffled
const album = await ytm.getAlbum("MPREb_4pL8gzRtw1p");
const shuffled = await ytm.getWatchPlaylist({ playlistId: album.audioPlaylistId!, shuffle: true });

// a radio from a song
const radio = await ytm.getWatchPlaylist({ videoId: "hpSrLjc5SMs", radio: true, limit: 50 });
```

<details class="example"><summary>Example output: <code>getWatchPlaylist({ videoId: "hpSrLjc5SMs", limit: 5 })</code></summary>

<<< @/examples/watch-playlist.json

</details>

::: info Likes only
`likeStatus` in watch tracks is `LIKE` or `INDIFFERENT`. A disliked song shows as `INDIFFERENT` here, because the queue's menu only toggles likes.
:::

**Throws** `YTMusicUserError` when neither `videoId` nor `playlistId` is given, and `YTMusicServerError` ("No content returned by the server") when the queue is empty, which usually means a private playlist you can't access.
