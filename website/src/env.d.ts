/// <reference types="vite/client" />

declare const __APP_BUILD_ID__: string;
declare const __HUNT_YEARS__: number[];

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
