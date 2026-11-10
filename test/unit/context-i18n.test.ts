import { describe, expect, it } from "vitest";
import { SUPPORTED_LANGUAGES } from "../../src/constants.ts";
import { buildContext, MOBILE_CLIENT, webClientVersion } from "../../src/context.ts";
import { createTranslator } from "../../src/i18n/index.ts";
import { LOCALES } from "../../src/i18n/locales.ts";

describe("buildContext", () => {
  const now = new Date(Date.UTC(2026, 0, 5, 23, 59));

  it("builds the WEB_REMIX context with a dated client version", () => {
    expect(webClientVersion(now)).toBe("1.20260105.01.00");
    expect(buildContext({ language: "de" }, now)).toEqual({
      context: { client: { clientName: "WEB_REMIX", clientVersion: "1.20260105.01.00", hl: "de" }, user: {} },
    });
  });

  it("adds location and brand account", () => {
    const { context } = buildContext({ language: "en", location: "US", user: "1234" }, now);
    expect(context.client).toMatchObject({ gl: "US", hl: "en" });
    expect(context.user).toEqual({ onBehalfOfUser: "1234" });
  });

  it("overrides the client per call without shared state", () => {
    const mobile = buildContext({ language: "en", client: MOBILE_CLIENT }, now);
    expect(mobile.context.client).toMatchObject({ clientName: "ANDROID_MUSIC", clientVersion: "7.21.50" });
    const web = buildContext({ language: "en" }, now);
    expect(web.context.client).toMatchObject({ clientName: "WEB_REMIX" });
    expect(mobile.context).not.toBe(web.context);
  });
});

describe("i18n", () => {
  it("has a catalog for every supported language", () => {
    for (const language of SUPPORTED_LANGUAGES) expect(LOCALES[language], language).toBeDefined();
  });

  it("translates and falls back to the msgid like gettext", () => {
    const de = createTranslator("de");
    expect(de("artist")).toBe("künstler");
    // de.po uses a non-breaking space, matching YouTube's section title; it must survive conversion
    expect(de("singles & eps")).toBe("singles & eps");
    // empty msgstr in de.po
    expect(de("podcast")).toBe("podcast");
    expect(createTranslator("xx")("album")).toBe("album");
  });

  it("keeps translators independent", () => {
    const ja = createTranslator("ja");
    const en = createTranslator("en");
    expect(ja("artist")).not.toBe(en("artist"));
    expect(en("artist")).toBe("artist");
  });
});
