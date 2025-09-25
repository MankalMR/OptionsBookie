import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Providers from '@/components/Providers';
import {
  getBaseUrl,
  getSiteName,
  getSiteDescription,
  getSiteKeywords,
  getAuthorInfo,
  getOrganizationInfo,
  buildImageUrl
} from '@/lib/url-utils';
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: `${getSiteName()} - Professional Options Trading Tracker & Analytics`,
    template: `%s | ${getSiteName()}`
  },
  description: getSiteDescription(),
  keywords: getSiteKeywords(),
  authors: [{ name: getAuthorInfo().name, url: getAuthorInfo().url }],
  creator: getAuthorInfo().name,
  publisher: getSiteName(),
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(getBaseUrl()),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: getBaseUrl(),
    siteName: getSiteName(),
    title: `${getSiteName()} - Professional Options Trading Tracker`,
    description: getSiteDescription(),
    images: [
      {
        url: buildImageUrl('/images/OptionBookie1.png'),
        width: 1200,
        height: 630,
        alt: `${getSiteName()} - Options Trading Tracker`,
      },
    ],
  },
  // Twitter metadata removed - no Twitter handle available
  // twitter: {
  //   card: 'summary_large_image',
  //   title: 'OptionsBookie - Professional Options Trading Tracker',
  //   description: 'Professional options trading tracker with real-time analytics and portfolio management.',
  //   images: ['/images/OptionBookie1.png'],
  //   creator: '@your_twitter_handle',
  // },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  // Verification handled via DNS TXT records
  // google: process.env.GOOGLE_SITE_VERIFICATION,
  // yandex: process.env.YANDEX_VERIFICATION,
  // yahoo: process.env.YAHOO_VERIFICATION,
  category: 'finance',
  classification: 'Business',
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'OptionsBookie',
    'application-name': 'OptionsBookie',
    'theme-color': '#2563eb',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
