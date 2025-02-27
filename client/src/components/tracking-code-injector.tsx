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
        // Create a temporary container to parse the HTML
        const container = document.createElement('div');
        container.innerHTML = settings.tracking_code;

        // Get the script element from the parsed HTML
        const scriptElement = container.querySelector('script');

        if (scriptElement) {
          // Create a new script element
          const script = document.createElement('script');

          // Copy all attributes from the original script
          Array.from(scriptElement.attributes).forEach(attr => {
            script.setAttribute(attr.name, attr.value);
          });

          // Set the inner content if any
          if (scriptElement.innerHTML) {
            script.innerHTML = scriptElement.innerHTML;
          }

          // Mark it as our tracking script
          script.setAttribute('data-tracking-script', 'true');

          // Get the first script in the document
          const firstScript = document.getElementsByTagName('script')[0];

          // Insert before the first script to ensure early loading
          if (firstScript && firstScript.parentNode) {
            firstScript.parentNode.insertBefore(script, firstScript);
            console.log('Tracking script injected successfully');
          } else {
            // Fallback to appending to head if no script found
            document.head.appendChild(script);
            console.log('Tracking script appended to head');
          }
        }
      } catch (error) {
        console.error('Error injecting tracking script:', error);
      }
    }
  }, [settings?.tracking_code]);

  return null;
}