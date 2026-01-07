import type { Metadata } from "next";
import { Source_Sans_3, Roboto_Mono } from "next/font/google";
import "@/app/globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { Toaster } from "sonner";

const sourceSans = Source_Sans_3({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  fallback: ["Arial", "Helvetica", "sans-serif"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  fallback: ["monospace"],
});

export const metadata: Metadata = {
  title: "Ministry Of Secondary School Education",
  description: "Official portal for the Delta State Government Ministry Of Secondary School Education - BECE Result Verification and School Administration Services",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${sourceSans.variable} ${robotoMono.variable} antialiased`}
      >

        {children}
        <Footer />
        <Toaster />
      </body>
    </html>
  );
}
