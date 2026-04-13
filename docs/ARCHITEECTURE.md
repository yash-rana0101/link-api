# 🛡️ Backend Architecture Document

## Zero-Trust Professional Network

---

# 1. 🧠 Backend Philosophy

The backend follows:

* **Modular Monolith (Node.js - Fastify)**
* **High-Performance Compute Layer (Rust)**
* **Event-Driven Architecture (Redis + Queues)**

---

## Core Principle

> Node.js handles **I/O + orchestration**
> Rust handles **computation + heavy logic**

---

# 2. ⚙️ Technology Stack

## Node Backend

* Runtime: **Node.js (TypeScript)**
* Framework: **Fastify**
* ORM: Prisma
* DB: PostgreSQL
* Cache/Queue: Redis (BullMQ)
* Realtime: Socket.IO

---

## Rust Backend

* Framework: Actix Web
* Role: High-performance computation engine

---

# 3. 🧩 Service Ownership (VERY IMPORTANT)

---

# 3.1 Node.js Responsibilities (Fastify)

Node acts as:

> **API Gateway + Business Orchestrator**

---

## Modules in Node

### 1. Auth Module

* Login / Signup
* JWT handling
* Session management

---

### 2. User Module

* Profile CRUD
* Trust score storage (not calculation)
* User metadata

---

### 3. Experience Module

* Add/Edit/Delete experience
* Attach proof-of-work
* Status tracking

---

### 4. Verification Module

* Send verification requests
* Store peer responses
* Trigger Rust validation

---

### 5. Connections Module

* Send/accept requests
* Relationship types
* Graph management

---

### 6. Feed Module

* Fetch posts
* Pagination
* Cache handling

---

### 7. Post Module

* Create/Delete posts
* Attach artifacts

---

### 8. Jobs Module

* Job CRUD
* Applications

---

### 9. Messaging Module

* Chat APIs
* Socket.IO integration

---

### 10. Notification Module

* Queue notifications
* Trigger real-time events

---

---

# 3.2 Rust Responsibilities

Rust acts as:

> **Deterministic Trust Engine**

---

## Services in Rust

### 1. Trust Score Engine

* Calculates trust score
* Applies weighted formula
* Returns computed value

---

### 2. Verification Consensus Engine

* Validates:

  * Minimum peer confirmations
  * Trust thresholds
* Returns final status:

  * VERIFIED
  * REJECTED
  * FLAGGED

---

### 3. Fraud Detection (Non-AI)

* Detect:

  * Circular verification
  * Rapid approvals
  * Suspicious patterns

---

### 4. Feed Ranking (Future)

* Ranking logic
* Signal weighting

---

---

# 4. 🔗 Node ↔ Rust Communication

---

## Protocol (MVP)

* REST (HTTP)

---

## Example Flow

```text
User adds experience
→ Node stores data
→ Node calls Rust /verification/resolve
→ Rust processes
→ Returns status
→ Node updates DB
```

---

## API Contracts

### Trust Score

```http
POST /trust/calculate
```

Request:

```json
{
  "user_id": "123"
}
```

Response:

```json
{
  "trust_score": 72
}
```

---

### Verification

```http
POST /verification/resolve
```

Request:

```json
{
  "experience_id": "exp_1",
  "confirmations": 2,
  "artifact": true
}
```

Response:

```json
{
  "status": "VERIFIED"
}
```

---

---

# 5. 🗄️ Data Ownership

---

## Node Owns:

* Users
* Experiences
* Posts
* Connections
* Jobs
* Messages

---

## Rust DOES NOT STORE DATA

* Stateless service
* Only computes & returns results

---

---

# 6. ⚡ Redis Responsibilities

---

## 6.1 Rate Limiting

* Prevent spam
* Prevent fake verifications

---

## 6.2 Caching

* Feed cache
* Profile cache

---

## 6.3 Queue System (BullMQ)

Queues:

* verification_queue
* notification_queue
* feed_update_queue

---

---

# 7. 🔁 Event-Driven Flow

---

## Example: Experience Verification

```text
User adds experience
→ Node saves (SELF_CLAIMED)
→ Push to verification_queue
→ Worker processes:
     → Calls Rust
     → Updates DB
     → Sends notifications
```

---

---

# 8. 🔌 Realtime (Socket.IO)

---

## Responsibilities

* Messaging
* Notifications
* Verification updates

---

## Channels

```text
user:{user_id}
chat:{room_id}
```

---

---

# 9. 🧠 Feed System Responsibility Split

---

## Node

* Fetch posts
* Handle pagination
* Cache reads

---

## Rust (Future)

* Ranking logic
* Scoring

---

---

# 10. ⚠️ Anti-Abuse Logic Placement

---

## Node Handles:

* Rate limiting
* Basic validation
* Request throttling

---

## Rust Handles:

* Pattern detection
* Trust anomalies
* Verification fraud

---

---

# 11. 🚀 Scaling Strategy

---

## Phase 1

* Single Node instance
* Single Rust instance

---

## Phase 2

* Multiple Node instances
* Load balancer

---

## Phase 3

* Separate services:

  * Messaging
  * Feed
  * Rust cluster

---

---

# 12. 📦 Folder Structure (Backend)

---

```text
/backend
  /src
    /modules
    /plugins
    /workers
    /services
  /prisma
  /docs
```

---

---

# 13. 🧬 Key Design Decisions

---

## Why Node + Rust Hybrid?

* Node → fast development + ecosystem
* Rust → performance + safety

---

## Why Modular Monolith?

* Easier to build
* Easy to scale later

---

## Why Redis?

* Caching
* Queues
* Rate limiting

---

---

# 14. 🏁 Final Summary

---

## Responsibilities Split

| Layer      | Role                |
| ---------- | ------------------- |
| Node.js    | API + orchestration |
| Rust       | computation engine  |
| PostgreSQL | source of truth     |
| Redis      | cache + queue       |
| Socket.IO  | realtime            |

---

---

## Philosophy

> Keep Node simple
> Keep Rust powerful
> Keep system scalable

---

**This backend is designed to evolve from MVP → production-scale system without rewriting core architecture.**
