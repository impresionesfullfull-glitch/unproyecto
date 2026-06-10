FROM node:20-slim
WORKDIR /app


COPY package*.json ./

RUN npm ci --only=production

# Copiamos el resto del código
COPY . .


EXPOSE 3001

CMD ["node", "server.js"]