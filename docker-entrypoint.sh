#!/bin/sh
set -e

# Replace placeholders with actual environment variables
sed -i "s|GO2RTC_API_URL_PLACEHOLDER|${GO2RTC_API_URL}|g" /etc/nginx/conf.d/default.conf
sed -i "s|GO2RTC_AUTH_PLACEHOLDER|${GO2RTC_AUTH}|g" /etc/nginx/conf.d/default.conf

# Start nginx
exec nginx -g "daemon off;"
