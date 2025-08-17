# Multi-stage Dockerfile para build da Bíblia Sagrada
FROM node:18-bullseye as builder

# Instalar dependências do sistema necessárias para o Electron
RUN apt-get update && apt-get install -y \
    libnss3-dev \
    libatk-bridge2.0-dev \
    libxkbcommon-dev \
    libxcomposite-dev \
    libxdamage-dev \
    libxrandr-dev \
    libgbm-dev \
    libxss-dev \
    libasound2-dev \
    libgtk-3-dev \
    build-essential \
    python3 \
    python3-distutils \
    && rm -rf /var/lib/apt/lists/*

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de configuração
COPY package*.json ./
COPY tsconfig.json ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY forge.config.ts ./
COPY vite*.config.ts ./

# Instalar dependências
RUN npm ci --only=production=false

# Copiar código fonte
COPY src/ ./src/
COPY index.html ./
COPY assets/ ./assets/

# Definir variáveis de ambiente para build
ENV NODE_ENV=production
ENV ELECTRON_CACHE=/tmp/electron-cache
ENV ELECTRON_BUILDER_CACHE=/tmp/electron-builder-cache

# Criar diretórios de cache
RUN mkdir -p $ELECTRON_CACHE $ELECTRON_BUILDER_CACHE

# Build do aplicativo
RUN npm run build

# Gerar pacote .deb
RUN npm run make:deb

# Stage final para extração dos artefatos
FROM alpine:latest as output

WORKDIR /output

# Copiar artefatos de build
COPY --from=builder /app/out/ ./

# Comando padrão
CMD ["sh", "-c", "find . -name '*.deb' -exec cp {} /host/ \\;"]