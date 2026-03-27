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

let huntsCache: Record<number, HuntYear> | null = null;

export async function loadHunts(): Promise<Record<number, HuntYear>> {
  if (huntsCache) return huntsCache;

  const hunts: Record<number, HuntYear> = {};

  // Load available hunt years (try multiple years, load what's available)
  for (const year of [2026, 2025, 2024, 2023]) {
    try {
      const response = await fetch(`/hunts/${year}/hunt.json`);
      if (response.ok) {
        const hunt = await response.json();
        hunts[hunt.year] = hunt;
      }
    } catch (error) {
      // Silently skip missing years
    }
  }

  huntsCache = hunts;
  return hunts;
}

export async function getSpot(
  year: number,
  spotId: string,
): Promise<SpotDefinition | null> {
  const hunts = await loadHunts();
  return hunts[year]?.spots[spotId] ?? null;
}

export async function getSpotsForYear(year: number): Promise<SpotDefinition[]> {
  const hunts = await loadHunts();
  const hunt = hunts[year];
  if (!hunt) return [];

  // Return all spots for the year (no specific order)
  return Object.values(hunt.spots);
}

export async function getSpotIdsForYear(year: number): Promise<string[]> {
  const hunts = await loadHunts();
  const hunt = hunts[year];
  if (!hunt) return [];

  return Object.keys(hunt.spots);
}

export async function getAvailableYears(): Promise<number[]> {
  const hunts = await loadHunts();
  return Object.keys(hunts)
    .map(Number)
    .sort((a, b) => b - a); // Most recent first
}

export async function getHuntMetadata(
  year: number,
): Promise<HuntYearMetadata | null> {
  const hunts = await loadHunts();
  const hunt = hunts[year];
  if (!hunt) return null;

  return {
    year: hunt.year,
    title: hunt.title,
    description: hunt.description,
    image: hunt.image,
    imageAlt: hunt.imageAlt,
  };
}
