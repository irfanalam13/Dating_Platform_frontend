import { describe, it, expect } from "vitest";
import { get, extractToken, extractUser } from "./parse";

describe("get", () => {
  it("reads a nested value along the key path", () => {
    expect(get({ a: { b: { c: 1 } } }, "a", "b", "c")).toBe(1);
  });

  it("returns undefined when any key along the path is missing", () => {
    expect(get({ a: {} }, "a", "b", "c")).toBeUndefined();
  });

  it("returns undefined (not a throw) when the path hits null/undefined", () => {
    expect(get({ a: null }, "a", "b")).toBeUndefined();
    expect(get(null, "a")).toBeUndefined();
    expect(get(undefined, "a")).toBeUndefined();
  });

  it("returns the object itself when no keys are given", () => {
    const obj = { x: 1 };
    expect(get(obj)).toBe(obj);
  });
});

describe("extractToken", () => {
  it.each([
    ["data.data.tokens.access", { data: { data: { tokens: { access: "t1" } } } }, "t1"],
    ["data.tokens.access", { data: { tokens: { access: "t2" } } }, "t2"],
    ["data.data.access", { data: { data: { access: "t3" } } }, "t3"],
    ["data.access", { data: { access: "t4" } }, "t4"],
    ["access (top level)", { access: "t5" }, "t5"],
  ])("pulls the token from shape: %s", (_label, res, expected) => {
    expect(extractToken(res)).toBe(expected);
  });

  it("prefers the deepest/most-specific shape when several are present", () => {
    const res = {
      data: { data: { tokens: { access: "deep" } }, access: "shallow" },
    };
    expect(extractToken(res)).toBe("deep");
  });

  it("returns null when no token shape matches", () => {
    expect(extractToken({ data: { user: { id: 1 } } })).toBeNull();
    expect(extractToken({})).toBeNull();
    expect(extractToken(null)).toBeNull();
  });

  it("ignores empty-string and non-string tokens", () => {
    expect(extractToken({ data: { access: "" } })).toBeNull();
    expect(extractToken({ access: 123 })).toBeNull();
  });
});

describe("extractUser", () => {
  it("pulls the user from data.data.user", () => {
    expect(extractUser({ data: { data: { user: { id: 7 } } } })).toEqual({ id: 7 });
  });

  it("pulls the user from data.user", () => {
    expect(extractUser({ data: { user: { id: 8 } } })).toEqual({ id: 8 });
  });

  it("falls back to the data object itself", () => {
    expect(extractUser({ data: { id: 9, email: "a@b.c" } })).toEqual({
      id: 9,
      email: "a@b.c",
    });
  });

  it("prefers the most-specific shape over the fallback", () => {
    const res = { data: { user: { id: "specific" }, id: "fallback" } };
    expect(extractUser(res)).toEqual({ id: "specific" });
  });

  it("returns null for arrays and non-object payloads", () => {
    expect(extractUser({ data: [1, 2, 3] })).toBeNull();
    expect(extractUser({ data: "nope" })).toBeNull();
    expect(extractUser(null)).toBeNull();
    expect(extractUser({})).toBeNull();
  });
});
