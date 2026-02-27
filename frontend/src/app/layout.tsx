import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Geist_Mono } from "next/font/google";
import "./globals.css";
import OnboardingProvider from "@/components/onboarding-provider";
import { Header } from "@/components/header";

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
  icons: {
    icon: "/manasCore.png",
    shortcut: "/manasCore.png",
    apple: "/manasCore.png",
  },
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
    <html lang="en" className={`${instrumentSerif.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased">
        <OnboardingProvider>
          <Header />
          {children}
        </OnboardingProvider>
      </body>
    </html>
  );
}


