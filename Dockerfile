# syntax=docker/dockerfile:1
# Dockerfile for Google Cloud Build - Frontend Application

FROM node:20-alpine AS dev-deps
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=dev-deps /app/node_modules ./node_modules
COPY frontend/ ./
# Accept build-time argument for tldraw license key
ARG VITE_TLDRAW_LICENSE_KEY
ENV VITE_TLDRAW_LICENSE_KEY=$VITE_TLDRAW_LICENSE_KEY
RUN npm run build

FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
# Cloud Run sets PORT env var, default to 8080 if not set
ENV PORT=8080
ENV HOST=0.0.0.0
COPY frontend/package*.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
EXPOSE 8080
# Use npm start which runs react-router-serve and respects PORT and HOST environment variables
CMD ["npm", "run", "start"]
