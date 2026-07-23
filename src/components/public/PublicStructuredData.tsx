import {
  PUBLIC_SITE_NAME,
  PUBLIC_SITE_URL,
} from '@/lib/public/site-public-info';

export default function PublicStructuredData() {
  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${PUBLIC_SITE_URL}/#website`,
    url: PUBLIC_SITE_URL,
    name: PUBLIC_SITE_NAME,
    inLanguage: 'vi-VN',
    description:
      'Thư viện mod, bản Việt hóa và công cụ hỗ trợ game dành cho cộng đồng Việt Nam.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${PUBLIC_SITE_URL}/mods?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${PUBLIC_SITE_URL}/#organization`,
    url: PUBLIC_SITE_URL,
    name: PUBLIC_SITE_NAME,
    logo: `${PUBLIC_SITE_URL}/icons/icon-512.png`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(website).replace(/</g, '\\u003c'),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organization).replace(/</g, '\\u003c'),
        }}
      />
    </>
  );
}
