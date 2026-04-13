# 🤝 Phase 3: Verification System (Peer Consensus Engine)

## 🛡️ Zero-Trust Professional Network

### Decentralized Experience Verification System

---

# 1. 🧠 Objective

This phase establishes:

* Peer-based verification system
* Verification request lifecycle
* Consensus validation rules
* Async processing using queues
* Foundation for trust scoring (Phase 5)

---

## ✅ Success Criteria

* User can request verification for an experience
* User can tag coworkers (peers)
* Peers can accept/reject verification
* System tracks confirmations
* Experience moves from:

  ```
  SELF_CLAIMED → PEER_VERIFIED
  ```

---

# 2. 🤖 Agent Instructions (FOR COPILOT / CODEX)

---

## 🎯 Architecture Rules

```text
Route → Controller → Service → Repository (Prisma)
```

---

## 🧠 Core Philosophy

1. No single authority decides truth
2. Truth = **peer consensus**
3. Minimum confirmations required
4. Only valid peers can verify

---

## ❌ DO NOT

* Do NOT calculate trust score here
* Do NOT call Rust yet (optional in next phase)
* Do NOT auto-verify anything

---

## ✅ MUST

* Use queue for async processing
* Prevent duplicate verification
* Validate peer eligibility

---

# 3. 📁 Folder Structure

```text
/src/modules
  /verification
    verification.controller.ts
    verification.service.ts
    verification.routes.ts
    verification.schema.ts
```

---

# 4. 🗄️ Prisma Schema (Verification System)

---

## Add to schema.prisma

```prisma
model Verification {
  id            String   @id @default(uuid())
  experienceId  String
  verifierId    String
  status        VerificationStatus
  createdAt     DateTime @default(now())

  experience Experience @relation(fields: [experienceId], references: [id])
  verifier   User       @relation(fields: [verifierId], references: [id])

  @@unique([experienceId, verifierId])
}

enum VerificationStatus {
  PENDING
  APPROVED
  REJECTED
}
```

---

## Run Migration

```bash
npx prisma migrate dev --name verification_system
```

---

# 5. 🧩 Verification Rules

---

## Rule 1: Minimum Consensus

```text
Min approvals required = 2
```

---

## Rule 2: Eligible Verifier

A verifier must:

* Not be the owner
* Not already verified
* Be a valid user

---

## Rule 3: Duplicate Prevention

```text
One verifier → one vote only
```

---

---

# 6. ⚙️ API Design

---

## Routes

```http
POST /verification/request
POST /verification/respond
GET  /verification/:experienceId
```

---

---

# 7. 🔧 Verification Module Implementation

---

## 7.1 Request Verification

### Flow

```text
User → request verification
→ provide verifier IDs
→ create PENDING records
→ push to queue
```

---

## Function

```ts
requestVerification(experienceId, verifierIds, userId)
```

---

---

## 7.2 Respond to Verification

### Flow

```text
Verifier → approve/reject
→ update record
→ trigger consensus check
```

---

## Function

```ts
respondVerification(experienceId, status, verifierId)
```

---

---

## 7.3 Consensus Check

### Logic

```text
IF approved_count >= 2
→ experience.status = PEER_VERIFIED
```

---

---

# 8. 🔁 Redis Queue Integration

---

## Queue Name

```text
verification_queue
```

---

## Flow

```text
Request created →
Push to queue →
Worker processes →
Send notifications
```

---

---

# 9. 🔐 Authorization Rules

---

## Owner

* Can request verification

---

## Verifier

* Can only respond to assigned request

---

## Rule

```text
IF verifier not assigned → reject request
```

---

---

# 10. 🧪 Validation

---

## Request Verification

```ts
{
  body: {
    type: "object",
    required: ["experienceId", "verifierIds"],
    properties: {
      experienceId: { type: "string" },
      verifierIds: {
        type: "array",
        items: { type: "string" }
      }
    }
  }
}
```

---

## Respond

```ts
{
  body: {
    type: "object",
    required: ["status"],
    properties: {
      status: {
        enum: ["APPROVED", "REJECTED"]
      }
    }
  }
}
```

---

---

# 11. 🔁 Flow: Full Verification Lifecycle

---

```text
User adds experience
→ SELF_CLAIMED

↓
User requests verification

↓
Peers receive request

↓
Peers approve/reject

↓
System checks:

IF approvals >= 2
→ status = PEER_VERIFIED
```

---

---

# 12. ⚠️ Edge Cases

---

## 1. Self Verification

→ Reject immediately

---

## 2. Duplicate Verifier

→ Ignore

---

## 3. Less than required approvals

→ Remain SELF_CLAIMED

---

## 4. Too many rejections

→ (Future: FLAGGED)

---

---

# 13. 🚫 What NOT to Do

---

❌ No trust score updates
❌ No Rust integration yet (optional next phase)
❌ No AI logic
❌ No automatic approval

---

---

# 14. 🧬 Output of Phase 3

---

✔ Peer verification system working
✔ Async queue system working
✔ Consensus logic implemented
✔ Experience status upgrade working

---

---

# 15. 🏁 Completion Checklist

---

* [ ] Request verification works
* [ ] Peer response works
* [ ] Duplicate prevention working
* [ ] Status updates correctly
* [ ] Queue integration working

---

---

# 🔥 Final Note

This is your **core innovation layer**.

> LinkedIn = “I say I worked here”
> Your system = “Others confirm I worked here”

---

**Truth is no longer claimed.
It is validated by the network.**
