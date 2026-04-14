#!/usr/bin/env node

require("dotenv").config();

const bcrypt = require("bcrypt");
const crypto = require("crypto");

const { PrismaPg } = require("@prisma/adapter-pg");
const {
  ApplicationStatus,
  ArtifactType,
  ConnectionStatus,
  ExperienceStatus,
  NotificationType,
  PrismaClient,
  RelationshipType,
  VerificationStatus,
} = require("@prisma/client");

const DEFAULT_USER_COUNT = 120;
const PASSWORD_FOR_ALL_USERS = "Password@123";

const FIRST_NAMES = [
  "Aarav",
  "Maya",
  "Rohan",
  "Nia",
  "Dev",
  "Isha",
  "Kian",
  "Zara",
  "Arjun",
  "Tara",
  "Kabir",
  "Meera",
  "Neil",
  "Anaya",
  "Vikram",
  "Sara",
  "Reyansh",
  "Diya",
  "Aditya",
  "Riya",
  "Kunal",
  "Priya",
  "Aisha",
  "Samir",
  "Nikhil",
  "Leena",
  "Ibrahim",
  "Fatima",
  "Omar",
  "Noor",
];

const LAST_NAMES = [
  "Sharma",
  "Patel",
  "Khan",
  "Reddy",
  "Gupta",
  "Das",
  "Malhotra",
  "Nair",
  "Singh",
  "Mehta",
  "Chowdhury",
  "Verma",
  "Kapoor",
  "Iyer",
  "Bhatt",
  "Saxena",
  "Bose",
  "Yadav",
  "Ansari",
  "Joshi",
];

const ROLE_POOL = [
  "Software Engineer",
  "Senior Software Engineer",
  "Frontend Engineer",
  "Backend Engineer",
  "Product Manager",
  "Data Scientist",
  "DevOps Engineer",
  "QA Engineer",
  "UI/UX Designer",
  "Site Reliability Engineer",
  "Engineering Manager",
  "Security Engineer",
  "Technical Recruiter",
];

const COMPANY_POOL = [
  "Nova Systems",
  "Blue Orbit Labs",
  "Pinnacle Works",
  "CloudNest",
  "Aster Digital",
  "VertexGrid",
  "Prism Data",
  "Northwind Tech",
  "SignalForge",
  "Quantum Loop",
  "Nimbus Retail",
  "Helio AI",
  "Maple Health",
  "Summit Finance",
  "UrbanScale",
  "Brightline Mobility",
];

const SKILL_POOL = [
  "TypeScript",
  "JavaScript",
  "Node.js",
  "React",
  "Next.js",
  "Prisma",
  "PostgreSQL",
  "Redis",
  "Docker",
  "Kubernetes",
  "AWS",
  "GCP",
  "CI/CD",
  "GraphQL",
  "REST APIs",
  "System Design",
  "Microservices",
  "Security",
  "Performance Optimization",
  "Product Strategy",
  "Leadership",
  "Communication",
  "Mentoring",
  "Testing",
  "Playwright",
  "Jest",
  "Python",
  "Rust",
  "Go",
  "Java",
  "Figma",
  "Accessibility",
  "Data Modeling",
  "Machine Learning",
  "Observability",
];

const POST_TOPICS = [
  "shipped a production feature",
  "improved API latency",
  "learned a new framework",
  "mentored a teammate",
  "optimized a database query",
  "ran a successful incident review",
  "launched a design refresh",
  "completed a hiring sprint",
  "built an internal automation",
  "documented a complex workflow",
  "presented in a team demo",
  "improved test coverage",
];

const COMMENT_TEMPLATES = [
  "Great update. Thanks for sharing this.",
  "Nice work, especially on the execution details.",
  "This is helpful context for the rest of us.",
  "Impressive progress. Keep it going.",
  "Solid approach. I like the tradeoff decisions.",
  "Very relevant for my team as well.",
  "Thanks, this gave me a few ideas to apply.",
  "Clear and practical. Well done.",
];

