"use client";

import { useEffect } from "react";

/** Scrolls an element into view on load (the form's result message is far down the page). */
export function ScrollIntoView({ targetId }: { targetId: string }) {
  useEffect(() => {
    // Wait for Next.js's own scroll-to-top after the redirect, then bring the form into view.
    const timer = setTimeout(() => document.getElementById(targetId)?.scrollIntoView({ block: "start" }), 150);
    return () => clearTimeout(timer);
  }, [targetId]);
  return null;
}
