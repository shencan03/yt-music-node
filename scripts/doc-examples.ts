/**
 * Records the example outputs shown in the docs: runs unauthenticated calls against YouTube Music
 * and writes trimmed results to docs/examples/<name>.json. Run it again when YouTube changes a
 * layout: `npm run docs:examples`.
 *
 * Trimming keeps the shape and drops bulk: arrays keep their first items (followed by a
 * "… N more" marker), thumbnail lists keep one entry and long strings are cut.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { YTMusic } from "../src/index.ts";

const OUT = new URL("../docs/examples/", import.meta.url);

const SAMPLE = {
  video: "hpSrLjc5SMs", // Oasis - Wonderwall
  album: "MPREb_4pL8gzRtw1p", // Eminem - Revival
  albumPlaylist: "OLAK5uy_nMr9h2VlS-2PULNz3M3XVXQj_P3C2bqaY",
  artist: "UCmMUZbaYdNH0bEd1PAlAqsA", // Oasis
  user: "UC44hbeRoCZVVMVg5z0FfIww",
  playlist: "PLQwVIlKxHM6qv-o99iX9R85og7IzF9YS_",
  podcastChannel: "UCGwuxdEeCf0TIA2RbPOj-8g",
  episode: "KNkyHCLOr1o",
};

interface TrimOptions {
  items: number;
  string: number;
}

function trim(value: unknown, options: TrimOptions = { items: 2, string: 160 }, key = ""): unknown {
  if (typeof value === "string") {
    return value.length > options.string ? `${value.slice(0, options.string)}…` : value;
  }
  if (Array.isArray(value)) {
    const keep = key === "thumbnails" ? 1 : options.items;
    const kept = value.slice(0, keep).map((item) => trim(item, options));
    return value.length > keep ? [...kept, `… ${value.length - keep} more`] : kept;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, trim(v, options, k)]));
  }
  return value;
}

function redactLyrics<T>(lyrics: T): T {
  if (!lyrics || typeof lyrics !== "object") return lyrics;
  const copy = { ...lyrics } as Record<string, unknown>;
  if (typeof copy.lyrics === "string") copy.lyrics = "Line one of the lyrics\nLine two of the lyrics\n…";
  if (Array.isArray(copy.lyrics)) {
    copy.lyrics = copy.lyrics.map((line: Record<string, unknown>, i: number) => ({ ...line, text: `Line ${i + 1}` }));
  }
  return copy as T;
}

type Example = [name: string, run: (ytm: YTMusic) => Promise<unknown>, options?: Partial<TrimOptions>];

const examples: Example[] = [
  // search
  ["search-songs", (ytm) => ytm.search("oasis wonderwall", { filter: "songs", limit: 3 }), { items: 2 }],
  ["search-all", (ytm) => ytm.search("oasis"), { items: 3 }],
  ["search-suggestions", (ytm) => ytm.getSearchSuggestions("oasis wond"), { items: 5 }],
  ["search-suggestions-detailed", (ytm) => ytm.getSearchSuggestions("oasis wond", { detailedRuns: true })],
  // browsing
  ["home", (ytm) => ytm.getHome({ limit: 3 })],
  ["artist", (ytm) => ytm.getArtist(SAMPLE.artist)],
  [
    "artist-albums",
    async (ytm) => {
      const artist = await ytm.getArtist(SAMPLE.artist);
      return ytm.getArtistAlbums(artist.albums!.browseId!, artist.albums!.params!, { limit: 5 });
    },
  ],
  ["user", (ytm) => ytm.getUser(SAMPLE.user)],
  ["album-browse-id", (ytm) => ytm.getAlbumBrowseId(SAMPLE.albumPlaylist)],
  ["album", (ytm) => ytm.getAlbum(SAMPLE.album), { items: 3 }],
  [
    "song",
    async (ytm) => {
      const song = await ytm.getSong(SAMPLE.video);
      return { ...song, streamingData: song.streamingData ? "(stream formats, see the note above)" : undefined };
    },
  ],
  [
    "song-credits",
    async (ytm) => {
      const album = await ytm.getAlbum(SAMPLE.album);
      const credits = album.tracks.find((t) => t.creditsBrowseId)?.creditsBrowseId;
      return credits ? ytm.getSongCredits(credits) : null;
    },
  ],
  [
    "song-related",
    async (ytm) => ytm.getSongRelated((await ytm.getWatchPlaylist({ videoId: SAMPLE.video, limit: 1 })).related!),
  ],
  // lyrics are copyrighted: the shape is real, the text is replaced
  [
    "lyrics",
    async (ytm) =>
      redactLyrics(await ytm.getLyrics((await ytm.getWatchPlaylist({ videoId: SAMPLE.video, limit: 1 })).lyrics!)),
  ],
  [
    "lyrics-timed",
    async (ytm) =>
      redactLyrics(
        await ytm.getLyrics((await ytm.getWatchPlaylist({ videoId: SAMPLE.video, limit: 1 })).lyrics!, {
          timestamps: true,
        }),
      ),
    { items: 3 },
  ],
  ["basejs-url", (ytm) => ytm.getBasejsUrl()],
  ["signature-timestamp", (ytm) => ytm.getSignatureTimestamp()],
  // watch
  ["watch-playlist", (ytm) => ytm.getWatchPlaylist({ videoId: SAMPLE.video, limit: 5 })],
  // explore
  ["mood-categories", (ytm) => ytm.getMoodCategories(), { items: 3 }],
  [
    "mood-playlists",
    async (ytm) => {
      const categories = await ytm.getMoodCategories();
      return ytm.getMoodPlaylists(Object.values(categories)[0]![0]!.params);
    },
  ],
  ["explore", (ytm) => ytm.getExplore()],
  ["charts", (ytm) => ytm.getCharts({ country: "US" })],
  // podcasts
  ["channel", (ytm) => ytm.getChannel(SAMPLE.podcastChannel)],
  [
    "podcast",
    async (ytm) => {
      const channel = await ytm.getChannel(SAMPLE.podcastChannel);
      return ytm.getPodcast(channel.podcasts!.results[0]!.podcastId!, { limit: 5 });
    },
  ],
  ["episode", (ytm) => ytm.getEpisode(SAMPLE.episode), { string: 300 }],
  // playlists
  ["playlist", (ytm) => ytm.getPlaylist(SAMPLE.playlist, { limit: 5 })],
];

const only = new Set(process.argv.slice(2));
const ytm = new YTMusic({ retry: 2 });
await mkdir(OUT, { recursive: true });
let failed = 0;
for (const [name, run, options] of examples) {
  if (only.size > 0 && !only.has(name)) continue;
  try {
    const result = trim(await run(ytm), { items: 2, string: 160, ...options });
    await writeFile(new URL(`${name}.json`, OUT), `${JSON.stringify(result, null, 2)}\n`);
    console.log(`ok   ${name}`);
  } catch (error) {
    failed++;
    console.log(`FAIL ${name}: ${(error as Error).message}`);
  }
}
process.exitCode = failed ? 1 : 0;
