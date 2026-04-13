# LinkedIn Clone Backend API Reference

This document lists all backend endpoints currently exposed by the API server for frontend integration and UI design.

Last updated: 2026-04-14

## 1) Base URL and Auth

- Base URL (local): `http://localhost:4000`
- There is no global `/api` or version prefix in the current backend.
- Protected endpoints require: `Authorization: Bearer <accessToken>`
- Access token type must be `access` (refresh token cannot be used for protected routes).

## 2) Common Request/Response Rules

- Content type: `application/json`
- IDs are string UUIDs.

Success envelope (most routes):

```json
{
  "success": true,
  "message": "Optional message",
  "data": {}
}
```

Error envelope:

```json
{
  "success": false,
  "message": "Error message"
}
```

Validation errors return HTTP `400` with `Request validation failed.`.

## 3) Enums Used by Frontend Forms

### RelationshipType

- `COWORKER`
- `TEAMMATE`
- `INTERVIEWED_WITH`
- `EVENT`
- `COLD_OUTREACH`

### ArtifactType

- `GITHUB`
- `PORTFOLIO`
- `PROJECT`
- `CERTIFICATE`
- `OTHER`

### VerificationStatus

- `PENDING`
- `APPROVED`
- `REJECTED`

### ApplicationStatus

- `APPLIED`
- `SHORTLISTED`
- `REJECTED`
- `HIRED`

Status values accepted by `PATCH /applications/:id/status`:

- `SHORTLISTED`
- `REJECTED`
- `HIRED`

### ExperienceStatus

- `SELF_CLAIMED`
- `PEER_VERIFIED`
- `FULLY_VERIFIED`
- `FLAGGED`

### NotificationType

- `CONNECTION_REQUEST`
- `CONNECTION_ACCEPTED`
- `VERIFICATION_REQUEST`
- `VERIFICATION_APPROVED`
- `MESSAGE_RECEIVED`
- `POST_LIKED`
- `POST_COMMENTED`
- `JOB_APPLIED`
- `APPLICATION_STATUS_UPDATED`

### Trust score event values (internal trust endpoint)

- `experience_verified`
- `verification_added`
- `connection_created`
- `user_reported`

## 4) Endpoint Catalog

## Health

### GET /

- Auth: No
- Response `200`:

```json
{
  "service": "backend",
  "status": "running",
  "health": "/health"
}
```

### GET /health

- Auth: No
- Response `200`:

```json
{
  "status": "ok",
  "service": "backend",
  "uptime": 123.45
}
```

## Auth (`/auth`)

### POST /auth/signup

- Auth: No
- Body:

```json
{
  "email": "user@example.com",
  "password": "string (6-72 chars)",
  "name": "optional, 1-120 chars"
}
```

- Response `201` data shape:

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "string|null",
    "trustScore": 0,
    "createdAt": "ISO datetime"
  },
  "tokens": {
    "accessToken": "jwt",
    "refreshToken": "jwt"
  }
}
```

### POST /auth/login

- Auth: No
- Body:

```json
{
  "email": "user@example.com",
  "password": "string (6-72 chars)"
}
```

- Response `200`: same `data` shape as signup.

### POST /auth/refresh

- Auth: No
- Body:

```json
{
  "refreshToken": "jwt"
}
```

- Response `200`: same `data` shape as signup.

### POST /auth/logout

- Auth: No
- Body:

```json
{
  "refreshToken": "jwt"
}
```

- Response `200`:

```json
{
  "success": true,
  "message": "Logout successful."
}
```

### POST /auth/oauth/google

- Auth: No
- Body:

```json
{
  "code": "oauth code",
  "redirectUri": "optional uri",
  "codeVerifier": "optional pkce verifier"
}
```

- Response `200`: same `data` shape as signup.

### POST /auth/oauth/microsoft

- Auth: No
- Body: same as Google OAuth callback.
- Response `200`: same `data` shape as signup.

## User (`/user`)

### GET /user/me

- Auth: Yes
- Response `200` data:

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "string|null",
  "currentRole": "string|null",
  "headline": "string|null",
  "about": "string|null",
  "profileImageUrl": "https://...|null",
  "skills": [
    {
      "id": "uuid",
      "name": "Node.js"
    }
  ],
  "trustScore": 0,
  "createdAt": "ISO datetime"
}
```

### GET /user/me/complete

- Auth: Yes
- Response `200` data:

