# Individual Service Tests

This directory contains **individual unit tests** for services that have specific logic not covered by the main simulation system.

## 🎯 **Testing Philosophy**

### ✅ **Individual Tests (this directory):**
Services with specific logic requiring individual testing:

- **`openai.service.spec.ts`** - OpenAI API communication layer
- **`chatOrchestrator.service.spec.ts`** - Real-time chat with dynamic context
- **`toviTheFox.service.spec.ts`** - Ski the Fox motivational messages
- **`notifications.service.spec.ts`** - Push notification system

### 🔄 **Covered by Simulation:**
Services tested as part of the main learning flow simulation:

- **`analytics.service`** ➜ Pattern analysis in `simulators/`
- **`learningPlanner.service`** ➜ Plan generation in `simulators/`
- **`contentGenerator.service`** ➜ Content generation in `simulators/`
- **`skillAnalyzer.service`** ➜ Skill analysis in `simulators/`
- **`pedagogicalExpert.service`** ➜ Pedagogical analysis in `simulators/`

## 📁 **Test Coverage**

### 🔧 `openai.service.spec.ts`
Tests the base OpenAI service handling all API communications.

**Test cases:** API responses, error handling, network failures, default config, JSON format, custom models.

### 💬 `chatOrchestrator.service.spec.ts`
Tests real-time chat orchestration with dynamic context management.

**Test cases:** User context, chat history (10 message limit), suggested actions, info requests, detailed context, OpenAI fallbacks.

### 🦊 `toviTheFox.service.spec.ts`
Tests Ski the Fox service for motivational messages and celebrations.

**Test cases:** Personalized messages, streak celebrations, daily motivation, different situations, data consistency.

### 🔔 `notifications.service.spec.ts`
Tests push notification system for reminders and achievements.

**Test cases:** Analytics-based reminders, intervention strategies, achievement notifications, partial failures, external service fallbacks.

## 🚀 **Running Tests**

```bash
# All individual tests
pnpm test:services

# Specific test file
pnpm test:services -- openai.service.spec.ts

# With coverage
pnpm test:services -- --coverage

# Watch mode
pnpm test:services -- --watch
```

## 🎯 **Why This Split?**

**Individual Tests:** For services with unique logic, real-time interactions, specific edge cases, or those outside the main learning flow.

**Simulation System:** For services that are part of the complete learning journey, benefit from integration testing, or have complex interdependencies.

**Benefits:** Fast development feedback, intelligent test coverage, minimal maintenance, CI/CD friendly approach. 