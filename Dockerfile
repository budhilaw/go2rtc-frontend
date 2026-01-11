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

# IMPORTANT: Tell envsubst to ONLY substitute GO2RTC_API_URL (not $host, $uri, etc)
ENV NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx/conf.d
ENV NGINX_ENVSUBST_TEMPLATE_SUFFIX=.template
ENV NGINX_ENVSUBST_FILTER=GO2RTC_API_URL

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
