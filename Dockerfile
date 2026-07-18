FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
ENV NODE_ENV=production
ENV DATA_DIR=/data
EXPOSE 3000
# Eerste start op een leeg volume: seed de demo-data, daarna gewoon starten.
CMD ["sh", "-c", "[ -f /data/pluim.db ] || node seed.js; node server.js"]
