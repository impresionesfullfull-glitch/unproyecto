FROM node:20
WORKDIR /app

# Esto listará los archivos y luego copiará todo
RUN ls -la
COPY . .

# Mantenemos el resto igual
RUN npm install
EXPOSE 3001
CMD ["node", "server.js"]