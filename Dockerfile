# --- Stage 1: Build Frontend ---
FROM node:18-slim AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# --- Stage 2: Final Image ---
FROM python:3.10-slim

# Install Node.js and System Dependencies in one layer
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    curl \
    gnupg \
    libgl1 \
    libglib2.0-0 \
    portaudio19-dev \
    libasound2-dev \
    gcc \
    g++ \
    make \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install ML Service Dependencies
COPY ml_service/requirements.txt ./ml_service/
# Pre-install TensorFlow CPU to block larger GPU versions
RUN pip install --no-cache-dir tensorflow-cpu tensorflow-hub \
    && pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r ml_service/requirements.txt

# Install Backend Dependencies
COPY server/package*.json ./server/
WORKDIR /app/server
# Use npm install to include devDependencies (like typescript) for the build
RUN npm install
COPY server/prisma ./prisma
RUN npx prisma generate
COPY server/ ./
RUN npm run build && npm prune --omit=dev

# Copy Source Code
WORKDIR /app
COPY ml_service ./ml_service

# Copy Built Frontend
RUN mkdir -p client/dist
COPY --from=client-build /app/client/dist ./client/dist

# Environment Variables
ENV NODE_ENV=production
ENV PORT=5000
ENV PYTHON_PATH=python3

# Expose Port
EXPOSE 5000

# Start Service (Backend will spawn ML Service)
WORKDIR /app/server
CMD ["npm", "run", "start"]
