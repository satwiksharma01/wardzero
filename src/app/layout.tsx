import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WardZero · Care overview",
  description:
    "A home-care monitoring workspace. Synthetic patient demonstration.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
