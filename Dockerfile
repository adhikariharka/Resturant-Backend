# Use Node.js 22 Alpine (matching dev environment)
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build
RUN ls -la dist/

# --- Production Image ---
FROM node:22-alpine

WORKDIR /app

# Copy package files for production install
COPY package*.json ./

# Install ONLY production dependencies
RUN npm ci --only=production

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist

# Expose port (default NestJS)
EXPOSE 8000

# Start command
CMD ["node", "dist/main"]
