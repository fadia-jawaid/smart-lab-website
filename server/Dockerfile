FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npx prisma generate
EXPOSE 5000
CMD npx prisma migrate deploy && node dist/index.js