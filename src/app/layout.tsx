import type { Metadata } from "next";
import { Manrope, Roboto_Condensed } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
});

const robotoCondensed = Roboto_Condensed({
  variable: "--font-display",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Молодая гвардия — доска мероприятий",
  description:
    "Календарь мероприятий Молодой гвардии с регистрацией, ролями модераторов и отметками участия.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${manrope.variable} ${robotoCondensed.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
