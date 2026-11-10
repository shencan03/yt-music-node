# Contributing

Thanks for helping. The full guide is at
**https://shencan03.github.io/yt-music-node/contributing/** (source: [`docs/contributing/`](docs/contributing/index.md)).

The short version:

- Every change reaches `main` through a pull request. Nobody pushes to `main` directly.
- Run `npm run check` before you push, and `npm run docs:check` if you touched the docs.
- Fill in the pull request template. CI must pass.
- A maintainer (listed in [`.github/CODEOWNERS`](.github/CODEOWNERS)) reviews, approves and merges.
- Never include `browser.json`, cookies, request headers or responses recorded while signed in.
