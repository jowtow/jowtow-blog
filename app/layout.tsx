import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header/Header";

export const metadata: Metadata = {
  title: "jowtow.dev",
  description: "John Townsend's personal site",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={`min-h-[100vw]`}>
        <Header />
        <div className="content mx-[10px] my-[10px] lg:mx-[20vw] ">
          {children}
        </div>
      </body>
    </html>
  );
}
