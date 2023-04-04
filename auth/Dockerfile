FROM blerch-dev/ocs-type:latest

# App Directory
WORKDIR /usr/src/app

# Install Dependencies
COPY package*.json ./
RUN npm install

# Bundle App
COPY . .

# Build App
RUN npm run build

# Configure
EXPOSE 8082
CMD [ "node", "build/index.js" ]
