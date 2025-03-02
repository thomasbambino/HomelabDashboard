import { useQuery } from "@tanstack/react-query";
import { Settings } from "@shared/schema.js";
import { useEffect } from "react";

interface MetadataProviderProps {
  children: React.ReactNode;
}

export function LPMetadataProvider({ children }: MetadataProviderProps) {
  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    if (settings) {
      // Update document title
      const title = settings.site_title || "Homelab Dashboard";
      const description = settings.login_description || "Monitor your services and game servers in real-time with our comprehensive dashboard.";
      const logoUrl = settings.logo_url_large || settings.logo_url;

      document.title = title;

      // Update favicon if custom logo is set
      if (settings.logo_url) {
        const link = document.querySelector<HTMLLinkElement>("link[rel*='icon']") || document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        link.href = settings.logo_url;
        document.head.appendChild(link);
      }

      // Update meta description
      const metaDescription = document.querySelector('meta[name="description"]') || document.createElement('meta');
      metaDescription.setAttribute("name", "description");
      metaDescription.setAttribute("content", description);
      if (!document.querySelector('meta[name="description"]')) {
        document.head.appendChild(metaDescription);
      }

      // OpenGraph meta tags for social sharing
      const ogTags = {
        'og:title': title,
        'og:description': description,
        'og:type': 'website',
        'og:image': logoUrl || '',
      };

      // Twitter Card meta tags
      const twitterTags = {
        'twitter:card': 'summary_large_image',
        'twitter:title': title,
        'twitter:description': description,
        'twitter:image': logoUrl || '',
      };

      // Update or create OpenGraph meta tags
      Object.entries(ogTags).forEach(([property, content]) => {
        if (!content) return;
        let meta = document.querySelector(`meta[property="${property}"]`);
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('property', property);
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
      });

      // Update or create Twitter Card meta tags
      Object.entries(twitterTags).forEach(([name, content]) => {
        if (!content) return;
        let meta = document.querySelector(`meta[name="${name}"]`);
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('name', name);
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
      });
    }
  }, [settings]);

  return <>{children}</>;
}