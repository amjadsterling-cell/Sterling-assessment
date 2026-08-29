import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spoken English Assessment",
  description: "Automated spoken-English assessment"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
