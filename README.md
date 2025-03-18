# Homelab Dashboard

A comprehensive homelab monitoring and management dashboard with Plex integration and game server management capabilities.

## Local Deployment with Docker

This guide will help you set up the application in your homelab environment.

### Prerequisites

- Docker and Docker Compose installed on your homelab server
- A running Plex Media Server (if using Plex integration)
- AMP Server (if managing game servers)

### Setup Instructions

1. **Clone the Repository**

   Clone the repository to your homelab server:

   ```bash
   git clone https://github.com/yourusername/homelab-dashboard.git
   cd homelab-dashboard
   ```

2. **Configure Environment Variables**

   Create a `.env` file based on the provided `.env.example`:

   ```bash
   cp .env.example .env
   ```

   Edit the `.env` file and replace the placeholder values with your actual credentials:

   - **Database Configuration**: The default configuration should work for local deployment
   - **Plex Integration**: Add your Plex token and local server URL
   - **AMP Server**: Add your AMP API credentials if you're using it
   - **Email Service**: Configure if you want email notifications

3. **Build and Start the Application**

   Run the following command to build and start the containers:

   ```bash
   docker-compose up -d
   ```

   This will:
   - Build the application container
   - Set up a PostgreSQL database
   - Configure networking between services
   - Start the application on port 5000

4. **Access the Dashboard**

   Once the containers are running, you can access the dashboard at:

   ```
   http://your-server-ip:5000
   ```

   If you're accessing it on the same machine, use:

   ```
   http://localhost:5000
   ```

5. **Initialize the Database**

   The first time you run the application, you'll need to push the database schema:

   ```bash
   docker-compose exec app npm run db:push
   ```

6. **Create Admin User**

   To create an admin user, run:

   ```bash
   docker-compose exec app node scripts/create-admin.js
   ```

### Connecting to Local Services

#### Plex Integration

To connect to your local Plex server:

1. Make sure your Plex server is running on the same network
2. In the `.env` file, set `PLEX_URL` to point to your Plex server (e.g., `http://192.168.1.100:32400`)
3. Add your Plex token to the `PLEX_TOKEN` variable

#### Accessing Services on the Host Machine

If you need to access services running on the host machine from inside the container:

1. Uncomment the `extra_hosts` section in `docker-compose.yml`:
   ```yaml
   extra_hosts:
     - "host.docker.internal:host-gateway"
   ```

2. Use `host.docker.internal` instead of `localhost` or `127.0.0.1` to access services on the host machine.

### Additional Configuration

#### Persistent Storage

The application uses Docker volumes for persistent storage:

- `postgres_data`: Stores the PostgreSQL database
- `app_uploads`: Stores uploaded files

These volumes persist even if the containers are restarted.

#### Backup and Restore

To backup your database:

```bash
docker-compose exec db pg_dump -U postgres gamelab > backup.sql
```

To restore from a backup:

```bash
cat backup.sql | docker-compose exec -T db psql -U postgres gamelab
```

#### Troubleshooting

If you encounter issues with the application:

1. Check the logs:
   ```bash
   docker-compose logs -f app
   ```

2. Ensure all services are running:
   ```bash
   docker-compose ps
   ```

3. Restart the application if needed:
   ```bash
   docker-compose restart app
   ```

### Updating the Application

To update the application:

1. Pull the latest changes:
   ```bash
   git pull
   ```

2. Rebuild and restart the containers:
   ```bash
   docker-compose up -d --build
   ```

3. Run any necessary database migrations:
   ```bash
   docker-compose exec app npm run db:push
   ```

---

## Tech Stack

- Frontend: React, TypeScript, TailwindCSS
- Backend: Node.js, Express
- Database: PostgreSQL
- Authentication: Firebase
- Other: PlexAPI, AMP API for game server management