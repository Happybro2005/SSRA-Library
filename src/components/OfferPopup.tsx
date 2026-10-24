"use client";

import { useEffect, useState } from "react";

export type OfferPopupProps = {
  storageKey: string;
  title: string;
  message: string;
  badge?: string | null;
  imageUrl?: string | null;
  ctaText?: string | null;
  ctaLink?: string | null;
  closeLabel: string;
  preview?: boolean;
};

const STORAGE_KEY = "ssra-offer-dismissed";

export function OfferPopup(props: OfferPopupProps) {
  const [open, setOpen] = useState(!!props.preview);

  useEffect(() => {
    if (props.preview) return;
    let dismissed: string | null = null;
    try {
      dismissed = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // storage unavailable (private mode) — just show the popup
    }
    if (dismissed === props.storageKey) return;
    const timer = setTimeout(() => setOpen(true), 1000);
    return () => clearTimeout(timer);
  }, [props.storageKey, props.preview]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function close() {
    setOpen(false);
    if (props.preview) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, props.storageKey);
    } catch {
      // ignore
    }
  }

  if (!open) return null;

  const card = (
    <div
      role="dialog"
      aria-modal={!props.preview}
      aria-labelledby="offer-title"
      className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-4 ring-sun"
    >
      <button
        onClick={close}
        aria-label={props.closeLabel}
        className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-xl font-bold text-ink shadow hover:bg-white"
      >
        ×
      </button>
      <div className="bg-gradient-to-br from-brand via-orange-500 to-sun px-6 pb-6 pt-8 text-center text-white">
        <div className="text-3xl" aria-hidden>
          🪔 ✨ 🪔
        </div>
        <h2 id="offer-title" className="mt-2 text-2xl font-bold leading-snug drop-shadow">
          {props.title}
        </h2>
        {props.badge && (
          <div className="mx-auto mt-4 inline-block rounded-2xl bg-white px-5 py-2 font-display text-3xl font-bold text-brand shadow-lg">
            {props.badge}
          </div>
        )}
      </div>
      {props.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={props.imageUrl} alt="" className="max-h-64 w-full object-cover" />
      )}
      <div className="space-y-4 p-6 text-center">
        <p className="whitespace-pre-line text-lg text-slate-700">{props.message}</p>
        {props.ctaText && props.ctaLink && (
          <a href={props.ctaLink} className="btn-brand w-full py-3 text-lg" onClick={() => !props.preview && close()}>
            {props.ctaText}
          </a>
        )}
      </div>
    </div>
  );

  if (props.preview) return card;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={close}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md">
        {card}
      </div>
    </div>
  );
}
