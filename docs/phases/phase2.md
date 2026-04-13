# 🧩 Phase 2: Experience System (Zero-Trust Identity Layer)

## 🛡️ Zero-Trust Professional Network

### Claim-Based Experience + Proof-of-Work System

---

# 1. 🧠 Objective

This phase establishes:

* Experience claim system (NOT trusted by default)
* Proof-of-Work (PoW) attachment system
* Experience lifecycle management
* Foundation for verification system (Phase 3)

---

## ✅ Success Criteria

* User can add experience
* Experience is stored as **SELF_CLAIMED**
* User can attach proof (GitHub, portfolio, etc.)
* User can update/delete experience
* Experience visible in profile with status

---

# 2. 🤖 Agent Instructions (FOR COPILOT / CODEX)

---

## 🎯 Architecture Rules

Follow STRICTLY:

```text id="arch-rule"
Route → Controller → Service → Repository (Prisma)
```

---

## 🧠 Business Logic Rules

1. Experience is NEVER trusted initially
2. Default status:

```text id="status-rule"
SELF_CLAIMED
```

3. No verification logic in this phase
4. Proof-of-work is mandatory for future validation

---

## ❌ DO NOT

* Do NOT implement peer verification
* Do NOT calculate trust score
* Do NOT call Rust service
* Do NOT add Redis queue here

---

## ✅ MUST

* Use enums for status
* Validate inputs
* Keep modular structure

---

# 3. 📁 Folder Structure

```text id="folder-exp"
/src/modules
  /experience
    experience.controller.ts
    experience.service.ts
    experience.routes.ts
    experience.schema.ts
```

---

# 4. 🗄️ Prisma Schema (Experience System)

---

## Update schema.prisma

```prisma id="schema-exp"
model Experience {
  id          String   @id @default(uuid())
  userId      String
  companyName String
  role        String
  description String?
  status      ExperienceStatus @default(SELF_CLAIMED)
  startDate   DateTime
  endDate     DateTime?
  createdAt   DateTime @default(now())

  user       User       @relation(fields: [userId], references: [id])
  artifacts  Artifact[]
}

model Artifact {
  id            String   @id @default(uuid())
  experienceId  String
  type          ArtifactType
  url           String
  createdAt     DateTime @default(now())

  experience Experience @relation(fields: [experienceId], references: [id])
}

enum ExperienceStatus {
  SELF_CLAIMED
  PEER_VERIFIED
  FULLY_VERIFIED
  FLAGGED
}

enum ArtifactType {
  GITHUB
  PORTFOLIO
  PROJECT
  CERTIFICATE
  OTHER
}
```

---

## Run Migration

```bash id="mig-exp"
npx prisma migrate dev --name experience_module
```

---

# 5. 🧩 Experience Data Model Rules

---

## Experience

* Represents a **claim**
* Linked to a user
* Can have multiple artifacts

---

## Artifact

* Represents **proof-of-work**
* Must be attached for validation in later phases

---

## Rule

```text id="rule-exp"
Experience without artifact = weak claim
```

---

# 6. ⚙️ API Design

---

## Routes

```http id="routes-exp"
POST   /experience
GET    /experience/:id
GET    /experience/user/:userId
PATCH  /experience/:id
DELETE /experience/:id
POST   /experience/:id/artifact
```

---

# 7. 🔧 Experience Module Implementation

---

## 7.1 Service Responsibilities

* Create experience
* Update experience
* Delete experience
* Fetch experiences
* Attach artifacts

---

## Core Functions

```ts id="func-exp"
createExperience(data, userId)
updateExperience(id, data, userId)
deleteExperience(id, userId)
getExperienceById(id)
getUserExperiences(userId)
addArtifact(experienceId, data)
```

---

---

## 7.2 Controller Responsibilities

* Validate input
* Call service
* Return structured response

---

---

# 8. 🔐 Authorization Rules

---

## IMPORTANT

User can ONLY:

* Update own experience
* Delete own experience

---

## Rule

```text id="auth-exp"
IF experience.userId !== currentUser
→ throw Unauthorized
```

---

---

# 9. 🧪 Validation Schema

---

## Create Experience

```ts id="schema-create"
{
  body: {
    type: "object",
    required: ["companyName", "role", "startDate"],
    properties: {
      companyName: { type: "string" },
      role: { type: "string" },
      description: { type: "string" },
      startDate: { type: "string" },
      endDate: { type: "string" }
    }
  }
}
```

---

## Add Artifact

```ts id="schema-artifact"
{
  body: {
    type: "object",
    required: ["type", "url"],
    properties: {
      type: { type: "string" },
      url: { type: "string" }
    }
  }
}
```

---

---

# 10. 🔁 Flow: Add Experience

---

```text id="flow-exp"
User → POST /experience
→ Validate input
→ Save in DB
→ status = SELF_CLAIMED
→ Return response
```

---

---

# 11. 🔁 Flow: Add Artifact

---

```text id="flow-artifact"
User → POST /experience/:id/artifact
→ Validate ownership
→ Save artifact
→ Link to experience
```

---

---

# 12. 📊 Response Format

---

## Success

```json id="resp-exp"
{
  "success": true,
  "data": {
    "id": "exp_123",
    "status": "SELF_CLAIMED"
  }
}
```

---

---

# 13. ⚠️ Edge Cases

---

## 1. Duplicate Experience

* Same company + same duration
  → Allow (but flag later in Phase 3)

---

## 2. Invalid Dates

* endDate < startDate → reject

---

## 3. Missing Artifact

* Allowed (but weak claim)

---

---

# 14. 🚫 What NOT to Do

---

❌ No peer verification
❌ No trust score updates
❌ No Redis usage
❌ No Rust calls

---

---

# 15. 🧬 Output of Phase 2

---

✔ Experience CRUD working
✔ Proof-of-work system ready
✔ Status system initialized
✔ Data ready for verification

---

---

# 16. 🏁 Completion Checklist

---

* [ ] Add experience API works
* [ ] Status = SELF_CLAIMED
* [ ] Artifact API works
* [ ] Update/delete secured
* [ ] Fetch user experiences works

---

---

# 🔥 Final Note

This phase defines your **core identity layer**.

> LinkedIn = “Trust what user says”
> Your platform = “Trust only what can be proven later”

---

**You are not building profiles.
You are building verifiable identity.**
