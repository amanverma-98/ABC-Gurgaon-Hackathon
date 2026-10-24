import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "P2Care - Patient to Care. Without Delay. | Hospital & OPD Portal",
  description: "P2Care Central Health Operations, Emergency Management, Doctor Workspace & OPD Control Desk",
  icons: {
    icon: [
      { url: "/ayushCareLogo.png", type: "image/png" },
    ],
    shortcut: "/ayushCareLogo.png",
    apple: "/ayushCareLogo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} min-h-full antialiased`}>
      <body className="min-h-screen w-full overflow-x-hidden bg-slate-100 font-sans text-slate-900">
        {children}
      </body>
    </html>
  );
}
