# Keeping credentials safe

## What the file contains

`browser.json` holds the request headers of your browser session. The important one is the `cookie`, which contains Google session cookies (`SID`, `HSID`, `SSID`, `SAPISID` and others). These are the same cookies that keep you signed in to Google in that browser.

So anyone with the file can:

- do anything on YouTube Music as you: read your history, change your library and playlists, upload, delete
- possibly use other Google services as you, since the cookies aren't limited to YouTube

**Treat the file like your Google password.**

## Do

- **Keep it out of version control.** Add it to `.gitignore` before your first commit. If you commit it by accident, [revoke the session](#revoking-access) and create a new one. Removing the file from git history isn't enough.
- **Keep the permissions tight.** The CLI writes the file with owner-only permissions (`0600`). Keep it that way: `chmod 600 browser.json`.
- **Use a secret store on servers and in CI** (see [servers and CI](/authentication/deployment)).
- **Use a separate session**, created in a private window, so you can revoke it without signing out everywhere (see the [tip](/authentication/browser#how-long-does-it-last)).
- **Consider a separate Google account** for automation that doesn't need your personal library.

## Don't

- Paste the headers or the file into issues, chat, forums, screenshots, pastebins or AI assistants. When asking for help, share the error message and `npx yt-music-node verify` output instead. Neither contains credentials.
- Log request headers, for example from an `onRequest` [hook](/guide/configuration#hooks).
- Bake the file into a container image or a client-side bundle.
- Run code you don't trust in a process that has your auth loaded.

## What the library does

- Sends the credentials only to `music.youtube.com`, and to `upload.youtube.com` for uploads.
- Never logs headers or cookies. `verify` prints only the account name, or `ok` with `--quiet`.
- Computes the `SAPISIDHASH` authorization header fresh for every request instead of reusing a captured one.
- Stores nothing on disk except what you ask the CLI to write.

## Revoking access

To end the session behind a saved file:

1. Go to [myaccount.google.com/device-activity](https://myaccount.google.com/device-activity) (Google Account → **Security** → **Your devices**).
2. Find the browser session you copied the headers from, by browser, operating system and last activity.
3. Choose **Sign out**.

Signing out of YouTube or Google in that browser ends it too. If you think the file leaked and you aren't sure which session it was, change your Google password: that ends all sessions. Then delete every copy of the file.
