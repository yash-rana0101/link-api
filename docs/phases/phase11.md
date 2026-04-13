# 💼 Phase 11: Jobs & Hiring System (Trust-Based Hiring)

## 🛡️ Zero-Trust Professional Network

### Verified Hiring + Application System

---

# 1. 🧠 Objective

This phase establishes:

* Job posting system
* Job application system
* Candidate filtering via trust
* Foundation for fraud-resistant hiring

---

## ✅ Success Criteria

* Companies/users can post jobs
* Users can apply to jobs
* Applications tracked
* Jobs linked to trusted entities
* Hiring flow functional

---

# 2. 🤖 Agent Instructions (FOR COPILOT / CODEX)

---

## 🎯 Architecture Rule

```text id="job-arch"
Route → Controller → Service → Prisma
```

---

## 🧠 Core Philosophy

* Jobs must be **trusted**
* Candidates must be **verifiable**
* Hiring must be **transparent**

---

## ❌ DO NOT

* Do NOT allow anonymous job posting
* Do NOT skip ownership validation
* Do NOT allow invalid applications

---

## ✅ MUST

* Link jobs to users (poster)
* Validate application flow
* Store application status

---

# 3. 📁 Folder Structure

```text id="job-folder"
/src/modules
  /jobs
    jobs.controller.ts
    jobs.service.ts
    jobs.routes.ts
    jobs.schema.ts
```

---

# 4. 🗄️ Prisma Schema

---

## Add to schema.prisma

```prisma id="job-schema"
model Job {
  id          String   @id @default(uuid())
  title       String
  description String
  location    String?
  createdAt   DateTime @default(now())

  postedById  String
  postedBy    User     @relation(fields: [postedById], references: [id])

  applications Application[]
}

model Application {
  id        String   @id @default(uuid())
  jobId     String
  userId    String
  status    ApplicationStatus @default(APPLIED)
  createdAt DateTime @default(now())

  job  Job  @relation(fields: [jobId], references: [id])
  user User @relation(fields: [userId], references: [id])

  @@unique([jobId, userId])
}

enum ApplicationStatus {
  APPLIED
  SHORTLISTED
  REJECTED
  HIRED
}
```

---

## Migration

```bash id="job-mig"
npx prisma migrate dev --name jobs_system
```

---

# 5. 🧩 Job Rules

---

## Rule 1: Job Ownership

```text id="job-rule1"
Only creator can manage job
```

---

## Rule 2: No Duplicate Application

```text id="job-rule2"
One user → one application per job
```

---

## Rule 3: Trust Awareness (Future)

* Prefer high trust users
* Show trust score to recruiter

---

---

# 6. ⚙️ API Design

---

## Job Routes

```http id="job-routes"
POST   /jobs
GET    /jobs
GET    /jobs/:id
DELETE /jobs/:id
```

---

## Application Routes

```http id="job-app-routes"
POST   /jobs/:id/apply
GET    /jobs/:id/applications
PATCH  /applications/:id/status
```

---

---

# 7. 🔧 Implementation

---

## 7.1 Create Job

### Flow

```text id="job-flow1"
User → create job
→ store in DB
→ return job
```

---

---

## 7.2 Apply to Job

### Flow

```text id="job-flow2"
User → apply
→ check duplicate
→ create application
```

---

---

## 7.3 Update Application Status

### Flow

```text id="job-flow3"
Recruiter → update status
→ APPLIED → SHORTLISTED → HIRED/REJECTED
```

---

---

# 8. 🔐 Authorization Rules

---

## Job Owner

* Can update/delete job
* Can view applications
* Can change status

---

## User

* Can apply
* Can view own application

---

---

# 9. 🧪 Validation

---

## Create Job

```ts id="job-schema1"
{
  body: {
    type: "object",
    required: ["title", "description"],
    properties: {
      title: { type: "string" },
      description: { type: "string" }
    }
  }
}
```

---

---

# 10. 🔁 Integration with Notification System

---

## Events

```text id="job-events"
job_applied
application_status_updated
```

---

## Flow

```text id="job-notif-flow"
User applies
→ queue notification
→ recruiter notified
```

---

---

# 11. 📊 Future Enhancements (NOT NOW)

---

* Verified job badge
* Trust-based ranking
* Skill matching
* AI screening

---

---

# 12. ⚠️ Edge Cases

---

## 1. Duplicate Application

→ Reject

---

## 2. Unauthorized Status Update

→ Reject

---

## 3. Deleted Job

→ cascade handling

---

---

# 13. 🚫 What NOT to Do

---

❌ No AI filtering
❌ No complex ranking
❌ No payment integration

---

---

# 14. 🧬 Output of Phase 11

---

✔ Job posting system
✔ Application system
✔ Hiring workflow
✔ Notification integration

---

---

# 15. 🏁 Completion Checklist

---

* [ ] Job creation works
* [ ] Job listing works
* [ ] Apply works
* [ ] Duplicate prevention works
* [ ] Status update works

---

---

# 🔥 Final Note

This phase completes your:

> **Professional ecosystem loop**

---

**Verified people
connect → prove → interact → get hired**
