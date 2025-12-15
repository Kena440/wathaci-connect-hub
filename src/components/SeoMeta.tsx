import { useEffect } from 'react';

type StructuredData = Record<string, unknown>;

interface SeoMetaProps {
  title: string;
  description: string;
  keywords?: string[];
  canonicalPath?: string;
  image?: string;
  type?: string;
  twitterCard?: string;
  robots?: string;
  structuredData?: StructuredData[];
}

const BASE_URL = "https://wathaci.com";

const upsertMetaTag = (selector: string, attributes: Record<string, string>) => {
  const head = document.head;
  if (!head) return;

  let element = head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;

  if (!element) {
    const tagName = selector.startsWith("link") ? "link" : "meta";
    element = document.createElement(tagName) as HTMLMetaElement | HTMLLinkElement;
    head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    if (value) {
      element!.setAttribute(key, value);
    }
  });
};

const removeStructuredDataScripts = () => {
  document.querySelectorAll("script[data-seo-structured-data='true']").forEach((node) => {
    node.remove();
  });
};

export const SeoMeta = ({
  title,
  description,
  keywords = [],
  canonicalPath,
  image = "https://d64gsuwffb70l.cloudfront.net/686a39ec793daf0c658a746a_1753699300137_a4fb9790.png",
  type = "website",
  twitterCard = "summary_large_image",
  robots = "index,follow",
  structuredData = []
}: SeoMetaProps) => {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const pageTitle = `${title} | Wathaci Connect`;
    document.title = pageTitle;

    const canonicalUrl = `${BASE_URL}${canonicalPath ?? window.location.pathname}`;

    upsertMetaTag("meta[name='description']", { name: "description", content: description });
    upsertMetaTag("meta[name='keywords']", { name: "keywords", content: keywords.join(", ") });
    upsertMetaTag("meta[name='robots']", { name: "robots", content: robots });
    upsertMetaTag("link[rel='canonical']", { rel: "canonical", href: canonicalUrl });

    upsertMetaTag("meta[property='og:title']", { property: "og:title", content: pageTitle });
    upsertMetaTag("meta[property='og:description']", { property: "og:description", content: description });
    upsertMetaTag("meta[property='og:image']", { property: "og:image", content: image });
    upsertMetaTag("meta[property='og:url']", { property: "og:url", content: canonicalUrl });
    upsertMetaTag("meta[property='og:type']", { property: "og:type", content: type });

    upsertMetaTag("meta[name='twitter:card']", { name: "twitter:card", content: twitterCard });
    upsertMetaTag("meta[name='twitter:title']", { name: "twitter:title", content: pageTitle });
    upsertMetaTag("meta[name='twitter:description']", { name: "twitter:description", content: description });
    upsertMetaTag("meta[name='twitter:image']", { name: "twitter:image", content: image });

    removeStructuredDataScripts();
    const head = document.head;
    structuredData.forEach((schema) => {
      const script = document.createElement("script");
      script.setAttribute("type", "application/ld+json");
      script.setAttribute("data-seo-structured-data", "true");
      script.textContent = JSON.stringify(schema);
      head?.appendChild(script);
    });

    return () => {
      removeStructuredDataScripts();
    };
  }, [title, description, keywords, canonicalPath, image, type, twitterCard, robots, structuredData]);

  return null;
};

export default SeoMeta;
