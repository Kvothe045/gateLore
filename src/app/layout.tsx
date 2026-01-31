import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gate Lores",
  description: "Restricted Access",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#050505] text-slate-200">
        {children}
      </body>
    </html>
  );
}