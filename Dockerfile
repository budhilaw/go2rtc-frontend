# Build stage
FROM node:22-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy nginx config directly (not as template)
COPY nginx.conf.template /etc/nginx/conf.d/default.conf

# Copy custom entrypoint
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html

# Default go2rtc backend - override with environment variables
ENV GO2RTC_API_URL=http://host.docker.internal:1984
ENV GO2RTC_AUTH=""

# Expose port
EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
