# Writing docs

This site is built with [VitePress](https://vitepress.dev) from `docs/`. The type reference is generated with [TypeDoc](https://typedoc.org).

```sh
npm run docs:dev      # local site with hot reload (generates the reference first)
npm run docs:build    # static site in docs/.vitepress/dist
npm run docs:check    # what CI checks
```

## What `docs:check` checks

1. **TSDoc on every export.** TypeDoc runs with `notDocumented` validation, and warnings are errors. An undocumented export fails the build.
2. **The coverage matrix is current, and every method is documented.** `scripts/docs-coverage.ts --check` fails if a public method has no `## methodName` entry on an API page, or if `docs/api/coverage.md` is out of date (`npm run docs:coverage` regenerates it).
3. **Every TypeScript example compiles.** `scripts/docs-typecheck.ts` extracts each ` ```ts ` block and typechecks it against the source. Blocks that use `ytm` without creating it get a `declare const ytm: YTMusic`. Put `<!-- no-check -->` on the line before a block to skip it (for example for partial snippets). Method signature blocks are skipped automatically.
4. **No dead links.** The VitePress build fails on broken internal links.

## API page entries

Every method gets the same shape:

````md
## `methodName`

<MethodInfo name="methodName" auth="none" />

```ts
methodName(arg: string, options?: Options): Promise<Result>
```

What it does, in one or two sentences.

| Option | Type | Default | Description |
|---|---|---|---|

A short, typed example.

<details class="example"><summary>Example output</summary>

<<< @/examples/method-name.json

</details>

**Throws** … (only the errors specific to this method).
````

`<MethodInfo>` renders the auth badge, the test suites that call the method (read from the coverage data) and the ytmusicapi name. Props:

| Prop | Values |
|---|---|
| `auth` | `"none"`, `"optional"` (more data when signed in), `"required"` |
| `write` | set for methods that change the account |
| `upstream` | the ytmusicapi name, when it isn't the snake_case form of `name` |

## Example outputs

`docs/examples/*.json` are real responses, recorded signed out by `scripts/doc-examples.ts` and trimmed: arrays keep their first items plus a `"… N more"` marker, thumbnail lists keep one entry, and long strings are cut. Lyric texts are replaced, because lyrics are copyrighted. Regenerate them when YouTube changes a layout:

```sh
npm run docs:examples
```

**Never commit output from a signed-in client.** It contains account names, playlists and history.

## Style

- Write for someone who hasn't used ytmusicapi.
- Show code that runs, with real ids.
- Say what's verified and what isn't. If a behavior wasn't tested, don't claim it.
- Don't put credentials, real account names or personal ids in examples.
