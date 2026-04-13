# 🚀 Phase 0: Foundation Setup (Backend)

## 🛡️ Zero-Trust Professional Network

### Backend Initialization & Infrastructure Setup

---

# 0. 🧠 Objective

This phase establishes:

* Project structure (modular monolith)
* Core infrastructure (DB, Redis, Docker)
* Fastify server setup
* Developer experience (DX)
* Base plugins (Prisma, Redis, Logger)

---

## ✅ Success Criteria

By end of Phase 0:

* Backend server runs successfully
* PostgreSQL connected via Prisma
* Redis connected
* Dockerized environment working
* Health endpoint operational
* Clean scalable folder structure ready

---

# 1. 🤖 Agent Instructions (FOR COPILOT / CODEX)

## 🎯 Behavior Rules

When generating code:

1. ALWAYS:

   * Use **TypeScript**
   * Follow modular architecture
   * Use async/await (no callbacks)
   * Add proper typing

2. NEVER:

   * Write business logic in route handlers
   * Mix concerns (controller/service/db)
   * Use `any` type

3. STRUCTURE RULE:

```text
Controller → Service → Repository (Prisma)
```

4. NAMING:

* camelCase for variables
* PascalCase for classes/types
* kebab-case for file names

---

## 🧠 Architecture Awareness

* Fastify uses **plugins instead of middleware** ([DEV Community][1])
* Prisma provides **type-safe DB queries** ([Prisma][2])
* Redis used for:

  * caching
  * queues
  * rate limiting

---

# 2. 📁 Project Initialization

---

## 2.1 Create Project

```bash
mkdir backend
cd backend
npm init -y
```

---

## 2.2 Install Dependencies

### Core

```bash
npm install fastify dotenv @fastify/cors @fastify/jwt
```

---

### Dev Dependencies

```bash
npm install -D typescript ts-node-dev @types/node
```

---

### ORM

```bash
npm install prisma @prisma/client
```

---

### Redis + Queue

```bash
npm install ioredis bullmq
```

---

### Logger

```bash
npm install pino
```

---

## 2.3 Initialize TypeScript

```bash
npx tsc --init
```

### Update tsconfig.json

```json
{
  "target": "ES2020",
  "module": "commonjs",
  "rootDir": "./src",
  "outDir": "./dist",
  "strict": true,
  "esModuleInterop": true
}
```

---

# 3. 🧱 Folder Structure (CRITICAL)

```text
/backend
  /src
    /modules
    /plugins
    /config
    /utils
    /middlewares
    /types
    app.ts
    server.ts
  /prisma
  /docker
  .env
```

---

## 🧠 Rule

* `/modules` → business logic
* `/plugins` → infra (db, redis)
* `/config` → env configs
* `/utils` → helpers

---

# 4. ⚙️ Fastify App Setup

---

## 4.1 app.ts

```ts
import Fastify from "fastify";

export const buildApp = () => {
  const app = Fastify({
    logger: true
  });

  return app;
};
```

---

## 4.2 server.ts

```ts
import { buildApp } from "./app";

const start = async () => {
  const app = buildApp();

  try {
    await app.listen({ port: 4000, host: "0.0.0.0" });
    console.log("Server running on port 4000");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
```

---

# 5. 🔌 Core Plugins Setup

---

## 5.1 Prisma Plugin

```ts
import fp from "fastify-plugin";
import { PrismaClient } from "@prisma/client";

export default fp(async (fastify) => {
  const prisma = new PrismaClient();

  await prisma.$connect();

  fastify.decorate("prisma", prisma);
});
```

---

## 5.2 Redis Plugin

```ts
import fp from "fastify-plugin";
import Redis from "ioredis";

export default fp(async (fastify) => {
  const redis = new Redis(process.env.REDIS_URL!);

  fastify.decorate("redis", redis);
});
```

---

## 5.3 Register Plugins

```ts
import prismaPlugin from "./plugins/prisma";
import redisPlugin from "./plugins/redis";

app.register(prismaPlugin);
app.register(redisPlugin);
```

---

# 6. 🗄️ Prisma Setup (PostgreSQL)

---

## 6.1 Init Prisma

```bash
npx prisma init
```

---

## 6.2 .env

```env
DATABASE_URL="postgresql://admin:password@localhost:5432/trustnet"
```

---

## 6.3 Basic Schema

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  createdAt DateTime @default(now())
}
```

---

## 6.4 Generate Client

```bash
npx prisma generate
```

---

# 7. 🐳 Docker Setup

---

## 7.1 docker-compose.yml

```yaml
version: "3.9"

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: trustnet
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"

  redis:
    image: redis:7
    ports:
      - "6379:6379"
```

---

## 🧠 Why Docker?

* Consistent environment across machines ([OneUptime][3])
* No local DB setup issues

---

# 8. 🧪 Health Check Endpoint

---

## Route

```ts
app.get("/health", async () => {
  return {
    status: "ok",
    service: "backend",
    uptime: process.uptime()
  };
});
```

---

## Expected Response

```json
{
  "status": "ok",
  "service": "backend"
}
```

---

# 9. 🔐 Environment Config

---

## .env

```env
PORT=4000
DATABASE_URL=...
REDIS_URL=redis://localhost:6379
JWT_SECRET=supersecret
```

---

## Config Loader

```ts
import dotenv from "dotenv";
dotenv.config();
```

---

# 10. 🧾 Scripts (package.json)

```json
"scripts": {
  "dev": "ts-node-dev src/server.ts",
  "build": "tsc",
  "start": "node dist/server.js"
}
```

---

# 11. ⚠️ Best Practices (IMPORTANT)

---

## Fastify

* Use schema validation (later phase) ([Fastify][4])
* Keep plugins isolated

---

## Prisma

* Avoid N+1 queries
* Use select to limit fields

---

## Redis

* Always set TTL for cache
* Avoid large payloads

---

# 12. 🧬 Output of Phase 0

---

✔ Running Fastify server
✔ PostgreSQL connected via Prisma
✔ Redis connected
✔ Docker working
✔ Health endpoint ready
✔ Clean modular structure

---

# 13. 🚀 What NOT to Do

---

❌ Don’t implement business logic
❌ Don’t create all modules yet
❌ Don’t optimize prematurely
❌ Don’t add Rust yet

---

# 14. 🏁 Phase Completion Checklist

---

* [ ] Server starts without error
* [ ] `/health` works
* [ ] Prisma connected
* [ ] Redis connected
* [ ] Docker services running
* [ ] Folder structure ready

---

# 🔥 Final Note

This phase is your **foundation layer**.

> If this is weak → entire system breaks later
> If this is strong → everything becomes easy

---

**Build slow here. Build strong here.**

[1]: https://dev.to/vinicius_rodrigues/criando-sua-api-com-fastify-e-prisma-2299?utm_source=chatgpt.com "Criando sua API com Fastify e Prisma"
[2]: https://www.prisma.io/fastify?utm_source=chatgpt.com "Fastify & Prisma | Next-Generation ORM for SQL DBs"
[3]: https://oneuptime.com/blog/post/2026-02-08-how-to-set-up-a-nextjs-postgresql-redis-stack-with-docker-compose/view?utm_source=chatgpt.com "How to Set Up a Next.js + PostgreSQL + Redis Stack with ..."
[4]: https://fastify.io/docs/latest/Reference/Validation-and-Serialization/?utm_source=chatgpt.com "Validation-and-Serialization"
