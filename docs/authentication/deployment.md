# Servers and CI

On your own machine, `browser.json` next to your code is fine. On servers, containers and CI runners, keep the headers in a secret store and hand them to the process at runtime.

## Environment variable

The `auth` option takes the file's content as a string. Store the whole JSON in one secret:

```sh
# put the file's content in a secret, e.g. for local testing:
export YTM_AUTH="$(cat browser.json)"
```

```ts
import { YTMusic } from "yt-music-node";

const auth = process.env.YTM_AUTH;
if (!auth) throw new Error("YTM_AUTH is not set");

const ytm = new YTMusic({ auth });
```

Most platforms have a secret store that ends up as an environment variable: GitHub Actions secrets, Docker/Kubernetes secrets, Fly.io, Railway, Render, Vercel and so on.

## GitHub Actions

1. In the repository: **Settings → Secrets and variables → Actions → New repository secret**. Name it `YTM_AUTH` and paste the content of `browser.json`.
2. Use it in a workflow:

```yaml
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: npm ci
      - name: Check the session
        env:
          YTM_AUTH: ${{ secrets.YTM_AUTH }}
        run: |
          printf '%s' "$YTM_AUTH" > "$RUNNER_TEMP/browser.json"
          npx yt-music-node verify --quiet --file "$RUNNER_TEMP/browser.json"
      - run: node sync.js
        env:
          YTM_AUTH: ${{ secrets.YTM_AUTH }}
```

GitHub masks secret values in logs, but only exact matches. Never print the auth or request headers, and use `verify --quiet` so the log doesn't show the account name.

::: warning Pull requests from forks
Don't expose the secret to workflows that run code from pull requests (`pull_request_target`, or self-hosted runners). Anyone could open a pull request that prints it.
:::

## Docker and Kubernetes

Mount the file as a secret instead of baking it into an image:

```sh
docker run --rm \
  --mount type=bind,source="$PWD/browser.json",target=/run/secrets/ytm-auth,readonly \
  my-app
```

```ts
import { YTMusic } from "yt-music-node";

const ytm = await YTMusic.fromAuthFile("/run/secrets/ytm-auth");
```

In Kubernetes, create a `Secret` from the file (`kubectl create secret generic ytm-auth --from-file=browser.json`) and mount it as a volume, or map it to an environment variable.

Never `COPY` the file into an image. Anyone who can pull the image can read it.

## Health checks

Sessions can end at any time (see [how long it lasts](/authentication/browser#how-long-does-it-last)). Check them so you notice before your jobs fail:

```sh
npx yt-music-node verify --quiet --file /run/secrets/ytm-auth
```

It exits with code `0` when signed in and `1` otherwise. Run it as a scheduled job, a container health check or a CI step. In code:

```ts
import { YTMusic, YTMusicError } from "yt-music-node";

async function sessionIsValid(ytm: YTMusic): Promise<boolean> {
  try {
    return Boolean((await ytm.getAccountInfo()).accountName);
  } catch (error) {
    if (error instanceof YTMusicError) return false;
    throw error;
  }
}
```

## Several processes

One session can serve several processes. They all send the same cookie, and each computes its own authorization header. Very high request rates from one account can trigger rate limits ([HTTP 429](/guide/errors#ytmusicservererror)) or [gated writes](/guide/errors#ytmusicgatederror). Spread the load out, and enable [retries](/guide/configuration#retries).

## Serverless

Pass `visitorData` to skip the homepage lookup on every cold start (see [serverless](/guide/configuration#serverless-and-edge-functions)). Read the auth from an environment variable instead of a file.
