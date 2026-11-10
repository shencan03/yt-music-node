/** Port of ytmusicapi/parsers/uploads.py. */
import { MENU_ITEMS, MENU_LIKE_STATUS, MENU_SERVICE, MNIR, MRLIR, TEXT_RUN_TEXT, THUMBNAILS, nav } from "../nav.ts";
import { has } from "./py.ts";
import { parseSongAlbum, parseSongArtists } from "./songs.ts";
import { getFixedColumnItem, getItemText, parseDuration } from "./utils.ts";

export function parseUploadedItems(results: readonly any[]): any[] {
  const songs: any[] = [];
  for (const result of results) {
    const data = nav(result, [MRLIR]);
    if (!has(data, "menu")) continue;
    const entityId = nav(data, [
      ...MENU_ITEMS,
      -1,
      MNIR,
      "navigationEndpoint",
      "confirmDialogEndpoint",
      "content",
      "confirmDialogRenderer",
      "confirmButton",
      "buttonRenderer",
      "command",
      "musicDeletePrivatelyOwnedEntityCommand",
      "entityId",
    ]);
    const videoId = nav(data, [...MENU_ITEMS, 0, ...MENU_SERVICE, "queueAddEndpoint", "queueTarget", "videoId"]);
    const duration = has(data, "fixedColumns") ? nav(getFixedColumnItem(data, 0), TEXT_RUN_TEXT) : null;
    songs.push({
      entityId,
      videoId,
      title: getItemText(data, 0),
      duration,
      duration_seconds: parseDuration(duration),
      artists: parseSongArtists(data, 1),
      album: parseSongAlbum(data, 2),
      likeStatus: nav(data, MENU_LIKE_STATUS),
      thumbnails: nav(data, THUMBNAILS, true),
    });
  }
  return songs;
}
