import type { HuntYearMetadata } from "../utils/spotLoader";

export function renderHuntHeader(metadata: HuntYearMetadata): HTMLElement {
  const header = document.createElement("div");
  header.className = "hunt-header";

  header.innerHTML = `
    <div class="hunt-header-image">
      <img
        src="${escapeHtml(metadata.image)}"
        alt="${escapeHtml(metadata.imageAlt)}"
        class="hunt-banner"
        loading="lazy"
      />
    </div>
    <div class="hunt-header-content">
      <h2 class="hunt-title">${escapeHtml(metadata.title)}</h2>
      <p class="hunt-year">Year ${metadata.year}</p>
      <p class="hunt-description">${escapeHtml(metadata.description)}</p>
    </div>
  `;

  return header;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
