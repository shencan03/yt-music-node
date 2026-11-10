/** Port of ytmusicapi/parsers/watch.py. */
import { MENU_ITEMS, NAVIGATION_VIDEO_TYPE, PAGE_TYPE, THUMBNAIL, TITLE_TEXT, TOGGLE_MENU, nav } from "../nav.ts";
import { has } from "./py.ts";
import { parseLikeStatus, parseSongMenuData, parseSongRuns } from "./songs.ts";

const PPVWR = "playlistPanelVideoWrapperRenderer";
const PPVR = "playlistPanelVideoRenderer";

export function parseWatchPlaylist(results: readonly any[]): any[] {
  const tracks: any[] = [];
  for (let result of results) {
    let counterpart: any = null;
    if (has(result, PPVWR)) {
      counterpart = nav(result, [PPVWR, "counterpart", 0, "counterpartRenderer", PPVR]);
      result = result[PPVWR].primaryRenderer;
    }
    if (!has(result, PPVR)) continue;
    const data = result[PPVR];
    if (has(data, "unplayableText")) continue;

    const track = parseWatchTrack(data);
    if (counterpart) track.counterpart = parseWatchTrack(counterpart);
    tracks.push(track);
  }
  return tracks;
}

export function parseWatchTrack(data: any): Record<string, any> {
  let likeStatus: string | null = null;
  for (const item of nav(data, MENU_ITEMS) as any[]) {
    if (has(item, TOGGLE_MENU)) {
      const service = item[TOGGLE_MENU].defaultServiceEndpoint;
      if (has(service, "likeEndpoint")) likeStatus = parseLikeStatus(service);
    }
  }

  const track: Record<string, any> = {
    videoId: nav(data, ["videoId"]),
    title: nav(data, TITLE_TEXT),
    length: nav(data, ["lengthText", "runs", 0, "text"], true),
    thumbnail: nav(data, THUMBNAIL, true),
    likeStatus,
    videoType: nav(data, ["navigationEndpoint", ...NAVIGATION_VIDEO_TYPE], true),
    inLibrary: null,
    feedbackTokens: null,
    pinnedToListenAgain: null,
    listenAgainFeedbackTokens: null,
    ...parseSongMenuData(data),
  };

  const longBylineText = nav(data, ["longBylineText"]);
  if (longBylineText) Object.assign(track, parseSongRuns(longBylineText.runs));
  return track;
}

/** Maps page type → browseId for the lyrics / related tabs of the watch page. */
export function getTabBrowseIds(watchNextRenderer: any): Record<string, string> {
  const browseIds: Record<string, string> = {};
  for (const tab of nav(watchNextRenderer, ["tabs"]) as any[]) {
    if (has(tab.tabRenderer, "unselectable")) continue;
    const browseEndpoint = nav(tab, ["tabRenderer", "endpoint", "browseEndpoint"], true);
    if (browseEndpoint) browseIds[nav(browseEndpoint, PAGE_TYPE)] = browseEndpoint.browseId;
  }
  return browseIds;
}
