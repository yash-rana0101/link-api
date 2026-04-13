import { ArtifactType, ExperienceStatus } from "@prisma/client";

export type CompletionSectionKey =
  | "basicInfo"
  | "profileImage"
  | "headline"
  | "about"
  | "experience"
  | "skills"
  | "artifacts";

type IssueSeverity = "error" | "warning" | "info";

export interface CompletionProfileInput {
  name: string | null;
  currentRole: string | null;
  headline: string | null;
  about: string | null;
  profileImageUrl: string | null;
}

export interface CompletionArtifactInput {
  id: string;
  type: ArtifactType;
  url: string;
}

export interface CompletionExperienceInput {
  id: string;
  companyName: string;
  role: string;
  description: string | null;
  status: ExperienceStatus;
  artifacts: CompletionArtifactInput[];
}

export interface ProfileCompletionInput {
  profile: CompletionProfileInput;
  experiences: CompletionExperienceInput[];
  skills: string[];
}

export interface ProfileCompletionIssue {
  section: CompletionSectionKey;
  severity: IssueSeverity;
  message: string;
  suggestion?: string;
}

export interface ProfileCompletionStep {
  key: CompletionSectionKey;
  title: string;
  ask: string;
  example?: string;
  improvementTips: string[];
  validationChecklist: string[];
  completed: boolean;
}

export interface ProfileCompletionEvaluation {
  objective: string;
  philosophy: string;
  tone: string;
  masterPrompt: string;
  completion: {
    percent: number;
    completedCount: number;
    totalSections: number;
    sections: Record<CompletionSectionKey, boolean>;
  };
  nextStep: ProfileCompletionStep | null;
  steps: ProfileCompletionStep[];
  validation: {
    quality: "excellent" | "good" | "needs-improvement";
    issues: ProfileCompletionIssue[];
  };
  trustNudges: string[];
  feedback: string;
}

interface CompletionStepTemplate {
  key: CompletionSectionKey;
  title: string;
  ask: string;
  example?: string;
  improvementTips: string[];
  validationChecklist: string[];
}

const COMPLETION_STEPS: CompletionStepTemplate[] = [
  {
    key: "basicInfo",
    title: "Step 1: Basic Info",
    ask: "What is your full name and current role?",
    example: "Yash Rana - Backend Engineer specializing in scalable systems",
    improvementTips: [
      "Use your real full name.",
      "Make your role specific and current.",
      "Avoid vague role labels that cannot be validated.",
    ],
    validationChecklist: [
      "Name is present and realistic.",
      "Current role is specific.",
      "No exaggerated job title claims.",
    ],
  },
  {
    key: "profileImage",
    title: "Step 2: Profile Picture",
    ask: "Upload a clear professional profile picture.",
    improvementTips: [
      "Use good lighting and a neutral background.",
      "Keep your face clearly visible.",
      "Avoid group photos or sunglasses.",
    ],
    validationChecklist: [
      "Profile image URL is provided.",
      "Image appears professional and identity-friendly.",
    ],
  },
  {
    key: "headline",
    title: "Step 3: Headline",
    ask: "Write a short headline using role + core skills + focus.",
    example: "Backend Engineer | Node.js, Redis, Distributed Systems",
    improvementTips: [
      "Keep it specific and skill-oriented.",
      "Avoid generic wording like hardworking individual.",
      "Do not use hype words that are hard to verify.",
    ],
    validationChecklist: [
      "Headline is specific and professional.",
      "Headline avoids generic or exaggerated claims.",
      "Headline communicates role and strengths clearly.",
    ],
  },
  {
    key: "about",
    title: "Step 4: About Section",
    ask: "Write a short summary of what you build and what you care about.",
    example: "I build scalable backend systems with Node.js and Redis, focusing on reliability and performance.",
    improvementTips: [
      "Mention what you do, what you have built, and your focus area.",
      "Prefer concrete outcomes over buzzwords.",
      "Keep tone professional and clear.",
    ],
    validationChecklist: [
      "About text is specific and non-generic.",
      "Claims sound realistic.",
      "Summary has clear professional direction.",
    ],
  },
  {
    key: "experience",
    title: "Step 5: Experience",
    ask: "Add experience with company, role, duration, and what you actually built.",
    example: "Built queue-based job processing using Redis and BullMQ.",
    improvementTips: [
      "Write what you personally shipped or owned.",
      "Include measurable impact where possible.",
      "Attach proof links for stronger trust.",
    ],
    validationChecklist: [
      "At least one experience is listed.",
      "Experience descriptions are specific.",
      "No unrealistic or inflated claims.",
    ],
  },
  {
    key: "skills",
    title: "Step 6: Skills",
    ask: "List 8-10 core skills you can confidently explain and use.",
    example: "Node.js, PostgreSQL, Redis, Docker",
    improvementTips: [
      "Only list skills you have used in real work.",
      "Keep the list focused and concise.",
      "Avoid duplicate or generic soft-skill-only entries.",
    ],
    validationChecklist: [
      "Skills list is non-empty.",
      "Skills are realistic and specific.",
      "Skill list is not bloated or repetitive.",
    ],
  },
  {
    key: "artifacts",
    title: "Step 7: Projects / Proof of Work",
    ask: "Add proof links like GitHub repos, project demos, or certificates.",
    improvementTips: [
      "Prioritize links tied to your listed experience.",
      "Add at least two proof artifacts for stronger trust.",
      "Use working, public, and direct URLs.",
    ],
    validationChecklist: [
      "At least one artifact exists.",
      "Artifacts map to real projects or certifications.",
      "Proof is sufficient to support profile claims.",
    ],
  },
];

