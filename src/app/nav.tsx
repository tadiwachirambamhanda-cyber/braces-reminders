import Link from "next/link";

const LINKS = [
  { href: "/", label: "Patients" },
  { href: "/run", label: "Run this week" },
  { href: "/phone", label: "Phone" },
  { href: "/calls", label: "Call list" },
  { href: "/book", label: "Book" },
  { href: "/wording", label: "Wording" },
];

export function Nav() {
  return (
    <nav className="mb-4 flex flex-wrap gap-x-4 gap-y-1 border-b border-neutral-200 pb-2 text-sm">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className="underline">
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
