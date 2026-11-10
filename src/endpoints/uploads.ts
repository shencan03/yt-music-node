/** Port of ytmusicapi/mixins/uploads.py. */
import { getContinuations } from "../continuations.ts";
import type { CallOptions, ClientContext, LimitOptions } from "../context.ts";
import { YTMusicServerError, YTMusicUserError } from "../errors.ts";
import { MUSIC_SHELF, SECTION_LIST_ITEM, SINGLE_COLUMN_TAB, nav } from "../nav.ts";
import { parseAlbumHeader } from "../parsers/albums.ts";
import { getLibraryContents, parseLibraryAlbums, parseLibraryArtists, popSongsRandomMix } from "../parsers/library.ts";
import { parseUploadedItems } from "../parsers/uploads.ts";
import { has } from "../parsers/py.ts";
import { sumTotalDuration } from "../parsers/utils.ts";
import type { AlbumSummary, LibraryArtist, UploadedSong } from "../types/results.ts";
import { prepareOrderParams, validateOrderParameter, type LibraryOptions, type LibraryOrder } from "./library.ts";
import type { WriteStatus } from "./playlists.ts";

export const UPLOAD_URL = "https://upload.youtube.com/upload/usermusic/http";
/** File extensions {@link YTMusic.uploadSong} accepts (case-insensitive). */
export const SUPPORTED_UPLOAD_TYPES = ["mp3", "m4a", "wma", "flac", "ogg"] as const;
/** 300 MiB */
export const MAX_UPLOAD_SIZE = 314_572_800;
/** Default timeout of the upload request; the client's `timeoutMs` (30s) is too short for large files. */
export const UPLOAD_TIMEOUT_MS = 10 * 60_000;

/** File contents for {@link UploadMethods.uploadSong}: a path (Node.js), or the data with a file name. */
export type UploadSource = string | { data: Blob | Uint8Array<ArrayBuffer>; filename: string };

/** Result of {@link YTMusic.getLibraryUploadAlbum}. */
/** Options of {@link YTMusic.uploadSong}. */
export interface UploadSongOptions extends CallOptions {
  /** Timeout of the upload request in milliseconds. Default: 10 minutes. */
  timeoutMs?: number;
}

/** Result of {@link YTMusic.getLibraryUploadAlbum}. */
export interface UploadedAlbum extends Record<string, any> {
  title: string;
  type: string;
  thumbnails: unknown;
  trackCount: number | null;
  duration: string | null;
  audioPlaylistId: string | null;
  tracks: UploadedSong[];
  duration_seconds: number;
}

function body(browseId: string, order?: LibraryOrder): Record<string, string> {
  validateOrderParameter(order);
  return order ? { browseId, params: prepareOrderParams(order) } : { browseId };
}

async function readSource(source: UploadSource): Promise<{ blob: Blob; filename: string }> {
  if (typeof source !== "string") {
    const blob = source.data instanceof Blob ? source.data : new Blob([source.data]);
    return { blob, filename: source.filename };
  }
  const fs = await import("node:fs");
  const pathMod = await import("node:path");
  let stat;
  try {
    stat = await fs.promises.stat(source);
  } catch {
    stat = undefined;
  }
  if (!stat?.isFile()) throw new YTMusicUserError("The provided file does not exist.");
  // streams from disk instead of buffering the whole file
  return { blob: await fs.openAsBlob(source), filename: pathMod.basename(source) };
}

