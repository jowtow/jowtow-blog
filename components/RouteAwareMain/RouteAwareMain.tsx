"use client";

import { usePathname } from "next/navigation";

type RouteAwareMainProps = {
  children: React.ReactNode;
};

export default function RouteAwareMain({ children }: RouteAwareMainProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");

  return (
    <main
      className={
        isAdminRoute
          ? "content flex-1 min-h-0 w-full md:h-[calc(100dvh-var(--admin-header-height)-var(--admin-footer-height))] md:overflow-hidden"
          : "content mx-[10px] my-[10px] grow lg:mx-[20vw]"
      }
    >
      {children}
    </main>
  );
}
