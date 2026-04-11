import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header/Header";
import Link from "next/link";
import { AuthProvider } from "@/components/AuthProvider/AuthProvider";

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
        <script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>
      </head>
      <body className={`min-h-[100vh] flex flex-col`}>
        <AuthProvider>
          <Header />
          <main className="content mx-[10px] my-[10px] lg:mx-[20vw] grow">
            {children}
          </main>
        <footer className="bg-[url(/footer.png)] bg-center bg-no-repeat bg-cover] min-h-[300px] mt-[25px] bg-[size:2500px_300px] flex justify-end">
          <div className="mt-25 mb-10 md:mx-20 p-5 shadow bg-[var(--color-dark)] rounded-xl flex flex-col h-fit">
            <Link href="/" className="text-xl">
              <span className="text-[var(--color-primary)]">blog</span>.
              <span className="">jowtow.dev</span>
            </Link>
            <Link href="/posts">posts</Link>
            <Link href="/music">music</Link>
            <Link href="/about">about</Link>
          </div>
        </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
