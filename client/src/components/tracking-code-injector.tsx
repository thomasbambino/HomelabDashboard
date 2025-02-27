import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Settings } from "@shared/schema";

export function TrackingCodeInjector() {
  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    // Remove any existing tracking script
    const existingScript = document.querySelector('script[data-tracking-script]');
    if (existingScript) {
      existingScript.remove();
    }

    // If there's a tracking code in settings, inject it
    if (settings?.tracking_code) {
      try {
        // Create a script element directly
        const script = document.createElement('script');

        // Parse the tracking code to extract attributes
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = settings.tracking_code;
        const sourceScript = tempDiv.querySelector('script');

        if (sourceScript) {
          // Copy all attributes from the source script
          Array.from(sourceScript.attributes).forEach(attr => {
            script.setAttribute(attr.name, attr.value);
          });

          // Set the script content if any
          script.textContent = sourceScript.textContent;

          // Mark it as our tracking script
          script.setAttribute('data-tracking-script', 'true');

          // Add it to the head
          document.head.appendChild(script);

          console.log('Tracking script injected successfully');
        }
      } catch (error) {
        console.error('Error injecting tracking script:', error);
      }
    }
  }, [settings?.tracking_code]);

  return null;
}