# 1. Use an official Node.js runtime as the base image
FROM node:18-slim

# 2. Set the working directory inside the container
WORKDIR /usr/src/app

# 3. Copy package.json and package-lock.json first (for caching)
COPY package*.json ./

# 4. Install all the dependencies
RUN npm install

# 5. Copy the rest of your backend code (server.js, etc.)
COPY . .

# 6. Expose port 8080 (Google Cloud Run requires this port)
EXPOSE 8080

# 7. The command to start your AI Agent
CMD [ "node", "server.js" ]