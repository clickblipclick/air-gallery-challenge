"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";

export const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <section className="w-full px-8">
      <h2 className="mb-3">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-neutral-600 hover:text-neutral-900"
        >
          <ChevronRight
            aria-hidden
            size={16}
            className={`transition-transform ${isOpen ? "rotate-90" : ""}`}
          />
          {title}
        </button>
      </h2>
      {isOpen && children}
    </section>
  );
};
