import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Samadhan Hub — AICTE Integrated Complaint Dashboard",
  description:
    "Integrated Dashboard for Monitoring and Tracking Institution-Related Complaint Cases Across AICTE Bureaus/Cells (Smart India Hackathon 2026 - PS SIH26264)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans bg-canvas text-ink min-h-screen antialiased selection:bg-primary-50 selection:text-primary">
        {children}
      </body>
    </html>
  );
}
