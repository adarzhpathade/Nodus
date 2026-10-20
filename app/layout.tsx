import type { Metadata } from "next";
import localFont from "next/font/local";
import Noise from "@/components/layout/Noise";
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
  description:
    "Maps your syllabus, connects your notes to it, and shows you what you know and what you're missing.",
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
      <body className="bg-background text-foreground relative flex min-h-full flex-col">
        {/* Paper grain background placed behind all UI elements */}
        <Noise
          fixed
          zIndex={0}
          opacity={0.45}
          size={1}
          fps={0}
          blendMode="normal"
          contrast={0.35}
          style={{ mixBlendMode: "soft-light" }}
        />
        <div className="relative z-1 flex min-h-full flex-1 flex-col">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
