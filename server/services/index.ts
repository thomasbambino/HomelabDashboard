// Export interfaces
export * from './interfaces';

// Export service registry
export * from './service-registry';

// Export service implementations
export * from './amp-service';
export * from './plex-service';
export * from './service-checker';
export * from './email-service';

// Import services and service registry
import { serviceRegistry } from './service-registry';
import { ampService } from './amp-service';
import { plexService } from './plex-service';
import { serviceCheckerService } from './service-checker';
import { emailService } from './email-service';

/**
 * Initialize all services and register them with the service registry
 */
export async function initializeServices(): Promise<void> {
  // Register all services with the registry
  serviceRegistry.register('amp', ampService);
  serviceRegistry.register('plex', plexService);
  serviceRegistry.register('service-checker', serviceCheckerService);
  serviceRegistry.register('email', emailService);
  
  // Initialize all registered services
  await serviceRegistry.initializeAll();
  
  console.log('All services initialized');
}