import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BusFactor",
  description: "Could someone who didn't write this safely run it?",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
