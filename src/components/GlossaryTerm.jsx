// src/components/GlossaryTerm.jsx

import { useState, useRef, useEffect } from "react";
import GLOSSARY from "../data/glossary";

export function GlossaryTerm({ term, definition }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <span ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="italic text-secondary-300 underline decoration-dotted underline-offset-2 cursor-help focus:outline-none focus-visible:ring-1 focus-visible:ring-secondary-300 rounded"
        aria-expanded={open}
        aria-label={`Definition of: ${term}`}
      >
        {term}
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute z-50 bottom-full left-0 mb-2 w-64 rounded-xl bg-primary-900 border border-primary-600 px-3 py-2.5 text-xs text-primary-100 leading-relaxed shadow-lg"
        >
          <span className="font-semibold text-secondary-300 block mb-1">{term}</span>
          {definition}
          <span className="absolute left-3 top-full w-2.5 h-2.5 bg-primary-900 border-r border-b border-primary-600 rotate-45 -mt-1.5 block" />
        </span>
      )}
    </span>
  );
}

export function EmRenderer({ children }) {
  const text = String(children);
  const definition = GLOSSARY[text.toLowerCase().trim()];
  if (definition) return <GlossaryTerm term={text} definition={definition} />;
  return <em>{children}</em>;
}