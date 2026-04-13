# 🔔 Phase 10: Notification System (Event-Driven Layer)

## 🛡️ Zero-Trust Professional Network

### Real-Time + Async Notification Engine

---

# 1. 🧠 Objective

This phase establishes:

* Centralized notification system
* Event-driven architecture
* Real-time + background notifications
* Unified communication layer across modules

---

## ✅ Success Criteria

* Notifications are generated on key events
* Notifications stored in DB
* Real-time push via Socket.IO
* Async processing via Redis queue
* Users can fetch notifications

---

# 2. 🤖 Agent Instructions (FOR COPILOT / CODEX)

---

## 🎯 Architecture Rule

```text id="notif-arch"
Event → Queue → Worker → DB → Socket Emit
```

---

## 🧠 Core Philosophy

* Notifications must be **decoupled**
* Events should NOT block main request
* Everything runs async

---

## ❌ DO NOT

* Do NOT send notifications directly in controllers
* Do NOT block API response for notifications
* Do NOT tightly couple modules

---

## ✅ MUST

* Use Redis queue (BullMQ)
* Store notifications in DB
* Emit via Socket.IO

---

# 3. 📁 Folder Structure

```text id="notif-folder"
/src/modules
  /notification
    notification.service.ts
    notification.controller.ts
    notification.routes.ts

/src/workers
  notification.worker.ts
```

---

# 4. 🗄️ Prisma Schema

---

## Add to schema.prisma

```prisma id="notif-schema"
model Notification {
  id        String   @id @default(uuid())
  userId    String
  type      NotificationType
  message   String
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
}

enum NotificationType {
  CONNECTION_REQUEST
  CONNECTION_ACCEPTED
  VERIFICATION_REQUEST
  VERIFICATION_APPROVED
  MESSAGE_RECEIVED
  POST_LIKED
  POST_COMMENTED
}
```

---

## Migration

```bash id="notif-mig"
npx prisma migrate dev --name notification_system
```

---

# 5. 🧩 Notification Events

---

## Trigger Events

```text id="notif-events"
connection_request
connection_accepted
verification_request
verification_approved
message_received
post_liked
post_commented
```

---

---

# 6. ⚙️ Queue System (BullMQ)

---

## Queue Name

```text id="notif-queue"
notification_queue
```

---

---

## Add Job

```ts id="notif-add"
await notificationQueue.add("notify", {
  userId,
  type,
  message
});
```

---

---

# 7. 🔁 Worker Implementation

---

## Worker Flow

```text id="notif-flow"
Receive job
→ store in DB
→ emit via socket
```

---

---

## Example Worker

```ts id="notif-worker"
import { Worker } from "bullmq";

new Worker("notification_queue", async job => {
  const { userId, type, message } = job.data;

  // Save notification in DB

  // Emit via socket
});
```

---

---

# 8. 🔌 Socket Integration

---

## Emit Event

```ts id="notif-emit"
io.to(`user:${userId}`).emit("notification", {
  type,
  message
});
```

---

---

# 9. ⚙️ Notification Module

---

## Functions

```ts id="notif-fn"
createNotification(userId, type, message)
getUserNotifications(userId)
markAsRead(notificationId)
```

---

---

# 10. 🔗 API Design

---

## Routes

```http id="notif-routes"
GET  /notifications
PATCH /notifications/:id/read
```

---

---

# 11. 🔐 Authorization Rules

---

* Only owner can read notifications
* Only owner can mark as read

---

---

# 12. 🔁 Full Flow Example

---

## Example: Connection Request

```text id="notif-example"
User A sends request
→ event triggered
→ job added to queue
→ worker processes
→ notification stored
→ real-time emit to User B
```

---

---

# 13. ⚠️ Edge Cases

---

## 1. User Offline

→ notification stored → delivered later

---

## 2. Duplicate Notifications

→ handle via logic (optional later)

---

## 3. Queue Failure

→ retry mechanism

---

---

# 14. 🚫 What NOT to Do

---

❌ No direct socket emit in controllers
❌ No synchronous notification sending
❌ No skipping DB storage

---

---

# 15. 🧬 Output of Phase 10

---

✔ Event-driven notifications
✔ Real-time updates
✔ Async processing
✔ Decoupled architecture

---

---

# 16. 🏁 Completion Checklist

---

* [ ] Notification queue working
* [ ] Worker processing jobs
* [ ] Notifications stored in DB
* [ ] Real-time emit working
* [ ] API working

---

---

# 🔥 Final Note

This phase introduces:

> **System awareness + reactivity**

---

**Users don’t check updates.
Updates reach users.**
