# Command line

The package includes a small CLI for setting up authentication. Run it with `npx` in a project that depends on `yt-music-node`, or anywhere with `npx yt-music-node@latest`.

```
Usage: yt-music-node <command> [options]

Commands:
  browser   save request headers copied from a logged-in browser session
  verify    check that an auth file signs in (prints no credentials)

Options:
  --file <path>   auth file (default: browser.json)
  -q, --quiet     verify: print only "ok" or the error, not the account name
  -h, --help      show this help
  -v, --version   show the version
```

## `browser`

Creates an auth file from request headers you copy out of your browser's developer tools.

```sh
npx yt-music-node browser                         # writes ./browser.json
npx yt-music-node browser --file ~/.config/ytm.json
```

Paste the headers and press <kbd>Ctrl</kbd>+<kbd>D</kbd> (<kbd>Ctrl</kbd>+<kbd>Z</kbd>, <kbd>Enter</kbd> on Windows). On macOS and Linux the paste isn't echoed; a line count confirms it arrived. Or pipe them in:

```sh
pbpaste | npx yt-music-node browser                              # macOS
wl-paste | npx yt-music-node browser                             # Linux (Wayland)
xclip -o -selection clipboard | npx yt-music-node browser        # Linux (X11)
Get-Clipboard | npx yt-music-node browser                        # Windows PowerShell
```

From a terminal, the command reads input in raw mode, so lines longer than the terminal's line limit (1024 bytes on macOS) arrive whole. Version 0.1.0 didn't, so on macOS it needs `pbpaste |`.

The command:

- accepts Firefox's format and both Chrome/Edge formats (`name: value` lines, or names and values on alternating lines)
- requires a `cookie` and `x-goog-authuser` header, and explains which is missing otherwise
- drops headers that must not be replayed (`host`, `content-length`, `sec-*`, …)
- writes the file with owner-only permissions (`0600`)

The file is compatible with ytmusicapi's `browser.json`. The step-by-step guide is in [set up browser auth](/authentication/browser).

## `verify`

Checks that an auth file signs in. It makes one request (the account menu) and prints the account name. It never prints cookies or headers.

```sh
$ npx yt-music-node verify
✓ browser auth works: signed in as Jane Doe (@janedoe)

$ npx yt-music-node verify --file ~/.config/ytm.json --quiet
ok
```

| Exit code | Meaning |
|---|---|
| `0` | signed in |
| `1` | the file is missing or invalid, or the session doesn't sign in. The message links to the matching [troubleshooting](/authentication/troubleshooting) section. |
| `2` | invalid command-line usage |

Use `--quiet` in CI and scripts: it prints `ok` instead of the account name, so build logs don't show who is signed in.

```sh
npx yt-music-node verify --quiet --file "$YTM_AUTH_FILE" || exit 1
```
