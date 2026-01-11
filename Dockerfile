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

# Copy nginx template
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html

# Default go2rtc backend - override with: docker run -e GO2RTC_API_URL=http://your-ip:1984
ENV GO2RTC_API_URL=http://host.docker.internal:1984

# Expose port
EXPOSE 80

# nginx:alpine auto-runs envsubst on /etc/nginx/templates/*.template files
CMD ["nginx", "-g", "daemon off;"]
