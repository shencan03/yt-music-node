export { YTMusic, extractVisitorData, type Logger, type YTMusicOptions } from "./client.ts";
export {
  SUPPORTED_LANGUAGES,
  SUPPORTED_LOCATIONS,
  YTM_BASE_API,
  YTM_DOMAIN,
  type Language,
  type Location,
} from "./constants.ts";
export {
  MOBILE_CLIENT,
  buildContext,
  type AuthType,
  type ClientContext,
  type ClientInfo,
  type ContextOptions,
  type GetRequestOptions,
  type RequestOptions,
} from "./context.ts";
export {
  YTMusicError,
  YTMusicGatedError,
  YTMusicNavigationError,
  YTMusicServerError,
  YTMusicUserError,
  type ServerErrorDetails,
} from "./errors.ts";
export type {
  FetchLike,
  HttpHooks,
  HttpResponse,
  RequestEvent,
  ResponseEvent,
  RetryOptions,
} from "./http.ts";
export { nav, findObjectByKey, findObjectsByKey, type Path, type PathSegment } from "./nav.ts";
export type { JsonArray, JsonObject, JsonPrimitive, JsonValue } from "./types/json.ts";
export type { RawRequestOptions, CallOptions, LimitOptions } from "./context.ts";
export type { RequestBody } from "./http.ts";
export type { Translator } from "./i18n/index.ts";

// auth
export { parseAuth, determineAuthType, type AuthInput, type ParsedAuth } from "./auth/index.ts";
export { parseBrowserHeaders, getAuthorization, sapisidFromCookie, parseCookie } from "./auth/browser.ts";

// endpoint option and result types
export type {
  ArtistOrder,
  HomeOptions,
  ArtistAlbumsOptions,
  GetSongOptions,
  LyricsOptions,
  SignatureTimestampOptions,
  SetTasteProfileOptions,
  BrowsingMethods,
} from "./endpoints/browsing.ts";
export type {
  SearchOptions,
  SearchFilter,
  SearchScope,
  SearchSuggestionsOptions,
  RemoveSearchSuggestionsOptions,
  SearchMethods,
} from "./endpoints/search.ts";
export type { WatchPlaylistOptions, WatchMethods } from "./endpoints/watch.ts";
export type { ChartsOptions, ExploreMethods } from "./endpoints/explore.ts";
export type { PodcastMethods } from "./endpoints/podcasts.ts";
export type { LibraryOrder, LibraryOptions, LibrarySongsOptions, LibraryMethods } from "./endpoints/library.ts";
export type {
  PlaylistSortOrder,
  PlaylistVoteOption,
  WriteStatus,
  GetPlaylistOptions,
  EditPlaylistOptions,
  CreatePlaylistOptions,
  AddPlaylistItemsOptions,
  AddPlaylistItemsResult,
  PlaylistMethods,
} from "./endpoints/playlists.ts";
export {
  SUPPORTED_UPLOAD_TYPES,
  MAX_UPLOAD_SIZE,
  type UploadSource,
  type UploadSongOptions,
  type UploadedAlbum,
  type UploadMethods,
} from "./endpoints/uploads.ts";
export type { LikeStatus, ArtistRef, AlbumRef } from "./parsers/songs.ts";
export type { Description, DescriptionElement } from "./parsers/podcasts.ts";
export type * from "./types/results.ts";
