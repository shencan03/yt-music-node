# Browsing

Home, artists, albums, songs, lyrics, users and the taste profile.

## `getHome`

<MethodInfo name="getHome" auth="optional" />

```ts
getHome(options?: { limit?: number }): Promise<HomeSection[]>
```

The home page as rows ("shelves"), each with a `title` and mixed `contents`: songs, albums, playlists, artists, videos, episodes. Signed in, the rows are personalized ("Listen again", "Quick picks", "Mixed for you").

| Option | Type | Default | Description |
|---|---|---|---|
| `limit` | `number` | `3` | rows to aim for. The first page has about 3 rows; more are fetched until `limit` is reached. |

```ts
for (const row of await ytm.getHome({ limit: 6 })) {
  console.log(row.title, Array.isArray(row.contents) ? row.contents.length : "");
}
```

<details class="example"><summary>Example output (signed out)</summary>

<<< @/examples/home.json

</details>

## `getArtist`

<MethodInfo name="getArtist" auth="optional" />

```ts
getArtist(channelId: string, options?: CallOptions): Promise<Artist>
```

An artist's page: name, description, subscribers, top songs and sections of albums, singles, videos, related artists, and, for some artists, episodes and podcasts. Signed in, `subscribed` reflects your subscription. `MPLA`-prefixed ids work too.

