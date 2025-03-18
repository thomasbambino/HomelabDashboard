# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Install Python and plexapi for Plex integration
RUN apt-get update && \
    apt-get install -y python3 python3-pip curl && \
    pip3 install plexapi && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-slim AS runner

WORKDIR /app

# Install Python and plexapi for Plex integration
RUN apt-get update && \
    apt-get install -y python3 python3-pip curl postgresql-client && \
    pip3 install plexapi && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Copy necessary configuration files
COPY tsconfig.json ./
COPY .env.example ./.env

# Copy uploads folder to ensure it exists
RUN mkdir -p uploads

# Create volumes for persistent data
VOLUME ["/app/uploads"]

# Expose the port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s \
  CMD curl -f http://localhost:5000/health || exit 1

# Start the application
CMD ["npm", "run", "start"]
