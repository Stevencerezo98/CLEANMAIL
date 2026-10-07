# Imagen base ligera con Node.js 20 sobre Alpine Linux
FROM node:20-alpine

# Definir directorio de trabajo de la aplicación
WORKDIR /app

# Instalar dependencias necesarias para compilación y utilidades del sistema
RUN apk add --no-cache libc6-compat

# Copiar manifiestos de paquetes
COPY package*.json ./

# Instalar todas las dependencias (incluyendo herramientas de compilación y runtime tsx)
RUN npm install

# Copiar el código fuente completo del proyecto
COPY . .

# Crear el directorio persistente de base de datos
RUN mkdir -p data

# Compilar la aplicación frontend con Vite
RUN npm run build

# Configurar variables de entorno para producción
ENV NODE_ENV=production
ENV PORT=3000

# Exponer el puerto de la aplicación
EXPOSE 3000

# Comando para iniciar el servidor de producción
CMD ["npm", "start"]
