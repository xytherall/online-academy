import { THEME_STORAGE_KEY } from "@/lib/theme-constants";

// Runs before hydration (next/script strategy="beforeInteractive") so the
// `.dark` class is already correct on <html> for the very first paint — no
// stored choice means "follow the OS setting", matching useTheme()'s runtime
// behaviour in src/lib/theme-store.ts.
export const THEME_INIT_SCRIPT = `(function(){try{var stored=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var dark=stored?stored==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",dark);}catch(e){}})();`;
