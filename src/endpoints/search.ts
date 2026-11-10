/** Port of ytmusicapi/mixins/search.py. */
import { getContinuations } from "../continuations.ts";
import type { CallOptions, ClientContext } from "../context.ts";
import { YTMusicUserError } from "../errors.ts";
import { MRLIR, MUSIC_SHELF, SECTION_LIST, TEXT_RUN_TEXT, TITLE_TEXT, nav } from "../nav.ts";
import { getSearchResultTypes } from "../parsers/i18n.ts";
import { has, truthy } from "../parsers/py.ts";
import {
  getSearchParams,
  parseSearchResults,
  parseSearchSuggestions,
  parseTopResult,
  type SearchFilter,
  type SearchScope,
} from "../parsers/search.ts";
import type { SearchResult, SearchSuggestion } from "../types/results.ts";

export type { SearchFilter, SearchScope };

const FILTERS = [
  "albums",
  "artists",
  "playlists",
  "community_playlists",
  "featured_playlists",
  "songs",
  "videos",
  "profiles",
  "podcasts",
  "episodes",
] as const;
const SCOPES = ["library", "uploads"] as const;

/** Options of {@link YTMusic.search}. */
export interface SearchOptions extends CallOptions {
  /** Restrict results to one type. Default: all types. */
  filter?: Exclude<SearchFilter, "uploads">;
  /** Search the library or uploads instead of the catalog (requires authentication). */
  scope?: SearchScope;
  /**
   * Number of results to aim for when a filter is set (continuations are fetched up to it).
   * Without a filter, YouTube returns a fixed set. Default: 20.
   */
  limit?: number;
  /** Search the query as typed, without spelling correction. */
  ignoreSpelling?: boolean;
}

