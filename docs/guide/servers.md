# Use it in a server

How to run yt-music-node in a long-lived service: share one client, stay under YouTube's rate limits, and keep cold starts short.

## A small search API

A zero-dependency HTTP endpoint around `search`:

```ts
import { createServer } from "node:http";
import { YTMusic, YTMusicError } from "yt-music-node";

const ytm = new YTMusic({ retry: 2, timeoutMs: 10_000 });

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const q = url.searchParams.get("q");
  if (url.pathname !== "/search" || !q) {
    res.writeHead(400).end("usage: /search?q=…");
    return;
  }
  try {
    const results = await ytm.search(q, { filter: "songs", limit: 10 });
    const body = results.map((r) => ({ title: r.title, artists: r.artists?.map((a) => a.name), videoId: r.videoId }));
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(body));
  } catch (error) {
    res.writeHead(error instanceof YTMusicError ? 502 : 500).end(String(error));
  }
}).listen(3000, () => console.log("http://localhost:3000/search?q=daft+punk"));
```

One client serves every request: it's safe to share, and it caches the visitor id.

## Concurrency and rate limits

Calls on one client can run concurrently. YouTube rate-limits aggressive clients with HTTP 429, so:

- Run a few requests at a time, not hundreds. A simple queue is enough:

```ts
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!);
    }
  });
  await Promise.all(workers);
  return results;
}

const ids = ["MPREb_4pL8gzRtw1p", "MPREb_n1AxZ9F8rF7"];
const albums = await mapLimit(ids, 3, (id) => ytm.getAlbum(id));
```

- Turn on [`retry`](/guide/configuration#retries): it backs off and honors `Retry-After`.
- Writes to an account are rate-limited more strictly than reads. Space out bulk edits.

## Serverless functions

In a short-lived function, every cold start pays for a visitor-id lookup. Look it up once and pass `visitorData` in: see [serverless and edge functions](/guide/configuration#serverless-and-edge-functions). For a signed-in function, load the auth from an environment variable as shown in [servers and CI](/authentication/deployment).

## Next steps

- [Configure the client](/guide/configuration): timeouts, retries, proxies and hooks
- [Servers and CI](/authentication/deployment): auth without a file on disk
- [Handling errors](/guide/errors): which errors to retry
