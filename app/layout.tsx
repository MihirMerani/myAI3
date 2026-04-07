import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ML Check — AI Legal Document Review",
  description: "AI-powered legal document review for every Indian. Upload contracts, agreements, NDAs and get risk flags and plain-English explanations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased bg-zinc-950 text-zinc-100`}
      >
        {/* EY-style yellow top bar */}
        <div className="fixed top-0 left-0 right-0 h-1 bg-[#FFE600] z-[100]" />
        {children}
      </body>
    </html>
  );
}
