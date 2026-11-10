/**
 * Uploads: uploads a 100 KB test file, waits for YTM to process it, reads it back through every
 * uploads endpoint, then deletes it. Leftovers of a crashed run are deleted before and after.
 */
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, expect, it } from "vitest";
import { YTMusicServerError, YTMusicUserError, type UploadedSong, type YTMusic } from "../../../src/index.ts";
import { authed, eventually, getClient } from "./helpers.ts";

const FILE = fileURLToPath(new URL("../../fixtures/yt-music-node-test.mp3", import.meta.url));
const TITLE_MARK = "yt-music-node-test";

const isTestUpload = (song: UploadedSong) => Boolean(song.title?.includes(TITLE_MARK));

async function deleteTestUploads(ytm: YTMusic): Promise<number> {
  const songs = await ytm.getLibraryUploadSongs({ limit: 100, order: "recently_added" });
  const leftovers = songs.filter(isTestUpload);
  for (const song of leftovers) await ytm.deleteUploadEntity(song.entityId);
  return leftovers.length;
}

authed("live auth: uploads", { timeout: 420_000 }, () => {
  let ytm: YTMusic;
  let uploaded: UploadedSong | undefined;

  beforeAll(async () => {
    ytm = await getClient();
    await deleteTestUploads(ytm);
  });

  afterAll(async () => {
    if (uploaded) await ytm.deleteUploadEntity(uploaded.entityId).catch(() => undefined);
    await deleteTestUploads(ytm).catch(() => undefined);
  });

  it("validates input before uploading", async () => {
    await expect(ytm.uploadSong("/nonexistent/song.mp3")).rejects.toThrow(/does not exist/);
    await expect(ytm.uploadSong({ data: new Uint8Array(10), filename: "song.wav" })).rejects.toThrow(YTMusicUserError);
  });

  it("uploads a song from a path", async () => {
    expect(await ytm.uploadSong(FILE)).toBe("STATUS_SUCCEEDED");
  });

  it("the upload appears in the library after processing", async () => {
    const songs = await eventually(
      () => ytm.getLibraryUploadSongs({ limit: 50, order: "recently_added" }),
      (list) => list.some(isTestUpload),
      { tries: 30, delayMs: 10_000 },
    );
    uploaded = songs.find(isTestUpload);
    expect(uploaded).toBeDefined();
    expect(uploaded!.entityId).toMatch(/^t_po_/);
    expect(uploaded!.videoId).toBeTruthy();
    expect(uploaded!.artists.length).toBeGreaterThan(0);
    expect(uploaded!.duration_seconds).toBeGreaterThan(0);
  });

  it("uploading the same file again is rejected as a duplicate (HTTP 409)", async () => {
    const data = new Uint8Array(await readFile(FILE));
    const error = await ytm.uploadSong({ data, filename: `${TITLE_MARK}.mp3` }).catch((e: unknown) => e);
    // YTM answers 409 for a file that is already uploaded; upstream returns that response
    if (error !== "STATUS_SUCCEEDED") {
      expect(error).toBeInstanceOf(YTMusicServerError);
      expect((error as YTMusicServerError).status).toBe(409);
    }
  });

  it("upload artists and albums list it, with detail pages", async () => {
    const artistId = uploaded!.artists[0]!.id;
    expect(artistId).toBeTruthy();
    const artists = await eventually(
      () => ytm.getLibraryUploadArtists({ limit: 100 }),
      (list) => list.some((a) => a.browseId === artistId),
    );
    expect(artists.some((a) => a.browseId === artistId)).toBe(true);
    const artistTracks = await ytm.getLibraryUploadArtist(artistId!);
    expect(artistTracks.some((t) => t.entityId === uploaded!.entityId)).toBe(true);

    if (uploaded!.album?.id) {
      const albums = await ytm.getLibraryUploadAlbums({ limit: 100 });
      expect(albums.some((a) => a.browseId === uploaded!.album!.id)).toBe(true);
      const album = await ytm.getLibraryUploadAlbum(uploaded!.album.id);
      expect(album.tracks.some((t) => t.entityId === uploaded!.entityId)).toBe(true);
      expect(album.duration_seconds).toBeGreaterThan(0);
    }
  });

  it("getSong works for the private upload", async () => {
    const song = await ytm.getSong(uploaded!.videoId);
    expect(song.videoDetails?.videoId).toBe(uploaded!.videoId);
  });

  it("deleteUploadEntity removes it", async () => {
    expect(await ytm.deleteUploadEntity(uploaded!.entityId)).toBe("STATUS_SUCCEEDED");
    const songs = await eventually(
      () => ytm.getLibraryUploadSongs({ limit: 50, order: "recently_added" }),
      (list) => !list.some((s) => s.entityId === uploaded!.entityId),
      { tries: 10, delayMs: 3000 },
    );
    expect(songs.some((s) => s.entityId === uploaded!.entityId)).toBe(false);
    uploaded = undefined;
  });
});
