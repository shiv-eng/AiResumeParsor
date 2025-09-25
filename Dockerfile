# Use the official Node.js 18 image.
FROM node:18-slim

# Create and change to the app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy the rest of the application source code
COPY . .

# Expose the port the app runs on
EXPOSE 5050

# The command to run your application
CMD [ "node", "src/index.js" ]