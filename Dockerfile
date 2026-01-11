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

# Default go2rtc backend - override with environment variables
ENV GO2RTC_API_URL=http://host.docker.internal:1984
# Base64 encoded username:password - generate with: echo -n "user:pass" | base64
ENV GO2RTC_AUTH=""

# Tell envsubst to ONLY substitute these variables (not $host, $uri, etc)
ENV NGINX_ENVSUBST_FILTER=GO2RTC_API_URL,GO2RTC_AUTH

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
