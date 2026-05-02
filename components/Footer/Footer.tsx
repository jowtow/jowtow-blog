'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock } from "lucide-react";

export default function Footer() {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");

  if (isAdminRoute) {
    return (
      <footer
        aria-hidden="true"
        className="h-[var(--admin-footer-height)] border-t border-[var(--color-secondary)]/20 bg-black/50"
      />
    );
  }

  return (
    <footer className="mt-[25px] flex min-h-[300px] justify-end bg-[url(/footer.png)] bg-cover bg-center bg-no-repeat bg-[size:2500px_300px]">
      <div className="mb-10 mt-25 h-fit rounded-xl bg-[var(--color-dark)] p-5 shadow md:mx-20">
        <div className="flex flex-col">
          <Link href="/" className="text-xl">
            <span className="text-[var(--color-primary)]">blog</span>.
            <span>jowtow.dev</span>
          </Link>
          <Link href="/posts">posts</Link>
          <Link href="/collections">collections</Link>
          <Link href="/music">music</Link>
          <Link href="/about">about</Link>
          <Link href="/admin/login" className="m-3 text-gray-500">
            <Lock size={7} />
          </Link>
        </div>
      </div>
    </footer>
  );
}
