/**
 * Live tests against music.youtube.com. Run with `npm run test:live`.
 * Skipped by default so the unit suite stays offline and deterministic.
 */
import { describe, expect, it } from "vitest";
import { MOBILE_CLIENT, nav, YTMusic, YTMusicServerError } from "../../src/index.ts";
import { SECTION_LIST, SINGLE_COLUMN_TAB } from "../../src/nav.ts";

const live = describe.skipIf(!process.env.YTM_LIVE);

live("live: unauthenticated core", () => {
  const ytm = new YTMusic({ retry: 2 });

  it("browses the home feed", async () => {
    const response = await ytm.request("browse", { browseId: "FEmusic_home" });
    const sections = nav(response, [...SINGLE_COLUMN_TAB, ...SECTION_LIST]);
    expect(Array.isArray(sections)).toBe(true);
    expect(sections.length).toBeGreaterThan(0);
  });

  it("searches", async () => {
    const response = await ytm.request("search", { query: "oasis wonderwall" });
    expect(nav(response, ["contents", "tabbedSearchResultsRenderer"], true)).toBeDefined();
  });

  it("works as the mobile client", async () => {
    const response = await ytm.request("browse", { browseId: "FEmusic_home" }, { client: MOBILE_CLIENT });
    expect(response.responseContext).toBeDefined();
  });

  it("returns structured server errors", async () => {
    const error = await ytm.request("browse", { browseId: "definitely-not-valid" }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(YTMusicServerError);
    expect((error as YTMusicServerError).status).toBeGreaterThanOrEqual(400);
  });
});
