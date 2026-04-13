# 🔗 Phase 6: Connection System (Contextual Network Graph)

## 🛡️ Zero-Trust Professional Network

### Relationship-Based Connection Engine

---

# 1. 🧠 Objective

This phase establishes:

* User-to-user connection graph
* Context-based connection requests
* Relationship types (important for trust)
* Foundation for:

  * Verification eligibility
  * Feed relevance
  * Trust scoring

---

## ✅ Success Criteria

* Users can send connection requests
* Requests include relationship context
* Users can accept/reject requests
* Connections stored bidirectionally
* Only valid connections allowed

---

# 2. 🤖 Agent Instructions (FOR COPILOT / CODEX)

---

## 🎯 Architecture Rule

```text id="conn-arch"
Route → Controller → Service → Prisma
```

---

## 🧠 Core Philosophy

* Connections ≠ followers
* Connections = **contextual relationships**
* Every connection must have **meaning**

---

## ❌ DO NOT

* Do NOT allow empty connection requests
* Do NOT auto-connect users
* Do NOT skip validation

---

## ✅ MUST

* Require relationship type
* Prevent duplicate requests
* Store connection symmetrically

---

# 3. 📁 Folder Structure

```text id="conn-folder"
/src/modules
  /connections
    connections.controller.ts
    connections.service.ts
    connections.routes.ts
    connections.schema.ts
```

---

# 4. 🗄️ Prisma Schema

---

## Add to schema.prisma

```prisma id="conn-schema"
model Connection {
  id              String   @id @default(uuid())
  requesterId     String
  receiverId      String
  relationship    RelationshipType
  status          ConnectionStatus @default(PENDING)
  createdAt       DateTime @default(now())

  requester User @relation("Requester", fields: [requesterId], references: [id])
  receiver  User @relation("Receiver", fields: [receiverId], references: [id])

  @@unique([requesterId, receiverId])
}

enum ConnectionStatus {
  PENDING
  ACCEPTED
  REJECTED
}

enum RelationshipType {
  COWORKER
  TEAMMATE
  INTERVIEWED_WITH
  EVENT
  COLD_OUTREACH
}
```

---

## Migration

```bash id="conn-mig"
npx prisma migrate dev --name connection_system
```

---

# 5. 🧩 Connection Rules

---

## Rule 1: No Self Connection

```text id="conn-rule1"
requesterId !== receiverId
```

---

## Rule 2: No Duplicate Request

* Unique constraint ensures this

---

## Rule 3: Context Required

```text id="conn-rule2"
relationship MUST be provided
```

---

## Rule 4: Bidirectional Meaning

* Single record represents both users
* Both users considered connected after acceptance

---

---

# 6. ⚙️ API Design

---

## Routes

```http id="conn-routes"
POST   /connections/request
POST   /connections/respond
GET    /connections
GET    /connections/pending
DELETE /connections/:id
```

---

---

# 7. 🔧 Implementation

---

## 7.1 Send Connection Request

### Flow

```text id="conn-flow1"
User → send request
→ validate input
→ create record (PENDING)
```

---

### Function

```ts id="conn-fn1"
sendRequest(requesterId, receiverId, relationship)
```

---

---

## 7.2 Respond to Request

### Flow

```text id="conn-flow2"
Receiver → accept/reject
→ update status
```

---

### Function

```ts id="conn-fn2"
respondRequest(connectionId, status, userId)
```

---

---

## 7.3 Get Connections

### Flow

```text id="conn-flow3"
Fetch all ACCEPTED connections
→ return list
```

---

---

# 8. 🔐 Authorization Rules

---

## Requester

* Can send request

---

## Receiver

* Can accept/reject

---

## Rule

```text id="conn-auth"
Only receiver can respond
```

---

---

# 9. 🧪 Validation

---

## Send Request

```ts id="conn-schema1"
{
  body: {
    type: "object",
    required: ["receiverId", "relationship"],
    properties: {
      receiverId: { type: "string" },
      relationship: { type: "string" }
    }
  }
}
```

---

## Respond

```ts id="conn-schema2"
{
  body: {
    type: "object",
    required: ["status"],
    properties: {
      status: {
        enum: ["ACCEPTED", "REJECTED"]
      }
    }
  }
}
```

---

---

# 10. 🔁 Flow: Full Connection Lifecycle

---

```text id="conn-lifecycle"
User sends request
→ PENDING

↓
Receiver responds

↓
IF ACCEPTED
→ Connection established

ELSE
→ Rejected
```

---

---

# 11. 🔁 Integration with Trust System

---

## Trigger Event

```text id="conn-event"
connection_created
```

---

## Flow

```text id="conn-trust-flow"
Connection accepted
→ push event to queue
→ recalculate trust score
```

---

---

# 12. ⚠️ Edge Cases

---

## 1. Duplicate Requests

→ Reject

---

## 2. Reverse Request

* If A → B exists and B → A sends
  → auto-handle (optional future)

---

## 3. Spam Requests

→ Rate limit (Phase 8)

---

---

# 13. 🚫 What NOT to Do

---

❌ No follower system
❌ No auto suggestions yet
❌ No recommendations
❌ No AI

---

---

# 14. 🧬 Output of Phase 6

---

✔ Connection system working
✔ Context-based networking
✔ Graph structure ready
✔ Trust integration enabled

---

---

# 15. 🏁 Completion Checklist

---

* [ ] Send request works
* [ ] Accept/reject works
* [ ] Connections fetch works
* [ ] Validation enforced
* [ ] Trust trigger works

---

---

# 🔥 Final Note

This phase creates your **network layer**.

> LinkedIn = “Add connection”
> Your system = “Define relationship”

---

**Connections are no longer numbers.
They are context-rich trust edges.**
