'use client';
import "./globals.css";
import { Providers } from "./providers";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { usePathname } from "next/navigation";
import WhatsappFloatingIcon from "@/components/WhatsappFloatingIcon";
import Head from 'next/head';

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith('/dashboard');

  return (
    <html lang="en" className="dark scroll-smooth">
      <head>
        <title>XIP AI | Elite Generative Aesthetics</title>
        <meta name="description" content="Pushing the boundaries of generative aesthetics through research and design excellence." />
        <link rel="icon" href="/logo.png" />
      </head>
      <body className="antialiased selection:bg-white/10 selection:text-white pb-10">
        <Providers>
          <Navbar />
          <main className="min-h-screen">
            {children}
          </main>
          {!isDashboard && <Footer />}
          <WhatsappFloatingIcon /> {/* Added component */}
        </Providers>
      </body>
    </html>
  );
}
