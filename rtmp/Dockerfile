FROM alfg/nginx-rtmp:latest

# Copy nginx configuration file
COPY nginx.conf /etc/nginx/nginx.conf

# Copy HTML files
COPY html /usr/share/nginx/html

# Create log directory
RUN mkdir -p /var/log/nginx

EXPOSE 1935
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
