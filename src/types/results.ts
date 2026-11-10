/**
 * Public result types. Keys and nesting match ytmusicapi's dictionaries, so code and documentation
 * written for the Python library carry over. Absent values are `null` (Python `None`).
 */
import type { Description } from "../parsers/podcasts.ts";
import type { AlbumRef, ArtistRef, FeedbackTokens, LikeStatus } from "../parsers/songs.ts";
import type { TextRun } from "../parsers/utils.ts";

export type { AlbumRef, ArtistRef, Description, FeedbackTokens, LikeStatus, TextRun };
export type { DescriptionElement } from "../parsers/podcasts.ts";

/** An image in one size. Lists of thumbnails are ordered from smallest to largest. */
export interface Thumbnail {
  url: string;
  width: number;
  height: number;
}

/**
 * How YouTube Music classifies a video: `ATV` is an audio track (a "song"), `OMV` an official music
 * video, `UGC` a user upload, `OFFICIAL_SOURCE_MUSIC` an official audio-only upload,
 * `PODCAST_EPISODE` an episode.
 */
export type VideoType =
  | "MUSIC_VIDEO_TYPE_OMV"
  | "MUSIC_VIDEO_TYPE_UGC"
  | "MUSIC_VIDEO_TYPE_ATV"
  | "MUSIC_VIDEO_TYPE_OFFICIAL_SOURCE_MUSIC"
  | "MUSIC_VIDEO_TYPE_PODCAST_EPISODE"
  | (string & {});

/** Who can see a playlist. */
export type PrivacyStatus = "PUBLIC" | "PRIVATE" | "UNLISTED";

/** Parsed song runs: artists, album, views, duration and year, whichever are present. */
export interface SongInfo {
  artists?: ArtistRef[];
  album?: AlbumRef;
  views?: string;
  duration?: string;
  duration_seconds?: number | null;
  year?: string;
}

/** Tokens for pinning an item to, or unpinning it from, the "Listen again" shelf of the home page. */
export interface ListenAgainFeedbackTokens {
  pin: string | null;
  unpin: string | null;
}

/** A track of a playlist, album, artist's songs or library listing. */
export interface PlaylistItem {
  videoId: string | null;
  title: string | null;
  artists: ArtistRef[] | null;
  album: AlbumRef | null;
  likeStatus: LikeStatus | null;
  inLibrary: boolean | null;
  pinnedToListenAgain: boolean | null;
  feedbackTokens?: FeedbackTokens;
  listenAgainFeedbackTokens?: ListenAgainFeedbackTokens;
  feedbackToken?: string | null;
  thumbnails: Thumbnail[] | null;
  isAvailable: boolean;
  isExplicit: boolean;
  videoType: VideoType | null;
  views: string | null;
  communityVoteStatus: { netVoteValue: number; status: string } | null;
  trackNumber?: number | null;
  duration?: string;
  duration_seconds?: number | null;
  setVideoId?: string;
  creditsBrowseId?: string;
}

// ---- browsing ---------------------------------------------------------------------------------

/** One shelf of the home page, e.g. "Quick picks" or "Listen again". */
export interface HomeSection {
  title: string | null;
  /** Mixed items (songs, albums, playlists, artists, episodes …), or a text for description shelves. */
  contents: any[] | string;
}

/** An album, single or EP as listed on artist pages, in search results and in the library. */
export interface AlbumSummary {
  title: string;
  browseId: string;
  playlistId?: string | null;
  audioPlaylistId?: string | null;
  artists?: { id: string | null; name: string | null }[] | ArtistRef[];
  thumbnails: Thumbnail[] | null;
  isExplicit?: boolean;
  type?: string;
  year?: string;
}

/** A playlist as listed on channel pages, in the library and in search results. */
export interface PlaylistSummary {
  title: string | null;
  playlistId: string;
  thumbnails: Thumbnail[] | null;
  owned?: boolean;
  description?: string;
  count?: string;
  author?: ArtistRef[];
}

/** A music video as listed on artist and channel pages. */
export interface VideoSummary {
  title: string;
  videoId: string;
  artists: ArtistRef[];
  playlistId: string | null;
  thumbnails: Thumbnail[] | null;
  views: string;
}

/** An artist in the "Fans might also like" section of an artist page. */
export interface RelatedArtist {
  title: string;
  browseId: string;
  subscribers: string | null;
  thumbnails: Thumbnail[] | null;
}

/**
 * A section of a channel page. When `browseId` is set, the section has more items than shown; pass
 * `browseId` and `params` to the matching `get…` method (e.g. {@link YTMusic.getArtistAlbums}) for
 * the full list.
 */
export interface ChannelSection<T> {
  browseId: string | null;
  params?: string | null;
  results: T[];
}

/** Sections of an artist, user or podcast channel page; present only when the page has them. */
export interface ChannelContents {
  albums?: ChannelSection<AlbumSummary>;
  singles?: ChannelSection<AlbumSummary>;
  shows?: ChannelSection<AlbumSummary>;
  videos?: ChannelSection<VideoSummary>;
  playlists?: ChannelSection<PlaylistSummary>;
  related?: ChannelSection<RelatedArtist>;
  episodes?: ChannelSection<EpisodeSummary>;
  podcasts?: ChannelSection<PodcastSummary>;
}

