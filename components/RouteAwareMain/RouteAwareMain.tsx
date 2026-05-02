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
          ? "content grow w-full"
          : "content mx-[10px] my-[10px] grow lg:mx-[20vw]"
      }
    >
      {children}
    </main>
  );
}
