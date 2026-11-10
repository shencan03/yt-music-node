# Recipes

Complete scripts for common tasks. Each one runs as is with Node.js 22+ (`node script.mjs`, or `.ts` with Node's type stripping). The ones marked 🔐 need an [auth file](/authentication/).

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

## Lyrics for a song

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

## An artist's full discography

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

## Export liked songs to CSV 🔐

```ts
import { writeFile } from "node:fs/promises";
import { YTMusic } from "yt-music-node";

const ytm = await YTMusic.fromAuthFile("browser.json");
const liked = await ytm.getLikedSongs({ limit: null });

const csv = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const rows = liked.tracks.map((t) =>
  [t.title, t.artists?.map((a) => a.name).join("; "), t.album?.name, t.duration, t.videoId].map(csv).join(","),
);
await writeFile("liked-songs.csv", ["title,artists,album,duration,videoId", ...rows].join("\n"));
console.log(`exported ${rows.length} songs`);
```

## Back up all your playlists 🔐

```ts
import { mkdir, writeFile } from "node:fs/promises";
import { YTMusic } from "yt-music-node";

const ytm = await YTMusic.fromAuthFile("browser.json", { retry: 2 });
await mkdir("backup", { recursive: true });

const playlists = await ytm.getLibraryPlaylists({ limit: null });
for (const summary of playlists) {
  if (summary.playlistId === "LM" || summary.playlistId === "SE") continue; // liked / saved episodes
  const playlist = await ytm.getPlaylist(summary.playlistId, { limit: null });
  const file = `backup/${summary.playlistId}.json`;
  await writeFile(file, JSON.stringify(playlist, null, 2));
  console.log(`${playlist.title}: ${playlist.tracks.length} tracks → ${file}`);
}
```

## Copy a public playlist into your library 🔐

`createPlaylist` can copy every item of another playlist in one request:

```ts
import { YTMusic } from "yt-music-node";

const ytm = await YTMusic.fromAuthFile("browser.json");

const source = "RDCLAK5uy_kmPRjHDECIcuVwnKsx2Ng7fyNgFKWNJFs";
const original = await ytm.getPlaylist(source, { limit: 1 });

const id = await ytm.createPlaylist(`${original.title} (my copy)`, "Copied with yt-music-node", {
  privacyStatus: "PRIVATE",
  sourcePlaylist: source,
});
console.log("created", id);
```

To save the original instead of copying it, use `ratePlaylist(source, "LIKE")`.

## Remove duplicates from a playlist 🔐

Items of your own playlists carry a `setVideoId`, which identifies one occurrence. Remove every occurrence after the first:

```ts
import { YTMusic } from "yt-music-node";

const ytm = await YTMusic.fromAuthFile("browser.json");
const playlistId = "PLxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

const playlist = await ytm.getPlaylist(playlistId, { limit: null });
if (!playlist.owned) throw new Error("you can only edit your own playlists");

const seen = new Set<string>();
const duplicates = playlist.tracks.filter((track) => {
  if (!track.videoId) return false;
  if (seen.has(track.videoId)) return true;
  seen.add(track.videoId);
  return false;
});

if (duplicates.length > 0) {
  console.log(await ytm.removePlaylistItems(playlistId, duplicates));
}
console.log(`removed ${duplicates.length} duplicates`);
```

## Turn a radio into a playlist 🔐

```ts
import { YTMusic } from "yt-music-node";

const ytm = await YTMusic.fromAuthFile("browser.json");

const radio = await ytm.getWatchPlaylist({ videoId: "hpSrLjc5SMs", radio: true, limit: 50 });
const videoIds = radio.tracks.map((t) => t.videoId);

const id = await ytm.createPlaylist("Wonderwall radio", "Generated from a radio", { videoIds });
console.log("created", id, "with", videoIds.length, "songs");
```

## Mark a song as played 🔐

Adding to the history takes the `playbackTracking` from `getSong`, made with the same client:

```ts
import { YTMusic } from "yt-music-node";

const ytm = await YTMusic.fromAuthFile("browser.json");

const song = await ytm.getSong("hpSrLjc5SMs");
const response = await ytm.addHistoryItem(song);
console.log(response.status === 204 ? "added to history" : `failed: HTTP ${response.status}`);
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

## A small search API

A zero-dependency HTTP endpoint around `search`:

```ts
import { createServer } from "node:http";
import { YTMusic, YTMusicError } from "yt-music-node";

const ytm = new YTMusic({ retry: 2, timeoutMs: 10_000 });

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const q = url.searchParams.get("q");
  if (url.pathname !== "/search" || !q) {
    res.writeHead(400).end("usage: /search?q=…");
    return;
  }
  try {
    const results = await ytm.search(q, { filter: "songs", limit: 10 });
    const body = results.map((r) => ({ title: r.title, artists: r.artists?.map((a) => a.name), videoId: r.videoId }));
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(body));
  } catch (error) {
    res.writeHead(error instanceof YTMusicError ? 502 : 500).end(String(error));
  }
}).listen(3000, () => console.log("http://localhost:3000/search?q=daft+punk"));
```

One client serves every request: it's safe to share, and it caches the visitor id.

## Upload a folder of songs 🔐

```ts
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { SUPPORTED_UPLOAD_TYPES, YTMusic, YTMusicServerError } from "yt-music-node";

const ytm = await YTMusic.fromAuthFile("browser.json");
const dir = "./music";

for (const name of await readdir(dir)) {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  if (!(SUPPORTED_UPLOAD_TYPES as readonly string[]).includes(extension)) continue;
  try {
    await ytm.uploadSong(join(dir, name));
    console.log("uploaded", name);
  } catch (error) {
    if (error instanceof YTMusicServerError && error.status === 409) console.log("already uploaded", name);
    else throw error;
  }
}
```

Uploaded songs take a while (often a minute or more) to be processed before they appear in `getLibraryUploadSongs`.
