"use client";

import Link, { useLinkStatus } from "next/link";
import { Spinner } from "./spinner";
import { usePathname } from "next/navigation";

// Ambil week dari URL (mis. /week/2026-W44/matriks) supaya pindah menu tetap di week yang sama.
function weekFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/week\/([^/]+)/);
  return match ? match[1] : null;
}

export function Nav() {
  const pathname = usePathname();
  const week = weekFromPath(pathname);

  const items = [
    {
      label: "Activity",
      href: week ? `/week/${week}` : "/",
      active: week !== null && !pathname.endsWith("/matriks"),
    },
    {
      label: "Matriks",
      href: week ? `/week/${week}/matriks` : "/matriks",
      active: pathname.endsWith("/matriks"),
    },
    { label: "Pengaturan", href: "/pengaturan", active: pathname.startsWith("/pengaturan") },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 bg-navy text-white md:static md:w-56 md:shrink-0"
      aria-label="Navigasi utama"
    >
      <div className="hidden px-5 py-6 md:block">
        <p className="text-lg font-semibold leading-tight">ClickUp Drafter</p>
        <p className="text-xs text-white/60">Update mingguan</p>
      </div>
      <ul className="flex md:flex-col md:gap-1 md:px-3">
        {items.map((item) => (
          <li key={item.label} className="flex-1 md:flex-none">
            <Link
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={`flex min-h-11 items-center justify-center gap-2 px-3 text-sm font-medium md:justify-start md:rounded-md ${
                item.active ? "bg-white/15" : "text-white/80 hover:bg-white/10"
              }`}
            >
              {item.label}
              <PendingIndicator />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// Spinner kecil di menu yang baru diklik, selama halaman tujuannya dimuat.
function PendingIndicator() {
  const { pending } = useLinkStatus();
  return pending ? <Spinner className="size-3.5" /> : null;
}
