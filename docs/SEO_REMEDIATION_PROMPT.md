# End-to-End SEO Remediation Prompt for wathaci.com

You are the lead SEO, web performance, and content specialist tasked with fixing **all** issues surfaced in the attached audit. Apply every instruction below to wathaci.com (and its staging clone if available) in a single execution pass—no follow-up prompts will be provided.

## Global success criteria
- Final on-page, technical, and speed scores meet or exceed **90/100** on standard audits (Google Lighthouse, SEMrush, PageSpeed Insights) for both mobile and desktop.
- All pages are fully crawlable and indexable; no audit errors or blocking directives remain.
- Core Web Vitals pass for mobile and desktop: **LCP ≤ 2.5s**, **INP ≤ 200ms**, CLS within Google-recommended thresholds.
- Social profiles (X/Twitter, LinkedIn, Facebook, Instagram) are correctly linked and validated.

## Technical SEO fixes
1. **Robots.txt**
   - Replace the current invalid robots.txt with valid syntax; disallow only sensitive/admin paths. Example base:
     ```
     User-agent: *
     Disallow: /admin
     Allow: /
     Sitemap: https://www.wathaci.com/sitemap.xml
     ```
   - Validate syntax and confirm 200 status at `https://www.wathaci.com/robots.txt`.
2. **XML Sitemap**
   - Generate and deploy a comprehensive `sitemap.xml` covering all canonical URLs. Submit its URL in robots.txt and Google Search Console.
3. **Hreflang & Language**
   - Set correct `<html lang="en">` (or the primary site language). Add hreflang tags if multiple regions/languages exist; otherwise ensure none are malformed.
4. **Canonicalization**
   - Ensure one canonical per page with absolute URLs; remove duplicates or incorrect self-references.
5. **Structured Data**
   - Add JSON-LD Schema.org (Organization + WebSite + LocalBusiness if relevant). Include name, logo, URL, sameAs social links, contact, address (if applicable), and searchAction. Validate via Rich Results Test.
6. **Favicon**
   - Confirm favicon is present, accessible, and referenced with `<link rel="icon" ...>` on every page.

## On-page SEO fixes
1. **Meta Title & Description**
   - Keep the existing title if accurate; otherwise craft <70-char titles with primary keyword. Rewrite meta descriptions to 120–150 chars, action-oriented, keyword-rich, and unique per page.
2. **Headings (H1–H6)**
   - Ensure exactly one H1 per page that states the page’s core intent and includes a primary keyword. Build a logical heading hierarchy (H2/H3) covering services, benefits, testimonials, FAQs, and CTAs.
3. **Content Depth & Text-to-Code Ratio**
   - Expand thin pages to **≥800–1,200 words** of high-quality, original content tailored to Zambian business services (WATHACI’s focus). Include keyword-rich sections, bullet lists, and internal links. Improve text-to-code ratio by reducing unnecessary markup/scripts.
4. **Internal Linking**
   - Add contextual internal links to priority pages (services, pricing, contact, blog). Ensure anchor text is descriptive and avoids duplication.
5. **Alt Text & Media**
   - Provide descriptive, keyword-aware `alt` text for all images; compress images (next-gen formats) and lazy-load below-the-fold media.

## Off-page & Social
1. Add visible, working links to **X/Twitter, LinkedIn, Facebook, Instagram** in header/footer and Schema `sameAs`.
2. Verify social OG tags (title, description, image) and Twitter Card metadata on all pages.
3. Create/verify business profiles where missing; ensure consistency of NAP data if local SEO applies.

## Page speed & Core Web Vitals
1. **Minify & Defer**
   - Minify CSS/JS; remove unused CSS/JS. Defer or async non-critical JS; inline critical CSS for above-the-fold content.
2. **Media Optimization**
   - Serve images in WebP/AVIF; size images responsively; enable compression and caching headers (Cache-Control, ETag). Use a CDN if available.
3. **Performance Targets**
   - Achieve **Performance Score ≥ 90**, **LCP ≤ 2.5s**, **INP ≤ 200ms** on mobile. Optimize server TTFB, enable HTTP/2 or HTTP/3.
4. **Mobile Friendliness**
   - Implement responsive layouts and tap-target sizing; remove horizontal scroll; ensure fonts and buttons are legible on small screens. Re-run mobile friendliness tests until passing.

## Implementation & validation steps (no skips)
1. Backup current site, then deploy fixes to staging; run Lighthouse/PageSpeed (mobile & desktop) and SEMrush crawl. Iterate until all red/yellow flags are resolved.
2. After publishing to production, verify:
   - `robots.txt` valid and not blocking key pages.
   - `sitemap.xml` accessible and submitted to Search Console/Bing Webmaster.
   - Structured data passes Rich Results Test.
   - Core Web Vitals all “Good.”
3. Document the before/after metrics (scores, load times, word counts, link additions) and store reports.

Follow these steps end-to-end and do not stop until every audit issue is cleared and the success criteria are met.