```json
{
  "profile": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "string|null",
    "currentRole": "string|null",
    "headline": "string|null",
    "about": "string|null",
    "profileImageUrl": "https://...|null",
    "skills": [
      {
        "id": "uuid",
        "name": "Node.js"
      }
    ],
    "trustScore": 0,
    "createdAt": "ISO datetime"
  },
  "stats": {
    "totalExperiences": 3,
    "verifiedExperiences": 1,
    "totalArtifacts": 5,
    "certificateCount": 2,
    "totalConnections": 12,
    "totalPosts": 8
  },
  "experiences": [
    {
      "id": "uuid",
      "userId": "uuid",
      "companyName": "string",
      "role": "string",
      "description": "string|null",
      "status": "SELF_CLAIMED|PEER_VERIFIED|FULLY_VERIFIED|FLAGGED",
      "startDate": "ISO datetime",
      "endDate": "ISO datetime|null",
      "createdAt": "ISO datetime",
      "artifacts": [
        {
          "id": "uuid",
          "type": "GITHUB|PORTFOLIO|PROJECT|CERTIFICATE|OTHER",
          "url": "https://...",
          "createdAt": "ISO datetime"
        }
      ]
    }
  ],
  "certificates": [
    {
      "id": "uuid",
      "experienceId": "uuid",
      "companyName": "string",
      "role": "string",
      "url": "https://...",
      "createdAt": "ISO datetime"
    }
  ],
  "connections": [
    {
      "id": "uuid",
      "relationship": "COWORKER|TEAMMATE|INTERVIEWED_WITH|EVENT|COLD_OUTREACH",
      "status": "ACCEPTED",
      "createdAt": "ISO datetime",
      "otherUser": {
        "id": "uuid",
        "email": "user@example.com",
        "name": "string|null",
        "trustScore": 0
      }
    }
  ],
  "posts": [
    {
      "id": "uuid",
      "userId": "uuid",
      "content": "string",
      "createdAt": "ISO datetime",
      "likeCount": 10,
      "commentCount": 4
    }
  ]
}
```

This is the recommended endpoint for rendering a full profile screen in one call.

### GET /user/me/completion-guide

- Auth: Yes
- Purpose: Returns the zero-trust profile completion prompt flow, section-by-section validation, completion scoring, and structured output for agent-driven onboarding.
- Response `200` data shape:

```json
{
  "objective": "Guide users to complete their profile with authenticity, clarity, verifiability, and stronger trust.",
  "philosophy": "Do not just fill a profile. Build a verifiable identity.",
  "tone": "Professional, friendly, and strict about authenticity.",
  "masterPrompt": "multi-line master prompt text",
  "completion": {
    "percent": 78,
    "completedCount": 5,
    "totalSections": 7,
    "sections": {
      "basicInfo": true,
      "profileImage": false,
      "headline": true,
      "about": true,
      "experience": true,
      "skills": true,
      "artifacts": false
    }
  },
  "profileCompleteness": {
    "basicInfo": true,
    "profileImage": false,
    "headline": true,
    "about": true,
    "experience": true,
    "skills": true,
    "artifacts": false
  },
  "nextStep": {
    "key": "profileImage",
    "title": "Step 2: Profile Picture",
    "ask": "Upload a clear professional profile picture.",
    "completed": false,
    "improvementTips": ["..."],
    "validationChecklist": ["..."]
  },
  "steps": [
    {
      "key": "basicInfo",
      "title": "Step 1: Basic Info",
      "ask": "What is your full name and current role?",
      "completed": true,
      "improvementTips": ["..."],
      "validationChecklist": ["..."]
    }
  ],
  "validation": {
    "quality": "good",
    "issues": [
      {
        "section": "artifacts",
        "severity": "warning",
        "message": "No proof-of-work artifacts found.",
        "suggestion": "Add GitHub repositories, project demos, or certificates."
      }
    ]
  },
  "trustNudges": [
    "Profiles with verified experience usually receive more recruiter attention."
  ],
  "feedback": "Your profile is 78% complete.\nTo improve trust score:\n- Upload a professional profile picture.",
  "structuredOutput": {
    "profile": { "...": "..." },
    "experiences": [{ "...": "..." }],
    "skills": ["Node.js", "PostgreSQL"],
    "artifacts": [{ "id": "uuid", "type": "GITHUB", "url": "https://..." }]
  }
}
```

### PATCH /user/update

- Auth: Yes
- Body:

```json
{
  "name": "optional, 1-120 chars",
  "currentRole": "optional string|null",
  "headline": "optional string|null",
  "about": "optional string|null",
  "profileImageUrl": "optional uri|null",
  "skills": ["optional", "0-10 skills"]
}
```

- Response `200`: same profile shape as `GET /user/me`.

## Experience (`/experience`)

### POST /experience/

- Auth: Yes
- Body:

