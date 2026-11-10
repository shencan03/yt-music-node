import { describe, expect, it, vi } from "vitest";
import {
  collect,
  getContinuationToken,
  getContinuations,
  getContinuations2025,
  getReloadableContinuations,
  getValidatedContinuations,
  iterContinuations,
} from "../../src/continuations.ts";

const identity = (items: any[]) => items;

/** Legacy page: `continuations` present while more pages exist. */
function legacyPage(items: number[], next?: string) {
  return {
    contents: items,
    ...(next ? { continuations: [{ nextContinuationData: { continuation: next } }] } : {}),
  };
}

function legacyResponse(items: number[], next?: string) {
  return { continuationContents: { musicShelfContinuation: legacyPage(items, next) } };
}

describe("legacy continuations", () => {
  it("follows tokens until there are no more continuations", async () => {
    const pages: Record<string, any> = {
      "&ctoken=t1&continuation=t1": legacyResponse([3, 4], "t2"),
      "&ctoken=t2&continuation=t2": legacyResponse([5]),
    };
    const request = vi.fn(async (params: string) => pages[params]);
    const items = await getContinuations(legacyPage([1, 2], "t1"), "musicShelfContinuation", null, request, identity);
    expect(items).toEqual([3, 4, 5]);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("stops once the limit is reached without trimming (upstream semantics)", async () => {
    const request = vi.fn(async () => legacyResponse([1, 2, 3], "again"));
    const items = await getContinuations(legacyPage([], "t"), "musicShelfContinuation", 4, request, identity);
    expect(items).toEqual([1, 2, 3, 1, 2, 3]);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("makes no request for limit 0", async () => {
    const request = vi.fn();
    expect(await getContinuations(legacyPage([], "t"), "x", 0, request, identity)).toEqual([]);
    expect(request).not.toHaveBeenCalled();
  });

  it("stops on a response without continuationContents or on an empty page", async () => {
    expect(await getContinuations(legacyPage([], "t"), "x", null, async () => ({}), identity)).toEqual([]);
    const empty = async () => legacyResponse([], "t");
    expect(await getContinuations(legacyPage([], "t"), "musicShelfContinuation", null, empty, identity)).toEqual([]);
  });

  it("reads items from `items` as well as `contents`", async () => {
    const request = async () => ({ continuationContents: { gridContinuation: { items: [9] } } });
    expect(await getContinuations(legacyPage([], "t"), "gridContinuation", null, request, identity)).toEqual([9]);
  });

  it("supports ctokenPath", async () => {
    const results = { continuations: [{ nextRadioContinuationData: { continuation: "r" } }] };
    const request = vi.fn(async () => legacyResponse([1]));
    await getContinuations(results, "musicShelfContinuation", null, request, identity, { ctokenPath: "Radio" });
    expect(request).toHaveBeenCalledWith("&ctoken=r&continuation=r");
  });

  it("is lazy: no request until the generator is consumed", async () => {
    const request = vi.fn(async () => legacyResponse([1]));
    const iterator = iterContinuations(legacyPage([], "t"), "musicShelfContinuation", request, identity);
    expect(request).not.toHaveBeenCalled();
    expect((await iterator.next()).value).toEqual([1]);
  });
});

describe("reloadable continuations", () => {
  it("re-sends the reload token for each batch", async () => {
    const results = { continuations: [{ reloadContinuationData: { continuation: "reload" } }] };
    const request = vi.fn(async (_params: string) => ({
      continuationContents: {
        musicShelfContinuation: { contents: [1, 2], continuations: [{ nextContinuationData: { continuation: "n" } }] },
      },
    }));
    const items = await getReloadableContinuations(results, "musicShelfContinuation", 4, request, identity);
    expect(items).toEqual([1, 2, 1, 2]);
    expect(request.mock.calls.every(([params]) => params === "&ctoken=reload&continuation=reload")).toBe(true);
  });
});

describe("validated continuations", () => {
  it("retries short pages and keeps the best attempt", async () => {
    const responses = [legacyResponse([1], "t2"), legacyResponse([1, 2, 3], "t2"), legacyResponse([4, 5, 6])];
    const request = vi.fn(async () => responses.shift());
    const items = await getValidatedContinuations(legacyPage([], "t1"), "musicShelfContinuation", 6, 3, request, identity);
    expect(items).toEqual([1, 2, 3, 4, 5, 6]);
    expect(request).toHaveBeenCalledTimes(3);
  });

  it("gives up after repeated empty pages instead of looping forever", async () => {
    const request = vi.fn(async () => legacyResponse([], "again"));
    const items = await getValidatedContinuations(legacyPage([], "t"), "musicShelfContinuation", 10, 5, request, identity);
    expect(items).toEqual([]);
    // 3 empty pages x (1 request + 3 retries)
    expect(request).toHaveBeenCalledTimes(12);
  });
});

describe("2025 continuations", () => {
  const token = (t: string) => ({
    continuationItemRenderer: { continuationEndpoint: { continuationCommand: { token: t } } },
  });
  const response = (items: any[]) => ({
    onResponseReceivedActions: [{ appendContinuationItemsAction: { continuationItems: items } }],
  });

  it("reads tokens directly or from commandExecutorCommand", () => {
    expect(getContinuationToken([{ a: 1 }, token("x")])).toBe("x");
    const nested = {
      continuationItemRenderer: {
        continuationEndpoint: {
          commandExecutorCommand: {
            commands: [
              { playlistVotingRefreshPopupCommand: {} },
              { continuationCommand: { request: "CONTINUATION_REQUEST_TYPE_BROWSE", token: "y" } },
            ],
          },
        },
      },
    };
    expect(getContinuationToken([nested])).toBe("y");
    expect(getContinuationToken([{ a: 1 }])).toBeUndefined();
  });

  it("handles an empty result list (upstream raises IndexError)", () => {
    expect(getContinuationToken([])).toBeUndefined();
  });

  it("sends the token in the body and parses each page", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(response([{ v: 2 }, token("b")]))
      .mockResolvedValueOnce(response([{ v: 3 }]));
    const parse = (items: any[]) => items.filter((i) => "v" in i).map((i) => i.v);
    const items = await getContinuations2025({ contents: [{ v: 1 }, token("a")] }, null, request, parse);
    expect(items).toEqual([2, 3]);
    expect(request).toHaveBeenNthCalledWith(1, { continuation: "a" });
    expect(request).toHaveBeenNthCalledWith(2, { continuation: "b" });
  });

  it("stops on empty continuation items", async () => {
    const request = vi.fn().mockResolvedValue(response([]));
    expect(await getContinuations2025({ contents: [token("a")] }, null, request, identity)).toEqual([]);
  });
});

describe("collect", () => {
  it("stops pulling pages after the limit", async () => {
    let pulled = 0;
    async function* pages() {
      for (;;) {
        pulled++;
        yield [1, 2];
      }
    }
    expect(await collect(pages(), 3)).toEqual([1, 2, 1, 2]);
    expect(pulled).toBe(2);
  });
});
