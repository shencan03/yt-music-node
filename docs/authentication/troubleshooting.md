# Troubleshooting

Find your error message below. Messages from the CLI link straight to the right section.

**First step for any problem:** run `npx yt-music-node verify` (add `--file <path>` if your file isn't `browser.json`). It tells you whether the saved session signs in, without printing credentials.

## Missing entries in your headers

```
Error: The following entries are missing in your headers: cookie, x-goog-authuser.
Please try a different request (such as /browse) and make sure you are logged in.
```

The pasted text isn't the request headers of a signed-in YouTube Music request.

- **You copied the wrong thing.** In Firefox, use **Copy Value → Copy Request Headers**, not *Copy URL* or *Copy Response Headers*. In Chrome/Edge, copy the **Request Headers** section with **Raw** turned on, not *Response Headers*.
- **You copied the wrong request.** Pick a `POST` request to `browse` on `music.youtube.com`, not a request to another domain or a `GET` for an image or script. See [step 3](/authentication/browser#_3-find-a-browse-request).
- **You aren't signed in** in that tab. Sign in and copy again.
- **Only `x-goog-authuser` is missing.** Some requests don't carry it. Click **Library** and copy that `browse` request.
- **The paste was cut off.** Pipe the clipboard instead of pasting: `pbpaste | npx yt-music-node browser` (see [step 5](/authentication/browser#_5-save-it-with-the-cli)).

## Cookie is missing __Secure-3PAPISID

```
Your cookie is missing the required value __Secure-3PAPISID
```

The `cookie` header has no `SAPISID`-type value, which is needed to compute the authorization header. This usually means the headers came from a signed-out tab, or a privacy extension stripped cookies. Sign in, disable cookie-blocking extensions for music.youtube.com, and copy the headers again.

## Could not determine the auth type

```
Could not determine the auth type: browser request headers with a `cookie` are required.
Create them with `npx yt-music-node browser`.
```

The `auth` you passed has no `cookie`. Typical causes:

- the file isn't a `browser.json` from the CLI or from ytmusicapi
- the environment variable holding the JSON is empty or truncated. Print its **length**, not its content, to check.
- it's an auth file from another tool

Create the file with [`npx yt-music-node browser`](/authentication/browser).

## Invalid auth JSON

```
Invalid auth JSON string provided: …
Invalid auth JSON string provided. To read an auth file, use `await YTMusic.fromAuthFile(path)`.
```

- You passed a file **path** as `auth`. Use `YTMusic.fromAuthFile(path)` instead, or read the file first.
- The JSON is broken, for example truncated when it was stored in a secret, or with quotes changed by a shell. Store the file content exactly as written, and check it with `node -e "JSON.parse(require('fs').readFileSync('browser.json','utf8'))"`.

## Signed out or expired session

```
Error: YouTube Music did not return a signed-in account. The session has probably expired or was signed out.
Error: YouTube Music rejected the credentials (HTTP 401). …
```

The saved session no longer signs in. In code, this shows up as a `YTMusicServerError` with `status` 401 or 403, or as a `YTMusicNavigationError` from methods that expect signed-in pages.

Sessions end when you sign out in that browser, clear its cookies, change your password or sign out the device in your Google Account (see [how long it lasts](/authentication/browser#how-long-does-it-last)). Create a new file by following the [setup guide](/authentication/browser) again.

If it fails right after you created the file:

- Make sure the tab was signed in to the account you expected, and that you didn't sign out afterwards.
- If you closed a private window, that's fine, but don't sign out in it.
- If you use several Google accounts, the [account index may point elsewhere](/authentication/multiple-accounts).

## The wrong account

`verify` prints a different account than you expected. The headers came from a tab where another account was active. Switch accounts in YouTube Music and copy the headers again, or see [multiple accounts](/authentication/multiple-accounts).

## Please provide authentication

```
Please provide authentication before using this function
```

You called a method that needs an account on a client without `auth`. Create the client with `YTMusic.fromAuthFile(path)` or `new YTMusic({ auth })`. The [API pages](/api/) mark these methods **Auth required**.

## YTMusicGatedError

```
YouTube Music did not perform this request and asked for interaction with its '…' dialog.
The account may be temporarily restricted from this action.
```

Authentication worked, but YouTube refused the write. This usually follows many writes in a short time. Wait a while (minutes to hours) and try again, and space out bulk changes. See [errors](/guide/errors#ytmusicgatederror).

## HTTP 409 on upload

`uploadSong` throws a `YTMusicServerError` with `status: 409`: this exact file is already in your uploads. To upload it again, delete the existing upload first (`getLibraryUploadSongs` → `deleteUploadEntity`).

## Other errors

- **HTTP 429**: too many requests. Slow down, and enable [`retry`](/guide/configuration#retries).
- **Timeouts and network errors**: check connectivity and proxies, or raise `timeoutMs`.
- **Anything else**: run `verify`, then [open an issue](https://github.com/shencan03/yt-music-node/issues) with the error message and the `verify` output. **Never include `browser.json`, cookies or request headers.**
