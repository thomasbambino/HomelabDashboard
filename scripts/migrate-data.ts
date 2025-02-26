import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import * as schema from '../shared/schema';

const { Pool } = pg;

async function verifyConnection(pool: pg.Pool, name: string) {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT current_database(), current_user;');
    console.log(`Connected to ${name} database:`, result.rows[0]);
    client.release();
    return true;
  } catch (error) {
    console.error(`Failed to connect to ${name} database:`, error);
    return false;
  }
}

// Source database connection
const sourcePool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_pT3PdKZOM1xJ@ep-ancient-brook-a68xn30x.us-west-2.aws.neon.tech/neondb',
  ssl: {
    rejectUnauthorized: false
  }
});

// Target database connection (using current DATABASE_URL)
const targetPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const sourceDb = drizzle(sourcePool, { schema });
const targetDb = drizzle(targetPool, { schema });

async function migrateData() {
  try {
    // Verify connections first
    console.log('Verifying database connections...');
    const sourceConnected = await verifyConnection(sourcePool, 'source');
    const targetConnected = await verifyConnection(targetPool, 'target');

    if (!sourceConnected || !targetConnected) {
      throw new Error('Failed to connect to one or both databases');
    }

    console.log('Fetching data from source database...');

    // First get all data from source
    const sourceUsers = await sourceDb.query.users.findMany();
    console.log(`Found ${sourceUsers.length} users to migrate`);

    const sourceSettings = await sourceDb.query.settings.findMany();
    console.log(`Found ${sourceSettings.length} settings to migrate`);

    const sourceServices = await sourceDb.query.services.findMany();
    console.log(`Found ${sourceServices.length} services to migrate`);

    const sourceGameServers = await sourceDb.query.gameServers.findMany();
    console.log(`Found ${sourceGameServers.length} game servers to migrate`);

    const sourceStatusLogs = await sourceDb.query.serviceStatusLogs.findMany();
    console.log(`Found ${sourceStatusLogs.length} status logs to migrate`);

    const sourceNotificationPrefs = await sourceDb.query.notificationPreferences.findMany();
    console.log(`Found ${sourceNotificationPrefs.length} notification preferences to migrate`);

    const sourceEmailTemplates = await sourceDb.query.emailTemplates.findMany();
    console.log(`Found ${sourceEmailTemplates.length} email templates to migrate`);

    const sourceSentNotifications = await sourceDb.query.sentNotifications.findMany();
    console.log(`Found ${sourceSentNotifications.length} sent notifications to migrate`);

    // Insert data into target database in the correct order to maintain relationships
    console.log('Starting data migration...');

    // 1. First users as they are referenced by other tables
    console.log('Migrating users...');
    for (const user of sourceUsers) {
      await targetDb.insert(schema.users)
        .values(user)
        .onConflictDoNothing();
    }

    // 2. Settings
    console.log('Migrating settings...');
    for (const setting of sourceSettings) {
      await targetDb.insert(schema.settings)
        .values(setting)
        .onConflictDoNothing();
    }

    // 3. Services
    console.log('Migrating services...');
    for (const service of sourceServices) {
      await targetDb.insert(schema.services)
        .values(service)
        .onConflictDoNothing();
    }

    // 4. Game Servers
    console.log('Migrating game servers...');
    for (const server of sourceGameServers) {
      await targetDb.insert(schema.gameServers)
        .values(server)
        .onConflictDoNothing();
    }

    // 5. Service Status Logs (depends on services)
    console.log('Migrating service status logs...');
    for (const log of sourceStatusLogs) {
      await targetDb.insert(schema.serviceStatusLogs)
        .values(log)
        .onConflictDoNothing();
    }

    // 6. Notification Preferences (depends on users and services)
    console.log('Migrating notification preferences...');
    for (const pref of sourceNotificationPrefs) {
      await targetDb.insert(schema.notificationPreferences)
        .values(pref)
        .onConflictDoNothing();
    }

    // 7. Email Templates
    console.log('Migrating email templates...');
    for (const template of sourceEmailTemplates) {
      await targetDb.insert(schema.emailTemplates)
        .values(template)
        .onConflictDoNothing();
    }

    // 8. Sent Notifications (depends on notification preferences, templates, and services)
    console.log('Migrating sent notifications...');
    for (const notification of sourceSentNotifications) {
      await targetDb.insert(schema.sentNotifications)
        .values(notification)
        .onConflictDoNothing();
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    console.log('Closing database connections...');
    await sourcePool.end();
    await targetPool.end();
  }
}

migrateData();