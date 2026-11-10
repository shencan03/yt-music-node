/** Origin of YouTube Music. */
export const YTM_DOMAIN = "https://music.youtube.com";
/** Base URL of the InnerTube API that YouTube Music uses. */
export const YTM_BASE_API = `${YTM_DOMAIN}/youtubei/v1/`;
export const YTM_PARAMS = "?alt=json";
export const YTM_PARAMS_KEY = "&key=AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30";

/** Upstream still ships a Firefox 88 (2021) UA; a current one is less likely to be served legacy layouts. */
export const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0";

export const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Headers sent with every request (upstream `initialize_headers`, minus `accept-encoding`, which
 * fetch manages, and `content-encoding: gzip`, which upstream sends on uncompressed bodies).
 */
export const YTMUSIC_INIT_HEADERS: Readonly<Record<string, string>> = {
  "user-agent": USER_AGENT,
  accept: "*/*",
  "content-type": "application/json",
  origin: YTM_DOMAIN,
};

/** Languages with translations available in `locales/` (results are returned in this language). */
export const SUPPORTED_LANGUAGES = [
  "ar", "cs", "de", "en", "es", "fr", "hi", "it", "ja", "ko", "nl", "pt", "ru", "tr", "ur", "zh_CN", "zh_TW",
] as const;
/** A language code from {@link SUPPORTED_LANGUAGES}. */
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

/** Countries YouTube Music accepts as the `gl` (location) context value. */
export const SUPPORTED_LOCATIONS = [
  "AE", "AR", "AT", "AU", "AZ", "BA", "BD", "BE", "BG", "BH", "BO", "BR", "BY", "CA", "CH", "CL",
  "CO", "CR", "CY", "CZ", "DE", "DK", "DO", "DZ", "EC", "EE", "EG", "ES", "FI", "FR", "GB", "GE",
  "GH", "GR", "GT", "HK", "HN", "HR", "HU", "ID", "IE", "IL", "IN", "IQ", "IS", "IT", "JM", "JO",
  "JP", "KE", "KH", "KR", "KW", "KZ", "LA", "LB", "LI", "LK", "LT", "LU", "LV", "LY", "MA", "ME",
  "MK", "MT", "MX", "MY", "NG", "NI", "NL", "NO", "NP", "NZ", "OM", "PA", "PE", "PG", "PH", "PK",
  "PL", "PR", "PT", "PY", "QA", "RO", "RS", "RU", "SA", "SE", "SG", "SI", "SK", "SN", "SV", "TH",
  "TN", "TR", "TW", "TZ", "UA", "UG", "US", "UY", "VE", "VN", "YE", "ZA", "ZW",
] as const;
/** A country code from {@link SUPPORTED_LOCATIONS}. */
export type Location = (typeof SUPPORTED_LOCATIONS)[number];
