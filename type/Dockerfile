FROM node:18.13.0-alpine

# App Directory
WORKDIR /usr/src/type

# Install Dependencies
COPY package*.json ./
RUN npm install

# Bundle App
COPY . .

# Build App
RUN npm run build