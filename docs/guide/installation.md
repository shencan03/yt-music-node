# Installation

## Requirements

- **Node.js 22 or later.** Check with `node --version`.
- Nothing else: the package has no runtime dependencies. Bun and Deno should work but are not tested.

## Add the package

::: code-group

```sh [npm]
npm install yt-music-node
```

```sh [pnpm]
pnpm add yt-music-node
```

```sh [yarn]
yarn add yt-music-node
```

```sh [bun]
bun add yt-music-node
```

<!-- no-check -->
```ts [deno]
import { YTMusic } from "npm:yt-music-node";
```

:::

## Check that it works

Save this as `check.mjs` and run `node check.mjs`:

```js [check.mjs]
import { YTMusic } from "yt-music-node";

const ytm = new YTMusic();
console.log(await ytm.getSearchSuggestions("daft punk"));
// an array of suggestion strings
```

If it prints a list of suggestions, the library can reach YouTube Music.

## ES modules and CommonJS

The package ships both. With ES modules (`"type": "module"` in `package.json`, or `.mjs` files) you can use top-level `await`:

```ts
import { YTMusic } from "yt-music-node";

const ytm = new YTMusic();
const results = await ytm.search("massive attack");
```

With CommonJS, `require` it and wrap your calls in an async function:

```js [check.cjs]
const { YTMusic } = require("yt-music-node");

(async () => {
  const ytm = new YTMusic();
  console.log(await ytm.getSearchSuggestions("taylor"));
})();
```

## TypeScript

Types are included; there's nothing extra to install. Every option and result is typed, and you can import the types by name:

```ts
import { YTMusic, type Album, type SearchResult } from "yt-music-node";

const ytm = new YTMusic();
const album: Album = await ytm.getAlbum("MPREb_4pL8gzRtw1p");
const results: SearchResult[] = await ytm.search("eminem");
```

Recent Node.js versions run `.ts` files directly (`node script.ts`) by stripping the types, so the examples in these docs run without a build step.

## Next steps

- [Your first script](/guide/getting-started): search, then follow ids to an artist and an album
- [Authentication](/authentication/): sign in to reach your library and playlists
