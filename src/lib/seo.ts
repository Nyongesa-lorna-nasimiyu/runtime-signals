const SITE_URL = 'https://runtimesignals.tech';
const SITE_NAME = 'Runtime Signals';
const DOCUMENT_TITLE_SUFFIX = ` - ${SITE_NAME}`;
const MAX_DOCUMENT_TITLE_LENGTH = 70;

/** Keep browser/search titles within the preview contract without shortening
 * the reader-facing title rendered in the page body. */
export function documentTitle(title: string): string {
  const availableTitleLength = MAX_DOCUMENT_TITLE_LENGTH - DOCUMENT_TITLE_SUFFIX.length;
  if (title.length <= availableTitleLength) return `${title}${DOCUMENT_TITLE_SUFFIX}`;

  return `${title.slice(0, availableTitleLength - 1).trimEnd()}…${DOCUMENT_TITLE_SUFFIX}`;
}

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description:
      'Systems analysis of evaluation, reliability, recovery, orchestration, state, memory, tool security, and observability for AI agents in production.',
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function articleJsonLd(input: {
  title: string;
  description: string;
  path: string;
  publishedAt: Date;
  updatedAt?: Date;
  authorNames: string[];
  imagePath?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.title,
    description: input.description,
    mainEntityOfPage: absoluteUrl(input.path),
    datePublished: input.publishedAt.toISOString(),
    dateModified: (input.updatedAt ?? input.publishedAt).toISOString(),
    author: input.authorNames.map((name) => ({ '@type': 'Person', name })),
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    ...(input.imagePath ? { image: absoluteUrl(input.imagePath) } : {}),
  };
}

export function profilePageJsonLd(input: { name: string; bio: string; path: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: input.name,
      description: input.bio,
      url: absoluteUrl(input.path),
    },
  };
}
