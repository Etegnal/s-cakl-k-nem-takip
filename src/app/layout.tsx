import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Isı ve Nem Takip Sistemi",
  description: "Makinelerin sıcaklık ve nem verilerini izleyen, Excel tabanlı kritik eşik uyarı sistemi.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body>
        <div className="app-container">
          {children}
        </div>
      </body>
    </html>
  );
}
