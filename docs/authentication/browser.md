# Set up browser auth

This guide assumes you have never opened your browser's developer tools. It takes about two minutes. You need:

- a desktop browser: Firefox (easiest), Chrome or Edge
- a terminal in your project folder, with Node.js 22 or later
- the YouTube Music account you want to use, signed in at [music.youtube.com](https://music.youtube.com)

::: tip Which browser?
**Firefox** is the easiest and the path this guide was verified with: it has a menu item that copies exactly the right text. Chrome and Edge work too, with one extra click.
:::

## 1. Open YouTube Music, signed in

1. Go to [music.youtube.com](https://music.youtube.com).
2. Make sure you are signed in: your profile picture shows in the top right corner. If you see a **Sign in** button, sign in first.
3. If you are signed in to several Google accounts, switch to the one you want to use (click your profile picture → **Switch account**). See [multiple accounts](/authentication/multiple-accounts).

## 2. Open the Network tab

Open the developer tools with the keyboard shortcut for your browser:

| | Windows / Linux | macOS |
|---|---|---|
| Firefox | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>E</kbd> | <kbd>⌘</kbd>+<kbd>⌥</kbd>+<kbd>E</kbd> |
| Chrome / Edge | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>I</kbd>, then the **Network** tab | <kbd>⌘</kbd>+<kbd>⌥</kbd>+<kbd>I</kbd>, then the **Network** tab |

A panel opens at the bottom or side of the window. Make sure the **Network** tab is selected. In Firefox, the shortcut opens it directly.

## 3. Find a `browse` request

1. In the panel's filter box (**Filter URLs** in Firefox, **Filter** in Chrome/Edge), type `browse`.
2. Click **Library** in YouTube Music's sidebar, or reload the page. Rows appear in the list.
3. Click a row whose **Method** is `POST` and whose file or name starts with `browse?`. Its status should be `200`.

::: details Don't see any rows?
The Network tab only records while it is open. With the panel open, click **Library** or **Home** again, or reload the page with <kbd>F5</kbd> / <kbd>⌘</kbd>+<kbd>R</kbd>.
:::

## 4. Copy the request headers

::: code-group

```txt [Firefox]
Right-click the browse request
  → Copy Value
    → Copy Request Headers
```

```txt [Chrome / Edge]
Click the browse request
  → Headers tab (on the right)
    → scroll to "Request Headers"
      → turn on the "Raw" switch next to it
        → select all of that text (from the first line to the last header) and copy it
```

:::

You now have a block of text on your clipboard that starts with something like `POST /youtubei/v1/browse?…` or `:authority: music.youtube.com` and contains a long `cookie:` line. You don't need to read or edit it.

::: warning Don't paste it anywhere else
This text contains your session cookie. Paste it only into the CLI in the next step. Not into chat, an issue or an AI assistant.
:::

## 5. Save it with the CLI

In your project folder, run:

```sh
npx yt-music-node browser
```

Paste the headers, then finish the input:

- macOS / Linux: press <kbd>Enter</kbd>, then <kbd>Ctrl</kbd>+<kbd>D</kbd>
- Windows: press <kbd>Enter</kbd>, then <kbd>Ctrl</kbd>+<kbd>Z</kbd>, then <kbd>Enter</kbd>

You can also pipe the clipboard into the command:

::: code-group

```sh [macOS]
pbpaste | npx yt-music-node browser
```

```sh [Linux (Wayland)]
wl-paste | npx yt-music-node browser
```

```sh [Linux (X11)]
xclip -o -selection clipboard | npx yt-music-node browser
```

```powershell [Windows PowerShell]
Get-Clipboard | npx yt-music-node browser
```

:::

The CLI checks the headers and writes `browser.json`, readable only by you:

```
Saved /home/you/project/browser.json.
Check it with: npx yt-music-node verify --file "/home/you/project/browser.json"
Use it with:   await YTMusic.fromAuthFile("/home/you/project/browser.json")
```

Use `--file <path>` to save it somewhere else. If you see an error instead, the message links to the matching entry in [troubleshooting](/authentication/troubleshooting).

## 6. Verify

```sh
npx yt-music-node verify
```

```
✓ browser auth works: signed in as Your Name (@yourhandle)
```

If it shows the account you expected, you're done. Close the developer tools.

## 7. Keep it out of git

Add the file to `.gitignore` right away:

```sh
echo "browser.json" >> .gitignore
```

## 8. Use it

```ts
import { YTMusic } from "yt-music-node";

const ytm = await YTMusic.fromAuthFile("browser.json");

const account = await ytm.getAccountInfo();
console.log(`Hi ${account.accountName}!`);

const playlists = await ytm.getLibraryPlaylists();
console.log(playlists.map((p) => p.title));
```

## How long does it last?

As long as the browser session you copied from stays signed in. That's usually months. The session ends, and requests start failing, when:

- you **sign out** of YouTube or Google in that browser
- you clear that browser's cookies
- you remove that session in your Google Account's device list, or change your password
- Google ends the session for security reasons

When that happens, `verify` reports a [signed-out or expired session](/authentication/troubleshooting#signed-out-or-expired-session). Repeat steps 1 to 6 to create a new file.

::: tip A session just for this library
To keep the session independent from your everyday browsing, sign in to YouTube Music in a **private window**, copy the headers there, and close the window **without signing out**. Signing out of your normal browser then doesn't affect the saved file. To end that session later, use your Google Account's device list (see [revoking access](/authentication/security#revoking-access)).
:::

## Without the CLI

`parseBrowserHeaders` is the function the CLI uses. Call it yourself to build auth in code:

```ts
import { readFile } from "node:fs/promises";
import { YTMusic, parseBrowserHeaders } from "yt-music-node";

const raw = await readFile("headers.txt", "utf8"); // the copied request headers
const ytm = new YTMusic({ auth: parseBrowserHeaders(raw) });
```

`auth` also takes the saved JSON as a string or an object.