const SECTION_ORDER: CompletionSectionKey[] = [
  "basicInfo",
  "profileImage",
  "headline",
  "about",
  "experience",
  "skills",
  "artifacts",
];

const GENERIC_PHRASES = [
  "hardworking",
  "looking for opportunities",
  "team player",
  "results driven",
  "passionate professional",
  "go getter",
  "self motivated",
  "quick learner",
  "detail oriented",
];

const EXAGGERATED_PHRASES = [
  "world class",
  "best in the world",
  "unmatched",
  "ninja",
  "guru",
  "rockstar",
  "legendary",
  "10x",
  "revolutionary",
];

const TRUST_NUDGES = [
  "Profiles with verified experience usually receive more recruiter attention.",
  "Adding proof links like GitHub, project demos, and certificates increases trust score.",
  "Specific claims with evidence are ranked above generic self-descriptions.",
];

export const PROFILE_COMPLETION_OBJECTIVE =
  "Guide users to complete their profile with authenticity, clarity, verifiability, and stronger trust.";

export const PROFILE_COMPLETION_PHILOSOPHY =
  "Do not just fill a profile. Build a verifiable identity.";

export const PROFILE_COMPLETION_TONE = "Professional, friendly, and strict about authenticity.";

export const PROFILE_COMPLETION_MASTER_PROMPT = [
  "You are helping a user build a professional profile on a Zero-Trust platform.",
  "",
  "Your goal is to guide the user to create a profile that is:",
  "- Authentic",
  "- Verifiable",
  "- Clear and professional",
  "",
  "Ask the user for information step-by-step and ensure:",
  "1. All claims are realistic and specific",
  "2. Encourage adding proof (GitHub, certificates, projects)",
  "3. Avoid vague or exaggerated descriptions",
  "4. Help improve wording professionally",
  "",
  "Collect these sections in order:",
  "1. Basic Info",
  "2. Profile Picture",
  "3. Headline",
  "4. About Section",
  "5. Experience",
  "6. Skills",
  "7. Projects / Proof of Work",
  "",
  "For each section: ask clearly, suggest improvements, and validate quality.",
].join("\n");

