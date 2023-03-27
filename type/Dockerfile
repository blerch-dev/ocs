FROM node:18.13-slim as build

# App Directory
WORKDIR /usr/src/type

# Install Dependencies
COPY package*.json ./
RUN npm install && npm run build

# Bundle App
COPY . .

# Build App
RUN npm run build