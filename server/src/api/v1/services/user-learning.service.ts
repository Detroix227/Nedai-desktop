// User Learning Service - Extracts and stores user preferences from interactions
import prisma from "@/lib/prisma";

export interface UserLearningUpdate {
  tone?: string;
  detail?: string;
  subjects?: { add?: string[]; remove?: string[] };
  studyPattern?: Record<string, any>;
  emotionalTrigger?: string;
}

/**
 * Get or create user learning profile
 */
export async function getOrCreateUserLearningProfile(userId: string) {
  let profile = await prisma.userLearningProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    profile = await prisma.userLearningProfile.create({
      data: {
        userId,
        weakSubjects: [],
        strongSubjects: [],
      },
    });
  }

  return profile;
}

/**
 * Update user learning profile based on interaction
 */
export async function updateUserLearningProfile(
  userId: string,
  update: UserLearningUpdate
): Promise<void> {
  const profile = await getOrCreateUserLearningProfile(userId);

  const data: any = {
    lastUpdated: new Date(),
  };

  if (update.tone) {
    data.preferredTone = update.tone;
  }

  if (update.detail) {
    data.preferredDetail = update.detail;
  }

  if (update.subjects) {
    if (update.subjects.add) {
      // Add to weak or strong based on context
      data.weakSubjects = [...new Set([...profile.weakSubjects, ...update.subjects.add])];
    }
    if (update.subjects.remove) {
      data.weakSubjects = profile.weakSubjects.filter((s: string) => !update.subjects!.remove!.includes(s));
    }
  }

  if (update.studyPattern) {
    data.studyPatterns = {
      ...((profile.studyPatterns as object) || {}),
      ...update.studyPattern,
    };
  }

  if (update.emotionalTrigger) {
    const currentProfile = (profile.emotionalProfile as any) || {};
    data.emotionalProfile = {
      ...currentProfile,
      triggers: [...(currentProfile.triggers || []), update.emotionalTrigger],
    };
  }

  await prisma.userLearningProfile.update({
    where: { userId },
    data,
  });

  console.log(`[user-learning] Updated profile for user ${userId}`);
}

/**
 * Analyze user message and extract learning insights
 */
export async function analyzeUserInteraction(
  userId: string,
  userMessage: string,
  assistantResponse: string
): Promise<void> {
  const insights: UserLearningUpdate = {};

  // Detect preferred tone from user message sentiment
  const tone = detectPreferredTone(userMessage);
  if (tone) {
    insights.tone = tone;
  }

  // Detect detail preference
  const detail = detectDetailPreference(userMessage);
  if (detail) {
    insights.detail = detail;
  }

  // Detect subject difficulty
  const subjectIndicators = detectSubjectDifficulty(userMessage);
  if (subjectIndicators.length > 0) {
    insights.subjects = { add: subjectIndicators };
  }

  // Detect study patterns (time of day)
  const hour = new Date().getHours();
  insights.studyPattern = {
    lastActiveHour: hour,
  };

  // Detect emotional triggers
  const emotionalTrigger = detectEmotionalTrigger(userMessage);
  if (emotionalTrigger) {
    insights.emotionalTrigger = emotionalTrigger;
  }

  // Only update if we found something
  if (insights.tone || insights.detail || insights.subjects || insights.emotionalTrigger) {
    await updateUserLearningProfile(userId, insights);
  }
}

/**
 * Detect user's preferred tone based on message sentiment
 */
