FROM node:20
# Forzamos que el directorio de trabajo sea donde está el código
WORKDIR /app

# Copiamos todo explícitamente desde la raíz del contexto de construcción
COPY . /app/

# Listamos para verificar (esto es lo que nos dirá la verdad en el log)
RUN ls -la /app

# Instalamos
RUN npm install

EXPOSE 3001
CMD ["node", "server.js"]