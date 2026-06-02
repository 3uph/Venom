FROM node:20-slim AS frontend-build
WORKDIR /app/dashboard
COPY dashboard/package.json dashboard/package-lock.json* ./
RUN npm install
COPY dashboard/ ./
RUN npm run build

FROM python:3.11-slim
WORKDIR /app
COPY api/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY api/ ./api/
COPY --from=frontend-build /app/dashboard/dist ./static
RUN mkdir -p /app/storage

ENV VENOM_STORAGE_PATH=/app/storage
ENV VENOM_DB_PATH=/app/storage/venom.db

EXPOSE 8080

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8080"]
