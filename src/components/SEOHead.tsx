'use client';

import Head from 'next/head';
import { getBaseUrl, getSiteName, getSiteDescription, getSiteKeywords, buildImageUrl } from '@/lib/url-utils';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string[];
  canonical?: string;
  ogImage?: string;
  noIndex?: boolean;
  structuredData?: any;
}

export default function SEOHead({
  title,
  description = getSiteDescription(),
  keywords = getSiteKeywords(),
  canonical,
  ogImage = "/images/OptionBookie1.png",
  noIndex = false,
  structuredData
}: SEOHeadProps) {
  const fullTitle = title ? `${title} | ${getSiteName()}` : `${getSiteName()} - Professional Options Trading Tracker`;
  const baseUrl = getBaseUrl();
  const canonicalUrl = canonical ? `${baseUrl}${canonical}` : baseUrl;

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords.join(', ')} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={`${baseUrl}${ogImage}`} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={getSiteName()} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={buildImageUrl(ogImage)} />

      {/* Robots */}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Structured Data */}
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
    </Head>
  );
}

