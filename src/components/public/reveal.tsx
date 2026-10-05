"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Fades its content in (with a small rise) the first time it scrolls into
 * view. The hiding lives in globals.css under `(scripting: enabled)` and
 * `prefers-reduced-motion: no-preference`, so with no JavaScript or with
 * reduced motion the content is simply shown.
 */
export function Reveal({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} data-reveal={shown ? "shown" : "pending"}>
      {children}
    </div>
  );
}
