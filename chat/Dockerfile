FROM blerch/ocs/type:v0.0.1

# App Directory
WORKDIR /usr/src/app

# Install Dependencies
COPY package*.json ./
RUN npm install

# Bundle App
COPY . .

# Configure
EXPOSE 8080
CMD [ "node", "build/index.js" ]