```json
{
  "companyName": "string",
  "role": "string",
  "description": "optional string",
  "startDate": "ISO datetime",
  "endDate": "optional ISO datetime|null"
}
```

- Response `201` data shape:

```json
{
  "id": "uuid",
  "userId": "uuid",
  "companyName": "string",
  "role": "string",
  "description": "string|null",
  "status": "SELF_CLAIMED|PEER_VERIFIED|FULLY_VERIFIED|FLAGGED",
  "startDate": "ISO datetime",
  "endDate": "ISO datetime|null",
  "createdAt": "ISO datetime",
  "artifacts": []
}
```

### GET /experience/:id

- Auth: No
- Params: `id`
- Response `200`: same experience shape as above.

### GET /experience/user/:userId

- Auth: No
- Params: `userId`
- Response `200` data: array of experience objects.

### PATCH /experience/:id

- Auth: Yes (owner only)
- Params: `id`
- Body (all optional):

```json
{
  "companyName": "string",
  "role": "string",
  "description": "string|null",
  "startDate": "ISO datetime",
  "endDate": "ISO datetime|null"
}
```

- Response `200`: updated experience object.

### DELETE /experience/:id

- Auth: Yes (owner only)
- Params: `id`
- Response `200`: success + message.

### POST /experience/:id/artifact

- Auth: Yes (owner only)
- Params: `id`
- Body:

```json
{
  "type": "GITHUB|PORTFOLIO|PROJECT|CERTIFICATE|OTHER",
  "url": "https://..."
}
```

- Response `201` data:

```json
{
  "id": "uuid",
  "type": "ArtifactType",
  "url": "https://...",
  "createdAt": "ISO datetime"
}
```

## Verification (`/verification`)

### POST /verification/request

- Auth: Yes (experience owner only)
- Body:

```json
{
  "experienceId": "uuid",
  "verifierIds": ["uuid", "uuid"]
}
```

- Response `201` data:

```json
{
  "experienceId": "uuid",
  "requestedCount": 2,
  "verifications": [
    {
      "id": "uuid",
      "experienceId": "uuid",
      "verifierId": "uuid",
      "status": "PENDING|APPROVED|REJECTED",
      "createdAt": "ISO datetime",
      "verifier": {
        "id": "uuid",
        "name": "string|null"
      }
    }
  ]
}
```

### POST /verification/respond

- Auth: Yes (assigned verifier only)
- Body:

```json
{
  "experienceId": "uuid",
  "status": "APPROVED|REJECTED"
}
```

- Response `200` data:

```json
{
  "experienceId": "uuid",
  "verificationStatus": "APPROVED|REJECTED",
  "approvalsRequired": 2,
  "approvalsReceived": 1,
  "consensusReached": false,
  "experienceStatus": "SELF_CLAIMED|PEER_VERIFIED|FULLY_VERIFIED|FLAGGED",
  "resolutionSource": "rust|fallback",
  "trustScore": null
}
```

### GET /verification/:experienceId

- Auth: Yes
- Params: `experienceId`
- Response `200` data:

```json
{
  "experienceId": "uuid",
  "experienceStatus": "SELF_CLAIMED|PEER_VERIFIED|FULLY_VERIFIED|FLAGGED",
  "approvalsRequired": 2,
  "approvalsReceived": 1,
  "verifications": []
}
```

## Trust (internal) (`/internal/trust`)

### POST /internal/trust/recalculate/:userId

- Auth: Yes
- Params: `userId`
- Body (all optional):

```json
{
  "event": "experience_verified|verification_added|connection_created|user_reported",
  "connections": 10,
  "reports": 0
}
```

- Response `200` data:

```json
{
  "userId": "uuid",
  "event": "trust event or manual_recalculation",
  "trustScore": 0,
  "trustLevel": "Low|Medium|High|Very High",
  "factors": {
    "verifiedExperiences": 0,
    "peerConfirmations": 0,
    "connections": 0,
    "reports": 0
  }
}
```

## Connections (`/connections`)

### POST /connections/request

- Auth: Yes
- Body:

```json
{
  "receiverId": "uuid",
  "relationship": "COWORKER|TEAMMATE|INTERVIEWED_WITH|EVENT|COLD_OUTREACH"
}
```

- Response `201` data shape:

```json
{
  "id": "uuid",
  "requesterId": "uuid",
  "receiverId": "uuid",
  "relationship": "RelationshipType",
  "status": "PENDING|ACCEPTED|REJECTED",
  "createdAt": "ISO datetime",
  "requester": {
    "id": "uuid",
    "name": "string|null",
    "email": "string",
    "trustScore": 0
  },
  "receiver": {
    "id": "uuid",
    "name": "string|null",
    "email": "string",
    "trustScore": 0
  }
}
```

