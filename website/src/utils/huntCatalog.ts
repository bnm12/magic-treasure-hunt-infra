import { resolveAppUrl } from "./appUrl";

export interface SpotDefinition {
  name: string;
  hint: string;
  collectedText: string;
  image: string;
  imageAlt: string;
  location?: string;
}

export interface HuntYearMetadata {
  year: number;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
}

export interface HuntYear extends HuntYearMetadata {
  spots: Record<string, SpotDefinition>;
}

export type ReadonlySpotDefinition = Readonly<SpotDefinition>;
export type ReadonlyHuntYear = Readonly<Omit<HuntYear, "spots">> & {
  readonly spots: Readonly<Record<string, ReadonlySpotDefinition>>;
};
export type HuntCatalogHunts = Readonly<Record<number, ReadonlyHuntYear>>;

export type HuntDiagnosticCode =
  | "unavailable"
  | "invalid-json"
  | "invalid-structure"
  | "folder-year-mismatch"
  | "required-string"
  | "spot-id"
  | "invalid-url";

export interface HuntDiagnostic {
  readonly year: number;
  readonly code: HuntDiagnosticCode;
  readonly message: string;
  readonly path?: string;
}

export interface HuntCatalogSnapshot {
  readonly hunts: HuntCatalogHunts;
  readonly years: readonly number[];
  readonly diagnostics: readonly HuntDiagnostic[];
}

export interface HuntCatalogOptions {
  years?: readonly number[];
  fetch?: typeof fetch;
  baseUrl?: string | URL | ((year: number) => string | URL);
  buildVersion?: string;
}

type HuntFetcher = typeof fetch;

const REQUIRED_HUNT_FIELDS = [
  "title",
  "description",
  "image",
  "imageAlt",
] as const;
const REQUIRED_SPOT_FIELDS = [
  "name",
  "hint",
  "collectedText",
  "image",
  "imageAlt",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }

  for (const nested of Object.values(value as Record<string, unknown>)) {
    deepFreeze(nested);
  }
  return Object.freeze(value);
}

function appendVersion(url: string, buildVersion: string | undefined): string {
  if (!buildVersion) return url;
  const parsed = new URL(url);
  parsed.searchParams.set("v", buildVersion);
  return parsed.toString();
}

function isAbsoluteUrl(value: string): boolean {
  try {
    return Boolean(new URL(value).protocol);
  } catch {
    return false;
  }
}

function normalizeImage(
  value: string,
  baseUrl: URL,
  buildVersion: string | undefined,
): string {
  if (/[^\S\r\n]|[\u0000-\u001f\u007f]/.test(value)) {
    throw new TypeError("invalid URL syntax");
  }
  if (value.startsWith("/")) {
    new URL(value, baseUrl);
    return value;
  }
  if (isAbsoluteUrl(value)) return value;
  if (value.includes("://")) {
    throw new TypeError("invalid URL syntax");
  }
  return appendVersion(new URL(value, baseUrl).toString(), buildVersion);
}

function diagnostic(
  year: number,
  code: HuntDiagnosticCode,
  message: string,
  path?: string,
): HuntDiagnostic {
  return path ? { year, code, message, path } : { year, code, message };
}

