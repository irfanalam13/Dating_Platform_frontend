FROM node:20.10-alpine

WORKDIR /app

ENV NODE_ENV=development

# Install dependencies first (cached)
COPY package*.json ./
RUN npm ci

# Copy rest of the code
COPY . .

EXPOSE 3000

RUN npm run build
CMD ["npm", "start"]