export const buildProfileCompletionEvaluation = (
  input: ProfileCompletionInput,
): ProfileCompletionEvaluation => {
  const sectionStates = getSectionStates(input);
  const completedCount = SECTION_ORDER.filter((section) => sectionStates[section]).length;
  const percent = Math.round((completedCount / SECTION_ORDER.length) * 100);
  const issues = buildIssues(input, sectionStates);
  const steps = COMPLETION_STEPS.map((step) => ({
    ...step,
    completed: sectionStates[step.key],
  }));
  const nextStep = steps.find((step) => !step.completed) ?? null;

  return {
    objective: PROFILE_COMPLETION_OBJECTIVE,
    philosophy: PROFILE_COMPLETION_PHILOSOPHY,
    tone: PROFILE_COMPLETION_TONE,
    masterPrompt: PROFILE_COMPLETION_MASTER_PROMPT,
    completion: {
      percent,
      completedCount,
      totalSections: SECTION_ORDER.length,
      sections: sectionStates,
    },
    nextStep,
    steps,
    validation: {
      quality: deriveQuality(issues),
      issues,
    },
    trustNudges: TRUST_NUDGES,
    feedback: buildFeedback(percent, sectionStates, issues),
  };
};

const getSectionStates = (input: ProfileCompletionInput): Record<CompletionSectionKey, boolean> => {
  const artifactCount = input.experiences.reduce(
    (total, experience) => total + experience.artifacts.length,
    0,
  );

  return {
    basicInfo: hasText(input.profile.name) && hasText(input.profile.currentRole),
    profileImage: hasText(input.profile.profileImageUrl),
    headline: hasText(input.profile.headline),
    about: hasText(input.profile.about),
    experience: input.experiences.length > 0,
    skills: input.skills.length > 0,
    artifacts: artifactCount > 0,
  };
};

const buildIssues = (
  input: ProfileCompletionInput,
  sections: Record<CompletionSectionKey, boolean>,
): ProfileCompletionIssue[] => {
  const issues: ProfileCompletionIssue[] = [];

  if (!sections.basicInfo) {
    issues.push({
      section: "basicInfo",
      severity: "warning",
      message: "Add your full name and current role to establish identity clarity.",
      suggestion: "Use your real name and a specific role such as Backend Engineer.",
    });
  }

  if (!sections.profileImage) {
    issues.push({
      section: "profileImage",
      severity: "warning",
      message: "A professional profile picture is missing.",
      suggestion: "Upload a clear headshot with neutral background and good lighting.",
    });
  }

  validateHeadline(input.profile.headline, issues);
  validateAbout(input.profile.about, issues);
  validateExperience(input.experiences, issues);
  validateSkills(input.skills, issues);
  validateArtifacts(input.experiences, sections.artifacts, issues);

  return issues;
};

const validateHeadline = (headline: string | null, issues: ProfileCompletionIssue[]): void => {
  if (!hasText(headline)) {
    issues.push({
      section: "headline",
      severity: "warning",
      message: "Add a professional headline.",
      suggestion: "Use role + skills + focus, for example: Backend Engineer | Node.js, Redis.",
    });
    return;
  }

  const normalizedHeadline = headline.trim();

  if (normalizedHeadline.length < 18) {
    issues.push({
      section: "headline",
      severity: "info",
      message: "Headline is short and may not communicate enough professional detail.",
      suggestion: "Add role, key technologies, and your focus area.",
    });
  }

  if (containsPhrase(normalizedHeadline, GENERIC_PHRASES)) {
    issues.push({
      section: "headline",
      severity: "warning",
      message: "Headline sounds generic.",
      suggestion: "Replace generic wording with concrete role and technical strengths.",
    });
  }

  if (containsPhrase(normalizedHeadline, EXAGGERATED_PHRASES)) {
    issues.push({
      section: "headline",
      severity: "error",
      message: "Headline includes exaggerated claims that reduce trust.",
      suggestion: "Use realistic, verifiable language.",
    });
  }
};