### POST /connections/respond

- Auth: Yes (receiver only)
- Body:

```json
{
  "connectionId": "uuid",
  "status": "ACCEPTED|REJECTED"
}
```

- Response `200`: same connection shape as request.

### GET /connections/

- Auth: Yes
- Response `200` data: array of accepted connections.

### GET /connections/pending

- Auth: Yes
- Response `200` data: array of pending incoming requests.

### DELETE /connections/:id

- Auth: Yes (participant only)
- Params: `id`
- Response `200`: success + message.

## Posts (`/posts`)

### POST /posts/

- Auth: Yes
- Body:

```json
{
  "content": "string (1-5000 chars)"
}
```

- Response `201` data shape:

```json
{
  "id": "uuid",
  "userId": "uuid",
  "content": "string",
  "createdAt": "ISO datetime",
  "user": {
    "id": "uuid",
    "name": "string|null",
    "email": "string",
    "trustScore": 0
  },
  "likeCount": 0,
  "commentCount": 0
}
```

### GET /posts/feed

- Auth: Yes
- Query:
  - `cursor` (optional ISO datetime)
  - `limit` (optional int string, range 1..50, default 10)
- Response `200` data:

```json
{
  "items": [
    {
      "id": "uuid",
      "userId": "uuid",
      "content": "string",
      "createdAt": "ISO datetime",
      "user": {
        "id": "uuid",
        "name": "string|null",
        "email": "string",
        "trustScore": 0
      },
      "likeCount": 0,
      "commentCount": 0
    }
  ],
  "pageInfo": {
    "nextCursor": "ISO datetime|null",
    "hasMore": true,
    "limit": 10
  }
}
```

### GET /posts/:id

- Auth: Yes
- Params: `id`
- Response `200` data:

```json
{
  "id": "uuid",
  "userId": "uuid",
  "content": "string",
  "createdAt": "ISO datetime",
  "user": {
    "id": "uuid",
    "name": "string|null",
    "email": "string",
    "trustScore": 0
  },
  "likeCount": 0,
  "commentCount": 0,
  "comments": [
    {
      "id": "uuid",
      "userId": "uuid",
      "postId": "uuid",
      "content": "string",
      "createdAt": "ISO datetime",
      "user": {
        "id": "uuid",
        "name": "string|null",
        "email": "string",
        "trustScore": 0
      }
    }
  ]
}
```

### DELETE /posts/:id

- Auth: Yes (owner only)
- Params: `id`
- Response `200`: success + message.

### POST /posts/:id/like

- Auth: Yes
- Params: `id`
- Response `200` data:

```json
{
  "postId": "uuid",
  "liked": true,
  "likeCount": 12
}
```

### POST /posts/:id/comment

- Auth: Yes
- Params: `id`
- Body:

```json
{
  "content": "string (1-2000 chars)"
}
```

- Response `201` data: created comment object.

## Messaging (HTTP) (`/messages`)

### GET /messages/conversations

- Auth: Yes
- Response `200` data:

```json
[
  {
    "id": "uuid",
    "createdAt": "ISO datetime",
    "otherParticipant": {
      "id": "uuid",
      "name": "string|null",
      "email": "string",
      "trustScore": 0
    },
    "lastMessage": {
      "id": "uuid",
      "senderId": "uuid",
      "conversationId": "uuid",
      "content": "string",
      "createdAt": "ISO datetime",
      "sender": {
        "id": "uuid",
        "name": "string|null",
        "email": "string",
        "trustScore": 0
      }
    },
    "messageCount": 42
  }
]
```

### GET /messages/:conversationId

- Auth: Yes (conversation participant only)
- Params: `conversationId`
- Query:
  - `cursor` (optional ISO datetime)
  - `limit` (optional int string, range 1..100, default 30)
- Response `200` data:

```json
{
  "items": [
    {
      "id": "uuid",
      "senderId": "uuid",
      "conversationId": "uuid",
      "content": "string",
      "createdAt": "ISO datetime",
      "sender": {
        "id": "uuid",
        "name": "string|null",
        "email": "string",
        "trustScore": 0
      }
    }
  ],
  "pageInfo": {
    "nextCursor": "ISO datetime|null",
    "hasMore": true,
    "limit": 30
  }
}
```

## Jobs (`/jobs`) and Applications (`/applications`)

### POST /jobs/

- Auth: Yes
- Body:

```json
{
  "title": "string (1-200)",
  "description": "string (1-8000)",
  "location": "optional string (1-200)"
}
```