function detectPreferredTone(message: string): string | null {
  const lowerMsg = message.toLowerCase();

  // Stressed/Overwhelmed → Reflective
  if (lowerMsg.match(/\b(stress|overwhelm|anxious|worried|tired|exhausted|burnout)\b/)) {
    return "reflective";
  }

  // Confused/Needs help → Guide
  if (lowerMsg.match(/\b(confused|lost|don't understand|help|how do i|what should i)\b/)) {
    return "guide";
  }

  // Excited/Celebrating → Lively
  if (lowerMsg.match(/\b(excited|happy|great|awesome|celebrate|passed|aced|won)\b/)) {
    return "lively";
  }

  // Technical/Deep question → Analytical
  if (lowerMsg.match(/\b(why|how does|explain|mechanism|process|theory|prove)\b/)) {
    return "analytical";
  }

  // Rushed/Direct → Concise
  if (lowerMsg.match(/\b(quick|fast|short|brief|tl;dr|just tell me)\b/)) {
    return "concise";
  }

  // Procrastinating/Making excuses → Challenger
  if (lowerMsg.match(/\b(lazy|procrastinat|delay|later|maybe|can't focus|distracted)\b/)) {
    return "challenger";
  }

  return null;
}

/**
 * Detect user's preferred detail level
 */
function detectDetailPreference(message: string): string | null {
  const lowerMsg = message.toLowerCase();

  if (lowerMsg.match(/\b(detailed|in depth|thorough|comprehensive|explain fully)\b/)) {
    return "detailed";
  }

  if (lowerMsg.match(/\b(simple|basic|just|only|summary|brief|short)\b/)) {
    return "concise";
  }

  if (lowerMsg.match(/\b(example|sample|show me|demonstrate|walkthrough)\b/)) {
    return "examples";
  }

  return null;
}

/**
 * Detect subjects the user struggles with
 */
function detectSubjectDifficulty(message: string): string[] {
  const subjects: string[] = [];
  const lowerMsg = message.toLowerCase();

  const subjectPatterns: Record<string, RegExp> = {
    math: /\b(math|calculus|algebra|geometry|trig|equation|formula)\b/,
    physics: /\b(physics|mechanics|thermodynamics|quantum|forces|motion)\b/,
    chemistry: /\b(chemistry|chemical|reaction|compound|molecule|periodic)\b/,
    biology: /\b(biology|cell|organism|anatomy|physiology|genetics)\b/,
    programming: /\b(code|programming|coding|bug|error|debug|syntax|function)\b/,
    statistics: /\b(statistics|probability|data|analysis|distribution)\b/,
    history: /\b(history|historical|war|revolution|civilization|era)\b/,
  };

  for (const [subject, pattern] of Object.entries(subjectPatterns)) {
    if (pattern.test(lowerMsg)) {
      // Check if user expresses difficulty
      if (lowerMsg.match(/\b(hard|difficult|confused|struggling|don't get|stuck|lost)\b/)) {
        subjects.push(subject);
      }
    }
  }

  return subjects;
}

/**
 * Detect emotional triggers for personalized support
 */
function detectEmotionalTrigger(message: string): string | null {
  const lowerMsg = message.toLowerCase();

  if (lowerMsg.match(/\b(exam|test|quiz|assessment|grade|score)\b/)) {
    if (lowerMsg.match(/\b(stress|anxious|worried|scared|nervous|freaking)\b/)) {
      return "exam_anxiety";
    }
  }

  if (lowerMsg.match(/\b(deadline|due|late|submit|assignment|homework)\b/)) {
    if (lowerMsg.match(/\b(overwhelm|too much|can't finish|behind|rushing)\b/)) {
      return "deadline_pressure";
    }
  }

  if (lowerMsg.match(/\b(fail|failing|bad grade|terrible|awful|worst)\b/)) {
    return "academic_struggle";
  }

  if (lowerMsg.match(/\b(drop out|quit|give up|useless|pointless)\b/)) {
    return "motivation_crisis";
  }

  return null;
}

/**
 * Get personalized system prompt modifier based on user profile
 */
export async function getPersonalizedPromptModifier(userId: string): Promise<string> {
  const profile = await getOrCreateUserLearningProfile(userId);

  const modifiers: string[] = [];

  if (profile.preferredTone) {
    modifiers.push(`User prefers ${profile.preferredTone} tone.`);
  }

  if (profile.preferredDetail) {
    modifiers.push(`User prefers ${profile.preferredDetail} explanations.`);
  }

  if (profile.weakSubjects.length > 0) {
    modifiers.push(`User may need extra support with: ${profile.weakSubjects.join(", ")}.`);
  }

  if (profile.strongSubjects.length > 0) {
    modifiers.push(`User excels at: ${profile.strongSubjects.join(", ")}.`);
  }

  const emotionalProfile = profile.emotionalProfile as any;
  if (emotionalProfile?.triggers?.includes("exam_anxiety")) {
    modifiers.push("User experiences exam anxiety - be extra supportive and encouraging.");
  }

  if (emotionalProfile?.triggers?.includes("motivation_crisis")) {
    modifiers.push("User has expressed motivation struggles - emphasize purpose and small wins.");
  }

  if (modifiers.length === 0) {
    return "";
  }

  return `\n\nUSER PERSONALIZATION:\n${modifiers.join(" ")}`;
}