export interface Artist extends ChannelContents {
  name: string;
  description: string | null;
  descriptionRuns: TextRun[];
  views: string | null;
  channelId: string;
  shuffleId: string | null;
  radioId: string | null;
  subscribers: string | null;
  monthlyListeners: string | null;
  subscribed: boolean;
  thumbnails: Thumbnail[] | null;
  songs: { browseId: string | null; results?: PlaylistItem[] };
}

export interface User extends ChannelContents {
  name: string;
}

/** Result of {@link YTMusic.getAlbum}. */
export interface Album extends Omit<SongInfo, "artists" | "album"> {
  title: string;
  type: string;
  thumbnails: Thumbnail[] | null;
  isExplicit: boolean;
  description: string;
  descriptionRuns: TextRun[];
  artists: ArtistRef[] | null;
  year?: string;
  trackCount?: number | null;
  duration: string;
  audioPlaylistId: string | null;
  likeStatus: LikeStatus;
  /** Tracks; `album` is the album title (as in ytmusicapi). */
  tracks: (Omit<PlaylistItem, "album"> & { album: string })[];
  other_versions?: AlbumSummary[];
  related_recommendations?: AlbumSummary[];
  duration_seconds: number;
}

/** A section of the song credits page, e.g. "Performed by" or "Written by". */
export interface CreditsSection {
  localized_title: string;
  data: string[];
}

/** Result of {@link YTMusic.getSongCredits}. */
export interface SongCredits {
  performed_by?: CreditsSection;
  written_by?: CreditsSection;
  produced_by?: CreditsSection;
  music_metadata_provided_by?: CreditsSection;
  other_sections: CreditsSection[];
}

/** The `player` response, reduced to these keys. Shapes are YouTube's own. */
export interface SongPlayerResponse {
  videoDetails?: any;
  playabilityStatus?: any;
  streamingData?: any;
  microformat?: any;
  playbackTracking?: any;
}

/** One line of timed lyrics. */
export interface LyricLine {
  text: string;
  /** Milliseconds. */
  start_time: number;
  /** Milliseconds. */
  end_time: number;
  id: number;
}

/** Plain lyrics from {@link YTMusic.getLyrics}. */
export interface Lyrics {
  lyrics: string;
  source: string | null;
  hasTimestamps: false;
}

/** Lyrics with per-line timestamps from {@link YTMusic.getLyrics} with `timestamps: true`. */
export interface TimedLyrics {
  lyrics: LyricLine[];
  source: string | null;
  hasTimestamps: true;
}

/**
 * Result of {@link YTMusic.getTasteProfile}: the artists offered in the taste profile, keyed by
 * name, with the values {@link YTMusic.setTasteProfile} needs.
 */
export type TasteProfile = Record<string, { selectionValue: string; impressionValue: string }>;

// ---- podcasts ---------------------------------------------------------------------------------

/** A podcast as listed on channel pages and in the library. */
export interface PodcastSummary {
  title: string;
  channel: { id: string | null; name: string | null };
  browseId: string;
  podcastId: string | null;
  thumbnails: Thumbnail[] | null;
}

/** A podcast episode as listed on podcast and channel pages. */
export interface EpisodeSummary {
  index: number | null;
  title: string;
  description: string | null;
  duration: string | null;
  videoId: string | null;
  browseId: string | null;
  videoType: VideoType | null;
  date: string | null;
  thumbnails: Thumbnail[] | null;
}

export interface Channel extends ChannelContents {
  title: string;
  thumbnails: Thumbnail[] | null;
}

/** The channel that publishes a podcast. */
export interface PodcastAuthor {
  name: string | null;
  id: string | null;
}

/** Result of {@link YTMusic.getPodcast}. */
export interface Podcast {
  author: PodcastAuthor | null;
  title: string;
  thumbnails: Thumbnail[] | null;
  description: string | null;
  saved: boolean;
  episodes: EpisodeSummary[];
}

/** Result of {@link YTMusic.getEpisode}. */
export interface Episode {
  author: PodcastAuthor | null;
  title: string;
  thumbnails: Thumbnail[] | null;
  date: string;
  duration: string | null;
  progressPercentage: number;
  saved: boolean;
  playlistId: string | null;
  description: Description | null;
}

// ---- playlists --------------------------------------------------------------------------------

/** The owner of a playlist. */
export interface PlaylistAuthor {
  name: string;
  id: string | null;
}

/** Result of {@link YTMusic.getPlaylist} and {@link YTMusic.getLikedSongs}. */
export interface Playlist {
  id: string;
  owned: boolean;
  privacy: PrivacyStatus;
  title: string;
  thumbnails: Thumbnail[] | null;
  description: string | null;
  author?: PlaylistAuthor;
  collaborators?: { text: string; avatars: Thumbnail[] };
  year?: string | null;
  /** View count; abbreviated counts such as "2M views" are expanded. */
  views: number | null;
  duration: string | null;
  trackCount: number | null;
  tracks: PlaylistItem[];
  related: PlaylistSummary[];
  suggestions?: PlaylistItem[];
  duration_seconds: number;
}

