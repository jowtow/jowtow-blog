import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import { AuthProvider } from "@/components/AuthProvider/AuthProvider";
import RouteAwareMain from "@/components/RouteAwareMain/RouteAwareMain";

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
      <body className="flex min-h-dvh flex-col">
        <AuthProvider>
          <Header />
          <RouteAwareMain>{children}</RouteAwareMain>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
