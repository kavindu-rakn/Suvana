import type { Metadata } from "next";
import { Noto_Serif, Noto_Serif_Sinhala } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";

// Suvana brand typeface (packages/branding/README.md) — Noto Serif for
// English, Noto Serif Sinhala for Sinhala, so both scripts share one voice.
// Replaces Geist Mono, which this app previously used for every role.
const notoSerif = Noto_Serif({
  variable: "--font-noto-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const notoSerifSinhala = Noto_Serif_Sinhala({
  variable: "--font-noto-serif-sinhala",
  subsets: ["sinhala"],
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  title: "Communicate — සුවණ Suvana",
  description:
    "Speak, and watch your words come to life as 3D sign language animations. Audio-to-text, emotion detection, and real-time gloss-to-3D-model translation.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${notoSerif.variable} ${notoSerifSinhala.variable} h-full antialiased`}
      // data-theme is written by the inline script below, before paint;
      // the server cannot know it, so hydration must not warn about it.
      suppressHydrationWarning
    >
      <head>
        {/*
          Theme, before first paint — the same block the shell and Learn run.
          One shared `suvana.theme` key across every same-origin Suvana
          surface, falling back to the operating system's preference.

          This must be inline and synchronous: a server-rendered page that
          waits for hydration to choose a theme paints the wrong one first,
          which is precisely the flash worth avoiding.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('suvana.theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='dark';}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
