# 📝 Phase 7: Post & Feed System (High-Signal Content Layer)

## 🛡️ Zero-Trust Professional Network

### Content Creation + Chronological Feed System

---

# 1. 🧠 Objective

This phase establishes:

* Post creation system
* Feed generation system
* Basic interactions (like, comment)
* Foundation for high-signal content (PoW-ready)

---

## ✅ Success Criteria

* Users can create posts
* Users can view feed
* Users can like/comment on posts
* Feed is chronological (no algorithm manipulation)
* Pagination works efficiently

---

# 2. 🤖 Agent Instructions (FOR COPILOT / CODEX)

---

## 🎯 Architecture Rule

```text id="post-arch"
Route → Controller → Service → Prisma
```

---

## 🧠 Core Philosophy

* Content must be **signal-heavy**
* Feed must be **chronological**
* No manipulation / no engagement hacks

---

## ❌ DO NOT

* Do NOT build recommendation algorithm
* Do NOT use Redis yet for feed
* Do NOT rank posts

---

## ✅ MUST

* Use cursor-based pagination
* Keep queries optimized
* Support future PoW integration

---

# 3. 📁 Folder Structure

```text id="post-folder"
/src/modules
  /post
    post.controller.ts
    post.service.ts
    post.routes.ts
    post.schema.ts
```

---

# 4. 🗄️ Prisma Schema

---

## Add to schema.prisma

```prisma id="post-schema"
model Post {
  id        String   @id @default(uuid())
  userId    String
  content   String
  createdAt DateTime @default(now())

  user     User      @relation(fields: [userId], references: [id])
  likes    Like[]
  comments Comment[]
}

model Like {
  id      String @id @default(uuid())
  userId  String
  postId  String

  user User @relation(fields: [userId], references: [id])
  post Post @relation(fields: [postId], references: [id])

  @@unique([userId, postId])
}

model Comment {
  id        String   @id @default(uuid())
  userId    String
  postId    String
  content   String
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
  post Post @relation(fields: [postId], references: [id])
}
```

---

## Migration

```bash id="post-mig"
npx prisma migrate dev --name post_system
```

---

# 5. ⚙️ API Design

---

## Routes

```http id="post-routes"
POST   /posts
GET    /posts/feed
GET    /posts/:id
DELETE /posts/:id

POST   /posts/:id/like
POST   /posts/:id/comment
```

---

# 6. 🔧 Post Module Implementation

---

## 6.1 Create Post

### Flow

```text id="post-flow1"
User → create post
→ save in DB
→ return post
```

---

### Function

```ts id="post-fn1"
createPost(userId, content)
```

---

---

## 6.2 Delete Post

* Only owner can delete

---

---

## 6.3 Get Feed

---

## 🔑 IMPORTANT: Cursor Pagination

---

### Query Logic

```text id="post-flow2"
GET posts WHERE createdAt < cursor
ORDER BY createdAt DESC
LIMIT 10
```

---

### Function

```ts id="post-fn2"
getFeed(cursor, limit)
```

---

---

# 7. ❤️ Like System

---

## Rules

* One user → one like per post
* Toggle like (optional)

---

### Function

```ts id="post-fn3"
likePost(userId, postId)
```

---

---

# 8. 💬 Comment System

---

### Function

```ts id="post-fn4"
addComment(userId, postId, content)
```

---

---

# 9. 🔐 Authorization Rules

---

## Post Owner

* Can delete post

---

## User

* Can like/comment

---

---

# 10. 🧪 Validation

---

## Create Post

```ts id="post-schema1"
{
  body: {
    type: "object",
    required: ["content"],
    properties: {
      content: { type: "string", minLength: 1 }
    }
  }
}
```

---

---

# 11. 🔁 Feed Flow

---

```text id="post-feed-flow"
Client requests feed
→ API fetch posts
→ return sorted data
```

---

---

# 12. ⚠️ Edge Cases

---

## 1. Empty Content

→ Reject

---

## 2. Duplicate Likes

→ Prevent via unique constraint

---

## 3. Large Feed Query

→ Use cursor pagination

---

---

# 13. 🚫 What NOT to Do

---

❌ No algorithmic ranking
❌ No Redis caching yet
❌ No trending system
❌ No AI filtering

---

---

# 14. 🧬 Output of Phase 7

---

✔ Post creation system
✔ Feed system working
✔ Like/comment system
✔ Efficient pagination

---

---

# 15. 🏁 Completion Checklist

---

* [ ] Create post works
* [ ] Feed API works
* [ ] Pagination works
* [ ] Like system works
* [ ] Comment system works

---

---

# 🔥 Final Note

This phase builds your **content layer**.

> LinkedIn = engagement-driven feed
> Your system = signal-driven feed

---

**Content is not for attention.
It is for proof and value.**
