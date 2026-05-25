import { getWebApplicationInfo, getOrganizationInfo } from '@/lib/url-utils';
import { safeJsonLdStringify } from '@/utils/security';

export default function JsonLd() {
  const webApp = getWebApplicationInfo();
  const org = getOrganizationInfo();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        ...webApp,
        image: org.logo,
      },
      {
        '@type': 'Organization',
        ...org,
        logo: {
          '@type': 'ImageObject',
          url: org.logo
        }
      }
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(jsonLd) }}
    />
  );
}
