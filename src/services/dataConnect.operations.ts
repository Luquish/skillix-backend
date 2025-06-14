// src/services/dataConnect.operations.ts

// --- QUERIES ---

export const GET_USER_BY_FIREBASE_UID_QUERY = `
  query GetUserByFirebaseUid($firebaseUid: String!) {
    user(key: { firebaseUid: $firebaseUid }) {
      firebaseUid email name authProvider platform photoUrl emailVerified
    }
  }
`;

export const GET_LEARNING_PLAN_STRUCTURE_QUERY = `
  query GetLearningPlanStructure($learningPlanId: UUID!) {
    learningPlans(where: { id: { eq: $learningPlanId } }) {
      id
      userFirebaseUid
      skillName
      sections: planSections_on_learningPlan {
        id
        title
        order
        days: dayContents_on_section {
          id
          dayNumber
          title
          focusArea
          isActionDay
          objectives
          completionStatus
        }
      }
      skillAnalysis: skillAnalysis_on_learningPlan {
        # ...los campos que necesites de skill analysis...
        skillName
        skillCategory
        marketDemand
        isSkillValid
        learningPathRecommendation
        realWorldApplications
        complementarySkills
        components: skillComponentDatas_on_skillAnalysis {
            name
            description
            difficultyLevel
            prerequisitesText
            estimatedLearningHours
            practicalApplications
            order
        }
      }
    }
  }
`;

export const GET_USER_FCM_TOKENS_QUERY = `
  query GetUserFcmTokens($firebaseUid: String!) {
    user(key: { firebaseUid: $firebaseUid }) {
      fcmTokens
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
    })
  }
`;

export const DELETE_USER_MUTATION = `
  mutation DeleteUser($firebaseUid: String!) {
    user_delete(key: { firebaseUid: $firebaseUid })
  }
`;

export const CREATE_USER_PREFERENCE_MUTATION = `
  mutation CreateUserPreference(
    $userFirebaseUid: String!, $skill: String!, $experienceLevel: String!,
    $motivation: String!, $availableTimeMinutes: Int!, $learningStyle: String!, $goal: String!
  ) {
    userPreference_insert(data: {
      userFirebaseUid: $userFirebaseUid, skill: $skill, experienceLevel: $experienceLevel,
      motivation: $motivation, availableTimeMinutes: $availableTimeMinutes,
      learningStyle: $learningStyle, goal: $goal
    })
  }
`;

export const CREATE_ENROLLMENT_MUTATION = `
  mutation CreateEnrollment($userFirebaseUid: String!, $learningPlanId: UUID!, $status: String!) {
    enrollment_insert(data: {
      userFirebaseUid: $userFirebaseUid,
      learningPlanId: $learningPlanId,
      status: $status
    })
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
  })
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
  })
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
  })
}
`;

export const CREATE_PLAN_SECTION_MUTATION = `
mutation CreatePlanSection(
  $learningPlanId: UUID!, $title: String!, $description: String, $order: Int!
) {
  planSection_insert(data: {
    learningPlanId: $learningPlanId, title: $title, description: $description, order: $order
  })
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
  })
}
`;

export const CREATE_MAIN_CONTENT_ITEM_MUTATION = `
mutation CreateMainContentItem(
  $dayContentId: UUID!, $title: String!, $textContent: String!, $funFact: String!, $xp: Int!
) {
  mainContentItem_insert(data: {
    dayContentId: $dayContentId, title: $title, textContent: $textContent, funFact: $funFact, xp: $xp
  })
}
`;

export const CREATE_KEY_CONCEPT_MUTATION = `
mutation CreateKeyConcept(
  $mainContentItemId: UUID!, $concept: String!, $explanation: String!
) {
  keyConcept_insert(data: {
    mainContentItemId: $mainContentItemId, concept: $concept, explanation: $explanation
  })
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
  })
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
  })
}
`;

export const CREATE_QUIZ_DETAILS_MUTATION = `
mutation CreateQuizDetails($description: String!) {
  quizContentDetails_insert(data: { description: $description })
}
`;

export const CREATE_EXERCISE_DETAILS_MUTATION = `
mutation CreateExerciseDetails($instructions: String!, $exerciseType: String!) {
  exerciseDetailsData_insert(data: {
    instructions: $instructions, exerciseType: $exerciseType
  })
}
`;

export const CREATE_MATCH_PAIR_MUTATION = `
mutation CreateMatchPair($exerciseId: UUID!, $prompt: String!, $correctAnswer: String!) {
  matchPair_insert(data: {
    exerciseId: $exerciseId, prompt: $prompt, correctAnswer: $correctAnswer
  })
}
`;

export const UPDATE_DAY_COMPLETION_STATUS_MUTATION = `
  mutation UpdateDayCompletionStatus($dayContentId: UUID!, $status: String!) {
    dayContent_update(key: { id: $dayContentId }, data: { completionStatus: $status })
  }
`;

export const CREATE_PEDAGOGICAL_ANALYSIS_MUTATION = `
mutation CreatePedagogicalAnalysis(
  $learningPlanId: UUID!, $effectivenessScore: Float!, $cognitiveLoadAssessment: String!,
  $scaffoldingQuality: String!, $engagementPotential: Float!, $recommendations: [String!]!,
  $assessmentStrategies: [String!]!, $improvementAreas: [String!]!, $generatedBy: String!
) {
  pedagogicalAnalysis_insert(data: {
    learningPlanId: $learningPlanId,
    effectivenessScore: $effectivenessScore,
    cognitiveLoadAssessment: $cognitiveLoadAssessment,
    scaffoldingQuality: $scaffoldingQuality,
    engagementPotential: $engagementPotential,
    recommendations: $recommendations,
    assessmentStrategies: $assessmentStrategies,
    improvementAreas: $improvementAreas,
    generatedBy: $generatedBy
  })
}
`;

export const CREATE_LEARNING_OBJECTIVE_MUTATION = `
mutation CreateLearningObjectiveData(
  $pedagogicalAnalysisId: UUID!, $objective: String!, $measurable: Boolean!,
  $timeframe: String!, $order: Int!
) {
  learningObjectiveData_insert(data: {
    pedagogicalAnalysisId: $pedagogicalAnalysisId,
    objective: $objective,
    measurable: $measurable,
    timeframe: $timeframe,
    order: $order
  })
}
`; 