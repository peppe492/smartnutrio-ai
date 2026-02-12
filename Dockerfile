FROM node:20-alpine AS base

# 1. Installa le dipendenze solo quando necessario
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Installa le dipendenze basandoti sul package.json
# Usiamo --legacy-peer-deps per evitare errori con React 19 e librerie UI
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# 2. Ricostruisci il codice sorgente
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disabilita la telemetria durante la build
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# 3. Immagine di produzione, copia i file necessari e avvia
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Sfrutta l'output standalone per ridurre drasticamente la dimensione dell'immagine
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Il file server.js viene creato automaticamente da next build in modalità standalone
CMD ["node", "server.js"]