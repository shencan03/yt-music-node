---
title: YTMusic
summary: "Create a client"
order: 1
---

# `new YTMusic()`

Creates a client. Every API method is a method of this client. All options are optional and fixed for the client's lifetime. Create one client per account and reuse it.

```ts
import { YTMusic } from "yt-music-node";

const ytm = new YTMusic({ language: "de", location: "DE", retry: 2 });
const results = await ytm.search("rammstein");
```

## Reference

<!-- no-check -->
```ts
new YTMusic(options?: YTMusicOptions)
```

### Options


| Option | Default | Description |
|---|---|---|
| `auth` | – | Browser request headers of a signed-in session, as an object or JSON string. Prefer [`YTMusic.fromAuthFile`](/api/client/fromAuthFile). See [Authentication](/authentication/). |
| `language` | `"en"` | Language of returned text. One of `SUPPORTED_LANGUAGES`: `ar`, `cs`, `de`, `en`, `es`, `fr`, `hi`, `it`, `ja`, `ko`, `nl`, `pt`, `ru`, `tr`, `ur`, `zh_CN`, `zh_TW`. |
| `location` | server's choice | Country code (`gl`) from `SUPPORTED_LOCATIONS`, e.g. `"US"`, `"DE"`, `"IN"`. |
| `user` | – | Brand account id, to act on behalf of a brand account. See [multiple accounts](/authentication/multiple-accounts). |
| `visitorData` | fetched once | Value for the `X-Goog-Visitor-Id` header. When omitted, it is read from the homepage on the first request. Pass it to skip that lookup (useful in serverless functions). |
| `fetch` | `globalThis.fetch` | Your own `fetch`, for proxies, logging or tests. See [proxies and custom fetch](/guide/configuration#proxies-and-custom-fetch). |
| `timeoutMs` | `30000` | Timeout of each HTTP attempt. Uploads use their own default of 10 minutes. |
| `retry` | `false` | Retries for reads on 408/429/5xx and network errors. A number sets the retry count, an object sets the details. Writes are never retried. |
| `hooks` | `{}` | `onRequest` / `onResponse` callbacks for every attempt. |
| `userAgent` | a recent desktop Firefox | `User-Agent` of signed-out requests. Signed-in requests use your browser's. |

### Errors

Throws [`YTMusicUserError`](/guide/errors#ytmusicusererror) right away for an invalid `language`, `location`, `timeoutMs` or `auth`.

## Good to know

- Creating a client is cheap: it opens no connection and starts no background work. On its first request it looks up a visitor id once and caches it.
- Concurrent calls on one client are safe.
- To sign in from a file, use [`YTMusic.fromAuthFile`](/api/client/fromAuthFile) instead of passing `auth`.

## See also

- [Configure the client](/guide/configuration): timeouts, retries, proxies, hooks and serverless use
- [`YTMusicOptions`](/reference/interfaces/YTMusicOptions) in the type reference
