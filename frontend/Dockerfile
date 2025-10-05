FROM nginx:alpine

# Copy frontend files
COPY index.html /usr/share/nginx/html/
COPY checkout.html /usr/share/nginx/html/
COPY styles.css /usr/share/nginx/html/
COPY script.js /usr/share/nginx/html/
COPY auth.js /usr/share/nginx/html/
COPY cart-api.js /usr/share/nginx/html/
COPY payment.js /usr/share/nginx/html/

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]