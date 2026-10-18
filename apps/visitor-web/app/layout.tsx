import type { Metadata, Viewport } from "next";
import { Literata, Manrope, Noto_Sans_Devanagari } from "next/font/google";
import "../styles/tokens.css";
import "../styles/base.css";
import "../styles/components.css";
import "../styles/shell.css";
import "../styles/welcome.css";
import "../styles/home.css";
import "../styles/monuments.css";
import "../styles/yatrik.css";
import "../styles/original.css";

// next/font downloads these at build time and serves them from this site, so
// no font request goes to Google from the visitor's browser.
const literata = Literata({ subsets: ["latin"], variable: "--font-serif", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const devanagari = Noto_Sans_Devanagari({ subsets: ["devanagari"], variable: "--font-deva", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Sanskriti | Heritage companion", template: "%s · Sanskriti" },
  description: "Recognise Indian monuments, ask Yatrik about their history in English or Hindi, and report issues at heritage sites.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f2e8",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${literata.variable} ${manrope.variable} ${devanagari.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
