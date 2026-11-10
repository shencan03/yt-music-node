---
title: YTMusic.fromAuthFile
summary: "Create a signed-in client from an auth file"
order: 2
---

# `YTMusic.fromAuthFile()`

Reads an auth file written by [`npx yt-music-node browser`](/guide/cli) and creates a signed-in client with it.

```ts
import { YTMusic } from "yt-music-node";

const ytm = await YTMusic.fromAuthFile("browser.json", { language: "en", retry: 2 });
const liked = await ytm.getLikedSongs({ limit: 50 });
```

## Reference

<!-- no-check -->
```ts
static fromAuthFile(path: string, options?: Omit<YTMusicOptions, "auth">): Promise<YTMusic>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `path` | `string` | yes | path of the auth file, e.g. `"browser.json"` |
| `options` | `Omit<YTMusicOptions, "auth">` | no | every [client option](/api/client/YTMusic#options) except `auth` |

### Returns

A promise of a signed-in [`YTMusic`](/api/client/YTMusic) client.

### Errors

Throws [`YTMusicUserError`](/guide/errors#ytmusicusererror) when the file can't be read or isn't valid browser auth. [Troubleshooting](/authentication/troubleshooting) explains each message.

## Good to know

- The file format is ytmusicapi's `browser.json`, so the same file works in both libraries.
- Needs a file system: Node.js, Bun and Deno. Elsewhere, read the file yourself and pass its contents as `auth` to [`new YTMusic()`](/api/client/YTMusic).
- The file holds a session cookie. Treat it like a password: see [keeping credentials safe](/authentication/security).

## See also

- [Set up browser auth](/authentication/browser)
- [Servers and CI](/authentication/deployment): loading auth from an environment variable
