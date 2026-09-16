# 1. Build frontend
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# 2. Setup production server
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Copy server dependencies and code
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --omit=dev
COPY server/ ./

# Copy built frontend assets
COPY --from=client-builder /app/client/dist /app/client/dist

# Expose backend port
EXPOSE 5000

# Start server
CMD ["node", "index.js"]
