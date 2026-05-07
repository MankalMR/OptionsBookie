import { getWebApplicationInfo, getOrganizationInfo } from '@/lib/url-utils';

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
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
