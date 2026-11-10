# Errors

Every error the library throws extends `YTMusicError`. Catch the subclasses you can handle and let the rest propagate.

```
YTMusicError
├── YTMusicUserError         invalid usage: missing auth, bad id, bad option
├── YTMusicServerError       HTTP error, invalid response, network failure, timeout
│   └── YTMusicGatedError    a write was refused with a dialog
└── YTMusicNavigationError   a response had an unexpected structure
```

Aborted calls are the exception: they reject with your signal's reason (an `AbortError` or `TimeoutError` `DOMException`).

```ts
import {
  YTMusic,
  YTMusicGatedError,
  YTMusicNavigationError,
  YTMusicServerError,
  YTMusicUserError,
} from "yt-music-node";

const ytm = new YTMusic({ retry: 2 });

try {
  await ytm.getAlbum("MPREb_4pL8gzRtw1p");
} catch (error) {
  if (error instanceof YTMusicUserError) {
    // fix the call: wrong id, missing auth, invalid option
  } else if (error instanceof YTMusicGatedError) {
    // YouTube refused a write; try again later
  } else if (error instanceof YTMusicServerError) {
    console.error(error.status, error.reason, error.message);
  } else if (error instanceof YTMusicNavigationError) {
    // YouTube changed a layout: please report it
  } else {
    throw error;
  }
}
```

## `YTMusicUserError`

The call can't work as written. Nothing was sent, or the input was rejected before parsing. Typical messages:

| Message | Cause |
|---|---|
| `Please provide authentication before using this function` | an auth-required method on a signed-out client |
| `Invalid album browseId provided, must start with MPRE.` | an id of the wrong kind; see [ids](/guide/concepts#ids-which-one-goes-where) |
| `Invalid filter provided. …` / `Invalid order …` | an option outside the allowed values (types catch most of these) |
| `Could not determine the auth type …` | auth input without a `cookie`; see [troubleshooting](/authentication/troubleshooting) |
| `The provided file type is not supported …` | `uploadSong` with an unsupported extension |

## `YTMusicServerError`

YouTube answered with an error, or didn't answer at all.

| Property | Description |
|---|---|
| `status` | HTTP status; `undefined` for network errors and timeouts |
| `statusText` | HTTP reason phrase |
| `reason` | InnerTube's machine-readable status, e.g. `"INVALID_ARGUMENT"`, `"UNAUTHENTICATED"` |
| `body` | the parsed JSON error body, or the first 1000 characters of a non-JSON body |
| `url` | the request URL without its query string |
| `cause` | the original error for network failures and timeouts |

| Situation | What to do |
|---|---|
| `status` 400, `reason` `INVALID_ARGUMENT` | usually an id that doesn't exist or isn't available in your location |
| `status` 401 / 403 | the session expired or was signed out. Recreate your [auth file](/authentication/troubleshooting#signed-out-or-expired-session) |
| `status` 404 | the item doesn't exist |
| `status` 409 on `uploadSong` | that exact file is already uploaded |
| `status` 429 / 5xx | rate limited or a server problem. Enable [`retry`](/guide/configuration#retries) and slow down |
| no `status`, "Request timed out after …" | raise `timeoutMs`, or retry |
| no `status`, "Network error: …" | DNS, proxy or connectivity. See `cause` |

## `YTMusicGatedError`

A subclass of `YTMusicServerError`. YouTube didn't perform a write and asked to show a dialog instead (the message names the dialog). This happens when an account is temporarily restricted from an action, for example after creating many playlists quickly. Wait and try again. ytmusicapi returns this response as if it were a success.

## `YTMusicNavigationError`

A response didn't have the structure a parser expected. This almost always means YouTube changed a page layout. It is the equivalent of ytmusicapi's `KeyError`.

| Property | Description |
|---|---|
| `path` | the full path the parser followed |
| `key` | the key that was missing |

Please [report it](https://github.com/shencan03/yt-music-node/issues) with the method, its arguments and the message. A [recorded response](/guide/advanced#recording-responses) speeds up the fix a lot. The nightly live tests usually catch layout changes too.

For signed-in calls, this error can also mean the session expired: YouTube then serves the signed-out layout. Run [`npx yt-music-node verify`](/guide/cli#verify) to check.

## Write results

Write methods don't throw when YouTube reports a failure in a successful response. They return what YouTube said:

```ts
const status = await ytm.addPlaylistItems("PLabc", { videoIds: ["hpSrLjc5SMs"] });
if (typeof status === "object" && status.status !== "STATUS_SUCCEEDED") {
  console.warn("not added:", status);
}
```

`"STATUS_SUCCEEDED"` means YouTube confirmed the change. Some playlist actions return `"STATUS_FAILED"` for actions that make no sense, for example adding a playlist to itself.
