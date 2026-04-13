# 💬 Phase 9: Messaging System (Realtime Communication Layer)

## 🛡️ Zero-Trust Professional Network

### Secure 1:1 Chat System with Socket.IO

---

# 1. 🧠 Objective

This phase establishes:

* Real-time messaging system
* Persistent chat storage
* Socket-based communication
* Context-aware messaging restrictions

---

## ✅ Success Criteria

* Users can send messages in real-time
* Messages are stored in DB
* Chat history is retrievable
* Only connected users can message
* Socket.IO working reliably

---

# 2. 🤖 Agent Instructions (FOR COPILOT / CODEX)

---

## 🎯 Architecture Rule

```text id="msg-arch"
Socket Event → Handler → Service → Prisma
```

---

## 🧠 Core Philosophy

* Messaging must be **secure**
* Messaging must be **restricted**
* Only meaningful interactions allowed

---

## ❌ DO NOT

* Do NOT allow messaging without connection
* Do NOT store messages only in memory
* Do NOT block event loop

---

## ✅ MUST

* Persist messages in DB
* Validate connection before sending
* Use rooms for chats

---

# 3. 📁 Folder Structure

```text id="msg-folder"
/src/modules
  /messaging
    messaging.service.ts
    messaging.controller.ts (optional for REST)
    messaging.socket.ts
```

---

# 4. 🗄️ Prisma Schema

---

## Add to schema.prisma

```prisma id="msg-schema"
model Conversation {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())

  participants Participant[]
  messages     Message[]
}

model Participant {
  id              String @id @default(uuid())
  userId          String
  conversationId  String

  user         User         @relation(fields: [userId], references: [id])
  conversation Conversation @relation(fields: [conversationId], references: [id])
}

model Message {
  id             String   @id @default(uuid())
  senderId       String
  conversationId String
  content        String
  createdAt      DateTime @default(now())

  sender       User         @relation(fields: [senderId], references: [id])
  conversation Conversation @relation(fields: [conversationId], references: [id])
}
```

---

## Migration

```bash id="msg-mig"
npx prisma migrate dev --name messaging_system
```

---

# 5. ⚙️ Messaging Rules

---

## Rule 1: Only Connected Users

```text id="msg-rule1"
User A can message User B ONLY if connection exists
```

---

## Rule 2: Conversation Reuse

* If conversation exists → reuse
* Else → create new

---

## Rule 3: No Self Messaging

```text id="msg-rule2"
senderId !== receiverId
```

---

---

# 6. 🔌 Socket.IO Setup

---

## Register Plugin

```ts id="socket-setup"
import { Server } from "socket.io";

const io = new Server(server, {
  cors: { origin: "*" }
});

fastify.decorate("io", io);
```

---

---

# 7. 🔁 Socket Flow

---

## Connection

```text id="socket-flow1"
Client connects
→ joins user room
→ user:{userId}
```

---

---

## Send Message

```text id="socket-flow2"
Client emits message
→ server validates
→ save to DB
→ emit to receiver room
```

---

---

# 8. 🔧 Implementation

---

## 8.1 Join Room

```ts id="join-room"
socket.join(`user:${userId}`);
```

---

---

## 8.2 Send Message Event

```ts id="msg-event"
socket.on("send_message", async (data) => {
  const { senderId, receiverId, content } = data;

  // validate connection
  // create/find conversation
  // store message
  // emit to receiver
});
```

---

---

## 8.3 Emit Message

```ts id="emit-msg"
io.to(`user:${receiverId}`).emit("receive_message", message);
```

---

---

# 9. 🔁 REST APIs (Optional)

---

## Routes

```http id="msg-routes"
GET /messages/:conversationId
GET /conversations
```

---

---

# 10. 🔐 Authorization Rules

---

## Before sending message:

* Check connection exists
* Check user is participant

---

---

# 11. 🧪 Validation

---

## Message Schema

```ts id="msg-schema1"
{
  content: { type: "string", minLength: 1 }
}
```

---

---

# 12. ⚠️ Edge Cases

---

## 1. User Offline

→ message stored → delivered later

---

## 2. Duplicate Conversations

→ prevent via query check

---

## 3. Spam Messaging

→ rate limit (Phase 8)

---

---

# 13. 🚫 What NOT to Do

---

❌ No group chat yet
❌ No typing indicators yet
❌ No message reactions yet

---

---

# 14. 🧬 Output of Phase 9

---

✔ Real-time messaging working
✔ Persistent chat system
✔ Secure communication
✔ Socket.IO integrated

---

---

# 15. 🏁 Completion Checklist

---

* [ ] Socket connection works
* [ ] Messages sent/received
* [ ] Messages stored in DB
* [ ] Conversations handled correctly
* [ ] Authorization enforced

---

---

# 🔥 Final Note

This phase adds:

> **Real-time human interaction layer**

---

**Profiles show credibility.
Messages build relationships.**