function resolveBaseUrl(
  baseUrl: HuntCatalogOptions["baseUrl"],
  year: number,
): URL {
  if (typeof baseUrl === "function") {
    const resolved = String(baseUrl(year));
    return new URL(resolved, ensureTrailingSlash(resolved));
  }

  const configured = baseUrl
    ? new URL(String(baseUrl))
    : new URL(resolveAppUrl(""));
  const pathname = configured.pathname.replace(/\/+$/, "");
  if (pathname.endsWith("/hunts")) {
    return new URL(`${year}/`, ensureTrailingSlash(configured.toString()));
  }
  return new URL(`hunts/${year}/`, ensureTrailingSlash(configured.toString()));
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function validateImage(
  value: unknown,
  year: number,
  path: string,
  baseUrl: URL,
  buildVersion: string | undefined,
  diagnostics: HuntDiagnostic[],
): string | null {
  if (!isNonEmptyString(value)) {
    diagnostics.push(diagnostic(year, "required-string", `${path} must be a non-empty string`, path));
    return null;
  }

  try {
    return normalizeImage(value, baseUrl, buildVersion);
  } catch {
    diagnostics.push(diagnostic(year, "invalid-url", `${path} is not a valid URL`, path));
    return null;
  }
}

function validateHunt(
  value: unknown,
  folderYear: number,
  baseUrl: URL,
  buildVersion: string | undefined,
): { hunt: HuntYear | null; diagnostics: HuntDiagnostic[] } {
  const diagnostics: HuntDiagnostic[] = [];
  if (!isRecord(value)) {
    diagnostics.push(
      diagnostic(folderYear, "invalid-structure", "hunt.json must contain an object"),
    );
    return { hunt: null, diagnostics };
  }

  if (
    typeof value.year !== "number" ||
    !Number.isSafeInteger(value.year) ||
    value.year < 1
  ) {
    diagnostics.push(
      diagnostic(folderYear, "invalid-structure", "year must be a positive integer", "year"),
    );
  } else if (value.year !== folderYear) {
    diagnostics.push(
      diagnostic(
        folderYear,
        "folder-year-mismatch",
        `folder year ${folderYear} does not match hunt year ${value.year}`,
        "year",
      ),
    );
  }

  const strings: Partial<Record<(typeof REQUIRED_HUNT_FIELDS)[number], string>> = {};
  for (const field of REQUIRED_HUNT_FIELDS) {
    if (!isNonEmptyString(value[field])) {
      diagnostics.push(
        diagnostic(
          folderYear,
          "required-string",
          `${field} must be a non-empty string`,
          field,
        ),
      );
    } else {
      strings[field] = value[field];
    }
  }

  const image = isNonEmptyString(value.image)
    ? validateImage(
        value.image,
        folderYear,
        "image",
        baseUrl,
        buildVersion,
        diagnostics,
      )
    : null;

  if (!isRecord(value.spots)) {
    diagnostics.push(
      diagnostic(folderYear, "invalid-structure", "spots must be an object", "spots"),
    );
    return { hunt: null, diagnostics };
  }

  const spots: Record<string, SpotDefinition> = {};
  const numericIds = new Set<number>();
  for (const [rawId, rawSpot] of Object.entries(value.spots)) {
    if (!/^[1-9]\d*$/.test(rawId)) {
      diagnostics.push(
        diagnostic(
          folderYear,
          "spot-id",
          `spot id "${rawId}" must be a positive numeric string`,
          `spots.${rawId}`,
        ),
      );
      continue;
    }
    const spotId = Number(rawId);
    if (!Number.isSafeInteger(spotId) || numericIds.has(spotId)) {
      diagnostics.push(
        diagnostic(
          folderYear,
          "spot-id",
          `spot id "${rawId}" is not a unique safe numeric id`,
          `spots.${rawId}`,
        ),
      );
      continue;
    }
    numericIds.add(spotId);

    if (!isRecord(rawSpot)) {
      diagnostics.push(
        diagnostic(
          folderYear,
          "invalid-structure",
          `spot ${rawId} must be an object`,
          `spots.${rawId}`,
        ),
      );
      continue;
    }

    const spotStrings: Partial<
      Record<(typeof REQUIRED_SPOT_FIELDS)[number], string>
    > = {};
    for (const field of REQUIRED_SPOT_FIELDS) {
      if (!isNonEmptyString(rawSpot[field])) {
        diagnostics.push(
          diagnostic(
            folderYear,
            "required-string",
            `spots.${rawId}.${field} must be a non-empty string`,
            `spots.${rawId}.${field}`,
          ),
        );
      } else {
        spotStrings[field] = rawSpot[field];
      }
    }
    if (rawSpot.location !== undefined && typeof rawSpot.location !== "string") {
      diagnostics.push(
        diagnostic(
          folderYear,
          "required-string",
          `spots.${rawId}.location must be a string`,
          `spots.${rawId}.location`,
        ),
      );
    }

    const spotImage = isNonEmptyString(rawSpot.image)
      ? validateImage(
          rawSpot.image,
          folderYear,
          `spots.${rawId}.image`,
          baseUrl,
          buildVersion,
          diagnostics,
        )
      : null;
    if (
      spotImage !== null &&
      REQUIRED_SPOT_FIELDS.every((field) => isNonEmptyString(spotStrings[field]))
    ) {
      spots[rawId] = {
        name: spotStrings.name!,
        hint: spotStrings.hint!,
        collectedText: spotStrings.collectedText!,
        image: spotImage,
        imageAlt: spotStrings.imageAlt!,
        ...(rawSpot.location === undefined ? {} : { location: rawSpot.location as string }),
      };
    }
  }

  const hasErrors = diagnostics.length > 0;
  if (
    hasErrors ||
    image === null ||
    !Number.isSafeInteger(value.year) ||
    value.year !== folderYear ||
    REQUIRED_HUNT_FIELDS.some((field) => !isNonEmptyString(strings[field]))
  ) {
    return { hunt: null, diagnostics };
  }

  const sortedSpots: Record<string, SpotDefinition> = {};
  for (const id of Object.keys(spots).sort((a, b) => Number(a) - Number(b))) {
    sortedSpots[id] = spots[id]!;
  }
  return {
    hunt: {
      year: value.year,
      title: strings.title!,
      description: strings.description!,
      image,
      imageAlt: strings.imageAlt!,
      spots: sortedSpots,
    },
    diagnostics,
  };
}

function defaultYears(): number[] {
  const discoveredYears =
    typeof __HUNT_YEARS__ === "undefined" ? [] : __HUNT_YEARS__;
  return [...discoveredYears].sort((a, b) => a - b);
}

export interface HuntCatalog {
  load(): Promise<HuntCatalogSnapshot>;
  reload(): Promise<HuntCatalogSnapshot>;
  clear(): void;
  getHunts(): Promise<HuntCatalogHunts>;
  getHunt(year: number): Promise<ReadonlyHuntYear | null>;
  getSpot(year: number, spotId: number): Promise<ReadonlySpotDefinition | null>;
  getSpotsForYear(year: number): Promise<readonly ReadonlySpotDefinition[]>;
  getSpotIdsForYear(year: number): Promise<readonly number[]>;
  getAvailableYears(): Promise<readonly number[]>;
  getAvailableYearsNewestFirst(): Promise<readonly number[]>;
  getDiagnostics(): Promise<readonly HuntDiagnostic[]>;
}

export function createHuntCatalog(options: HuntCatalogOptions = {}): HuntCatalog {
  const years = [...(options.years ?? defaultYears())]
    .filter((year) => Number.isSafeInteger(year) && year > 0)
    .sort((a, b) => a - b)
    .filter((year, index, all) => index === 0 || year !== all[index - 1]);
  const fetcher: HuntFetcher = options.fetch ?? fetch;
  const buildVersion =
    options.buildVersion ??
    (typeof __APP_BUILD_ID__ === "undefined" ? undefined : __APP_BUILD_ID__);
  let cached: HuntCatalogSnapshot | null = null;
  let inFlight: Promise<HuntCatalogSnapshot> | null = null;
  let generation = 0;

  const load = (): Promise<HuntCatalogSnapshot> => {
    if (cached) return Promise.resolve(cached);
    if (inFlight) return inFlight;

    const requestGeneration = generation;
    const request = Promise.all(
      years.map(async (year) => {
        const baseUrl = resolveBaseUrl(options.baseUrl, year);
        const jsonUrl = appendVersion(
          new URL("hunt.json", baseUrl).toString(),
          buildVersion,
        );
        try {
          const response = await fetcher(jsonUrl);
          if (response.ok === false) {
            return {
              hunt: null,
              diagnostics: [
                diagnostic(year, "unavailable", `hunt ${year} returned HTTP ${response.status || "error"}`),
              ],
            };
          }
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            return {
              hunt: null,
              diagnostics: [diagnostic(year, "invalid-json", `hunt ${year} is not valid JSON`)],
            };
          }
          return validateHunt(data, year, baseUrl, buildVersion);
        } catch {
          return {
            hunt: null,
            diagnostics: [diagnostic(year, "unavailable", `hunt ${year} could not be loaded`)],
          };
        }
      }),
    ).then((results) => {
      const hunts: Record<number, HuntYear> = {};
      const diagnostics: HuntDiagnostic[] = [];
      for (const result of results) {
        diagnostics.push(...result.diagnostics);
        if (result.hunt) hunts[result.hunt.year] = result.hunt;
      }
      return deepFreeze({
        hunts,
        years: Object.keys(hunts).map(Number).sort((a, b) => a - b),
        diagnostics,
      });
    });

    const trackedRequest = request.then((result) => {
      if (generation === requestGeneration) cached = result;
      return result;
    });
    inFlight = trackedRequest;
    inFlight.then(() => {
      if (inFlight === trackedRequest) inFlight = null;
    }, () => {
      if (inFlight === trackedRequest) inFlight = null;
    });
    return inFlight;
  };

  return {
    load,
    reload: () => {
      cached = null;
      generation += 1;
      inFlight = null;
      return load();
    },
    clear: () => {
      cached = null;
      generation += 1;
      inFlight = null;
    },
    getHunts: () => load().then((result) => result.hunts),
    getHunt: (year) => load().then((result) => result.hunts[year] ?? null),
    getSpot: (year, spotId) =>
      load().then((result) => result.hunts[year]?.spots[String(spotId)] ?? null),
    getSpotsForYear: (year) =>
      load().then((result) => {
        const hunt = result.hunts[year];
        if (!hunt) return Object.freeze([]);
        return Object.freeze(
          Object.entries(hunt.spots)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([, spot]) => spot),
        );
      }),
    getSpotIdsForYear: (year) =>
      load().then((result) => {
        const hunt = result.hunts[year];
        if (!hunt) return Object.freeze([]);
        return Object.freeze(
          Object.keys(hunt.spots)
            .map(Number)
            .sort((a, b) => a - b),
        );
      }),
    getAvailableYears: () => load().then((result) => result.years),
    getAvailableYearsNewestFirst: () =>
      load().then((result) =>
        Object.freeze([...result.years].sort((a, b) => b - a)),
      ),
    getDiagnostics: () => load().then((result) => result.diagnostics),
  };
}

