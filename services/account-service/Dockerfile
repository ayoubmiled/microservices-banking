FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN mkdir -p data
EXPOSE 50052
CMD ["node", "src/index.js"]