const MESSAGE_TEMPLATES = [
  "Hi, wanted to check in about the project timeline.",
  "Can we sync tomorrow for 15 minutes?",
  "I reviewed the latest draft and it looks solid.",
  "Thanks for the quick turnaround on this.",
  "Let us align on next steps this afternoon.",
  "I pushed an update and would love your feedback.",
  "Can you share the latest metrics when you get a chance?",
  "Great collaboration so far, appreciate your help.",
];

const JOB_TITLE_PREFIXES = ["Senior", "Lead", "Principal", "Staff", "Associate", ""];

const JOB_ROLES = [
  "Backend Engineer",
  "Frontend Engineer",
  "Full Stack Engineer",
  "DevOps Engineer",
  "Data Engineer",
  "Product Designer",
  "Product Manager",
  "Security Engineer",
  "QA Automation Engineer",
];

const LOCATIONS = [
  "Bengaluru",
  "Mumbai",
  "Delhi",
  "Pune",
  "Hyderabad",
  "Remote",
  "Chennai",
  "Kolkata",
  "Dubai",
  "Singapore",
  "London",
  "New York",
];

const NOTIFICATION_MESSAGES = {
  [NotificationType.CONNECTION_REQUEST]: "You received a new connection request.",
  [NotificationType.CONNECTION_ACCEPTED]: "Your connection request was accepted.",
  [NotificationType.VERIFICATION_REQUEST]: "A new verification request needs your attention.",
  [NotificationType.VERIFICATION_APPROVED]: "One of your experiences was verified.",
  [NotificationType.MESSAGE_RECEIVED]: "You received a new message.",
  [NotificationType.POST_LIKED]: "Someone liked your post.",
  [NotificationType.POST_COMMENTED]: "Someone commented on your post.",
  [NotificationType.JOB_APPLIED]: "A candidate applied to your job posting.",
  [NotificationType.APPLICATION_STATUS_UPDATED]: "Your application status was updated.",
  [NotificationType.PROFILE_VIEWED]: "Someone viewed your profile.",
};