const defaultCatalog = createHuntCatalog();

export const loadHuntCatalog = (): Promise<HuntCatalogSnapshot> =>
  defaultCatalog.load();
export const loadHunts = (): Promise<HuntCatalogHunts> =>
  defaultCatalog.getHunts();
export const reloadHuntCatalog = (): Promise<HuntCatalogSnapshot> =>
  defaultCatalog.reload();
export const reloadHunts = (): Promise<HuntCatalogHunts> =>
  defaultCatalog.reload().then((result) => result.hunts);
export const clearHuntCatalog = (): void => defaultCatalog.clear();
export const clearHuntCache = (): void => defaultCatalog.clear();
export const getHuntCatalogDiagnostics = (): Promise<readonly HuntDiagnostic[]> =>
  defaultCatalog.getDiagnostics();
export const getHunt = (year: number): Promise<ReadonlyHuntYear | null> =>
  defaultCatalog.getHunt(year);
export const getSpot = (
  year: number,
  spotId: number,
): Promise<ReadonlySpotDefinition | null> => defaultCatalog.getSpot(year, spotId);
export const getSpotsForYear = (
  year: number,
): Promise<readonly ReadonlySpotDefinition[]> =>
  defaultCatalog.getSpotsForYear(year);
export const getSpotIdsForYear = (year: number): Promise<readonly number[]> =>
  defaultCatalog.getSpotIdsForYear(year);
export const getAvailableYears = (): Promise<readonly number[]> =>
  defaultCatalog.getAvailableYears();
export const getAvailableYearsNewestFirst = (): Promise<readonly number[]> =>
  defaultCatalog.getAvailableYearsNewestFirst();
