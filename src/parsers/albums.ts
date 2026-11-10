/** Port of ytmusicapi/parsers/albums.py. */
import {
  DESCRIPTION_RUN_LIST,
  DESCRIPTION_SHELF,
  HEADER_DETAIL,
  MENU,
  NAVIGATION_PLAYLIST_ID,
  NAVIGATION_WATCH_PLAYLIST_ID,
  RESPONSIVE_HEADER,
  SECTION_LIST_ITEM,
  SUBTITLE,
  SUBTITLE_BADGE_LABEL,
  TAB_CONTENT,
  THUMBNAILS,
  THUMBNAIL_CROPPED,
  TITLE_TEXT,
  TWO_COLUMN_RENDERER,
  WATCH_PID,
  WATCH_PLAYLIST_ID,
  findObjectByKey,
  nav,
} from "../nav.ts";
import { has, or } from "./py.ts";
import { parseArtistsRuns, parseLikeStatus, parseSongRuns } from "./songs.ts";
import { parseDescriptionRuns, toInt } from "./utils.ts";

/** Legacy album header (`musicDetailHeaderRenderer`). */
export function parseAlbumHeader(response: any): Record<string, any> {
  const header = nav(response, HEADER_DETAIL);
  const album: Record<string, any> = {
    title: nav(header, TITLE_TEXT),
    type: nav(header, SUBTITLE),
    thumbnails: nav(header, THUMBNAIL_CROPPED, true),
    isExplicit: nav(header, SUBTITLE_BADGE_LABEL, true) !== null,
  };
  if (has(header, "description")) album.description = header.description.runs[0].text;

  Object.assign(album, parseSongRuns(header.subtitle.runs.slice(2)));
  Object.assign(album, parseTrackCountAndDuration(header));

  // add to library/uploaded
  const toplevel = nav(header, MENU).topLevelButtons;
  album.audioPlaylistId =
    nav(toplevel, [0, "buttonRenderer", ...NAVIGATION_WATCH_PLAYLIST_ID], true) ||
    nav(toplevel, [0, "buttonRenderer", ...NAVIGATION_PLAYLIST_ID], true);
  const service = nav(toplevel, [1, "buttonRenderer", "defaultServiceEndpoint"], true);
  if (service) album.likeStatus = parseLikeStatus(service);
  return album;
}

/** Album header since 2024 (`musicResponsiveHeaderRenderer`). */
export function parseAlbumHeader2024(response: any): Record<string, any> {
  const header = nav(response, [...TWO_COLUMN_RENDERER, ...TAB_CONTENT, ...SECTION_LIST_ITEM, ...RESPONSIVE_HEADER]);
  const album: Record<string, any> = {
    title: nav(header, TITLE_TEXT),
    type: nav(header, SUBTITLE),
    thumbnails: nav(header, THUMBNAILS, true),
    isExplicit: nav(header, SUBTITLE_BADGE_LABEL, true) !== null,
  };
  const [description, descriptionRuns] = parseDescriptionRuns(
    nav(header, ["description", ...DESCRIPTION_SHELF, ...DESCRIPTION_RUN_LIST], true),
  );
  album.description = description;
  album.descriptionRuns = descriptionRuns;

  const albumInfo: Record<string, any> = parseSongRuns(header.subtitle.runs.slice(2));
  const straplineRuns = nav(header, ["straplineTextOne", "runs"], true);
  albumInfo.artists = or(straplineRuns, null) ? parseArtistsRuns(straplineRuns) : null;
  Object.assign(album, albumInfo);
  Object.assign(album, parseTrackCountAndDuration(header));

  // add to library/uploaded
  const buttons = header.buttons;
  const playButton = findObjectByKey(buttons, "musicPlayButtonRenderer");
  album.audioPlaylistId = nav(playButton, ["musicPlayButtonRenderer", "playNavigationEndpoint", ...WATCH_PID], true);
  // remove this once A/B testing is finished and it is no longer covered
  if (album.audioPlaylistId === null) {
    album.audioPlaylistId = nav(
      playButton,
      ["musicPlayButtonRenderer", "playNavigationEndpoint", ...WATCH_PLAYLIST_ID],
      true,
    );
  }
  const toggle = findObjectByKey(buttons, "toggleButtonRenderer");
  const service = nav(toggle, ["toggleButtonRenderer", "defaultServiceEndpoint"], true);
  const isToggled = nav(toggle, ["toggleButtonRenderer", "isToggled"], true);
  // the toggle's default endpoint is always "like", saved or not, so upstream always reports
  // INDIFFERENT; `isToggled` is the actual state (verified live 2026-11-09)
  if (typeof isToggled === "boolean") album.likeStatus = isToggled ? "LIKE" : "INDIFFERENT";
  else album.likeStatus = service ? parseLikeStatus(service) : "INDIFFERENT";
  return album;
}

function parseTrackCountAndDuration(header: any): { trackCount?: number | null; duration: string } {
  const runs = header.secondSubtitle.runs;
  if (runs.length > 1) return { trackCount: toInt(runs[0].text), duration: runs[2].text };
  return { duration: runs[0].text };
}

/** The content of the data changes based on whether the user is authenticated or not. */
export function parseAlbumPlaylistIdIfExists(data: any): string | null {
  if (!data) return null;
  return nav(data, WATCH_PID, true) || nav(data, WATCH_PLAYLIST_ID, true);
}