- Response `201` data shape:

```json
{
  "id": "uuid",
  "title": "string",
  "description": "string",
  "location": "string|null",
  "createdAt": "ISO datetime",
  "postedById": "uuid",
  "postedBy": {
    "id": "uuid",
    "name": "string|null",
    "email": "string",
    "trustScore": 0
  },
  "applicationCount": 0
}
```

### GET /jobs/

- Auth: Yes
- Query: `limit` (optional int string, range 1..100, default 50)
- Response `200` data: array of job objects.

### GET /jobs/:id

- Auth: Yes
- Params: `id`
- Response `200`: single job object.

### DELETE /jobs/:id

- Auth: Yes (job owner only)
- Params: `id`
- Response `200`: success + message.

### POST /jobs/:id/apply

- Auth: Yes
- Params: `id`
- Response `201` data shape:

```json
{
  "id": "uuid",
  "jobId": "uuid",
  "userId": "uuid",
  "status": "APPLIED|SHORTLISTED|REJECTED|HIRED",
  "createdAt": "ISO datetime",
  "user": {
    "id": "uuid",
    "name": "string|null",
    "email": "string",
    "trustScore": 0
  },
  "job": { "id": "uuid", "title": "string", "postedById": "uuid" }
}
```

### GET /jobs/:id/applications

- Auth: Yes (job owner only)
- Params: `id`
- Response `200` data: array of application objects.

### PATCH /applications/:id/status

- Auth: Yes (job owner only)
- Params: `id` (application id)
- Body:

```json
{
  "status": "SHORTLISTED|REJECTED|HIRED"
}
```

- Response `200` data: updated application object.

## Notifications (`/notifications`)

### GET /notifications/

- Auth: Yes
- Response `200` data:

```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "type": "NotificationType",
    "message": "string",
    "isRead": false,
    "createdAt": "ISO datetime"
  }
]
```

Notes:

- Returns latest notifications in descending order.
- Current backend limit is up to 100 notifications per request.

### PATCH /notifications/:id/read

- Auth: Yes (notification owner only)
- Params: `id`
- Response `200` data: updated notification object (`isRead: true`).

## 5) Realtime Messaging (Socket.IO)

Socket server runs on the same backend origin.

### Connection auth

Provide token either:

- `auth.token` during socket connection, or
- `Authorization` header

Supported formats:

- `"Bearer <accessToken>"`
- `"<accessToken>"`

Invalid/missing token -> socket emits `message_error` and disconnects.

### Client event: `send_message`

Payload:

```json
{
  "receiverId": "uuid",
  "content": "non-empty string"
}
```

Ack callback response:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "senderId": "uuid",
    "conversationId": "uuid",
    "content": "string",
    "createdAt": "ISO datetime",
    "sender": {
      "id": "uuid",
      "name": "string|null",
      "email": "string",
      "trustScore": 0
    }
  }
}
```

Error ack shape:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error message"
}
```

### Server event: `receive_message`

Emitted to sender and receiver user rooms with the created message object.

### Server event: `message_error`

General socket errors and unauthorized cases.

### Socket rate limit

- `send_message` is limited to 40 messages per 60 seconds per user.
- Exceeded limit returns `429` error in ack (or `message_error` if ack not supplied).

## 6) Quick Endpoint Index (Method + Path)

- `GET /`
- `GET /health`
- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/oauth/google`
- `POST /auth/oauth/microsoft`
- `GET /user/me`
- `GET /user/me/complete`
- `GET /user/me/completion-guide`
- `PATCH /user/update`
- `POST /experience/`
- `GET /experience/:id`
- `GET /experience/user/:userId`
- `PATCH /experience/:id`
- `DELETE /experience/:id`
- `POST /experience/:id/artifact`
- `POST /verification/request`
- `POST /verification/respond`
- `GET /verification/:experienceId`
- `POST /internal/trust/recalculate/:userId`
- `POST /connections/request`
- `POST /connections/respond`
- `GET /connections/`
- `GET /connections/pending`
- `DELETE /connections/:id`
- `POST /posts/`
- `GET /posts/feed`
- `GET /posts/:id`
- `DELETE /posts/:id`
- `POST /posts/:id/like`
- `POST /posts/:id/comment`
- `GET /messages/conversations`
- `GET /messages/:conversationId`
- `POST /jobs/`
- `GET /jobs/`
- `GET /jobs/:id`
- `DELETE /jobs/:id`
- `POST /jobs/:id/apply`
- `GET /jobs/:id/applications`
- `PATCH /applications/:id/status`
- `GET /notifications/`
- `PATCH /notifications/:id/read`
