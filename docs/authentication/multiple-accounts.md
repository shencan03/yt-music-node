# Multiple accounts

## Several Google accounts in one browser

When you are signed in to more than one Google account in a browser, each one has an index: `0` for the first account you signed in with, `1` for the next, and so on. The copied headers carry the index of the account that was active in the tab, in the `x-goog-authuser` header. The library sends it with every request.

To save headers for a particular account:

1. In YouTube Music, click your profile picture → **Switch account**, and pick the account.
2. Follow [set up browser auth](/authentication/browser) from step 2, with that account active.
3. Run `npx yt-music-node verify` to confirm which account the file signs in as.

Repeat with a different `--file` for each account:

```sh
npx yt-music-node browser --file auth/personal.json
npx yt-music-node browser --file auth/work.json
```

```ts
import { YTMusic } from "yt-music-node";

const personal = await YTMusic.fromAuthFile("auth/personal.json");
const work = await YTMusic.fromAuthFile("auth/work.json");
```

The files share one browser session. Signing out of the browser ends all of them.

::: warning The index can shift
The index depends on the order in which accounts were signed in. If you sign out of one account and back in, the indexes can change, and a saved file may then point at a different account. Run `verify` after any account changes in that browser.
:::

## Brand accounts

A brand account is a channel shared by one or more Google accounts. To act as a brand account, save headers for a Google account that manages it, then pass the brand account's id as `user`:

```ts
import { YTMusic } from "yt-music-node";

const brand = await YTMusic.fromAuthFile("browser.json", { user: "112233445566778899000" });
```

Find the id at [myaccount.google.com/brandaccounts](https://myaccount.google.com/brandaccounts): select the brand account, and the id is the number in the address bar, in `…/b/<id>/…`.

::: info Not tested live
Brand-account support follows ytmusicapi, but the live test suite doesn't run against a brand account yet. Removing history items doesn't work for brand accounts (a YouTube Music limitation).
:::
