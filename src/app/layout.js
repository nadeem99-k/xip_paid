'use client';
import "./globals.css";
import { Providers } from "./providers";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { usePathname } from "next/navigation";
import WhatsappFloatingIcon from "@/components/WhatsappFloatingIcon";
import BroadcastBanner from "@/components/BroadcastBanner";
import FomoNotification from "@/components/FomoNotification";
import Head from 'next/head';

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith('/dashboard');

  return (
    <html lang="en" className="dark scroll-smooth" suppressHydrationWarning>
      <head>
        <title>XIP AI | Premium AI Image Studio & Professional Render</title>
        <meta name="description" content="Generate high-quality AI images, professional renders, and creative visual transformations. Join 800+ users worldwide." />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://xip-paid.vercel.app/" />
        <meta property="og:title" content="XIP AI | Create Breathtaking Photos" />
        <meta property="og:description" content="Turn your ideas into reality with our premium Flux-powered AI. Get started with 1 free image daily!" />
        <meta property="og:image" content="https://xip-paid.vercel.app/images/showcase.png" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://xip-paid.vercel.app/" />
        <meta property="twitter:title" content="XIP AI | Premium AI Studio" />
        <meta property="twitter:description" content="Professional AI image generation. High detail, low latency." />
        <meta property="twitter:image" content="https://xip-paid.vercel.app/images/showcase.png" />

        <link rel="icon" href="/logo.png" />
      </head>
      <body className="antialiased selection:bg-white/10 selection:text-white pb-10" suppressHydrationWarning>
        <Providers>
          <BroadcastBanner />
          <Navbar />
          <main className="min-h-screen">
            {children}
          </main>
          {!isDashboard && <Footer />}
          <WhatsappFloatingIcon />
          <FomoNotification />
        </Providers>
      </body>
    </html>
  );
}
