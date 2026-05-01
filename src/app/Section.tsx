"use client";

import { useState } from "react";

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
      <h2>
        <button onClick={() => setIsOpen(!isOpen)}>{title}</button>
      </h2>
      {isOpen && children}
    </section>
  );
};
