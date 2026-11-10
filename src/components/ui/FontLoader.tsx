"use client";

import { useEffect } from "react";

const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Tamil:wght@400;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap";

/**
 * Loads optional Google Fonts asynchronously after hydration so slow or
 * restricted networks never block initial paint or document load events.
 */
export function FontLoader() {
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    if (document.querySelector(`link[data-inisai-fonts="true"]`)) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = GOOGLE_FONTS_HREF;
    link.setAttribute("data-inisai-fonts", "true");
    link.onerror = () => link.remove();
    document.head.appendChild(link);
  }, []);

  return null;
}

