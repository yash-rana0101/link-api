# 📊 Phase 5: Trust Score System (Reputation Engine)

## 🛡️ Zero-Trust Professional Network

### Dynamic Trust & Reputation Layer

---

# 1. 🧠 Objective

This phase establishes:

* Dynamic trust score calculation
* Reputation-based system behavior
* Integration with verification system
* Foundation for anti-fraud logic

---

## ✅ Success Criteria

* Each user has a trust score
* Trust score updates dynamically
* Trust score influenced by:

  * Verified experiences
  * Peer confirmations
  * Reports
* Trust score affects system decisions

---

# 2. 🤖 Agent Instructions (FOR COPILOT / CODEX)

---

## 🎯 Architecture Rule

```text id="k7w8ax"
Node → stores trust score
Rust → calculates trust score
```

---

## 🧠 Core Philosophy

* Trust is **earned, not assigned**
* Trust is **dynamic**
* Trust is **network-influenced**

---

## ❌ DO NOT

* Do NOT calculate trust score in Node
* Do NOT hardcode values in controllers
* Do NOT skip recalculation triggers

---

## ✅ MUST

* Always call Rust for calculation
* Store result in DB
* Trigger updates on events

---

# 3. 🗄️ Prisma Schema Update

---

## Update User Model

```prisma id="trust-schema"
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  passwordHash  String
  name          String?
  trustScore    Int      @default(0)
  createdAt     DateTime @default(now())

  experiences   Experience[]
  sessions      Session[]
}
```

---

## Migration

```bash id="trust-mig"
npx prisma migrate dev --name trust_score_system
```

---

# 4. 🧠 Trust Score Formula (Rust)

---

## Initial Formula

```text id="trust-formula"
Trust Score =
(Verified Experiences * 20)
+ (Peer Confirmations * 10)
+ (Connections * 5)
- (Reports * 30)
```

---

## Example

```text id="trust-example"
2 verified exp → 40
5 confirmations → 50
3 connections → 15
1 report → -30

Total = 75
```

---

---

# 5. ⚡ Rust Implementation

---

## Input

```json id="trust-input"
{
  "verified_experiences": 2,
  "peer_confirmations": 5,
  "connections": 3,
  "reports": 1
}
```

---

## Output

```json id="trust-output"
{
  "trust_score": 75
}
```

---

---

# 6. 🔗 Node Integration

---

## Service Function

```ts id="trust-call"
calculateTrustScore(userId)
```

---

## Flow

```text id="trust-flow"
Fetch user data
→ send to Rust
→ receive score
→ update DB
```

---

---

# 7. 🔁 Trigger Points (IMPORTANT)

---

## Recalculate trust score when:

* Experience gets verified
* New peer confirmation added
* Connection created
* User reported

---

---

# 8. ⚙️ API Design

---

## Internal API

```http id="trust-api"
POST /internal/trust/recalculate/:userId
```

---

---

# 9. 🔁 Event-Driven Integration

---

## Events

```text id="trust-events"
experience_verified
verification_added
connection_created
user_reported
```

---

## Flow

```text id="trust-event-flow"
Event triggered
→ Push to Redis queue
→ Worker processes
→ Call Rust
→ Update DB
```

---

---

# 10. 📊 Trust Levels (System Usage)

---

| Score | Level     |
| ----- | --------- |
| 0–20  | Low       |
| 21–50 | Medium    |
| 51–80 | High      |
| 81+   | Very High |

---

---

# 11. 🧠 Usage in System

---

## Verification Weight

* High trust → stronger vote

---

## Feed Visibility

* High trust → higher visibility

---

## Hiring Preference

* Recruiters prefer high trust users

---

---

# 12. ⚠️ Edge Cases

---

## 1. New Users

* Default trustScore = 0

---

## 2. Negative Score

* Clamp to minimum = 0

---

## 3. Extremely High Score

* Cap at 100 (optional)

---

---

# 13. 🚫 What NOT to Do

---

❌ No manual trust editing
❌ No frontend trust calculation
❌ No skipping Rust

---

---

# 14. 🧬 Output of Phase 5

---

✔ Dynamic trust score system
✔ Rust-powered computation
✔ Event-driven updates
✔ Reputation layer ready

---

---

# 15. 🏁 Completion Checklist

---

* [ ] Trust score stored in DB
* [ ] Rust API working
* [ ] Recalculation triggers working
* [ ] Queue processing working
* [ ] Trust updates correctly

---

---

# 🔥 Final Note

This phase introduces:

> **Reputation as a system primitive**

---

**Users are no longer equal.
Trust defines influence.**
