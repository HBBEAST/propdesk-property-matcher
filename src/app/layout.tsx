import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeBanner";

export const metadata: Metadata = {
  title: "PropDesk — Indore Real Estate Property Matcher",
  description: "Real estate brokerage CRM & property matcher for Indore",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="aurora">
      <body className="css-upgraded min-h-screen bg-slate-50 text-slate-900 antialiased flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
