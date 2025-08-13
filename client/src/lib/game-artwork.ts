// Game artwork mapping system
// Maps game types to their respective artwork/icons

export interface GameArtwork {
  icon: string; // Small icon for badges
  banner: string; // Larger banner/background image
  logo: string; // Game logo
  color: string; // Primary brand color
}

// Game artwork database - uses external URLs for now, can be replaced with local assets
export const gameArtworkMap: Record<string, GameArtwork> = {
  'Minecraft': {
    icon: 'https://minecraft.wiki/images/2/2d/Plains_Grass_Block.png',
    banner: 'https://minecraft.wiki/images/b/bd/MinecraftLauncher.png',
    logo: 'https://logos-world.net/wp-content/uploads/2020/04/Minecraft-Logo.png',
    color: '#62A844'
  },
  'Satisfactory': {
    icon: 'https://cdn2.steamgriddb.com/icon_thumb/52b57ae2e5d0b9a2c0daaa5b09bb9e7a.png',
    banner: 'https://cdn.cloudflare.steamstatic.com/steam/apps/526870/header.jpg',
    logo: 'https://cdn.cloudflare.steamstatic.com/steam/apps/526870/logo.png',
    color: '#FF6B35'
  },
  'Valheim': {
    icon: 'https://cdn2.steamgriddb.com/icon_thumb/52b57ae2e5d0b9a2c0daaa5b09bb9e7a.png',
    banner: 'https://cdn.cloudflare.steamstatic.com/steam/apps/892970/header.jpg',
    logo: 'https://cdn.cloudflare.steamstatic.com/steam/apps/892970/logo.png',
    color: '#4A5D23'
  },
  'Terraria': {
    icon: 'https://cdn2.steamgriddb.com/icon_thumb/7648a4a8dc4d3f95e5bd7c1c64c8c425.png',
    banner: 'https://cdn.cloudflare.steamstatic.com/steam/apps/105600/header.jpg',
    logo: 'https://cdn.cloudflare.steamstatic.com/steam/apps/105600/logo.png',
    color: '#5D9C59'
  },
  'Rust': {
    icon: 'https://cdn2.steamgriddb.com/icon_thumb/cc5a8c925a7def8c4b5b1cd7aecf1cea.png',
    banner: 'https://cdn.cloudflare.steamstatic.com/steam/apps/252490/header.jpg',
    logo: 'https://cdn.cloudflare.steamstatic.com/steam/apps/252490/logo.png',
    color: '#CE422B'
  },
  '7 Days to Die': {
    icon: 'https://cdn2.steamgriddb.com/icon_thumb/52b57ae2e5d0b9a2c0daaa5b09bb9e7a.png',
    banner: 'https://cdn.cloudflare.steamstatic.com/steam/apps/251570/header.jpg',
    logo: 'https://cdn.cloudflare.steamstatic.com/steam/apps/251570/logo.png',
    color: '#8B0000'
  },
  'Palworld': {
    icon: 'https://cdn2.steamgriddb.com/icon_thumb/52b57ae2e5d0b9a2c0daaa5b09bb9e7a.png',
    banner: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1623730/header.jpg',
    logo: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1623730/logo.png',
    color: '#4FC3F7'
  },
  'Enshrouded': {
    icon: 'https://cdn2.steamgriddb.com/icon_thumb/52b57ae2e5d0b9a2c0daaa5b09bb9e7a.png',
    banner: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1203620/header.jpg',
    logo: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1203620/logo.png',
    color: '#8E24AA'
  },
  'ARK: Survival Evolved': {
    icon: 'https://cdn2.steamgriddb.com/icon_thumb/52b57ae2e5d0b9a2c0daaa5b09bb9e7a.png',
    banner: 'https://cdn.cloudflare.steamstatic.com/steam/apps/346110/header.jpg',
    logo: 'https://cdn.cloudflare.steamstatic.com/steam/apps/346110/logo.png',
    color: '#FF7043'
  },
  'Conan Exiles': {
    icon: 'https://cdn2.steamgriddb.com/icon_thumb/52b57ae2e5d0b9a2c0daaa5b09bb9e7a.png',
    banner: 'https://cdn.cloudflare.steamstatic.com/steam/apps/440900/header.jpg',
    logo: 'https://cdn.cloudflare.steamstatic.com/steam/apps/440900/logo.png',
    color: '#795548'
  }
};

// Default artwork for unknown games
export const defaultGameArtwork: GameArtwork = {
  icon: 'https://cdn-icons-png.flaticon.com/512/2972/2972531.png', // Generic game controller
  banner: 'https://via.placeholder.com/460x215/374151/ffffff?text=Game+Server',
  logo: 'https://via.placeholder.com/200x80/374151/ffffff?text=Game',
  color: '#374151'
};

/**
 * Get artwork for a specific game type
 * @param gameType The game type string
 * @returns GameArtwork object with all image URLs and color
 */
export function getGameArtwork(gameType: string): GameArtwork {
  // Try exact match first
  if (gameArtworkMap[gameType]) {
    return gameArtworkMap[gameType];
  }

  // Try case-insensitive match
  const lowerGameType = gameType.toLowerCase();
  const matchedKey = Object.keys(gameArtworkMap).find(
    key => key.toLowerCase() === lowerGameType
  );

  if (matchedKey) {
    return gameArtworkMap[matchedKey];
  }

  // Try partial match
  const partialMatch = Object.keys(gameArtworkMap).find(
    key => key.toLowerCase().includes(lowerGameType) || lowerGameType.includes(key.toLowerCase())
  );

  if (partialMatch) {
    return gameArtworkMap[partialMatch];
  }

  // Return default artwork
  return defaultGameArtwork;
}

/**
 * Get the primary color for a game type
 * @param gameType The game type string
 * @returns Hex color string
 */
export function getGameColor(gameType: string): string {
  return getGameArtwork(gameType).color;
}

/**
 * Get game icon URL
 * @param gameType The game type string
 * @returns Icon URL string
 */
export function getGameIcon(gameType: string): string {
  return getGameArtwork(gameType).icon;
}

/**
 * Get game banner/header image URL
 * @param gameType The game type string
 * @returns Banner URL string
 */
export function getGameBanner(gameType: string): string {
  return getGameArtwork(gameType).banner;
}

/**
 * Get game logo URL
 * @param gameType The game type string
 * @returns Logo URL string
 */
export function getGameLogo(gameType: string): string {
  return getGameArtwork(gameType).logo;
}