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
      // Define base metadata
      const title = settings.site_title || "Homelab Dashboard";
      const description = settings.login_description || "Monitor your services and game servers in real-time with our comprehensive dashboard.";
      const logoUrl = settings.logo_url_large || settings.logo_url;

      // Ensure logo URL is absolute
      const absoluteLogoUrl = logoUrl?.startsWith('http') 
        ? logoUrl 
        : `${window.location.origin}${logoUrl}`;

      // Basic meta tags
      document.title = title;

      // Update or create basic meta tags
      const updateMetaTag = (name: string, content: string) => {
        let meta = document.querySelector(`meta[name="${name}"]`);
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('name', name);
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
      };

      // Update or create OpenGraph meta tags
      const updateOGMetaTag = (property: string, content: string) => {
        let meta = document.querySelector(`meta[property="${property}"]`);
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('property', property);
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
      };

      // Basic metadata
      updateMetaTag('description', description);
      updateMetaTag('application-name', title);

      // OpenGraph metadata
      updateOGMetaTag('og:site_name', title);
      updateOGMetaTag('og:title', title);
      updateOGMetaTag('og:description', description);
      updateOGMetaTag('og:type', 'website');
      updateOGMetaTag('og:url', window.location.href);
      if (absoluteLogoUrl) {
        updateOGMetaTag('og:image', absoluteLogoUrl);
        updateOGMetaTag('og:image:secure_url', absoluteLogoUrl);
        updateOGMetaTag('og:image:alt', `${title} logo`);
      }

      // Twitter Card metadata
      updateMetaTag('twitter:card', 'summary_large_image');
      updateMetaTag('twitter:title', title);
      updateMetaTag('twitter:description', description);
      if (absoluteLogoUrl) {
        updateMetaTag('twitter:image', absoluteLogoUrl);
        updateMetaTag('twitter:image:alt', `${title} logo`);
      }

      // Update favicon if custom logo is set
      if (logoUrl) {
        const link = document.querySelector<HTMLLinkElement>("link[rel*='icon']") || document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        link.href = logoUrl;
        if (!document.querySelector("link[rel*='icon']")) {
          document.head.appendChild(link);
        }
      }

      // Add preconnect for logo domain if it's from a different origin
      if (logoUrl?.startsWith('http')) {
        try {
          const logoOrigin = new URL(logoUrl).origin;
          if (logoOrigin !== window.location.origin) {
            const preconnectLink = document.createElement('link');
            preconnectLink.rel = 'preconnect';
            preconnectLink.href = logoOrigin;
            document.head.appendChild(preconnectLink);
          }
        } catch (e) {
          console.error('Failed to parse logo URL:', e);
        }
      }
    }
  }, [settings]);

  return <>{children}</>;
}