| Result key | Description |
|---|---|
| `name`, `description`, `views`, `subscribers`, `monthlyListeners`, `thumbnails` | page header |
| `channelId`, `shuffleId`, `radioId` | ids for `subscribeArtist`, and for `getWatchPlaylist({ playlistId })` (shuffle or radio of the artist) |
| `songs` | top songs. `songs.browseId` is a playlist of all songs (pass it to `getPlaylist`) |
| `albums`, `singles`, `shows`, `videos`, `playlists`, `related`, `episodes`, `podcasts` | [sections](/guide/concepts#following-a-section-to-its-full-list). `results` holds the items shown, and `browseId` + `params` lead to the full list |
| `subscribed` | whether you are subscribed (`false` when signed out) |

```ts
const artist = await ytm.getArtist("UCmMUZbaYdNH0bEd1PAlAqsA");
console.log(artist.name, artist.subscribers, artist.monthlyListeners);
console.log(artist.songs.results?.map((s) => s.title));

// play the artist's radio
const radio = await ytm.getWatchPlaylist({ playlistId: artist.radioId! });
```

<details class="example"><summary>Example output: <code>getArtist("UCmMUZbaYdNH0bEd1PAlAqsA")</code> (Oasis)</summary>

<<< @/examples/artist.json

</details>

## `getArtistAlbums`

<MethodInfo name="getArtistAlbums" auth="none" />

```ts
getArtistAlbums(channelId: string, params: string, options?: ArtistAlbumsOptions): Promise<AlbumSummary[]>
```

Every album, single or show of an artist. Pass the `browseId` and `params` of the artist's `albums`, `singles` or `shows` section.

| Option | Type | Default | Description |
|---|---|---|---|
| `limit` | `number \| null` | `100` | albums to aim for; `null` for all |
| `order` | `"Recency"` \| `"Popularity"` \| `"Alphabetical order"` | page order | sort order |

```ts
const artist = await ytm.getArtist("UCmMUZbaYdNH0bEd1PAlAqsA");
const { browseId, params } = artist.albums!;
const albums = await ytm.getArtistAlbums(browseId!, params!, { order: "Recency", limit: null });
```

<details class="example"><summary>Example output</summary>

<<< @/examples/artist-albums.json

</details>

Results have no `artists` key: they all belong to the artist you asked for. **Throws** `YTMusicUserError` for an unknown `order`.

## `getUser`

<MethodInfo name="getUser" auth="none" />

```ts
getUser(channelId: string, options?: CallOptions): Promise<User>
```

A user's channel page: `name`, and `playlists` and `videos` sections.

```ts
const user = await ytm.getUser("UC44hbeRoCZVVMVg5z0FfIww");
console.log(user.name, user.playlists?.results.map((p) => p.title));
```

<details class="example"><summary>Example output</summary>

<<< @/examples/user.json

</details>

## `getUserPlaylists`

<MethodInfo name="getUserPlaylists" auth="none" />

```ts
getUserPlaylists(channelId: string, params: string, options?: CallOptions): Promise<PlaylistSummary[]>
```

All playlists of a user. Pass the `browseId` and `params` of the user's `playlists` section. Returns `[]` when the user has none.

```ts
const user = await ytm.getUser("UC44hbeRoCZVVMVg5z0FfIww");
if (user.playlists?.params) {
  const all = await ytm.getUserPlaylists(user.playlists.browseId!, user.playlists.params);
}
```

## `getUserVideos`

<MethodInfo name="getUserVideos" auth="none" />

```ts
getUserVideos(channelId: string, params: string, options?: CallOptions): Promise<VideoSummary[]>
```

All videos of a user. Pass the `browseId` and `params` of the user's `videos` section. Returns `[]` when the user has none.

## `getAlbum`

<MethodInfo name="getAlbum" auth="optional" />

```ts
getAlbum(browseId: string, options?: CallOptions): Promise<Album>
```

An album and its tracks. `browseId` starts with `MPRE`. If you have an `OLAK5uy_…` playlist id instead, convert it with [`getAlbumBrowseId`](#getalbumbrowseid).

| Result key | Description |
|---|---|
| `title`, `type` (`"Album"`, `"Single"`, `"EP"`), `year`, `artists`, `description`, `thumbnails`, `isExplicit` | header |
| `trackCount`, `duration`, `duration_seconds` | totals |
| `audioPlaylistId` | `OLAK5uy_…`: play it with `getWatchPlaylist`, save it with `ratePlaylist` |
| `likeStatus` | whether you saved the album (`LIKE`) |
| `tracks` | tracks with `trackNumber`, `videoId`, `duration`, `isAvailable`, `feedbackTokens` (add to or remove from library) and `creditsBrowseId`. `album` is the album title. |
| `other_versions`, `related_recommendations` | other editions and "Releases for you", when shown |

```ts
const album = await ytm.getAlbum("MPREb_4pL8gzRtw1p");
console.log(`${album.title} (${album.year}), ${album.trackCount} tracks, ${album.duration}`);
for (const track of album.tracks) {
  console.log(track.trackNumber, track.title, track.isAvailable ? "" : "(unavailable)");
}
```

<details class="example"><summary>Example output: <code>getAlbum("MPREb_4pL8gzRtw1p")</code></summary>

<<< @/examples/album.json

</details>

Unavailable (greyed-out) tracks have `isAvailable: false` and `trackNumber: null`. Which tracks are unavailable depends on your location. **Throws** `YTMusicUserError` when `browseId` doesn't start with `MPRE`.

## `getAlbumBrowseId`

<MethodInfo name="getAlbumBrowseId" auth="none" />

```ts
getAlbumBrowseId(audioPlaylistId: string, options?: CallOptions): Promise<string | null>
```

Converts an album's playlist id (`OLAK5uy_…`) to its `browseId` (`MPREb_…`), or `null` if the playlist isn't an album.

```ts
const browseId = await ytm.getAlbumBrowseId("OLAK5uy_nMr9h2VlS-2PULNz3M3XVXQj_P3C2bqaY");
// "MPREb_4pL8gzRtw1p"
```

## `getSong`

<MethodInfo name="getSong" auth="none" />

```ts
getSong(videoId: string, options?: { signatureTimestamp?: number }): Promise<SongPlayerResponse>
```

The player's data for a song or video: `videoDetails` (title, author, length, view count, keywords, thumbnails), `playabilityStatus`, `microformat` (category, publish date, available countries), `playbackTracking` (for [`addHistoryItem`](/api/library#addhistoryitem)) and `streamingData`. The shapes are YouTube's own.

| Option | Type | Default | Description |
|---|---|---|---|
| `signatureTimestamp` | `number` | estimated from the date | from [`getSignatureTimestamp`](#getsignaturetimestamp), for valid stream URLs |

```ts
const song = await ytm.getSong("hpSrLjc5SMs");
console.log(song.videoDetails.title, song.videoDetails.lengthSeconds, song.playabilityStatus.status);
```

<details class="example"><summary>Example output (streaming formats omitted)</summary>

<<< @/examples/song.json

</details>

::: warning Stream URLs
Most formats in `streamingData` have a `signatureCipher` instead of a URL. Deciphering it is out of scope. See [streaming URLs](/guide/advanced#streaming-urls).
:::

## `getSongRelated`

<MethodInfo name="getSongRelated" auth="none" />

```ts
getSongRelated(browseId: string, options?: CallOptions): Promise<HomeSection[]>
```

The "Related" tab of the player: shelves such as "You might also like", "Recommended playlists" and "Similar artists". Pass the `related` browseId from [`getWatchPlaylist`](/api/watch).

```ts
const watch = await ytm.getWatchPlaylist({ videoId: "hpSrLjc5SMs", limit: 1 });
const related = await ytm.getSongRelated(watch.related!);
console.log(related.map((shelf) => shelf.title));
```

<details class="example"><summary>Example output</summary>

<<< @/examples/song-related.json

</details>

## `getSongCredits`

<MethodInfo name="getSongCredits" auth="none" />

```ts
getSongCredits(browseId: string, options?: CallOptions): Promise<SongCredits>
```

Who performed, wrote and produced a song. Pass a track's `creditsBrowseId` (`MPTC…`) from an album or playlist. Known sections use fixed keys (`performed_by`, `written_by`, `produced_by`, `music_metadata_provided_by`, …), each with the `localized_title` and the names in `data`. Anything else goes into `other_sections`.

```ts
const album = await ytm.getAlbum("MPREb_4pL8gzRtw1p");
const track = album.tracks.find((t) => t.creditsBrowseId);
const credits = await ytm.getSongCredits(track!.creditsBrowseId!);
console.log(credits.written_by?.data);
```

<details class="example"><summary>Example output</summary>

<<< @/examples/song-credits.json

</details>

**Throws** `YTMusicUserError` when `browseId` doesn't start with `MPTC`.

## `getLyrics`

<MethodInfo name="getLyrics" auth="none" />

```ts
getLyrics(browseId: string, options?: { timestamps?: boolean }): Promise<Lyrics | TimedLyrics | null>
```

A song's lyrics. Pass the `lyrics` browseId from [`getWatchPlaylist`](/api/watch). Returns `null` when the song has no lyrics.

| Option | Type | Default | Description |
|---|---|---|---|
| `timestamps` | `boolean` | `false` | request timed lyrics. They come from the mobile app's API, and when a song has none, you get plain lyrics. |

Check `hasTimestamps` to tell the two shapes apart:

```ts
const watch = await ytm.getWatchPlaylist({ videoId: "hpSrLjc5SMs", limit: 1 });
const lyrics = watch.lyrics ? await ytm.getLyrics(watch.lyrics, { timestamps: true }) : null;

if (lyrics?.hasTimestamps) {
  for (const line of lyrics.lyrics) console.log(line.start_time, line.end_time, line.text);
} else if (lyrics) {
  console.log(lyrics.lyrics); // one string, lines separated by \n
}
```

<details class="example"><summary>Example output (lyric text replaced; lyrics are copyrighted)</summary>

<<< @/examples/lyrics.json

<<< @/examples/lyrics-timed.json

</details>

`start_time` and `end_time` are milliseconds. `source` credits the lyrics provider (e.g. `"Source: LyricFind"`). Display it with the lyrics. **Throws** `YTMusicUserError` for an empty `browseId`.

## `getBasejsUrl`

<MethodInfo name="getBasejsUrl" auth="none" />

```ts
getBasejsUrl(options?: CallOptions): Promise<string>
```

The URL of the current `base.js` player script. Cached on the client for an hour.

```ts
const url = await ytm.getBasejsUrl();
// "https://music.youtube.com/s/player/…/player_es6.vflset/…/base.js"
```

## `getSignatureTimestamp`

<MethodInfo name="getSignatureTimestamp" auth="none" upstream="get_signatureTimestamp" />

```ts
getSignatureTimestamp(options?: { url?: string }): Promise<number>
```

The `signatureTimestamp` of the current player, for [`getSong`](#getsong). Cached for an hour, unless you pass a `url`.

```ts
const signatureTimestamp = await ytm.getSignatureTimestamp(); // e.g. 20403
const song = await ytm.getSong("hpSrLjc5SMs", { signatureTimestamp });
```

## `getTasteProfile`

<MethodInfo name="getTasteProfile" auth="required" upstream="get_tasteprofile" />

```ts
getTasteProfile(options?: CallOptions): Promise<TasteProfile>
```

The artists YouTube Music offers in "Tell us which artists you like", keyed by name. Each entry has the `selectionValue` and `impressionValue` that [`setTasteProfile`](#settasteprofile) needs.

```ts
const profile = await ytm.getTasteProfile();
console.log(Object.keys(profile)); // artist names
```

## `setTasteProfile`

<MethodInfo name="setTasteProfile" auth="required" write upstream="set_tasteprofile" />

```ts
setTasteProfile(artists: string[], options?: { tasteProfile?: TasteProfile }): Promise<void>
```

Selects artists in your taste profile, which shapes recommendations. `artists` are names from `getTasteProfile`. Pass the profile you already fetched as `tasteProfile` to save a request.

```ts
const profile = await ytm.getTasteProfile();
await ytm.setTasteProfile(["Oasis", "Blur"], { tasteProfile: profile });
```

::: warning Can't be undone
There's no API to deselect artists, so this method is only tested against a fake server.
:::

**Throws** `YTMusicUserError` for a name that isn't in the profile.
