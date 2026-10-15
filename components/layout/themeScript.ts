// Shared by the server layout (inline script) and the client ThemeProvider. Not a client module,
// so the server can import the script string directly.
export const THEME_STORAGE_KEY = "nodus-theme";
export const DARK_QUERY = "(prefers-color-scheme: dark)";
/** Dark palette is not designed yet: while false, the whole app is forced to light. Flip when dark is ready. */
export const DARK_MODE_ENABLED = false;

/** Inline script for <head>: sets `.dark` before React hydrates, so there's no light flash. */
export const themeInitScript = !DARK_MODE_ENABLED
  ? `(()=>{var e=document.documentElement;e.classList.remove("dark");e.style.colorScheme="light"})()`
  : `(()=>{try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=t==="dark"||(t!=="light"&&matchMedia("${DARK_QUERY}").matches);var e=document.documentElement;e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light"}catch(_){}})()`;
