# Search and browse the catalog

Scripts that work without signing in: search, follow ids from one result to the next call, and read lyrics and charts. Each runs as is with Node.js 22+ (`node script.mjs`, or `.ts` with Node's type stripping).

## Search, then play the queue

Find a song, get its "Up next" queue and print it:

```ts
import { YTMusic } from "yt-music-node";

const ytm = new YTMusic();

const [song] = await ytm.search("massive attack teardrop", { filter: "songs", limit: 1 });
if (!song?.videoId) throw new Error("no song found");

const queue = await ytm.getWatchPlaylist({ videoId: song.videoId, limit: 20 });
for (const [i, track] of queue.tracks.entries()) {
  console.log(`${String(i + 1).padStart(2)}. ${track.title} – ${track.artists?.map((a) => a.name).join(", ")}`);
}
```

Pass `radio: true` for a radio that changes on every call, or `playlistId` and `shuffle: true` to shuffle a playlist.

## Get the lyrics of a song

Lyrics are reached through the watch playlist, which carries the lyrics `browseId`:

```ts
import { YTMusic } from "yt-music-node";

const ytm = new YTMusic();

const [song] = await ytm.search("radiohead no surprises", { filter: "songs", limit: 1 });
const watch = await ytm.getWatchPlaylist({ videoId: song!.videoId!, limit: 1 });

if (!watch.lyrics) {
  console.log("no lyrics for this song");
} else {
  const lyrics = await ytm.getLyrics(watch.lyrics, { timestamps: true });
  if (lyrics?.hasTimestamps) {
    for (const line of lyrics.lyrics) {
      const at = new Date(line.start_time).toISOString().slice(14, 19); // mm:ss
      console.log(`[${at}] ${line.text}`);
    }
  } else if (lyrics) {
    console.log(lyrics.lyrics);
  }
  console.log(lyrics?.source);
}
```

## List an artist's full discography

An artist page shows a few albums per section. Follow the section's `browseId` and `params` to get all of them (see [following a section](/guide/concepts#following-a-section-to-its-full-list)):

```ts
import { YTMusic } from "yt-music-node";

const ytm = new YTMusic();

const [result] = await ytm.search("portishead", { filter: "artists", limit: 1 });
const artist = await ytm.getArtist(result!.browseId!);

async function all(section: typeof artist.albums) {
  if (!section) return [];
  if (section.browseId && section.params) {
    return ytm.getArtistAlbums(section.browseId, section.params, { limit: null });
  }
  return section.results;
}

const albums = await all(artist.albums);
const singles = await all(artist.singles);

console.log(`${artist.name}: ${albums.length} albums, ${singles.length} singles & EPs`);
for (const album of albums) console.log(`${album.year ?? "????"}  ${album.title}`);
```

## Snapshot the charts every day

```ts
import { appendFile } from "node:fs/promises";
import { YTMusic } from "yt-music-node";

const ytm = new YTMusic({ retry: 2 });

const charts = await ytm.getCharts({ country: "US" });
const day = new Date().toISOString().slice(0, 10);
const lines = (charts.artists ?? []).map((a) => JSON.stringify({ day, rank: a.rank, artist: a.title, trend: a.trend }));
await appendFile("artist-chart.jsonl", `${lines.join("\n")}\n`);
console.log(`${day}: ${lines.length} artists`);
```

Run it from cron or a scheduled CI job. Chart contents depend on the country, and some sections (like `genres`) only exist for some countries.

## Next steps

- [`search`](/api/search/search): every filter and option
- [`getWatchPlaylist`](/api/watch/getWatchPlaylist): queues, radios and shuffles
- [Manage your library and playlists](/guide/library): the same, signed in
