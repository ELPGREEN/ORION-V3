import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_NAME = "ORION IA by ELP® Green Technology";
const BASE_URL = "https://www.iasofthub.com";
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-images/og-home.jpg`;
const DEFAULT_KEYWORDS =
  "ORION IA, ELP Green Technology, inteligência artificial empresarial, IA jurídica, LegalTech, NeuroCore, Lumen7 Engine, AquaMonkey, AI platform, artificial intelligence, legal technology, tecnologia sustentável, CRM inteligente, automação neural";

interface DynamicMetaProps {
  title: string;
  description: string;
  image?: string;
  /** @deprecated Use `image` instead */
  ogImage?: string;
  /** @deprecated Auto-derived from route */
  canonical?: string;
  /** @deprecated Use `canonical` instead */
  url?: string;
  keywords?: string;
  ogType?: string;
  jsonLd?: Record<string, unknown>;
  noIndex?: boolean;
}

/** Page-level JSON-LD for Organization + SoftwareApplication */
function buildBaseJsonLd(url: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "ELP® Green Technology",
        legalName: "ELP Green Technology S.R.L.",
        url: "https://www.iasofthub.com",
        email: "info@iasofthub.com",
        description:
          "Empresa de tecnologia especializada em inteligência artificial empresarial, LegalTech e soluções sustentáveis. CNPJ 42.501.190/0001-70.",
        founder: {
          "@type": "Person",
          name: "Ericson Piccoli",
          jobTitle: "General Director & Founder, Systems Engineer",
        },
        taxID: "42.501.190/0001-70",
        sameAs: ["https://www.iasofthub.com"],
      },
      {
        "@type": "SoftwareApplication",
        name: "ORION IA",
        url: BASE_URL,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web, Android, iOS",
        description:
          "Plataforma de IA Empresarial com motor neural NeuroCore, Lumen7 Engine (50 protocolos) e sistema AquaMonkey®.",
        creator: {
          "@type": "Organization",
          name: "ELP® Green Technology",
        },
      },
      {
        "@type": "WebPage",
        url,
        isPartOf: { "@type": "WebSite", name: SITE_NAME, url: BASE_URL },
      },
    ],
  };
}

export function DynamicMeta({
  title,
  description,
  image,
  ogImage: ogImageLegacy,
  canonical: _canonical,
  keywords,
  ogType = "website",
  jsonLd,
  noIndex = false,
}: DynamicMetaProps) {
  const location = useLocation();
  const canonicalUrl = _canonical || `${BASE_URL}${location.pathname}`;
  const ogImage = image || ogImageLegacy || DEFAULT_OG_IMAGE;
  const fullKeywords = keywords
    ? `${keywords}, ${DEFAULT_KEYWORDS}`
    : DEFAULT_KEYWORDS;

  useEffect(() => {
    document.title = title;

    const setMeta = (
      attr: "name" | "property",
      key: string,
      content: string
    ) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    // Basic
    setMeta("name", "description", description);
    setMeta("name", "keywords", fullKeywords);
    setMeta("name", "copyright", "© 2023 ELP® Green Technology. All Rights Reserved.");
    if (noIndex) {
      setMeta("name", "robots", "noindex, nofollow");
    } else {
      setMeta("name", "robots", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
    }

    // Open Graph
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:type", ogType);
    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("property", "og:locale", "pt_BR");
    setMeta("property", "og:url", canonicalUrl);
    setMeta("property", "og:image", ogImage);
    setMeta("property", "og:image:width", "1200");
    setMeta("property", "og:image:height", "630");
    setMeta("property", "og:image:type", "image/jpeg");
    setMeta("property", "og:image:alt", title);

    // Twitter
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", ogImage);
    setMeta("name", "twitter:site", "@ELPGreenTech");
    setMeta("name", "twitter:image:alt", title);

    // Canonical
    let link = document.querySelector(
      'link[rel="canonical"]'
    ) as HTMLLinkElement;
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", canonicalUrl);

    // JSON-LD
    const mergedJsonLd = jsonLd || buildBaseJsonLd(canonicalUrl);
    let scriptEl = document.querySelector(
      "script[data-seo-jsonld]"
    ) as HTMLScriptElement;
    if (!scriptEl) {
      scriptEl = document.createElement("script");
      scriptEl.setAttribute("type", "application/ld+json");
      scriptEl.setAttribute("data-seo-jsonld", "true");
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify(mergedJsonLd);

    return () => {
      document.title = `${SITE_NAME} | Plataforma de IA Empresarial`;
      const s = document.querySelector("script[data-seo-jsonld]");
      if (s) s.remove();
    };
  }, [title, description, canonicalUrl, ogImage, ogType, fullKeywords, jsonLd, noIndex]);

  return null;
}