const validateAbout = (about: string | null, issues: ProfileCompletionIssue[]): void => {
  if (!hasText(about)) {
    issues.push({
      section: "about",
      severity: "warning",
      message: "About section is missing.",
      suggestion: "Summarize what you build, what you have built, and your current focus.",
    });
    return;
  }

  const normalizedAbout = about.trim();

  if (normalizedAbout.length < 80) {
    issues.push({
      section: "about",
      severity: "info",
      message: "About section is brief and may feel generic.",
      suggestion: "Add concrete systems, projects, or outcomes to increase credibility.",
    });
  }

  if (containsPhrase(normalizedAbout, GENERIC_PHRASES)) {
    issues.push({
      section: "about",
      severity: "warning",
      message: "About section contains generic phrasing.",
      suggestion: "Use specific examples and measurable impact.",
    });
  }

  if (containsPhrase(normalizedAbout, EXAGGERATED_PHRASES)) {
    issues.push({
      section: "about",
      severity: "error",
      message: "About section includes exaggerated language.",
      suggestion: "Keep statements realistic and verifiable.",
    });
  }
};

const validateExperience = (
  experiences: CompletionExperienceInput[],
  issues: ProfileCompletionIssue[],
): void => {
  if (experiences.length === 0) {
    issues.push({
      section: "experience",
      severity: "warning",
      message: "No experience added yet.",
      suggestion: "Add at least one real role with what you actually built.",
    });
    return;
  }

  const missingDescriptionCount = experiences.filter((experience) => !hasText(experience.description)).length;

  if (missingDescriptionCount > 0) {
    issues.push({
      section: "experience",
      severity: "info",
      message: `${missingDescriptionCount} experience entries are missing concrete descriptions.`,
      suggestion: "Describe systems built, scope, and your individual contribution.",
    });
  }

  const genericDescriptionCount = experiences.filter((experience) => (
    hasText(experience.description)
    && containsPhrase(experience.description, GENERIC_PHRASES)
  )).length;

  if (genericDescriptionCount > 0) {
    issues.push({
      section: "experience",
      severity: "warning",
      message: `${genericDescriptionCount} experience entries include generic descriptions.`,
      suggestion: "Replace generic language with concrete implementation details.",
    });
  }

  const exaggeratedDescriptionCount = experiences.filter((experience) => (
    hasText(experience.description)
    && containsPhrase(experience.description, EXAGGERATED_PHRASES)
  )).length;

  if (exaggeratedDescriptionCount > 0) {
    issues.push({
      section: "experience",
      severity: "error",
      message: `${exaggeratedDescriptionCount} experience entries include exaggerated claims.`,
      suggestion: "Use realistic wording supported by proof or measurable outcomes.",
    });
  }

  const experiencesWithoutProof = experiences.filter((experience) => experience.artifacts.length === 0).length;

  if (experiencesWithoutProof > 0) {
    issues.push({
      section: "experience",
      severity: "warning",
      message: `${experiencesWithoutProof} experience entries have no proof attached.`,
      suggestion: "Attach GitHub, project, or certificate links to support each claim.",
    });
  }
};

const validateSkills = (skills: string[], issues: ProfileCompletionIssue[]): void => {
  if (skills.length === 0) {
    issues.push({
      section: "skills",
      severity: "warning",
      message: "Skills list is empty.",
      suggestion: "Add 8-10 core skills you can explain confidently.",
    });
    return;
  }

  if (skills.length > 10) {
    issues.push({
      section: "skills",
      severity: "warning",
      message: "Skills list is too long.",
      suggestion: "Keep skills focused to 8-10 high-confidence items.",
    });
  }

  const duplicateSkills = findDuplicateValues(skills);

  if (duplicateSkills.length > 0) {
    issues.push({
      section: "skills",
      severity: "info",
      message: `Skills contain duplicates: ${duplicateSkills.join(", ")}.`,
      suggestion: "Remove duplicates and keep only distinct core skills.",
    });
  }
};

