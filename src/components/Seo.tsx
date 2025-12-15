import { useEffect } from "react";

export interface SeoMetadata {
  title: string;
  description: string;
  keywords?: string[];
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
  robots?: string;
  structuredData?: Array<Record<string, any>>;
}

const setMetaTag = (selector: string, attribute: "name" | "property", value: string) => {
  if (!value) return;
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${selector}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attribute, selector);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", value);
};

const removeExistingJsonLd = () => {
  document
    .querySelectorAll<HTMLScriptElement>('script[data-seo-json-ld="true"]')
    .forEach(node => node.remove());
};

const addStructuredData = (structuredData?: Array<Record<string, any>>) => {
  removeExistingJsonLd();

  structuredData?.forEach(data => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.seoJsonLd = "true";
    script.text = JSON.stringify(data);
    document.head.appendChild(script);
  });
};

export const Seo = ({
  title,
  description,
  keywords,
  canonical,
  ogImage,
  ogType = "website",
  twitterCard = "summary_large_image",
  robots = "index,follow",
  structuredData,
}: SeoMetadata) => {
  useEffect(() => {
    document.title = title;

    setMetaTag("description", "name", description);
    if (keywords?.length) setMetaTag("keywords", "name", keywords.join(", "));
    setMetaTag("robots", "name", robots);

    setMetaTag("og:title", "property", title);
    setMetaTag("og:description", "property", description);
    setMetaTag("og:type", "property", ogType);
    if (ogImage) setMetaTag("og:image", "property", ogImage);
    if (canonical) setMetaTag("og:url", "property", canonical);

    setMetaTag("twitter:card", "name", twitterCard);
    setMetaTag("twitter:title", "name", title);
    setMetaTag("twitter:description", "name", description);
    if (ogImage) setMetaTag("twitter:image", "name", ogImage);

    if (canonical) {
      let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      link.href = canonical;
    }

    addStructuredData(structuredData);
  }, [canonical, description, keywords, ogImage, ogType, robots, structuredData, title, twitterCard]);

  return null;
};

export default Seo;
