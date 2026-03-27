import type { SpotDefinition } from "../utils/spotLoader";

export function renderSpotCard(
  spot: SpotDefinition,
  isCollected: boolean,
): HTMLElement {
  const card = document.createElement("div");
  card.className = `spot-card ${isCollected ? "collected" : "uncollected"}`;

  card.innerHTML = `
    <div class="spot-image-wrapper">
      <img 
        src="${escapeHtml(spot.image)}" 
        alt="${escapeHtml(spot.imageAlt)}"
        class="spot-image"
        loading="lazy"
      />
      ${isCollected ? '<div class="collected-badge">✓ Collected</div>' : ""}
    </div>
    <div class="spot-content">
      <h3 class="spot-name">${escapeHtml(spot.name)}</h3>
      ${spot.location ? `<p class="spot-location">${escapeHtml(spot.location)}</p>` : ""}
      <p class="spot-text ${isCollected ? "collected-text" : "hint-text"}">
        ${escapeHtml(isCollected ? spot.collectedText : spot.hint)}
      </p>
    </div>
  `;

  return card;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
