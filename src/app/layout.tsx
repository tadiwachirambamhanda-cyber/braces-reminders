import type { Metadata } from "next";
import { IBM_Plex_Mono, Newsreader, Noto_Naskh_Arabic, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const body = Source_Sans_3({ variable: "--font-body", subsets: ["latin"], weight: ["400", "600"] });
const title = Newsreader({ variable: "--font-title", subsets: ["latin"], weight: ["500"] });
const code = IBM_Plex_Mono({ variable: "--font-code", subsets: ["latin"], weight: ["400"] });
const arabic = Noto_Naskh_Arabic({ variable: "--font-arabic", subsets: ["arabic"], weight: ["400", "600"] });

export const metadata: Metadata = {
  title: "Smile Book",
  description: "Monthly braces reminders for Liwan Dental, with a phone simulator",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${body.variable} ${title.variable} ${code.variable} ${arabic.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