const validateArtifacts = (
  experiences: CompletionExperienceInput[],
  hasArtifacts: boolean,
  issues: ProfileCompletionIssue[],
): void => {
  if (!hasArtifacts) {
    issues.push({
      section: "artifacts",
      severity: "warning",
      message: "No proof-of-work artifacts found.",
      suggestion: "Add GitHub repositories, project demos, or certificates.",
    });
    return;
  }

  const allArtifacts = experiences.flatMap((experience) => experience.artifacts);

  if (allArtifacts.length < 2) {
    issues.push({
      section: "artifacts",
      severity: "info",
      message: "Add more proof links for stronger verification.",
      suggestion: "Target at least two public proof links.",
    });
  }

  const hasHighSignalArtifact = allArtifacts.some((artifact) => (
    artifact.type === ArtifactType.GITHUB
    || artifact.type === ArtifactType.PROJECT
    || artifact.type === ArtifactType.CERTIFICATE
  ));

  if (!hasHighSignalArtifact) {
    issues.push({
      section: "artifacts",
      severity: "warning",
      message: "Artifacts exist but high-signal proof is missing.",
      suggestion: "Add at least one GitHub, project demo, or certificate artifact.",
    });
  }
};

const deriveQuality = (issues: ProfileCompletionIssue[]): "excellent" | "good" | "needs-improvement" => {
  const qualityScore = issues.reduce((score, issue) => {
    if (issue.severity === "error") {
      return score - 15;
    }

    if (issue.severity === "warning") {
      return score - 8;
    }

    return score - 3;
  }, 100);

  if (qualityScore >= 85) {
    return "excellent";
  }

  if (qualityScore >= 70) {
    return "good";
  }

  return "needs-improvement";
};

const buildFeedback = (
  percent: number,
  sections: Record<CompletionSectionKey, boolean>,
  issues: ProfileCompletionIssue[],
): string => {
  const missingActions: string[] = [];

  if (!sections.basicInfo) {
    missingActions.push("Add your full name and current role.");
  }

  if (!sections.profileImage) {
    missingActions.push("Upload a professional profile picture.");
  }

  if (!sections.headline) {
    missingActions.push("Add a role-focused headline.");
  }

  if (!sections.about) {
    missingActions.push("Write a specific about summary.");
  }

  if (!sections.experience) {
    missingActions.push("Add at least one real experience entry.");
  }

  if (!sections.skills) {
    missingActions.push("Add core skills you can explain confidently.");
  }

  if (!sections.artifacts) {
    missingActions.push("Add proof links such as GitHub, projects, or certificates.");
  }

  const priorityIssueSuggestions = issues
    .filter((issue) => issue.severity === "error" || issue.severity === "warning")
    .slice(0, 3)
    .map((issue) => issue.suggestion)
    .filter((value): value is string => typeof value === "string");

  const uniqueActions = Array.from(new Set([...missingActions, ...priorityIssueSuggestions])).slice(0, 5);

  if (uniqueActions.length === 0) {
    return `Your profile is ${percent}% complete. Keep your evidence links updated as your work evolves.`;
  }

  return [
    `Your profile is ${percent}% complete.`,
    "To improve trust score:",
    ...uniqueActions.map((action) => `- ${action}`),
  ].join("\n");
};

const hasText = (value: string | null | undefined): value is string => (
  typeof value === "string" && value.trim().length > 0
);

const containsPhrase = (value: string, phrases: string[]): boolean => {
  const normalized = value.trim().toLowerCase();

  return phrases.some((phrase) => normalized.includes(phrase));
};

const findDuplicateValues = (values: string[]): string[] => {
  const normalizedCount = new Map<string, number>();

  for (const value of values) {
    const normalizedValue = value.trim().toLowerCase();

    if (!normalizedValue) {
      continue;
    }

    normalizedCount.set(normalizedValue, (normalizedCount.get(normalizedValue) ?? 0) + 1);
  }

  return Array.from(normalizedCount.entries())
    .filter(([, count]) => count > 1)
    .map(([value]) => value);
};
