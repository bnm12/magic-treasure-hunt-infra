import { ref } from "vue";

export type PageName = "hunt" | "archive" | "toybox";

export function useRouter() {
  const currentPage = ref<PageName>("hunt");
  // No URL-based routing needed for the main app.
  // The initialize and configureSpot pages have moved to /management/.
  return { currentPage };
}