function mulberry32(seed) {
  let value = seed >>> 0;

  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;

    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stringToSeed(text) {
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function parseArgs(argv) {
  const options = {
    users: DEFAULT_USER_COUNT,
    reset: true,
    seed: "20260414",
  };

  for (const arg of argv) {
    if (arg === "--append") {
      options.reset = false;
      continue;
    }

    if (arg === "--reset") {
      options.reset = true;
      continue;
    }

    if (arg.startsWith("--users=")) {
      const parsed = Number.parseInt(arg.split("=")[1], 10);

      if (Number.isInteger(parsed) && parsed >= 20 && parsed <= 1000) {
        options.users = parsed;
      }

      continue;
    }

    if (arg.startsWith("--seed=")) {
      const value = arg.split("=")[1]?.trim();

      if (value) {
        options.seed = value;
      }
    }
  }

  return options;
}

function randomInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pickOne(rng, values) {
  return values[randomInt(rng, 0, values.length - 1)];
}

function pickManyUnique(rng, values, count) {
  if (count >= values.length) {
    return [...values];
  }

  const pool = [...values];
  const picked = [];

  for (let index = 0; index < count; index += 1) {
    const selectedIndex = randomInt(rng, 0, pool.length - 1);
    picked.push(pool[selectedIndex]);
    pool.splice(selectedIndex, 1);
  }

  return picked;
}

function weightedPick(rng, entries) {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  const ticket = rng() * totalWeight;
  let cumulative = 0;

  for (const entry of entries) {
    cumulative += entry.weight;

    if (ticket <= cumulative) {
      return entry.value;
    }
  }

  return entries[entries.length - 1].value;
}

function randomDateBetween(rng, from, to) {
  const start = from.getTime();
  const end = to.getTime();

  if (end <= start) {
    return new Date(start);
  }

  return new Date(randomInt(rng, start, end));
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function clampDateToNow(date) {
  const now = Date.now();
  return date.getTime() > now ? new Date(now) : date;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function hashRefreshToken(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function createManyInBatches(label, rows, batchSize, insertFn) {
  if (!rows.length) {
    console.log(`[seed] ${label}: 0`);
    return 0;
  }

  let inserted = 0;

  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize);
    await insertFn(batch);
    inserted += batch.length;

    if (inserted === rows.length || inserted % (batchSize * 5) === 0) {
      console.log(`[seed] ${label}: ${inserted}/${rows.length}`);
    }
  }

  return inserted;
}

async function clearDatabase(prisma) {
  console.log("[seed] Clearing existing data...");

  await prisma.session.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.artifact.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.like.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.message.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.application.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.connection.deleteMany();
  await prisma.post.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.job.deleteMany();
  await prisma.experience.deleteMany();
  await prisma.user.deleteMany();

  console.log("[seed] Existing data removed.");
}

function buildUsers(rng, options, passwordHash, startIndex) {
  const now = new Date();
  const earliestCreatedAt = new Date(now.getTime() - 540 * 24 * 60 * 60 * 1000);
  const latestCreatedAt = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const users = [];

  for (let index = 0; index < options.users; index += 1) {
    const serialNumber = startIndex + index;
    const serial = String(serialNumber).padStart(3, "0");
    const firstName = FIRST_NAMES[serialNumber % FIRST_NAMES.length];
    const lastName = LAST_NAMES[Math.floor(serialNumber / FIRST_NAMES.length) % LAST_NAMES.length];
    const fullName = `${firstName} ${lastName}`;
    const role = pickOne(rng, ROLE_POOL);

    users.push({
      email: `qa.user${serial}@dummy.local`,
      passwordHash,
      name: fullName,
      currentRole: role,
      headline: `${role} building reliable products at scale`,
      location: pickOne(rng, LOCATIONS),
      about: `${fullName} focuses on shipping practical, user-centered software with measurable outcomes.`,
      profileImageUrl: `https://i.pravatar.cc/300?img=${(serialNumber % 70) + 1}`,
      profileBannerUrl: `https://picsum.photos/seed/qa-banner-${serial}/1200/300`,
      publicProfileUrl: `qa-${slugify(firstName)}-${slugify(lastName)}-${serial}`,
      trustScore: randomInt(rng, 35, 98),
      createdAt: randomDateBetween(rng, earliestCreatedAt, latestCreatedAt),
    });
  }

  return users;
}

function buildSessions(rng, users, seedLabel) {
  const now = new Date();
  const sessionRows = [];

  for (const user of users) {
    const sessionCount = weightedPick(rng, [
      { value: 0, weight: 15 },
      { value: 1, weight: 55 },
      { value: 2, weight: 30 },
    ]);

    for (let index = 0; index < sessionCount; index += 1) {
      const tokenRaw = `${seedLabel}:${user.id}:${index}:${rng().toString(36).slice(2)}`;

      sessionRows.push({
        userId: user.id,
        refreshToken: hashRefreshToken(tokenRaw),
        createdAt: randomDateBetween(
          rng,
          new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000),
          now,
        ),
      });
    }
  }

  return sessionRows;
}

function buildSkills(rng, users) {
  const rows = [];

  for (const user of users) {
    const skillCount = randomInt(rng, 6, 12);
    const selected = pickManyUnique(rng, SKILL_POOL, skillCount);

    for (const skill of selected) {
      rows.push({
        userId: user.id,
        name: skill,
        createdAt: addMinutes(user.createdAt, randomInt(rng, 5, 5000)),
      });
    }
  }

  return rows;
}

function buildExperiences(rng, users) {
  const rows = [];
  const byUser = new Map();
  const now = new Date();
  const oldestStart = new Date(now.getTime() - 10 * 365 * 24 * 60 * 60 * 1000);
  const newestStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  for (const user of users) {
    const experienceCount = randomInt(rng, 2, 5);
    const list = [];

    for (let index = 0; index < experienceCount; index += 1) {
      const id = crypto.randomUUID();
      const status = weightedPick(rng, [
        { value: ExperienceStatus.SELF_CLAIMED, weight: 45 },
        { value: ExperienceStatus.PEER_VERIFIED, weight: 30 },
        { value: ExperienceStatus.FULLY_VERIFIED, weight: 20 },
        { value: ExperienceStatus.FLAGGED, weight: 5 },
      ]);
      const startDate = randomDateBetween(rng, oldestStart, newestStart);
      const stillActive = rng() < 0.45;

      let endDate = null;
      if (!stillActive) {
        endDate = randomDateBetween(
          rng,
          addMinutes(startDate, 60 * 24 * 120),
          new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        );
      }

      const row = {
        id,
        userId: user.id,
        companyName: pickOne(rng, COMPANY_POOL),
        role: pickOne(rng, ROLE_POOL),
        description: "Delivered measurable impact through cross-functional collaboration and iterative improvements.",
        status,
        startDate,
        endDate,
        createdAt: clampDateToNow(addMinutes(startDate, randomInt(rng, 60 * 24 * 10, 60 * 24 * 45))),
      };

      rows.push(row);
      list.push(row);
    }

    byUser.set(user.id, list);
  }

  return { rows, byUser };
}

function buildArtifacts(rng, experiences) {
  const rows = [];

  for (const experience of experiences) {
    const artifactCount = weightedPick(rng, [
      { value: 1, weight: 55 },
      { value: 2, weight: 30 },
      { value: 3, weight: 15 },
    ]);

    for (let index = 0; index < artifactCount; index += 1) {
      const type = pickOne(rng, Object.values(ArtifactType));

      rows.push({
        experienceId: experience.id,
        type,
        url: `https://example.com/artifacts/${slugify(type)}-${experience.id.slice(0, 8)}-${index + 1}`,
        createdAt: addMinutes(experience.createdAt, randomInt(rng, 30, 60 * 24 * 30)),
      });
    }
  }

  return rows;
}

function getVerificationStatus(rng, experienceStatus) {
  if (experienceStatus === ExperienceStatus.FULLY_VERIFIED) {
    return weightedPick(rng, [
      { value: VerificationStatus.APPROVED, weight: 85 },
      { value: VerificationStatus.PENDING, weight: 10 },
      { value: VerificationStatus.REJECTED, weight: 5 },
    ]);
  }

  if (experienceStatus === ExperienceStatus.PEER_VERIFIED) {
    return weightedPick(rng, [
      { value: VerificationStatus.APPROVED, weight: 65 },
      { value: VerificationStatus.PENDING, weight: 25 },
      { value: VerificationStatus.REJECTED, weight: 10 },
    ]);
  }

  if (experienceStatus === ExperienceStatus.FLAGGED) {
    return weightedPick(rng, [
      { value: VerificationStatus.REJECTED, weight: 70 },
      { value: VerificationStatus.PENDING, weight: 20 },
      { value: VerificationStatus.APPROVED, weight: 10 },
    ]);
  }

  return weightedPick(rng, [
    { value: VerificationStatus.PENDING, weight: 60 },
    { value: VerificationStatus.APPROVED, weight: 25 },
    { value: VerificationStatus.REJECTED, weight: 15 },
  ]);
}

function buildVerifications(rng, users, experiencesByUser) {
  const rows = [];

  for (const [ownerId, experiences] of experiencesByUser.entries()) {
    const potentialVerifiers = users.filter((user) => user.id !== ownerId);

    for (const experience of experiences) {
      if (rng() < 0.2) {
        continue;
      }

      const verificationCount = weightedPick(rng, [
        { value: 1, weight: 55 },
        { value: 2, weight: 30 },
        { value: 3, weight: 15 },
      ]);
      const selectedVerifiers = pickManyUnique(
        rng,
        potentialVerifiers,
        Math.min(verificationCount, potentialVerifiers.length),
      );

      for (const verifier of selectedVerifiers) {
        rows.push({
          experienceId: experience.id,
          verifierId: verifier.id,
          status: getVerificationStatus(rng, experience.status),
          createdAt: clampDateToNow(addMinutes(experience.createdAt, randomInt(rng, 60 * 24 * 2, 60 * 24 * 90))),
        });
      }
    }
  }

  return rows;
}

function buildConnections(rng, users) {
  const rows = [];
  const acceptedPairs = [];
  const pairSet = new Set();
  const maxWindow = Math.min(8, Math.max(users.length - 1, 1));

  const addPair = (leftUser, rightUser) => {
    const sorted = [leftUser.id, rightUser.id].sort();
    const pairKey = `${sorted[0]}|${sorted[1]}`;

    if (pairSet.has(pairKey)) {
      return false;
    }

    pairSet.add(pairKey);

    const status = weightedPick(rng, [
      { value: ConnectionStatus.ACCEPTED, weight: 68 },
      { value: ConnectionStatus.PENDING, weight: 20 },
      { value: ConnectionStatus.REJECTED, weight: 12 },
    ]);

    const requesterFirst = rng() < 0.5;
    const requesterId = requesterFirst ? leftUser.id : rightUser.id;
    const receiverId = requesterFirst ? rightUser.id : leftUser.id;

    rows.push({
      requesterId,
      receiverId,
      relationship: pickOne(rng, Object.values(RelationshipType)),
      status,
      createdAt: randomDateBetween(
        rng,
        new Date(Date.now() - 240 * 24 * 60 * 60 * 1000),
        new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      ),
    });

    if (status === ConnectionStatus.ACCEPTED) {
      acceptedPairs.push(sorted);
    }

    return true;
  };

  for (let i = 0; i < users.length; i += 1) {
    for (let offset = 1; offset <= maxWindow; offset += 1) {
      const j = i + offset;

      if (j >= users.length) {
        break;
      }

      addPair(users[i], users[j]);
    }
  }

  const extraPairsTarget = Math.floor(users.length * 2.5);
  let createdExtras = 0;
  let attempts = 0;

  while (createdExtras < extraPairsTarget && attempts < extraPairsTarget * 20) {
    attempts += 1;
    const i = randomInt(rng, 0, users.length - 1);
    const j = randomInt(rng, 0, users.length - 1);

    if (i === j) {
      continue;
    }

    const added = addPair(users[i], users[j]);

    if (added) {
      createdExtras += 1;
    }
  }

  return { rows, acceptedPairs };
}

function buildPosts(rng, users) {
  const rows = [];
  const byId = new Map(users.map((user) => [user.id, user]));
  const now = new Date();
  const oldest = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000);

  for (const user of users) {
    const postCount = randomInt(rng, 8, 16);

    for (let index = 0; index < postCount; index += 1) {
      const topic = pickOne(rng, POST_TOPICS);
      const authorName = byId.get(user.id)?.name?.split(" ")[0] ?? "I";

      rows.push({
        id: crypto.randomUUID(),
        userId: user.id,
        content: `${authorName} recently ${topic}. Happy to share what worked and what we would refine next.`,
        createdAt: randomDateBetween(rng, oldest, now),
      });
    }
  }

  return rows;
}

function buildLikes(rng, users, posts) {
  const rows = [];

  for (const post of posts) {
    const available = users.filter((user) => user.id !== post.userId);

    if (!available.length) {
      continue;
    }

    const likeCount = randomInt(rng, 2, Math.min(16, available.length));
    const likedBy = pickManyUnique(rng, available, likeCount);

    for (const user of likedBy) {
      rows.push({
        userId: user.id,
        postId: post.id,
      });
    }
  }

  return rows;
}

function buildComments(rng, users, posts) {
  const rows = [];

  for (const post of posts) {
    if (rng() < 0.1) {
      continue;
    }

    const commentCount = randomInt(rng, 1, 5);

    for (let index = 0; index < commentCount; index += 1) {
      const commenter = pickOne(rng, users);

      rows.push({
        userId: commenter.id,
        postId: post.id,
        content: pickOne(rng, COMMENT_TEMPLATES),
        createdAt: randomDateBetween(rng, post.createdAt, new Date()),
      });
    }
  }

  return rows;
}

function buildConversationsAndMessages(rng, acceptedPairs) {
  const conversations = [];
  const participants = [];
  const messages = [];

  if (!acceptedPairs.length) {
    return { conversations, participants, messages };
  }

  const conversationTarget = Math.min(350, acceptedPairs.length);
  const selectedPairs = pickManyUnique(rng, acceptedPairs, conversationTarget);
  const now = new Date();

  for (const pair of selectedPairs) {
    const [leftUserId, rightUserId] = pair;
    const conversationId = crypto.randomUUID();
    const createdAt = randomDateBetween(
      rng,
      new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    );

    conversations.push({
      id: conversationId,
      createdAt,
    });

    participants.push({
      userId: leftUserId,
      conversationId,
    });

    participants.push({
      userId: rightUserId,
      conversationId,
    });

    const messageCount = randomInt(rng, 6, 22);
    let currentTime = createdAt;
    let lastSenderId = leftUserId;

    for (let index = 0; index < messageCount; index += 1) {
      const senderId = rng() < 0.7
        ? (lastSenderId === leftUserId ? rightUserId : leftUserId)
        : pickOne(rng, [leftUserId, rightUserId]);

      currentTime = clampDateToNow(addMinutes(currentTime, randomInt(rng, 5, 240)));
      lastSenderId = senderId;

      messages.push({
        senderId,
        conversationId,
        content: pickOne(rng, MESSAGE_TEMPLATES),
        createdAt: currentTime,
      });
    }
  }

  return { conversations, participants, messages };
}

function buildNotifications(rng, users) {
  const rows = [];

  for (const user of users) {
    const notificationCount = randomInt(rng, 8, 20);

    for (let index = 0; index < notificationCount; index += 1) {
      const type = weightedPick(rng, [
        { value: NotificationType.MESSAGE_RECEIVED, weight: 24 },
        { value: NotificationType.POST_LIKED, weight: 20 },
        { value: NotificationType.POST_COMMENTED, weight: 15 },
        { value: NotificationType.CONNECTION_REQUEST, weight: 12 },
        { value: NotificationType.CONNECTION_ACCEPTED, weight: 8 },
        { value: NotificationType.VERIFICATION_REQUEST, weight: 7 },
        { value: NotificationType.VERIFICATION_APPROVED, weight: 6 },
        { value: NotificationType.JOB_APPLIED, weight: 4 },
        { value: NotificationType.APPLICATION_STATUS_UPDATED, weight: 4 },
        { value: NotificationType.PROFILE_VIEWED, weight: 6 },
      ]);

      rows.push({
        userId: user.id,
        type,
        message: NOTIFICATION_MESSAGES[type],
        isRead: rng() < 0.62,
        createdAt: randomDateBetween(
          rng,
          new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
          new Date(),
        ),
      });
    }
  }

  return rows;
}

function buildJobsAndApplications(rng, users) {
  const jobs = [];
  const applications = [];

  const recruiterCandidates = users.filter((_, index) => index % 6 === 0 || index % 7 === 0);
  const recruiters = recruiterCandidates.length ? recruiterCandidates : users.slice(0, Math.min(8, users.length));

  for (const recruiter of recruiters) {
    const jobCount = randomInt(rng, 2, 5);

    for (let index = 0; index < jobCount; index += 1) {
      const prefix = pickOne(rng, JOB_TITLE_PREFIXES);
      const role = pickOne(rng, JOB_ROLES);
      const title = `${prefix ? `${prefix} ` : ""}${role}`;
      const createdAt = randomDateBetween(
        rng,
        new Date(Date.now() - 75 * 24 * 60 * 60 * 1000),
        new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      );
      const jobId = crypto.randomUUID();

      jobs.push({
        id: jobId,
        title,
        description: "Join our team to drive delivery quality, platform reliability, and customer impact. This role works across product, design, and engineering to ship outcomes quickly and safely.",
        location: pickOne(rng, LOCATIONS),
        createdAt,
        postedById: recruiter.id,
      });

      const applicantPool = users.filter((user) => user.id !== recruiter.id);
      const applicationCount = randomInt(rng, 6, Math.min(28, applicantPool.length));
      const selectedApplicants = pickManyUnique(rng, applicantPool, applicationCount);

      for (const applicant of selectedApplicants) {
        applications.push({
          jobId,
          userId: applicant.id,
          status: weightedPick(rng, [
            { value: ApplicationStatus.APPLIED, weight: 40 },
            { value: ApplicationStatus.SHORTLISTED, weight: 25 },
            { value: ApplicationStatus.REJECTED, weight: 25 },
            { value: ApplicationStatus.HIRED, weight: 10 },
          ]),
          createdAt: randomDateBetween(rng, createdAt, new Date()),
        });
      }
    }
  }

  return { jobs, applications };
}

function buildProfileViews(rng, users) {
  const rows = [];

  for (const viewedUser of users) {
    const viewerPool = users.filter((user) => user.id !== viewedUser.id);

    if (!viewerPool.length) {
      continue;
    }

    const viewEvents = randomInt(rng, 5, 18);

    for (let index = 0; index < viewEvents; index += 1) {
      const viewer = pickOne(rng, viewerPool);
      rows.push({
        viewerId: viewer.id,
        viewedUserId: viewedUser.id,
        createdAt: randomDateBetween(
          rng,
          new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          new Date(),
        ),
      });
    }
  }

  return rows;
}

async function collectTableCounts(prisma) {
  const [
    users,
    sessions,
    skills,
    experiences,
    artifacts,
    verifications,
    connections,
    posts,
    likes,
    comments,
    conversations,
    participants,
    messages,
    notifications,
    profileViews,
    jobs,
    applications,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.session.count(),
    prisma.skill.count(),
    prisma.experience.count(),
    prisma.artifact.count(),
    prisma.verification.count(),
    prisma.connection.count(),
    prisma.post.count(),
    prisma.like.count(),
    prisma.comment.count(),
    prisma.conversation.count(),
    prisma.participant.count(),
    prisma.message.count(),
    prisma.notification.count(),
    prisma.profileView.count(),
    prisma.job.count(),
    prisma.application.count(),
  ]);

  return {
    users,
    sessions,
    skills,
    experiences,
    artifacts,
    verifications,
    connections,
    posts,
    likes,
    comments,
    conversations,
    participants,
    messages,
    notifications,
    profileViews,
    jobs,
    applications,
  };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required. Ensure api/.env is configured.");
  }

  const options = parseArgs(process.argv.slice(2));
  const rng = mulberry32(stringToSeed(options.seed));
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  console.log("[seed] Starting large data seed...");
  console.log(`[seed] mode=${options.reset ? "reset" : "append"}, users=${options.users}, seed=${options.seed}`);

  try {
    await prisma.$connect();

    if (options.reset) {
      await clearDatabase(prisma);
    }

    const existingQaUserCount = options.reset
      ? 0
      : await prisma.user.count({
        where: {
          email: {
            endsWith: "@dummy.local",
          },
        },
      });

    const passwordHash = await bcrypt.hash(PASSWORD_FOR_ALL_USERS, 10);
    const userRows = buildUsers(rng, options, passwordHash, existingQaUserCount + 1);

    await createManyInBatches("users", userRows, 150, (batch) =>
      prisma.user.createMany({
        data: batch,
      }),
    );

    const seededEmails = userRows.map((user) => user.email);
    const createdUsers = await prisma.user.findMany({
      where: {
        email: {
          in: seededEmails,
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
      orderBy: {
        email: "asc",
      },
    });

    if (!createdUsers.length) {
      throw new Error("Failed to create users for seeding.");
    }

    const sessionRows = buildSessions(rng, createdUsers, options.seed);
    const skillRows = buildSkills(rng, createdUsers);
    const { rows: experienceRows, byUser: experienceByUser } = buildExperiences(rng, createdUsers);
    const artifactRows = buildArtifacts(rng, experienceRows);
    const verificationRows = buildVerifications(rng, createdUsers, experienceByUser);
    const { rows: connectionRows, acceptedPairs } = buildConnections(rng, createdUsers);
    const postRows = buildPosts(rng, createdUsers);
    const likeRows = buildLikes(rng, createdUsers, postRows);
    const commentRows = buildComments(rng, createdUsers, postRows);
    const {
      conversations: conversationRows,
      participants: participantRows,
      messages: messageRows,
    } = buildConversationsAndMessages(rng, acceptedPairs);
    const notificationRows = buildNotifications(rng, createdUsers);
    const profileViewRows = buildProfileViews(rng, createdUsers);
    const { jobs: jobRows, applications: applicationRows } = buildJobsAndApplications(rng, createdUsers);

    await createManyInBatches("sessions", sessionRows, 500, (batch) => prisma.session.createMany({ data: batch }));
    await createManyInBatches("skills", skillRows, 1000, (batch) => prisma.skill.createMany({ data: batch }));
    await createManyInBatches("experiences", experienceRows, 800, (batch) => prisma.experience.createMany({ data: batch }));
    await createManyInBatches("artifacts", artifactRows, 1000, (batch) => prisma.artifact.createMany({ data: batch }));
    await createManyInBatches("verifications", verificationRows, 800, (batch) => prisma.verification.createMany({ data: batch }));
    await createManyInBatches("connections", connectionRows, 1000, (batch) => prisma.connection.createMany({ data: batch }));
    await createManyInBatches("posts", postRows, 1000, (batch) => prisma.post.createMany({ data: batch }));
    await createManyInBatches("likes", likeRows, 2000, (batch) => prisma.like.createMany({ data: batch }));
    await createManyInBatches("comments", commentRows, 1200, (batch) => prisma.comment.createMany({ data: batch }));
    await createManyInBatches("conversations", conversationRows, 800, (batch) => prisma.conversation.createMany({ data: batch }));
    await createManyInBatches("participants", participantRows, 1500, (batch) => prisma.participant.createMany({ data: batch }));
    await createManyInBatches("messages", messageRows, 1500, (batch) => prisma.message.createMany({ data: batch }));
    await createManyInBatches("notifications", notificationRows, 1500, (batch) => prisma.notification.createMany({ data: batch }));
    await createManyInBatches("profile views", profileViewRows, 1500, (batch) => prisma.profileView.createMany({ data: batch }));
    await createManyInBatches("jobs", jobRows, 800, (batch) => prisma.job.createMany({ data: batch }));
    await createManyInBatches("applications", applicationRows, 1500, (batch) => prisma.application.createMany({ data: batch }));

    const counts = await collectTableCounts(prisma);

    console.log("\n[seed] Final table counts:");
    console.table(counts);

    console.log("[seed] Done.");
    console.log(`[seed] Login password for all seeded QA users: ${PASSWORD_FOR_ALL_USERS}`);
    console.log("[seed] Sample users:");

    createdUsers.slice(0, 8).forEach((user) => {
      console.log(`  - ${user.email}`);
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[seed] Failed:", error);
  process.exitCode = 1;
});
