import type { Metadata } from "next";
import localFont from "next/font/local";
import { themeInitScript } from "@/components/layout/themeScript";
import "./globals.css";
import { Providers } from "./providers";

// BT Grotesk: headlines and body. Geist Mono: small uppercase labels.
// Files live in app/fonts (source copy in design/fonts).
const grotesk = localFont({
  variable: "--font-grotesk",
  display: "swap",
  src: [
    { path: "./fonts/BTGrotesk-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/BTGrotesk-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/BTGrotesk-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "./fonts/BTGrotesk-Bold.woff2", weight: "700", style: "normal" },
  ],
});

const mono = localFont({
  variable: "--font-geist-mono",
  display: "swap",
  src: [{ path: "./fonts/GeistMono-Medium.woff2", weight: "500", style: "normal" }],
});

export const metadata: Metadata = {
  title: "NODUS",
  description: "Maps your syllabus, connects your notes to it, and shows you what you know and what you're missing.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the theme script sets `class`/`style` on <html> before hydration.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${grotesk.variable} ${mono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
