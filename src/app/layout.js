import "./globals.css";
import { Providers } from "./providers";
import Navbar from "@/components/Navbar";

// Font is now handled in globals.css via system stack for better build reliability

export const metadata = {
  title: "Xip Premium AI",
  description: "Transform your photos with AI",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="antialiased selection:bg-white/10 selection:text-white pb-10">
        <Providers>
          <Navbar />
          <main className="min-h-screen">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
