FROM node:20
WORKDIR /app

# Copiamos package.json primero
COPY package*.json ./
RUN npm install

# Copiamos todo el contenido de la carpeta actual al directorio /app
COPY . .

# FORZAMOS la ejecución. Si server.js está en la raíz, esto debería funcionar.
CMD ["node", "server.js"]