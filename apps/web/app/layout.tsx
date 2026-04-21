import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zample | R&D Operating System",
  description: "Launch food R&D projects faster and safer."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
