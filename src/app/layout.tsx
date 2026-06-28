import { Inter } from "next/font/google";
import "./globals.css";

/**
 * Корневой лейаут — общий каркас <html>/<body> и шрифт.
 * Хром публичного сайта (шапка/футер, метаданные, JSON-LD) — в (site)/layout.
 * Встроенная Studio (/studio) рендерится вне (site), без хрома сайта.
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600", "700", "900"],
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={`${inter.variable} h-full antialiased`}>
      <body className="bg-background text-foreground font-sans">
        {children}
      </body>
    </html>
  );
}
