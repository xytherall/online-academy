"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Floating WhatsApp button for public pages only (SPEC: not portal/admin).
 * Hidden entirely while the footer is on screen, via IntersectionObserver on
 * the page's one <footer>, so it never sits on top of the footer's links.
 */
export function WhatsAppButton({ href }: { href: string }) {
  const [hidden, setHidden] = useState(false);
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;

    const observer = new IntersectionObserver(([entry]) => setHidden(entry.isIntersecting), {
      rootMargin: "0px 0px -1px 0px",
    });
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  return (
    <a
      ref={ref}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      hidden={hidden}
      className="fixed right-5 bottom-5 z-40 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform duration-150 ease-out hover:-translate-y-0.5 motion-reduce:transition-none sm:right-6 sm:bottom-6"
    >
      <WhatsAppGlyph className="size-7" />
    </a>
  );
}

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className={className} fill="currentColor">
      <path d="M16.004 2.667c-7.364 0-13.337 5.973-13.337 13.337 0 2.352.615 4.646 1.783 6.667L2.667 29.333l6.84-1.794a13.27 13.27 0 0 0 6.497 1.698h.006c7.363 0 13.336-5.973 13.336-13.337 0-3.563-1.388-6.913-3.907-9.43a13.246 13.246 0 0 0-9.435-3.903Zm0 24.4a11.03 11.03 0 0 1-5.622-1.54l-.403-.24-4.06 1.065 1.084-3.958-.263-.407a11.047 11.047 0 0 1-1.69-5.883c0-6.106 4.968-11.073 11.076-11.073a11.02 11.02 0 0 1 7.834 3.244 11.015 11.015 0 0 1 3.242 7.838c0 6.106-4.968 11.074-11.075 11.074l-.123-.12Zm6.066-8.293c-.332-.166-1.966-.97-2.271-1.081-.305-.111-.527-.166-.748.167-.222.332-.86 1.08-1.054 1.302-.194.222-.388.25-.72.083-.332-.167-1.4-.516-2.667-1.645-.986-.879-1.652-1.964-1.846-2.296-.194-.333-.021-.512.146-.678.15-.149.333-.388.5-.583.166-.194.221-.333.332-.555.111-.222.056-.417-.028-.583-.083-.167-.748-1.804-1.025-2.47-.27-.648-.544-.56-.748-.57-.194-.01-.416-.012-.638-.012a1.227 1.227 0 0 0-.888.417c-.305.333-1.165 1.139-1.165 2.777 0 1.638 1.193 3.221 1.36 3.444.166.222 2.35 3.588 5.693 5.032.796.343 1.417.549 1.901.703.799.254 1.526.218 2.1.133.641-.096 1.966-.804 2.244-1.581.277-.777.277-1.443.194-1.582-.083-.139-.305-.222-.637-.389Z" />
    </svg>
  );
}
