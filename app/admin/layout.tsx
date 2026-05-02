'use client';

import { usePathname } from 'next/navigation';

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAuthRoute = pathname === '/admin/login' || pathname === '/admin/recovery';

  return (
    <div
      className={
        isAuthRoute
          ? 'flex min-h-full w-full items-center justify-center px-4 py-6 md:px-5 md:py-8'
          : 'flex min-h-[calc(100dvh-var(--admin-header-height)-var(--admin-footer-height))] w-full flex-col bg-[var(--color-dark)] px-2 py-2 md:h-full md:min-h-0 md:px-3 md:py-3 lg:px-4'
      }
    >
      {children}
    </div>
  );
}
