'use client';

import { useEffect } from 'react';
import { getBaseUrl, getSiteName, getSiteDescription, getAuthorInfo, buildImageUrl } from '@/lib/url-utils';

interface StructuredDataProps {
  data: any;
}

export default function StructuredData({ data }: StructuredDataProps) {
  useEffect(() => {
    // Remove existing structured data
    const existingScript = document.querySelector('script[type="application/ld+json"]');
    if (existingScript) {
      existingScript.remove();
    }

    // Add new structured data
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(data);
    document.head.appendChild(script);

    return () => {
      // Cleanup on unmount
      const scriptToRemove = document.querySelector('script[type="application/ld+json"]');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [data]);

  return null;
}

// Predefined structured data schemas
export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": getSiteName(),
  "url": getBaseUrl(),
  "logo": buildImageUrl('/images/OptionBookie1.png'),
  "description": getSiteDescription(),
  "foundingDate": "2024",
  "founder": {
    "@type": "Person",
    "name": getAuthorInfo().name,
    "url": getAuthorInfo().url
  },
  "sameAs": [
    getAuthorInfo().url
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer service",
    "email": getAuthorInfo().email
  }
};

export const webApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": getSiteName(),
  "url": getBaseUrl(),
  "description": getSiteDescription(),
  "applicationCategory": "FinanceApplication",
  "operatingSystem": "Web Browser",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "featureList": [
    "Real-time options tracking",
    "Portfolio management",
    "P&L analytics",
    "Covered calls tracking",
    "Cash-secured puts tracking",
    "Trading performance metrics",
    "Strategy analysis"
  ],
  "browserRequirements": "Requires JavaScript. Requires HTML5.",
  "softwareVersion": "1.0.0",
  "author": {
    "@type": "Organization",
    "name": getSiteName(),
    "url": getBaseUrl()
  }
};

export const breadcrumbSchema = (items: Array<{ name: string; url: string }>) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": items.map((item, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": item.name,
    "item": item.url
  }))
});

