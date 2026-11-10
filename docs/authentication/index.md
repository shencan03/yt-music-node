# Authentication

Without signing in, you can search and browse everything public. To reach your own library, edit playlists, rate songs, see your history or upload music, the library needs to act as your account.

It does this the same way the YouTube Music website does: with the **request headers of a signed-in browser session**. You copy them from your browser's developer tools once, and the bundled CLI saves them to a file. This takes about two minutes, and you don't need a Google Cloud project or an API key.

<div class="tip custom-block" style="padding-top: 8px">

**Quick version** (for people who have done this before)

1. Open [music.youtube.com](https://music.youtube.com), signed in, and open the developer tools' **Network** tab.
2. Find a `POST` request to `browse` and copy its **request headers**.
3. Run `npx yt-music-node browser`, paste them, and press <kbd>Ctrl</kbd>+<kbd>D</kbd>.
4. Run `npx yt-music-node verify`.

</div>

Otherwise, follow the step-by-step guide: **[Set up browser auth →](/authentication/browser)**

## What you get

| | |
|---|---|
| Access | everything you can do on music.youtube.com: library, playlists, ratings, history, subscriptions, uploads |
| Lifetime | as long as that browser session stays signed in, which is usually months |
| Setup | about two minutes, once |
| Format | a JSON file of headers (`browser.json`), compatible with ytmusicapi |

## How it works

The saved file contains your session cookie and a few other headers. For every request, the library:

1. sends the cookie, as the browser does
2. computes a fresh `SAPISIDHASH` authorization header from the cookie, the current time and the origin, as the website's JavaScript does
3. adds the account index (`x-goog-authuser`) and, if you set one, the brand account (`user`)

Nothing is sent anywhere except `music.youtube.com` (and `upload.youtube.com` for uploads).

::: danger Treat the file like a password
The cookie in `browser.json` is a Google session cookie. Anyone who has the file can act as you on YouTube and possibly on other Google services. Read [keeping credentials safe](/authentication/security) before you store it anywhere except your own machine.
:::

## Using it

```ts
import { YTMusic } from "yt-music-node";

// from the file the CLI wrote
const ytm = await YTMusic.fromAuthFile("browser.json");

// or from a string, e.g. an environment variable or secret store
const fromEnv = new YTMusic({ auth: process.env.YTM_AUTH });
```

## Guides

- [Set up browser auth](/authentication/browser): step by step for Firefox and Chrome/Edge
- [Multiple accounts](/authentication/multiple-accounts): several Google accounts in one browser, brand accounts
- [Servers and CI](/authentication/deployment): environment variables, secrets, containers, health checks
- [Keeping credentials safe](/authentication/security): storage, sharing, revoking
- [Troubleshooting](/authentication/troubleshooting): every error message and its fix
