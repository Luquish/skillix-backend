// src/services/dataConnect.operations.ts

// --- QUERIES ---

export const GET_USER_BY_FIREBASE_UID_QUERY = `
  query GetUserByFirebaseUid($firebaseUid: String!) {
    user(key: { firebaseUid: $firebaseUid }) {
      firebaseUid email name authProvider platform photoUrl emailVerified
    }
  }
`;

// --- MUTATIONS ---

export const CREATE_USER_MUTATION = `
  mutation CreateUser(
    $firebaseUid: String!, $email: String!, $name: String, $authProvider: String!,
    $platform: String, $photoUrl: String, $emailVerified: Boolean, $appleUserIdentifier: String
  ) {
    user_insert(data: {
      firebaseUid: $firebaseUid, email: $email, name: $name, authProvider: $authProvider,
      platform: $platform, photoUrl: $photoUrl, emailVerified: $emailVerified,
      appleUserIdentifier: $appleUserIdentifier
    }) { firebaseUid }
  }
`;

export const DELETE_USER_MUTATION = `
  mutation DeleteUser($firebaseUid: String!) {
    user_delete(key: { firebaseUid: $firebaseUid }) { firebaseUid }
  }
`;

export const CREATE_LEARNING_PLAN_BASE_MUTATION = `
mutation CreateLearningPlanBase(
  $userFirebaseUid: String!, $skillName: String!, $generatedBy: String!, $generatedAt: Timestamp!,
  $totalDurationWeeks: Int!, $dailyTimeMinutes: Int!, $skillLevelTarget: String!,
  $milestones: [String!]!, $progressMetrics: [String!]!, $flexibilityOptions: [String!]
) {
  learningPlan_insert(data: {
    userFirebaseUid: $userFirebaseUid, skillName: $skillName, generatedBy: $generatedBy, generatedAt: $generatedAt,
    totalDurationWeeks: $totalDurationWeeks, dailyTimeMinutes: $dailyTimeMinutes, 
    skillLevelTarget: $skillLevelTarget,
    milestones: $milestones, progressMetrics: $progressMetrics, flexibilityOptions: $flexibilityOptions
  }) { id }
}
`;

export const CREATE_SKILL_ANALYSIS_MUTATION = `
mutation CreateSkillAnalysis(
  $learningPlanId: UUID!, $skillName: String!, $skillCategory: String!, $marketDemand: String!,
  $learningPathRecommendation: String!, $realWorldApplications: [String!]!,
  $complementarySkills: [String!]!, $isSkillValid: Boolean!, $viabilityReason: String, $generatedBy: String!
) {
  skillAnalysis_insert(data: {
    learningPlanId: $learningPlanId, skillName: $skillName, skillCategory: $skillCategory, marketDemand: $marketDemand,
    learningPathRecommendation: $learningPathRecommendation, realWorldApplications: $realWorldApplications,
    complementarySkills: $complementarySkills, isSkillValid: $isSkillValid, viabilityReason: $viabilityReason, generatedBy: $generatedBy
  }) { id }
}
`;

export const CREATE_SKILL_COMPONENT_DATA_MUTATION = `
mutation CreateSkillComponentData(
  $skillAnalysisId: UUID!, $name: String!, $description: String!, $difficultyLevel: String!,
  $prerequisitesText: [String!]!, $estimatedLearningHours: Int!, $practicalApplications: [String!]!, $order: Int!
) {
  skillComponentData_insert(data: {
    skillAnalysisId: $skillAnalysisId, name: $name, description: $description, difficultyLevel: $difficultyLevel,
    prerequisitesText: $prerequisitesText, estimatedLearningHours: $estimatedLearningHours,
    practicalApplications: $practicalApplications, order: $order
  }) { id }
}
`;

export const CREATE_PLAN_SECTION_MUTATION = `
mutation CreatePlanSection(
  $learningPlanId: UUID!, $title: String!, $description: String, $order: Int!
) {
  planSection_insert(data: {
    learningPlanId: $learningPlanId, title: $title, description: $description, order: $order
  }) { id }
}
`;

export const CREATE_DAY_CONTENT_MUTATION = `
mutation CreateDayContent(
  $sectionId: UUID!, $dayNumber: Int!, $title: String!, $focusArea: String!,
  $isActionDay: Boolean!, $objectives: [String!]!, $completionStatus: String
) {
  dayContent_insert(data: {
    sectionId: $sectionId, dayNumber: $dayNumber, title: $title, focusArea: $focusArea,
    isActionDay: $isActionDay, objectives: $objectives, 
    completionStatus: $completionStatus
  }) { id }
}
`;

export const CREATE_MAIN_CONTENT_ITEM_MUTATION = `
mutation CreateMainContentItem(
  $dayContentId: UUID!, $title: String!, $textContent: String!, $funFact: String!, $xp: Int!
) {
  mainContentItem_insert(data: {
    dayContentId: $dayContentId, title: $title, textContent: $textContent, funFact: $funFact, xp: $xp
  }) { id }
}
`;

export const CREATE_KEY_CONCEPT_MUTATION = `
mutation CreateKeyConcept(
  $mainContentItemId: UUID!, $concept: String!, $explanation: String!
) {
  keyConcept_insert(data: {
    mainContentItemId: $mainContentItemId, concept: $concept, explanation: $explanation
  }) { id }
}
`;

export const CREATE_ACTION_TASK_ITEM_MUTATION = `
mutation CreateActionTaskItem(
  $dayContentId: UUID!, $title: String!, $challengeDescription: String!, $timeEstimateString: String!,
  $tips: [String!]!, $realWorldContext: String!, $successCriteria: [String!]!, $toviMotivation: String!,
  $difficultyAdaptation: String, $xp: Int!
) {
  actionTaskItem_insert(data: {
    dayContentId: $dayContentId, title: $title, challengeDescription: $challengeDescription,
    timeEstimateString: $timeEstimateString, tips: $tips, realWorldContext: $realWorldContext,
    successCriteria: $successCriteria, toviMotivation: $toviMotivation,
    difficultyAdaptation: $difficultyAdaptation, xp: $xp
  }) { id }
}
`;

export const CREATE_CONTENT_BLOCK_ITEM_MUTATION = `
mutation CreateContentBlockItem(
  $dayContentId: UUID!, $blockType: String!, $title: String!, $xp: Int!, $order: Int!,
  $estimatedMinutes: Int, $quizDetailsId: UUID, $exerciseDetailsId: UUID
) {
  contentBlockItem_insert(data: {
    dayContentId: $dayContentId, 
    blockType: $blockType, 
    title: $title, xp: $xp, order: $order,
    estimatedMinutes: $estimatedMinutes, quizDetailsId: $quizDetailsId, exerciseDetailsId: $exerciseDetailsId
  }) { id }
}
`;

export const CREATE_QUIZ_DETAILS_MUTATION = `
mutation CreateQuizDetails($description: String!) {
  quizContentDetails_insert(data: { description: $description }) { id }
}
`;

export const CREATE_EXERCISE_DETAILS_MUTATION = `
mutation CreateExerciseDetails($instructions: String!, $exerciseType: String!) {
  exerciseDetailsData_insert(data: {
    instructions: $instructions, exerciseType: $exerciseType
  }) { id }
}
`;

export const CREATE_MATCH_PAIR_MUTATION = `
mutation CreateMatchPair($exerciseId: UUID!, $prompt: String!, $correctAnswer: String!) {
  matchPair_insert(data: {
    exerciseId: $exerciseId, prompt: $prompt, correctAnswer: $correctAnswer
  }) { id }
}
`; 