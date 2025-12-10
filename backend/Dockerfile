FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy backend source code
COPY . .

# Use the same port as in backend/.env
ENV PORT=4000
EXPOSE 4000

# Start the backend
CMD ["npm", "start"]
