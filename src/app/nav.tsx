"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Patients" },
  { href: "/run", label: "Run this week" },
  { href: "/phone", label: "Phone" },
  { href: "/calls", label: "Call list" },
  { href: "/book", label: "Book" },
  { href: "/wording", label: "Wording" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="nav-bar flex flex-wrap items-baseline gap-x-8 gap-y-2 border-b border-rule px-12 py-5">
      <span className="nav-brand mr-4">
        <span className="font-serif text-[22px]">Smile Book</span>
        <span className="ml-2 text-[13px] text-soft">Liwan Dental</span>
      </span>
      {LINKS.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`py-2 no-underline ${active ? "border-b-2 border-green font-semibold text-ink" : "text-soft"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
