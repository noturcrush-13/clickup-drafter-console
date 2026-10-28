import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Nav } from "@/components/nav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "ClickUp Drafter Console",
  description: "Menyiapkan update mingguan ClickUp",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="font-sans antialiased">
        <div className="md:flex md:min-h-screen">
          <Nav />
          {/* pb-24 memberi ruang untuk navigasi bawah di layar sempit */}
          <main className="flex-1 px-4 pt-6 pb-24 md:px-8 md:pb-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
