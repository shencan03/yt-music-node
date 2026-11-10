# Test your code

Test code that uses yt-music-node without the network, and record real responses to test against.

## Use a fake fetch

Pass a fake `fetch` to test code that uses the library without the network:

```ts
import { YTMusic, type FetchLike } from "yt-music-node";

const calls: string[] = [];
const fakeFetch: FetchLike = async (url, init) => {
  calls.push(`${init.method} ${new URL(url).pathname}`);
  return new Response(JSON.stringify({ actions: [] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};

// visitorData skips the homepage lookup, so only your requests reach the fake
const ytm = new YTMusic({ fetch: fakeFetch, visitorData: "test" });
await ytm.request("music/get_search_suggestions", { input: "x" });
console.log(calls); // [ 'POST /youtubei/v1/music/get_search_suggestions' ]
```

To return realistic data, record real responses with [hooks](#record-real-responses) and serve them from the fake.

## Record real responses

When a method breaks after a layout change, a recording of the raw response is the fastest way to a fix. `hooks.onResponse` sees every response body:

```ts
import { writeFileSync } from "node:fs";
import { YTMusic } from "yt-music-node";

let n = 0;
const ytm = new YTMusic({
  hooks: {
    onResponse: ({ url, status, text }) => {
      if (!url.includes("/youtubei/v1/")) return;
      const endpoint = new URL(url).pathname.split("/v1/")[1]!.replaceAll("/", "_");
      writeFileSync(`recording-${++n}-${endpoint}-${status}.json`, text);
    },
  },
});

await ytm.getArtist("UCmMUZbaYdNH0bEd1PAlAqsA").catch((error) => console.error(error));
```

::: warning Check recordings before sharing
Signed-in responses contain your account name, playlists and listening history. Record with a signed-out client when you can, and read a recording before attaching it to an issue.
:::

To turn a recording into a regression test, see [contributing: testing](/contributing/testing#golden-tests).

## Next steps

- [Configure the client](/guide/configuration#hooks): every hook and its fields
- [Contributing: testing](/contributing/testing): how this library tests itself
