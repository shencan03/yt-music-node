# Podcasts

## `getChannel`

<MethodInfo name="getChannel" auth="none" />

```ts
getChannel(channelId: string, options?: CallOptions): Promise<Channel>
```

A podcast channel page: `title`, `thumbnails`, and `episodes` and `podcasts` sections.

```ts
const channel = await ytm.getChannel("UCGwuxdEeCf0TIA2RbPOj-8g");
console.log(channel.title, channel.podcasts?.results.map((p) => p.title));
```

<details class="example"><summary>Example output</summary>

<<< @/examples/channel.json

</details>

## `getChannelEpisodes`

<MethodInfo name="getChannelEpisodes" auth="none" />

```ts
getChannelEpisodes(channelId: string, params: string, options?: CallOptions): Promise<EpisodeSummary[]>
```

All episodes of a channel. Pass the channel id and the `params` of the channel's `episodes` section.

```ts
const channelId = "UCGwuxdEeCf0TIA2RbPOj-8g";
const channel = await ytm.getChannel(channelId);
const episodes = await ytm.getChannelEpisodes(channelId, channel.episodes!.params!);
```

## `getPodcast`

<MethodInfo name="getPodcast" auth="optional" />

```ts
getPodcast(playlistId: string, options?: { limit?: number | null }): Promise<Podcast>
```

A podcast and its episodes. The `MPSP` prefix of the id is optional. Signed in, `saved` tells whether it's in your library.

| Option | Type | Default | Description |
|---|---|---|---|
| `limit` | `number \| null` | `100` | episodes to aim for; `null` for all |

```ts
const channel = await ytm.getChannel("UCGwuxdEeCf0TIA2RbPOj-8g");
const podcast = await ytm.getPodcast(channel.podcasts!.results[0]!.podcastId!, { limit: 10 });
for (const episode of podcast.episodes) console.log(episode.date, episode.title, episode.duration);
```

<details class="example"><summary>Example output</summary>

<<< @/examples/podcast.json

</details>

## `getEpisode`

<MethodInfo name="getEpisode" auth="optional" />

```ts
getEpisode(videoId: string, options?: CallOptions): Promise<Episode>
```

One episode: title, author, date, duration, `progressPercentage` (how much you've listened to, when signed in), `saved`, and the description as text and runs (with links and timestamps). The `MPED` prefix of the id is optional.

```ts
const episode = await ytm.getEpisode("KNkyHCLOr1o");
console.log(episode.title, episode.duration);
console.log(episode.description?.text);
```

<details class="example"><summary>Example output</summary>

<<< @/examples/episode.json

</details>

To play an episode, pass its `videoId` to [`getWatchPlaylist`](/api/watch) or [`getSong`](/api/browsing#getsong).

## `getEpisodesPlaylist`

<MethodInfo name="getEpisodesPlaylist" auth="required" />

```ts
getEpisodesPlaylist(playlistId?: string, options?: CallOptions): Promise<EpisodesPlaylist>
```

An episode playlist:

| Id | Playlist |
|---|---|
| `"RDPN"` (default) | **New episodes** of the podcasts you follow. Needs auth, and the account must follow at least one podcast. |
| `"SE"` | **Episodes for later** (also available in playlist form as [`getSavedEpisodes`](/api/playlists#getsavedepisodes)). Needs auth. |

```ts
import { YTMusic } from "yt-music-node";

const ytm = await YTMusic.fromAuthFile("browser.json");
const fresh = await ytm.getEpisodesPlaylist();
console.log(fresh.episodes.map((e) => e.title));
```

**Throws** `YTMusicServerError` with an explanation when YouTube returns no contents, for example `RDPN` on an account that follows no podcasts.
