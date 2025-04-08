FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies with production flag
RUN npm ci --only=production

# Copy app source
COPY . .

# Create data directory
RUN mkdir -p data

# Expose the port defined in environment
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Run as non-root user for better security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -G nodejs nodeuser && \
    chown -R nodeuser:nodejs /usr/src/app

USER nodeuser

# Start the app
CMD ["node", "src/index.js"] 