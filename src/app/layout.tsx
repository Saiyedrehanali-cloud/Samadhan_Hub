import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CaseLens — AICTE Integrated Complaint Dashboard",
  description:
    "Integrated Dashboard for Monitoring and Tracking Institution-Related Complaint Cases Across AICTE Bureaus/Cells (Smart India Hackathon 2026 - PS SIH26264)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans bg-canvas text-ink min-h-screen antialiased selection:bg-primary-50 selection:text-primary">
        {children}
      </body>
    </html>
  );
}

