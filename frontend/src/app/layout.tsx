import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Geist_Mono } from "next/font/google";
import "./globals.css";
import OnboardingProvider from "@/components/onboarding-provider";
import { Header } from "@/components/header";
import { ThemeProvider } from "@/components/theme-provider";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "manasCore - Your Inner Journal",
  description: "A reflective AI journaling experience for solitude and self-discovery.",
};

export const viewport: Viewport = {
  themeColor: "#141418",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${instrumentSerif.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <OnboardingProvider>
            <Header />
            {children}
          </OnboardingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

