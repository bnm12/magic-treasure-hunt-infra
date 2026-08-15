import { describe, expect, it } from "vitest";
import {
  createHuntCatalog,
  type HuntYear,
} from "./huntCatalog";

function hunt(year: number, overrides: Partial<HuntYear> = {}): HuntYear {
  return {
    year,
    title: `Hunt ${year}`,
    description: `Description ${year}`,
    image: "images/banner.svg?theme=night&v=old-build",
    imageAlt: `Banner ${year}`,
    spots: {
      "2": {
        name: "Second",
        hint: "Hint two",
        collectedText: "Collected two",
        image: "images/two.svg?size=small",
        imageAlt: "Second image",
      },
      "1": {
        name: "First",
        hint: "Hint one",
        collectedText: "Collected one",
        image: "images/one.svg",
        imageAlt: "First image",
      },
    },
    ...overrides,
  };
}

function response(value: unknown, ok = true): Response {
  return {
    ok,
    json: async () => value,
  } as unknown as Response;
}

function fetchFor(
  fixtures: Record<number, unknown>,
  calls: string[] = [],
): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    const year = Number(url.match(/hunts\/(\d{4})\/hunt\.json/)?.[1]);
    return response(fixtures[year]);
  }) as typeof fetch;
}

describe("hunt catalog", () => {
  it("loads valid hunts with canonical ordering and image URL normalization", async () => {
    const catalog = createHuntCatalog({
      years: [2026, 2025],
      baseUrl: "https://example.test/app/",
      buildVersion: "build-7",
      fetch: fetchFor({ 2025: hunt(2025), 2026: hunt(2026) }),
    });

    const result = await catalog.load();

    expect(result.years).toEqual([2025, 2026]);
    expect(Object.keys(result.hunts)).toEqual(["2025", "2026"]);
    expect(Object.keys(result.hunts[2025]!.spots)).toEqual(["1", "2"]);
    expect(result.hunts[2025]!.image).toBe(
      "https://example.test/app/hunts/2025/images/banner.svg?theme=night&v=build-7",
    );
    expect(result.hunts[2025]!.spots["2"]!.image).toBe(
      "https://example.test/app/hunts/2025/images/two.svg?size=small&v=build-7",
    );
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.hunts)).toBe(true);
    expect(Object.isFrozen(result.hunts[2025]!.spots)).toBe(true);
    expect(Object.isFrozen(result.diagnostics)).toBe(true);

    const spots = await catalog.getSpotsForYear(2025);
    expect(spots.map((spot) => spot.name)).toEqual(["First", "Second"]);
    expect(await catalog.getSpotIdsForYear(2025)).toEqual([1, 2]);
    expect(Object.isFrozen(spots)).toBe(true);
    expect(Object.isFrozen(await catalog.getSpotIdsForYear(2025))).toBe(true);

    const rootRelative = hunt(2025, {
      image: "/shared/banner.svg?theme=night",
      spots: {
        "1": {
          name: "First",
          hint: "Hint",
          collectedText: "Collected",
          image: "https://cdn.test/one.svg?size=small",
          imageAlt: "First image",
        },
      },
    });
    const secondCatalog = createHuntCatalog({
      years: [2025],
      baseUrl: "https://example.test/app/",
      buildVersion: "build-7",
      fetch: fetchFor({ 2025: rootRelative }),
    });
    const second = await secondCatalog.load();
    expect(second.hunts[2025]!.image).toBe("/shared/banner.svg?theme=night");
    expect(second.hunts[2025]!.spots["1"]!.image).toBe(
      "https://cdn.test/one.svg?size=small",
    );
  });

  it("retains valid years and exposes diagnostics for invalid or unavailable hunts", async () => {
    const malformed = hunt(2026, {
      title: "",
      spots: {
        "1": {
          name: "Valid",
          hint: "Hint",
          collectedText: "Collected",
          image: "images/valid.svg",
          imageAlt: "Valid image",
        },
        "01": {
          name: "Duplicate",
          hint: "Hint",
          collectedText: "Collected",
          image: "images/duplicate.svg",
          imageAlt: "Duplicate image",
        },
      },
    });
    const catalog = createHuntCatalog({
      years: [2024, 2025, 2026, 2027, 2028, 2029],
      baseUrl: "https://example.test/",
      fetch: (async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/2024/")) return response(hunt(2023));
        if (url.includes("/2025/")) return response(undefined, false);
        if (url.includes("/2028/")) throw new Error("offline");
        if (url.includes("/2029/")) return response(undefined);
        if (url.includes("/2027/")) return response(hunt(2027));
        return response(malformed);
      }) as typeof fetch,
    });

    const result = await catalog.load();

    expect(result.years).toEqual([2027]);
    expect(Object.keys(result.hunts)).toEqual(["2027"]);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "folder-year-mismatch",
      "unavailable",
      "required-string",
      "spot-id",
      "unavailable",
      "invalid-structure",
    ]);
    expect(result.diagnostics.every((diagnostic) => diagnostic.year > 0)).toBe(
      true,
    );
  });

  it("rejects malformed JSON and invalid image URLs without probing images", async () => {
    const calls: string[] = [];
    const catalog = createHuntCatalog({
      years: [2026],
      baseUrl: "https://example.test/",
      fetch: (async (input: RequestInfo | URL) => {
        calls.push(String(input));
        return response(
          hunt(2026, {
            image: "https://",
          }),
        );
      }) as typeof fetch,
    });

    const result = await catalog.load();

    expect(result.hunts).toEqual({});
    expect(result.diagnostics).toContainEqual({
      year: 2026,
      code: "invalid-url",
      message: "image is not a valid URL",
      path: "image",
    });
    expect(calls).toHaveLength(1);

    const malformedJsonCatalog = createHuntCatalog({
      years: [2026],
      baseUrl: "https://example.test/",
      fetch: (async () =>
        ({
          ok: true,
          json: async () => {
            throw new SyntaxError("bad json");
          },
        }) as unknown as Response) as typeof fetch,
    });
    const malformedJson = await malformedJsonCatalog.load();
    expect(malformedJson.diagnostics).toContainEqual({
      year: 2026,
      code: "invalid-json",
      message: "hunt 2026 is not valid JSON",
    });
  });

  it("deduplicates in-flight loads, caches the session, and supports reload and clear", async () => {
    let calls = 0;
    let current = hunt(2026);
    const catalog = createHuntCatalog({
      years: [2026],
      baseUrl: "https://example.test/",
      fetch: (async () => {
        calls += 1;
        await Promise.resolve();
        return response(current);
      }) as typeof fetch,
    });

    const first = catalog.load();
    const second = catalog.load();
    expect(await first).toBe(await second);
    expect(calls).toBe(1);

    current = hunt(2026, { title: "Reloaded" });
    expect((await catalog.load()).hunts[2026]!.title).toBe("Hunt 2026");
    expect((await catalog.reload()).hunts[2026]!.title).toBe("Reloaded");
    expect(calls).toBe(2);

    catalog.clear();
    await catalog.load();
    expect(calls).toBe(3);
  });

  it("returns null or empty results for unknown years and spots", async () => {
    const catalog = createHuntCatalog({
      years: [2026],
      baseUrl: "https://example.test/",
      fetch: fetchFor({ 2026: hunt(2026) }),
    });

    expect(await catalog.getHunt(2025)).toBeNull();
    expect(await catalog.getSpot(2026, 99)).toBeNull();
    expect(await catalog.getSpotsForYear(2025)).toEqual([]);
    expect(await catalog.getSpotIdsForYear(2025)).toEqual([]);
    expect(await catalog.getAvailableYears()).toEqual([2026]);
    expect(await catalog.getAvailableYearsNewestFirst()).toEqual([2026]);
  });
});
