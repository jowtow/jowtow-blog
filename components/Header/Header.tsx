'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore, logoutFromNetlify } from "@/lib/auth";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const isAdminRoute = pathname?.startsWith("/admin");

  if (isAdminRoute) {
    return (
      <header className="border-b border-[var(--color-secondary)]/20 bg-[var(--color-dark)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-dark)]/88">
        <nav className="mx-auto flex h-[var(--admin-header-height)] w-full max-w-[1920px] items-center justify-between gap-3 px-4 md:px-5 lg:px-6">
          <Link href={isAuthenticated ? "/admin" : "/"} className="text-lg font-semibold tracking-[0.01em]">
            <span className="text-[var(--color-primary)]">blog</span>.
            <span>jowtow.dev</span>
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/"
              className="rounded-md border border-[var(--color-secondary)]/30 px-3 py-2 text-[var(--text-light)]/80 transition hover:bg-white/5 hover:text-[var(--text-light)]"
            >
              View site
            </Link>
            {!isLoading && isAuthenticated && (
              <button
                type="button"
                onClick={async () => {
                  await logoutFromNetlify();
                  router.push("/admin/login");
                }}
                className="cursor-pointer rounded-md border border-red-400/45 bg-red-500/15 px-3 py-2 font-medium text-red-200 transition hover:bg-red-500/25"
              >
                Logout
              </button>
            )}
          </div>
        </nav>
      </header>
    );
  }

  return (
    <header className="flex min-h-[200px] justify-start bg-[url(/header.png)] bg-cover bg-right bg-no-repeat bg-[size:2500px_200px] p-[5px] xl:justify-center">
      <nav className="nav mx-3 my-5 flex h-fit flex-col rounded bg-[var(--color-dark)] p-4 sm:my-10 sm:flex-row lg:mx-10 xl:mx-25">
        <div className="border-b text-center sm:border-none">
          <Link href="/">
            <span className="text-[var(--color-primary)]">blog</span>.
            <span>jowtow.dev</span>
          </Link>
        </div>
        <div>
          <Link href="/posts" className="m-3">
            posts
          </Link>
          <Link href="/collections" className="m-3">
            collections
          </Link>
          <Link href="/music" className="m-3">
            music
          </Link>
          <Link href="/about" className="m-3">
            about
          </Link>
          {!isLoading && isAuthenticated && (
            <Link href="/admin" className="m-3 font-semibold text-yellow-400">
              admin
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
