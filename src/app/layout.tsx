import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Newsreader } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-context";
import { LanguageProvider } from "@/lib/language-context";
import { AuthProvider } from "@/lib/auth-context";
import { AccentProvider } from "@/lib/accent-context";
import { ServiceWorkerRegister } from "@/components/layout/ServiceWorkerRegister";

const jakartaDisplay = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const newsreader = Newsreader({
  variable: "--font-verse",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["italic"],
});

export const metadata: Metadata = {
  title: "DWKY Connect",
  description: "The digital home for the DWKY Sunday School ministry.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "DWKY Connect",
    statusBarStyle: "default",
  },
  // `appleWebApp` above only emits the modern `mobile-web-app-capable` tag (and Safari 16.4+
  // reads that fine) — this fills in the legacy `apple-mobile-web-app-*` names older iOS
  // versions look for instead, so "Add to Home Screen" launches standalone on both.
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f9fd" },
    { media: "(prefers-color-scheme: dark)", color: "#18181b" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${jakartaDisplay.variable} ${jakarta.variable} ${newsreader.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegister />
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <AccentProvider>{children}</AccentProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
