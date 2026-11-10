import { describe, expect, it } from "vitest";
import { YTMusicNavigationError } from "../../src/errors.ts";
import { CAROUSEL_TITLE, findObjectByKey, findObjectsByKey, nav, TITLE_TEXT } from "../../src/nav.ts";

const data = {
  title: { runs: [{ text: "first" }, { text: "second" }] },
  nothing: null,
  list: [1, 2, 3],
};

describe("nav", () => {
  it("walks objects and arrays", () => {
    expect(nav(data, TITLE_TEXT)).toBe("first");
    expect(nav(data, ["title", "runs", 1, "text"])).toBe("second");
  });

  it("supports negative indices like Python", () => {
    expect(nav(data, ["title", "runs", -1, "text"])).toBe("second");
    expect(nav(data, ["list", -3])).toBe(1);
    expect(nav(data, ["list", -4], true)).toBeNull();
  });

  it("throws a navigation error with path details in strict mode", () => {
    let caught: unknown;
    try {
      nav(data, ["title", "missing", "text"]);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(YTMusicNavigationError);
    expect((caught as YTMusicNavigationError).key).toBe("missing");
    expect((caught as YTMusicNavigationError).path).toEqual(["title", "missing", "text"]);
    expect(() => nav(data, ["list", 3])).toThrow(YTMusicNavigationError);
  });

  it("returns null for absent paths in optional mode", () => {
    expect(nav(data, CAROUSEL_TITLE, true)).toBeNull();
    expect(nav(data, ["title", "runs", 5], true)).toBeNull();
  });

  it("treats null intermediates as absent instead of crashing", () => {
    expect(nav(data, ["nothing", "deeper"], true)).toBeNull();
    expect(() => nav(data, ["nothing", "deeper"])).toThrow(YTMusicNavigationError);
  });

  it("returns null values that are present", () => {
    expect(nav(data, ["nothing"])).toBeNull();
  });

  it("returns null for a null root, like upstream", () => {
    expect(nav(null, ["a"])).toBeNull();
    expect(nav(undefined, ["a"])).toBeNull();
  });

  it("does not treat string keys on arrays or prototype keys as present", () => {
    expect(nav(data, ["list", "length"], true)).toBeNull();
    expect(nav(data, ["toString"], true)).toBeNull();
  });
});

describe("findObjectByKey", () => {
  const list = [{ a: 1 }, { b: { inner: 2 } }, { b: 3 }];

  it("finds the first object containing a key", () => {
    expect(findObjectByKey(list, "b")).toEqual({ b: { inner: 2 } });
    expect(findObjectByKey(list, "b", undefined, true)).toEqual({ inner: 2 });
    expect(findObjectByKey(list, "z")).toBeNull();
  });

  it("looks inside a nested key", () => {
    const nested = [{ wrap: { x: 1 } }, { wrap: { y: 2 } }];
    expect(findObjectByKey(nested, "y", "wrap")).toEqual({ y: 2 });
  });

  it("finds all objects containing a key", () => {
    expect(findObjectsByKey(list, "b")).toHaveLength(2);
  });
});
