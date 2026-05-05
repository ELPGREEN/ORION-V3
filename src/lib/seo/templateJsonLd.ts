/**
 * Builds JSON-LD SoftwareApplication structured data for template landing pages.
 */
export function buildTemplateJsonLd(opts: {
  name: string;
  description: string;
  url: string;
  category?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: opts.name,
    description: opts.description,
    url: opts.url,
    applicationCategory: opts.category ?? "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "BRL",
      availability: "https://schema.org/InStock",
    },
    provider: {
      "@type": "Organization",
      name: "Orion Intelligence Platform",
      url: "https://www.iasofthub.com",
    },
  };
}
