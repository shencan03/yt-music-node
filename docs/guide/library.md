# Manage your library and playlists

These scripts need a [signed-in client](/authentication/): they read `browser.json`, written by `npx yt-music-node browser`. Most of them change your account, so try them on a test playlist first.

## Export liked songs to CSV

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

## Back up all your playlists

Saves every playlist in your library as JSON. `retry` makes a long export survive the odd 429:

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

## Copy a public playlist into your library

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

## Remove duplicates from a playlist

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

## Turn a radio into a playlist

Builds a 50-song radio from a song and saves it as a new playlist:

```ts
import { YTMusic } from "yt-music-node";

const ytm = await YTMusic.fromAuthFile("browser.json");

const radio = await ytm.getWatchPlaylist({ videoId: "hpSrLjc5SMs", radio: true, limit: 50 });
const videoIds = radio.tracks.map((t) => t.videoId);

const id = await ytm.createPlaylist("Wonderwall radio", "Generated from a radio", { videoIds });
console.log("created", id, "with", videoIds.length, "songs");
```

## Mark a song as played

Adding to the history takes the `playbackTracking` from `getSong`, made with the same client:

```ts
import { YTMusic } from "yt-music-node";

const ytm = await YTMusic.fromAuthFile("browser.json");

const song = await ytm.getSong("hpSrLjc5SMs");
const response = await ytm.addHistoryItem(song);
console.log(response.status === 204 ? "added to history" : `failed: HTTP ${response.status}`);
```

## Next steps

- [Playlists API](/api/playlists/): every playlist method and its options
- [Library & account API](/api/library/): ratings, subscriptions and history
- [Upload songs](/guide/uploads): add your own files
