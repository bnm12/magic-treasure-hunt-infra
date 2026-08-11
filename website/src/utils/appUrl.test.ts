import { describe, it, expect, beforeAll } from "vitest";
import { resolveAppUrl, withBuildVersion } from "./appUrl.ts";

beforeAll(() => {
  // @ts-ignore
  globalThis.__APP_BUILD_ID__ = "1.0.0";
  // @ts-ignore
  globalThis.document = {
    baseURI: "http://localhost/"
  };
});

describe("appUrl utility", () => {
  it("should normalize paths and resolve app URL correctly", () => {
    const url = resolveAppUrl("test-path");
    expect(url).toBe("http://localhost/test-path");
  });

  it("should append build version correctly", () => {
    const url = withBuildVersion("http://localhost/test");
    expect(url).toBe("http://localhost/test?v=1.0.0");
  });
});