export const uploadMethods = {
  /** Uploaded songs in the user's library. */
  async getLibraryUploadSongs(this: ClientContext, options: LibraryOptions = {}): Promise<UploadedSong[]> {
    this.checkAuth();
    const { limit = 25, order, signal } = options;
    const request = body("FEmusic_library_privately_owned_tracks", order);
    const response = await this.sendRequest("browse", request, { signal });
    const results = getLibraryContents(response, MUSIC_SHELF);
    if (results === null) return [];
    popSongsRandomMix(results);
    const songs = parseUploadedItems(results.contents ?? []);
    if (has(results, "continuations")) {
      const requestFn = (additionalParams: string) => this.sendRequest("browse", request, { additionalParams, signal });
      const remaining = limit == null ? null : limit - songs.length;
      songs.push(...(await getContinuations(results, "musicShelfContinuation", remaining, requestFn, parseUploadedItems)));
    }
    return songs as UploadedSong[];
  },

  /** Albums of uploaded songs in the user's library, as returned by `getLibraryAlbums`. */
  async getLibraryUploadAlbums(this: ClientContext, options: LibraryOptions = {}): Promise<AlbumSummary[]> {
    this.checkAuth();
    const { order, signal } = options;
    const request = body("FEmusic_library_privately_owned_releases", order);
    const response = await this.sendRequest("browse", request, { signal });
    const requestFn = (additionalParams: string) => this.sendRequest("browse", request, { additionalParams, signal });
    return (await parseLibraryAlbums(response, requestFn, options.limit === undefined ? 25 : options.limit)) as AlbumSummary[];
  },

  /** Artists of uploaded songs in the user's library, as returned by `getLibraryArtists`. */
  async getLibraryUploadArtists(this: ClientContext, options: LibraryOptions = {}): Promise<LibraryArtist[]> {
    this.checkAuth();
    const { order, signal } = options;
    const request = body("FEmusic_library_privately_owned_artists", order);
    const response = await this.sendRequest("browse", request, { signal });
    const requestFn = (additionalParams: string) => this.sendRequest("browse", request, { additionalParams, signal });
    return (await parseLibraryArtists(response, requestFn, options.limit === undefined ? 25 : options.limit)) as LibraryArtist[];
  },

  /**
   * Uploaded tracks of an artist.
   * @param browseId browse id of the upload artist, e.g. from `getLibraryUploadSongs`
   */
  async getLibraryUploadArtist(
    this: ClientContext,
    browseId: string,
    options: LimitOptions = {},
  ): Promise<UploadedSong[]> {
    this.checkAuth();
    const { limit = 25, signal } = options;
    const request = { browseId };
    const response = await this.sendRequest("browse", request, { signal });
    const results = nav(response, [...SINGLE_COLUMN_TAB, ...SECTION_LIST_ITEM, ...MUSIC_SHELF]);
    // upstream pops from the response in place; slicing leaves it untouched
    const contents: any[] = results.contents.length > 1 ? results.contents.slice(1) : results.contents;
    const items = parseUploadedItems(contents);
    if (has(results, "continuations")) {
      const requestFn = (additionalParams: string) => this.sendRequest("browse", request, { additionalParams, signal });
      const remaining = limit == null ? null : limit - items.length;
      items.push(...(await getContinuations(results, "musicShelfContinuation", remaining, requestFn, parseUploadedItems)));
    }
    return items as UploadedSong[];
  },

  /**
   * Information and tracks of an album of uploaded tracks.
   * @param browseId browse id of the upload album, e.g. from `getLibraryUploadSongs`
   */
  async getLibraryUploadAlbum(this: ClientContext, browseId: string, options: CallOptions = {}): Promise<UploadedAlbum> {
    this.checkAuth();
    const response = await this.sendRequest("browse", { browseId }, { signal: options.signal });
    const album = parseAlbumHeader(response);
    const results = nav(response, [...SINGLE_COLUMN_TAB, ...SECTION_LIST_ITEM, ...MUSIC_SHELF]);
    album.tracks = parseUploadedItems(results.contents);
    album.duration_seconds = sumTotalDuration(album);
    return album as UploadedAlbum;
  },

  /**
   * Uploads a song to YouTube Music.
   *
   * @param source path to an mp3, m4a, wma, flac or ogg file (Node.js), or `{ data, filename }`
   * @returns `"STATUS_SUCCEEDED"`; throws {@link YTMusicServerError} if an upload request fails
   *   (upstream returns the raw `requests.Response`)
   */
  async uploadSong(
    this: ClientContext,
    source: UploadSource,
    options: UploadSongOptions = {},
  ): Promise<"STATUS_SUCCEEDED"> {
    this.checkAuth();
    const { signal } = options;
    const { blob, filename } = await readSource(source);

    // upstream compares the extension case-sensitively, so "SONG.MP3" is rejected
    const extension = /\.([^.]+)$/.exec(filename)?.[1]?.toLowerCase() ?? "";
    if (!(SUPPORTED_UPLOAD_TYPES as readonly string[]).includes(extension)) {
      throw new YTMusicUserError(
        "The provided file type is not supported by YouTube Music. Supported file types are " +
          SUPPORTED_UPLOAD_TYPES.join(", "),
      );
    }
    if (blob.size >= MAX_UPLOAD_SIZE) {
      throw new YTMusicUserError(`File ${filename} has size ${blob.size} bytes, which is larger than the limit of 300MB`);
    }

    const authUser = this.authHeader("x-goog-authuser") ?? "0";
    const start = await this.sendRawRequest(`${UPLOAD_URL}?authuser=${encodeURIComponent(authUser)}`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded;charset=utf-8",
        "x-goog-upload-command": "start",
        "x-goog-upload-header-content-length": String(blob.size),
        "x-goog-upload-protocol": "resumable",
      },
      body: `filename=${filename}`,
      signal,
    });
    const uploadUrl = start.headers.get("x-goog-upload-url");
    // upstream does not check the first response and fails with a KeyError
    if (!start.ok || !uploadUrl) {
      throw new YTMusicServerError(`Starting the upload failed with HTTP ${start.status}`, {
        status: start.status,
        statusText: start.statusText,
        body: start.text.slice(0, 1000),
        url: UPLOAD_URL,
      });
    }

    const upload = await this.sendRawRequest(uploadUrl, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded;charset=utf-8",
        "x-goog-upload-command": "upload, finalize",
        "x-goog-upload-offset": "0",
        "x-goog-upload-protocol": "resumable",
      },
      body: blob,
      signal,
      timeoutMs: options.timeoutMs ?? UPLOAD_TIMEOUT_MS,
    });
    if (upload.status !== 200) {
      throw new YTMusicServerError(`Uploading ${filename} failed with HTTP ${upload.status}`, {
        status: upload.status,
        statusText: upload.statusText,
        body: upload.text.slice(0, 1000),
        url: UPLOAD_URL,
      });
    }
    return "STATUS_SUCCEEDED";
  },

  /**
   * Deletes a previously uploaded song or album.
   * @param entityId entity id of the uploaded song or album, e.g. from `getLibraryUploadSongs`
   * @returns `"STATUS_SUCCEEDED"` or the error from the response
   */
  async deleteUploadEntity(this: ClientContext, entityId: string, options: CallOptions = {}): Promise<WriteStatus> {
    this.checkAuth();
    const id = entityId.replace("FEmusic_library_privately_owned_release_detail", "");
    const response = await this.sendRequest(
      "music/delete_privately_owned_entity",
      { entityId: id },
      { signal: options.signal, retry: false },
    );
    return has(response, "error") ? response.error : "STATUS_SUCCEEDED";
  },
};

/** Upload methods of {@link YTMusic}. */
export type UploadMethods = typeof uploadMethods;