export const searchMethods = {
  /** Searches YouTube Music. Returns results in the order the web client shows them. */
  async search(this: ClientContext, query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const { filter, scope, limit = 20, ignoreSpelling = false, signal } = options;
    const body: Record<string, string> = { query };
    const results: SearchResult[] = [];

    if (filter && !(FILTERS as readonly string[]).includes(filter)) {
      throw new YTMusicUserError(
        `Invalid filter provided. Please use one of the following filters or leave out the parameter: ${FILTERS.join(", ")}`,
      );
    }
    // library and uploads scopes search the user's own items
    if (scope) this.checkAuth();
    if (scope && !(SCOPES as readonly string[]).includes(scope)) {
      throw new YTMusicUserError(
        `Invalid scope provided. Please use one of the following scopes or leave out the parameter: ${SCOPES.join(", ")}`,
      );
    }
    if (scope === "uploads" && filter) {
      throw new YTMusicUserError(
        "No filter can be set when searching uploads. Please unset the filter parameter when scope is set to uploads. ",
      );
    }
    if (scope === "library" && (filter === "community_playlists" || filter === "featured_playlists")) {
      throw new YTMusicUserError(
        `${filter} cannot be set when searching library. Please use one of the following filters or leave out the parameter: ` +
          [...FILTERS.slice(0, 3), ...FILTERS.slice(5)].join(", "),
      );
    }

    const params = getSearchParams(filter, scope, ignoreSpelling);
    if (params) body.params = params;

    const response = await this.sendRequest("search", body, { signal });
    // no results
    if (!has(response, "contents")) return results;

    let contents = response.contents;
    if (has(contents, "tabbedSearchResultsRenderer")) {
      const tabIndex = !scope || filter ? 0 : SCOPES.indexOf(scope) + 1;
      contents = nav(contents, ["tabbedSearchResultsRenderer", "tabs", tabIndex, "tabRenderer", "content"]);
    }
    const sectionList: any[] = nav(contents, SECTION_LIST);

    // no results (upstream checks `"itemSectionRenderer" in section_list`, which is never true)
    if (sectionList.length === 1 && has(sectionList[0], "itemSectionRenderer")) {
      const first = nav(sectionList[0], ["itemSectionRenderer", "contents", 0], true);
      if (!has(first, MRLIR)) return results;
    }

    // set filter for parser
    let internalFilter: string | null = filter ?? null;
    let resultType: string | null = null;
    if (internalFilter && internalFilter.includes("playlists")) {
      internalFilter = "playlists";
    } else if (scope === "uploads") {
      internalFilter = "uploads";
      resultType = "upload";
    }

    for (const res of sectionList) {
      let category: string | null = null;
      let shelfContents: any[];

      if (has(res, "musicCardShelfRenderer")) {
        results.push(parseTopResult(res.musicCardShelfRenderer, getSearchResultTypes(this.t)) as SearchResult);
        shelfContents = nav(res, ["musicCardShelfRenderer", "contents"], true);
        if (!truthy(shelfContents)) continue;
        shelfContents = [...shelfContents];
        // if "more from youtube" is present, remove it - it's not parseable
        if (has(shelfContents[0], "messageRenderer")) {
          category = nav(shelfContents.shift(), ["messageRenderer", ...TEXT_RUN_TEXT]);
        }
      } else if (has(res, "musicShelfRenderer")) {
        shelfContents = res.musicShelfRenderer.contents;
        if (!has(shelfContents[0], MRLIR)) continue;
        category = nav(res, [...MUSIC_SHELF, ...TITLE_TEXT], true);
      } else if (has(res, "itemSectionRenderer")) {
        shelfContents = res.itemSectionRenderer.contents;
        if (!has(shelfContents[0], MRLIR)) continue;
      } else {
        continue;
      }

      // if we know the filter it's easy to set the result type
      // unfortunately uploads is modeled as a filter (historical reasons),
      //  so we take care to not set the result type for that scope
      if ((has(res, "musicShelfRenderer") || has(res, "itemSectionRenderer")) && internalFilter && scope !== "uploads") {
        // YTM sometimes pads results with a differently-categorized shelf (e.g. a "Songs" shelf
        // when filtering by featured_playlists): skip it rather than mislabeling its contents.
        // The category text is localized, so compare against the translated filter stem.
        const expectedCategory = this.t(internalFilter.slice(0, -1));
        if (category && !category.toLowerCase().includes(expectedCategory.toLowerCase())) continue;
        resultType = internalFilter.slice(0, -1).toLowerCase();
      }

      results.push(...(parseSearchResults(shelfContents, resultType, category) as SearchResult[]));

      // if filter is set, there are continuations
      // (upstream reads res["musicShelfRenderer"] unconditionally and raises KeyError otherwise)
      if (internalFilter && has(res, "musicShelfRenderer")) {
        const shelfResultType = resultType;
        const shelfCategory = category;
        const requestFn = (additionalParams: string) => this.sendRequest("search", body, { additionalParams, signal });
        results.push(
          ...((await getContinuations(res.musicShelfRenderer, "musicShelfContinuation", limit - results.length, requestFn, (c) =>
            parseSearchResults(c, shelfResultType, shelfCategory),
          )) as SearchResult[]),
        );
      }
    }
    return results;
  },

  /** Search suggestions for a (partial) query. */
  async getSearchSuggestions<Detailed extends boolean = false>(
    this: ClientContext,
    query: string,
    options: SearchSuggestionsOptions<Detailed> = {},
  ): Promise<Detailed extends true ? SearchSuggestion[] : string[]> {
    const response = await this.sendRequest("music/get_search_suggestions", { input: query }, { signal: options.signal });
    return parseSearchSuggestions(response, options.detailedRuns ?? false) as Detailed extends true ? SearchSuggestion[] : string[];
  },

  /**
   * Removes suggestions from the search history (requires authentication).
   * @param suggestions result of `getSearchSuggestions(query, { detailedRuns: true })`
   * @returns whether the removal was processed
   */
  async removeSearchSuggestions(
    this: ClientContext,
    suggestions: readonly SearchSuggestion[],
    options: RemoveSearchSuggestionsOptions = {},
  ): Promise<boolean> {
    this.checkAuth();
    if (!suggestions.some((s) => s.fromHistory)) {
      throw new YTMusicUserError(
        "No search result from history provided. Please run getSearchSuggestions first to retrieve suggestions. " +
          "Ensure that you have searched a similar term before.",
      );
    }
    const indices = options.indices ?? suggestions.map((_, i) => i);
    if (indices.some((i) => i >= suggestions.length || i < 0)) {
      throw new YTMusicUserError("Index out of range. Index must be smaller than the length of suggestions");
    }
    const feedbackTokens = indices.map((i) => suggestions[i]!.feedbackToken).filter((t): t is string => t != null);
    if (feedbackTokens.length === 0) return false;

    const response = await this.sendRequest("feedback", { feedbackTokens }, { signal: options.signal, retry: false });
    return Boolean(nav(response, ["feedbackResponses", 0, "isProcessed"], true));
  },
};

/** Options of {@link YTMusic.getSearchSuggestions}. */
export interface SearchSuggestionsOptions<Detailed extends boolean = false> extends CallOptions {
  /**
   * Return {@link SearchSuggestion} objects (with the matched text runs and whether a suggestion
   * comes from the search history) instead of plain strings. Default: `false`.
   */
  detailedRuns?: Detailed;
}

/** Options of {@link YTMusic.removeSearchSuggestions}. */
export interface RemoveSearchSuggestionsOptions extends CallOptions {
  /** Indices of the suggestions to remove. Default: all history suggestions. */
  indices?: readonly number[];
}

/** Search methods of {@link YTMusic}. */
export type SearchMethods = typeof searchMethods;