/** Result of {@link YTMusic.getEpisodesPlaylist}. */
export interface EpisodesPlaylist extends Omit<Playlist, "id" | "tracks" | "related" | "duration_seconds"> {
  episodes: EpisodeSummary[];
}

// ---- search -----------------------------------------------------------------------------------

/** One search result. Which keys are present depends on `resultType` (see ytmusicapi docs). */
export interface SearchResult extends SongInfo {
  category: string | null;
  resultType: string | null;
  title?: string | null;
  videoId?: string | null;
  videoType?: VideoType | null;
  browseId?: string | null;
  playlistId?: string | null;
  thumbnails: Thumbnail[] | null;
  isExplicit?: boolean;
  isAvailable?: boolean;
  [key: string]: unknown;
}

/** A detailed search suggestion from {@link YTMusic.getSearchSuggestions} with `detailedRuns: true`. */
export interface SearchSuggestion {
  text: string;
  runs: any[];
  fromHistory: boolean;
  feedbackToken: string | null;
}

// ---- watch ------------------------------------------------------------------------------------

export interface WatchTrack extends SongInfo {
  videoId: string;
  title: string;
  length: string | null;
  thumbnail: Thumbnail[] | null;
  likeStatus: LikeStatus | null;
  videoType: VideoType | null;
  inLibrary: boolean | null;
  feedbackTokens: FeedbackTokens | null;
  pinnedToListenAgain: boolean | null;
  listenAgainFeedbackTokens: ListenAgainFeedbackTokens | null;
  counterpart?: WatchTrack;
}

/** Result of {@link YTMusic.getWatchPlaylist}: the "Up next" queue. */
export interface WatchPlaylist {
  tracks: WatchTrack[];
  playlistId: string | null;
  /** browseId for {@link YTMusic.getLyrics}. */
  lyrics: string | null;
  /** browseId for {@link YTMusic.getSongRelated}. */
  related: string | null;
}

// ---- explore & charts -------------------------------------------------------------------------

/** A chart playlist, e.g. "Top 100 Songs" or a genre chart. */
export interface ChartPlaylist {
  title: string;
  playlistId: string;
  thumbnails: Thumbnail[] | null;
}

/** An artist in the artist chart, with its rank and trend. */
export interface ChartArtist {
  title: string;
  browseId: string;
  subscribers: string | null;
  thumbnails: Thumbnail[] | null;
  rank: string | null;
  trend: "up" | "down" | "neutral" | null;
}

/** Result of {@link YTMusic.getCharts}. */
export interface Charts {
  countries: { selected: { text: string }; options: string[] };
  videos?: ChartPlaylist[];
  daily?: ChartPlaylist[];
  weekly?: ChartPlaylist[];
  genres?: ChartPlaylist[];
  languages?: ChartPlaylist[];
  artists?: ChartArtist[];
}

/** A mood or genre; pass `params` to {@link YTMusic.getMoodPlaylists}. */
export interface MoodCategory {
  title: string;
  params: string;
}

/**
 * Result of {@link YTMusic.getMoodCategories}: categories keyed by section title, e.g. "Moods &
 * moments" and "Genres".
 */
export type MoodCategories = Record<string, MoodCategory[]>;

/** Result of {@link YTMusic.getExplore}. */
export interface Explore {
  new_releases?: AlbumSummary[];
  moods_and_genres?: MoodCategory[];
  top_episodes?: any[];
  new_videos?: VideoSummary[];
  top_songs?: { playlist: string; items: any[] };
  trending?: { playlist: string; items: any[] };
}

// ---- library & account ------------------------------------------------------------------------

/** A playlist in the user's library, from {@link YTMusic.getLibraryPlaylists}. */
export interface LibraryPlaylist {
  title: string | null;
  playlistId: string;
  thumbnails: Thumbnail[] | null;
  owned?: boolean;
  description?: string;
  count?: string;
  author?: ArtistRef[];
}

/** An artist in the user's library or subscriptions. */
export interface LibraryArtist {
  browseId: string;
  artist: string | null;
  type?: "artist" | "channel";
  shuffleId?: string;
  radioId?: string;
  subscribers?: string;
  songs?: string;
  thumbnails: Thumbnail[] | null;
}

export interface HistoryItem extends PlaylistItem {
  played: string;
  feedbackToken?: string | null;
}

/** Result of {@link YTMusic.getAccountInfo}. */
export interface AccountInfo {
  accountName: string;
  channelHandle: string | null;
  accountPhotoUrl: string;
}

// ---- uploads ----------------------------------------------------------------------------------

/** A song the user uploaded, from {@link YTMusic.getLibraryUploadSongs} and the other upload listings. */
export interface UploadedSong {
  entityId: string;
  videoId: string;
  title: string | null;
  duration: string | null;
  duration_seconds: number | null;
  artists: ArtistRef[];
  album: AlbumRef | null;
  likeStatus: LikeStatus;
  thumbnails: Thumbnail[] | null;
}
