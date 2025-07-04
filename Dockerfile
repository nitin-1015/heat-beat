# Build stage
FROM node:18-alpine as build
WORKDIR /app

# Build arguments for environment variables at build time
ARG VITE_API_URL=https://keval-fst-health-vital-backend.hf.space
ARG VITE_WS_URL=wss://keval-fst-health-vital-backend.hf.space

# Set environment variables for the build
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_WS_URL=${VITE_WS_URL}

# Copy package files and configs first (for better caching)
COPY package*.json ./
COPY vite.config.ts .
COPY tsconfig*.json .
COPY tailwind.config.js .
COPY postcss.config.js .

# Install dependencies
RUN npm install --no-audit

# Copy source code
COPY src ./src
COPY index.html .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Install gettext for envsubst
RUN apk add --no-cache gettext

# Copy built files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config template
COPY frontend/nginx.conf /etc/nginx/templates/default.conf.template


# Expose port
EXPOSE 80

# Start Nginx with environment variable substitution
CMD ["sh", "-c", "envsubst '$$VITE_API_URL $$VITE_WS_URL' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
