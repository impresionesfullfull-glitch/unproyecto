FROM node:20
WORKDIR /app

# Copiamos package.json primero para aprovechar el cache de Docker
COPY package*.json ./
RUN npm install

# Copiamos el resto del código
COPY . .

EXPOSE 3001

# Usamos este formato para asegurar la ejecución
CMD ["node", "server.js"]