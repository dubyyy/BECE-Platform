import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import "../globals.css";
import { Toaster } from "sonner";
import CIEAuthGateWrapper from "./CIEAuthGateWrapper";

const sourceSans = Source_Sans_3({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  fallback: ["Arial", "Helvetica", "sans-serif"],
});

export const metadata: Metadata = {
  title: "CIE Dashboard | Delta State Ministry of Basic and Secondary Education",
  description: "Chief Inspector of Education Dashboard",
};

export default function CIELayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sourceSans.variable} antialiased min-h-screen flex flex-col`}>
        <main className="flex-1">
          <CIEAuthGateWrapper>{children}</CIEAuthGateWrapper>
        </main>
        <Toaster />
      </body>
    </html>
  );
}
