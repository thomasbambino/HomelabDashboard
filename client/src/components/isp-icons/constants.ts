// This will be populated with the actual ISP configurations once we have the PNG files
export const ISP_MAPPINGS: ISPMappingConfig[] = [];

// Helper function to find the matching ISP config
export function findISPConfig(ispName: string): ISPMappingConfig | undefined {
  const normalizedName = ispName.toLowerCase();
  return ISP_MAPPINGS.find(config => 
    config.matches.some(match => 
      normalizedName.includes(match.toLowerCase())
    )
  );
}
