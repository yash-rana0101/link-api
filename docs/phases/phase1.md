# 🔐 Phase 1: Authentication & User System

## 🛡️ Zero-Trust Professional Network

### Identity Layer Implementation

---

# 1. 🧠 Objective

This phase establishes:

* Secure authentication system (JWT-based)
* User identity management
* Protected routes
* Base user profile system

---

## ✅ Success Criteria

* User can **signup**
* User can **login**
* JWT authentication works
* Protected routes are secured
* User profile APIs working

---

# 2. 🤖 Agent Instructions (FOR COPILOT / CODEX)

---

## 🎯 Code Generation Rules

### MUST FOLLOW

1. Use **TypeScript strict mode**
2. Follow architecture:

```text
Route → Controller → Service → Prisma
```

3. Use:

* async/await
* proper error handling
* typed DTOs

---

### NEVER DO

❌ No business logic in routes
❌ No direct Prisma calls in controllers
❌ No plain text passwords
❌ No `any` types

---

## 🧠 Security Rules

* Password must be hashed using **bcrypt**
* JWT must have:

  * access token (short expiry)
  * refresh token (long expiry)
* Store refresh token securely (DB)

---

## 🧩 Naming Conventions

* `auth.controller.ts`
* `auth.service.ts`
* `auth.routes.ts`
* `user.service.ts`

---

# 3. 📁 Folder Structure

```text
/src/modules
  /auth
    auth.controller.ts
    auth.service.ts
    auth.routes.ts
    auth.schema.ts
  /user
    user.controller.ts
    user.service.ts
    user.routes.ts
```

---

# 4. 🗄️ Prisma Schema (Phase 1)

---

## Update schema.prisma

```prisma
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  passwordHash  String
  name          String?
  trustScore    Int      @default(0)
  createdAt     DateTime @default(now())

  sessions      Session[]
}

model Session {
  id           String   @id @default(uuid())
  userId       String
  refreshToken String
  createdAt    DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
}
```

---

## Run Migration

```bash
npx prisma migrate dev --name init_auth
```

---

# 5. 🔐 Auth Flow Design

---

## Signup Flow

```text
User → API → hash password → store user → return tokens
```

---

## Login Flow

```text
User → verify password → generate tokens → store refresh → return tokens
```

---

## Token Strategy

| Token         | Expiry |
| ------------- | ------ |
| Access Token  | 15 min |
| Refresh Token | 7 days |

---

# 6. 🔑 JWT Setup

---

## Install

```bash
npm install @fastify/jwt bcrypt
```

---

## JWT Plugin

```ts
fastify.register(require('@fastify/jwt'), {
  secret: process.env.JWT_SECRET!
});
```

---

---

# 7. 🔐 Auth Module Implementation

---

## 7.1 Auth Service

Responsibilities:

* Signup
* Login
* Token generation

---

### Key Functions

```ts
signup(data)
login(data)
generateTokens(user)
hashPassword(password)
comparePassword(password, hash)
```

---

---

## 7.2 Auth Controller

Responsibilities:

* Handle request/response
* Call service

---

## Routes

```http
POST /auth/signup
POST /auth/login
POST /auth/refresh
```

---

---

# 8. 👤 User Module

---

## Features

* Get profile
* Update profile

---

## Routes

```http
GET /user/me
PATCH /user/update
```

---

---

# 9. 🔐 Auth Middleware

---

## Purpose

Protect private routes

---

## Implementation

```ts
fastify.decorate("authenticate", async (req, reply) => {
  try {
    await req.jwtVerify();
  } catch (err) {
    reply.send(err);
  }
});
```

---

## Usage

```ts
app.get("/user/me", { preHandler: [app.authenticate] }, handler);
```

---

---

# 10. 🔁 Refresh Token Flow

---

## Flow

```text
Client sends refresh token
→ Validate from DB
→ Generate new access token
```

---

## Rules

* Store refresh token in DB
* Invalidate on logout

---

---

# 11. 🧪 Validation Layer

---

## Use JSON Schema (Fastify)

---

### Example

```ts
const signupSchema = {
  body: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: { type: "string" },
      password: { type: "string", minLength: 6 }
    }
  }
};
```

---

---

# 12. ⚠️ Security Best Practices

---

## Password

* bcrypt salt rounds: 10–12

---

## JWT

* Never expose secret
* Use env variables

---

## API

* Validate all inputs
* Sanitize data

---

---

# 13. 🧾 Error Handling

---

## Standard Format

```json
{
  "success": false,
  "message": "Error message"
}
```

---

---

# 14. 🧬 Output of Phase 1

---

✔ User registration working
✔ Login working
✔ JWT auth working
✔ Protected routes working
✔ User profile APIs ready

---

---

# 15. 🚫 What NOT to Do

---

❌ Don’t implement roles yet
❌ Don’t add OAuth yet
❌ Don’t optimize tokens yet
❌ Don’t add Redis here

---

---

# 16. 🏁 Completion Checklist

---

* [ ] Signup API works
* [ ] Login API works
* [ ] Password hashed
* [ ] JWT working
* [ ] Refresh token stored
* [ ] Protected routes working
* [ ] Profile API working

---

---

# 🔥 Final Note

This phase builds your **identity foundation**.

> If auth is weak → entire platform is compromised
> If auth is strong → everything becomes secure

---

**Build this like a security engineer, not just a developer.**
