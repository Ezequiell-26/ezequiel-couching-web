import { SITE_NAME, SITE_URL } from "./constants";

export interface ArticleSchema {
  headline: string;
  description: string;
  image: string;
  datePublished: string;
  dateModified?: string;
  author: string;
}

export interface ProductSchema {
  name: string;
  description: string;
  image: string;
  price: number;
  currency: string;
  availability: string;
}

export interface FAQSchema {
  question: string;
  answer: string;
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    sameAs: [
      "https://instagram.com/kinetixfitt",
      "https://tiktok.com/@kinetixfitt",
      "https://youtube.com/@kinetixfitt",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: "info@kinetixfitt.com",
    },
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function articleJsonLd(article: ArticleSchema) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.headline,
    description: article.description,
    image: article.image,
    datePublished: article.datePublished,
    dateModified: article.dateModified || article.datePublished,
    author: {
      "@type": "Person",
      name: article.author,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.png`,
      },
    },
  };
}

export function productJsonLd(product: ProductSchema) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.image,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: product.currency,
      availability: product.availability,
      url: SITE_URL,
    },
  };
}

export function faqJsonLd(faqs: FAQSchema[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function localBusinessJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    name: SITE_NAME,
    url: SITE_URL,
    image: `${SITE_URL}/og.png`,
    description: "Entrenamiento online premium con planes personalizados",
    priceRange: "€€",
  };
}
