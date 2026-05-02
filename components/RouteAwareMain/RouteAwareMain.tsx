"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type RouteAwareMainProps = {
  children: React.ReactNode;
};

export default function RouteAwareMain({ children }: RouteAwareMainProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");

  useEffect(() => {
    document.documentElement.classList.toggle("admin-route", Boolean(isAdminRoute));
    document.body.classList.toggle("admin-route", Boolean(isAdminRoute));

    return () => {
      document.documentElement.classList.remove("admin-route");
      document.body.classList.remove("admin-route");
    };
  }, [isAdminRoute]);

  return (
    <main
      className={
        isAdminRoute
          ? "content w-full md:flex-1 md:min-h-0 md:h-[calc(100dvh-var(--admin-header-height)-var(--admin-footer-height))] md:overflow-hidden"
          : "content mx-[10px] my-[10px] grow lg:mx-[20vw]"
      }
    >
      {children}
    </main>
  );
}
