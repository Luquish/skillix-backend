# Tovi Backend - AI Agent Guide 🦊

This project is **Tovi Backend**, an AI-driven microlearning platform backend built with Node.js, Express, TypeScript, and Firebase Data Connect. This guide helps AI agents understand the project architecture and work efficiently within the established patterns.

## 🤖 **Agent Instructions**

### **Programmatic Validation (MANDATORY)**
After making ANY code changes, you MUST run these validation checks:
```bash
# Core validation pipeline (REQUIRED)
pnpm test:offline          # Must pass - tests core functionality
pnpm lint:fix             # Must run - fixes code formatting
pnpm typecheck            # Must pass - validates TypeScript

# Additional checks based on changes
pnpm test:e2e             # If modifying API endpoints
pnpm sim:journey          # If modifying LLM services
```

### **Git Workflow Requirements**
- **No new branches**: Work directly in current branch
- **Commit all changes**: Use `git add . && git commit -m "descriptive message"`
- **Clean worktree**: Ensure `git status` shows clean state before finishing
- **Fix pre-commit failures**: If pre-commit hooks fail, fix issues and retry
- **Descriptive commits**: Use conventional commit format: `feat:`, `fix:`, `refactor:`, etc.

### **PR Message Guidelines**
When creating PR descriptions, include:
```markdown
## 🎯 Summary
Brief description of changes and their purpose

## 🔧 Technical Changes
- List specific files modified
- Explain architectural decisions
- Note any Google service integrations

## 🧪 Testing
- Cite test results: `pnpm test:offline` output
- Include simulation results if LLM services modified
- Note any manual testing performed

## 🛡️ Security Review
- Confirm no sensitive data exposure
- Validate input sanitization
- Check authentication/authorization changes

## 📊 Performance Impact
- API cost implications (OpenAI usage)
- Google Cloud resource impact
- Database query optimization
```

## 🏗️ **Project Architecture**

### **Service Layer Pattern**
The system follows a strict layered architecture:
```
API Routes → Auth Middleware → Controllers → Services/Orchestrators → LLM Agents → DataConnect Service
```

**Key principles:**
- Controllers handle HTTP concerns only
- Services contain business logic
- Only DataConnect Service touches the database
- LLM agents are specialized, single-purpose services

### **LLM Agent System**
Multiple specialized AI agents work together:
- **`skillAnalyzer`** - Analyzes user skills and market demand
- **`learningPlanner`** - Creates personalized learning plans
- **`contentGenerator`** - Generates daily learning content
- **`pedagogicalExpert`** - Validates and improves educational content
- **`chatOrchestrator`** - Manages real-time conversations
- **`toviTheFox`** - Ski the Fox motivational messages
- **`analytics`** - User behavior analysis and predictions
- **`notifications`** - Smart notification strategies

**Each agent has:**
- Specific system prompts in `src/services/llm/prompts.ts`
- Zod schemas for input/output validation in `src/services/llm/schemas.ts`
- Individual service files with single responsibilities

## 🧪 **Testing Strategy**

### **Critical Testing Philosophy**
This project has a **sophisticated testing architecture** optimized for both rapid development and OpenAI Codex compatibility:

**Individual Tests (`tests/services/`):**
- Only for services with **unique individual logic**
- Services tested: `openai`, `chatOrchestrator`, `toviTheFox`, `notifications`
- **DO NOT** create individual tests for: `analytics`, `learningPlanner`, `contentGenerator`, `skillAnalyzer`, `pedagogicalExpert`

**Simulation System (`tests/simulators/`, `tests/flows/`):**
- **Main learning flow services are tested via simulation**
- Complete end-to-end journey validation
- 100% offline, no networking required
- Optimized for OpenAI Codex compatibility

### **When to Create Tests**
```bash
# ✅ Create individual tests for:
- Services with real-time interactions (chat, notifications)
- Infrastructure services (OpenAI communication)
- Services outside the main learning flow

# ❌ DO NOT create individual tests for:
- Services covered by simulation system
- Main learning journey components
- Services that benefit from integration testing
```

### **Testing Commands**
```bash
# Fast development (Codex compatible)
pnpm test:offline          # All offline tests (~1 second)
pnpm test:services         # Individual service tests
pnpm test:flows           # Journey flow validation
pnpm test:simulators      # Simulation system tests

# Interactive tools
pnpm sim:journey          # Journey simulation
pnpm sim:performance      # Performance analysis

# Infrastructure required (Local only)
pnpm test:e2e            # API tests with Firebase
pnpm test:all            # Complete validation
```

## 📊 **Data Structures**

### **Core Types**
The project uses Zod schemas for validation. Key types:
- **`UserData`** - User profile and preferences
- **`LearningPlan`** - Complete learning journey structure
- **`DayContent`** - Daily learning materials
- **`ActionTask`** - Hands-on practice activities (every 3rd day)
- **`SkillAnalysis`** - Market analysis and skill categorization
- **`ChatContext`** - Real-time conversation state

### **Database Schema**
Firebase Data Connect with PostgreSQL backend:
- **`users`** - User profiles and authentication
- **`learning_plans`** - Personalized learning journeys
- **`user_progress`** - Daily completion tracking
- **`user_preferences`** - Learning preferences and analytics
- **`chat_history`** - Conversation logs (limited to 10 messages)

## 🔄 **Development Patterns**

### **LLM Service Development**
When creating or modifying LLM services:

1. **Define schemas first** in `src/services/llm/schemas.ts`
2. **Create system prompts** in `src/services/llm/prompts.ts`
3. **Implement service** with proper error handling
4. **Add to simulation** if part of main learning flow
5. **Create individual tests** only if outside main flow

### **Error Handling**
```typescript
// Always use proper error handling with fallbacks
try {
  const result = await llmService.generate(input);
  return result;
} catch (error) {
  logger.error('LLM service failed', { error, input });
  return fallbackResponse;
}
```

### **Logging Standards**
Use structured logging with context:
```typescript
import { logger } from '../utils/logger';

logger.info('User journey started', {
  userId: user.id,
  skill: skill.name,
  planId: plan.id
});
```

## 🚀 **OpenAI Codex Optimization**

### **Codex-Compatible Development**
The project is specifically optimized for OpenAI Codex:

**✅ Codex-Friendly:**
- 80% of tests work without networking
- Complete simulation system
- Fast feedback loops (<1 second)
- No external API dependencies for core development

**❌ Codex Limitations:**
- API tests require server infrastructure
- Firebase emulators need local setup
- Database operations need connection

### **Recommended Codex Workflow**
```bash
# Primary development loop
pnpm test:offline          # Instant validation

# Feature development
pnpm test:services         # Unit test new services
pnpm sim:journey           # Test journey integration
pnpm test:flows           # Validate end-to-end flows
```

## 🎯 **Code Quality Guidelines**

### **TypeScript Standards**
- Use strict TypeScript configuration
- Prefer `interface` over `type` for object shapes
- Use Zod for runtime validation
- Export types from service files
- Always handle null/undefined cases explicitly
- Use meaningful variable and function names
- Prefer composition over inheritance

### **Async/Await Patterns**
```typescript
// ✅ Preferred pattern
async function processUserJourney(userId: string): Promise<LearningPlan> {
  const user = await getUserById(userId);
  const skills = await analyzeUserSkills(user);
  const plan = await generateLearningPlan(user, skills);
  return plan;
}

// ❌ Avoid nested promises
```

### **File Organization**
- Controllers: HTTP-specific logic only
- Services: Business logic and orchestration
- Utils: Pure functions and helpers
- Types: Shared interfaces and types

### **Naming Conventions**
```typescript
// ✅ File names: kebab-case
src/services/llm/chat-orchestrator.service.ts
src/controllers/learning-plan.controller.ts

// ✅ Function names: camelCase
async function generateLearningPlan() {}
export const createUserProfile = async () => {}

// ✅ Interface names: PascalCase
interface UserData {}
interface LearningPlan {}

// ✅ Type names: PascalCase
type SkillCategory = 'TECHNICAL' | 'SOFT_SKILL' | 'LANGUAGE';

// ✅ Constants: SCREAMING_SNAKE_CASE
const MAX_CHAT_HISTORY = 10;
const DEFAULT_LEARNING_DAYS = 30;

// ✅ Enum names: PascalCase with descriptive values
enum NotificationStrategy {
  GENTLE_REMINDER = 'gentle_reminder',
  MOTIVATIONAL_BOOST = 'motivational_boost',
  STREAK_MAINTENANCE = 'streak_maintenance'
}
```

### **File-Specific Instructions**

#### **LLM Service Files (`src/services/llm/*.ts`)**
```typescript
// Required structure for LLM services
export async function serviceName(
  input: ValidatedInput,
  context?: ServiceContext
): Promise<ServiceOutput> {
  try {
    // 1. Validate input with Zod
    const validatedInput = inputSchema.parse(input);
    
    // 2. Prepare OpenAI prompt
    const messages = buildMessages(validatedInput, context);
    
    // 3. Call OpenAI with error handling
    const response = await getOpenAiChatCompletion({
      messages,
      schema: outputSchema,
      temperature: 0.7
    });
    
    // 4. Log success with context
    logger.info('LLM service completed', {
      service: 'serviceName',
      inputSize: JSON.stringify(input).length,
      outputSize: JSON.stringify(response).length
    });
    
    return response;
  } catch (error) {
    // 5. Log error and provide fallback
    logger.error('LLM service failed', { error, input });
    throw new Error(`Failed to process ${serviceName}: ${error.message}`);
  }
}
```

#### **Controller Files (`src/controllers/*.ts`)**
```typescript
// Required structure for controllers
export const controllerName = async (req: Request, res: Response) => {
  try {
    // 1. Extract and validate request data
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // 2. Validate input with Zod
    const validatedData = requestSchema.parse(req.body);
    
    // 3. Call service layer
    const result = await serviceFunction(validatedData, { userId });
    
    // 4. Return successful response
    res.status(200).json(result);
  } catch (error) {
    // 5. Handle errors appropriately
    logger.error('Controller error', { error, userId: req.user?.uid });
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

#### **Test Files (`tests/**/*.spec.ts`)**
```typescript
// Required structure for tests
describe('ServiceName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup common mocks
  });

  describe('functionName', () => {
    it('should handle successful case', async () => {
      // Arrange
      const input = { /* test data */ };
      const expectedOutput = { /* expected result */ };
      
      // Act
      const result = await functionName(input);
      
      // Assert
      expect(result).toEqual(expectedOutput);
      expect(mockFunction).toHaveBeenCalledWith(/* expected params */);
    });

    it('should handle error case', async () => {
      // Arrange
      const input = { /* invalid data */ };
      mockFunction.mockRejectedValue(new Error('Test error'));
      
      // Act & Assert
      await expect(functionName(input)).rejects.toThrow('Test error');
    });
  });
});
```

### **Best Practices**
- **Code Reviews**: All changes require peer review
- **Single Responsibility**: Each function should do one thing well
- **Immutability**: Prefer immutable data structures
- **Error Boundaries**: Always implement proper error handling
- **Performance**: Consider memory and CPU impact of changes
- **Documentation**: Self-documenting code with minimal but meaningful comments
- **Testing**: Write tests before or alongside implementation
- **Refactoring**: Continuously improve code quality

## 🔧 **Firebase Data Connect**

### **Query Patterns**
- Use generated types from `dataconnect-generated/`
- All database operations go through DataConnect Service
- Prefer batch operations when possible
- Handle connection errors gracefully

### **Schema Migrations**
```bash
# Update schema
pnpm migrate:schema        # Apply database changes
```

## 🛡️ **Security Guidelines**

### **Data Protection**
- **User Data**: Always encrypt sensitive user information
- **API Keys**: Never commit API keys to version control
- **Environment Variables**: Use `.env` files for sensitive configuration
- **Input Validation**: Validate and sanitize all user inputs using Zod schemas
- **SQL Injection**: Use parameterized queries through Firebase Data Connect
- **Authentication**: Implement proper Firebase Auth integration
- **Authorization**: Verify user permissions for all data operations

### **LLM Security**
- **Prompt Injection**: Sanitize user inputs before sending to OpenAI
- **Data Leakage**: Never include sensitive user data in LLM prompts
- **API Rate Limits**: Implement proper rate limiting for OpenAI calls
- **Error Handling**: Don't expose internal errors to end users
- **Logging**: Never log sensitive information (API keys, user passwords, etc.)

### **Infrastructure Security**
- **HTTPS Only**: All communication must use HTTPS
- **CORS**: Configure CORS properly for production
- **Headers**: Use security headers (Helmet.js is already configured)
- **Dependencies**: Regularly update dependencies and check for vulnerabilities
- **Secrets Management**: Use Google Secret Manager for production secrets

## 🌐 **Google Ecosystem Priority**

### **Google Services First**
This project **prioritizes Google/Firebase ecosystem** for all infrastructure needs:

**✅ Google/Firebase Services (Preferred):**
- **Firebase Auth** - User authentication and authorization
- **Firebase Data Connect** - PostgreSQL database with generated types
- **Google Cloud Run** - Serverless deployment platform
- **Google Cloud Build** - CI/CD pipeline
- **Google Secret Manager** - Secrets and API key management
- **Google Cloud Logging** - Centralized logging
- **Google Cloud Monitoring** - Application monitoring
- **Firebase Admin SDK** - Server-side Firebase operations
- **Firebase Cloud Messaging** - Push notifications

**🔧 Google Cloud Services (When Needed):**
- **Cloud SQL** - Managed PostgreSQL (if needed beyond Data Connect)
- **Cloud Storage** - File storage and CDN
- **Cloud Functions** - Additional serverless functions
- **Cloud Scheduler** - Cron jobs and scheduled tasks
- **Cloud Pub/Sub** - Event-driven messaging

**⚠️ Non-Google Services (Exceptions Only):**
- **OpenAI API** - LLM capabilities (no Google equivalent meets requirements)
- **Third-party libraries** - Only when no Google alternative exists

### **Integration Patterns**
```typescript
// ✅ Preferred: Use Firebase/Google services
import { getAuth } from 'firebase-admin/auth';
import { connectorsApi } from '../config/firebase.service';

// ⚠️ Exception: OpenAI for LLM capabilities
import OpenAI from 'openai';

// ❌ Avoid: Non-Google alternatives when Google services exist
// Don't use AWS, Azure, or other cloud providers unless absolutely necessary
```

### **Migration Strategy**
When considering new services:
1. **First**: Check if Google/Firebase offers the capability
2. **Second**: Evaluate if existing Google services can be extended
3. **Third**: Consider Google Cloud services
4. **Last Resort**: Non-Google services only if critical functionality missing

### **Benefits of Google Ecosystem**
- **Unified Billing**: Single invoice for all services
- **Integrated Security**: Consistent IAM and security policies
- **Performance**: Optimized inter-service communication
- **Monitoring**: Unified logging and monitoring across all services
- **Cost Optimization**: Google Cloud committed use discounts
- **Compliance**: Consistent data governance and compliance policies

## 📝 **Contribution Guidelines**

### **When Adding New Features**
1. **Security Review** - Consider security implications of new functionality
2. **Google Ecosystem First** - Prefer Google/Firebase services over alternatives
3. **Testing Strategy** - Use simulation system unless service has unique individual logic
4. **Schema Updates** - Update Zod schemas if changing data structures
5. **Documentation** - Update documentation for significant changes
6. **Performance Impact** - Consider memory, CPU, and cost implications

### **PR Requirements**
- **Security Check**: Review for security vulnerabilities
- **Google Services**: Justify any non-Google service usage
- **Tests Pass**: `pnpm test:offline` must pass
- **Code Quality**: `pnpm lint:fix` and `pnpm typecheck` clean
- **Test Coverage**: All new features need appropriate test coverage
- **Documentation**: Update relevant documentation
- **Performance**: No significant performance regressions

### **Performance Considerations**
- **OpenAI API Costs**: Use simulation for development to minimize API calls
- **Database Efficiency**: Batch operations and optimize queries
- **Memory Management**: Monitor memory usage and prevent leaks
- **Logging Levels**: Use appropriate logging levels for production
- **Caching Strategy**: Implement caching for expensive operations
- **Google Cloud Costs**: Monitor and optimize Google Cloud resource usage

## 🎭 **Simulation System Usage**

The simulation system is a core feature for development:

```bash
# Test different scenarios
pnpm sim:journey --skill "Python" --days 7 --detailed
pnpm sim:journey --skill "React" --days 3 --export "journey.json"

# Performance analysis
pnpm sim:performance --iterations 20 --concurrency 5

# Complete flow validation
pnpm test:flows           # End-to-end journey tests
```

The simulation system replaces individual testing for main learning flow services and provides:
- Complete journey validation
- Performance analysis
- OpenAI Codex compatibility
- Rich logging and debugging

## 🦊 **Ski the Fox (Tovi)**

Ski is the AI mascot providing motivational messages. When working with Ski:
- Messages should be encouraging and personalized
- Use appropriate emojis and personality
- Consider user's learning context and progress
- Celebrate achievements and milestones

---

## 📖 **Citation and Documentation Standards**

### **File Citations**
When referencing code changes or files, use format:
- `【F:src/services/llm/chatOrchestrator.service.ts†L45-L60】` for file citations
- Always cite relevant files when discussing architectural decisions
- Prefer file citations over terminal citations unless terminal output is directly relevant

### **Code Documentation**
- **Self-documenting code**: Write clear, readable code that explains itself
- **Minimal comments**: Only comment when logic is truly complex
- **Type annotations**: Always provide explicit types for function parameters and returns
- **Error context**: Include relevant context in error messages and logs

### **File Modification Rules**
For every file you modify, you must:
1. **Follow TypeScript strict mode** - No `any` types without justification
2. **Use project patterns** - Follow existing service/controller/util patterns
3. **Validate with Zod** - All external inputs must be validated
4. **Handle errors gracefully** - Always provide fallbacks and proper error handling
5. **Log appropriately** - Use structured logging with relevant context

## 🔍 **Instruction Precedence**

### **Priority Order (Highest to Lowest)**
1. **Direct user/system instructions** - Explicit task requirements
2. **Security requirements** - Security always takes precedence
3. **Google ecosystem constraints** - Must use Google services when available
4. **This AGENTS.md file** - Project-specific guidelines
5. **Sub-directory AGENTS.md files** - More specific, nested instructions take precedence
6. **General coding best practices** - Standard development practices

### **Conflict Resolution**
When instructions conflict:
- **Security > Functionality** - Never compromise security for features
- **Google Services > Third-party** - Prefer Google ecosystem unless technically impossible
- **Testing Requirements > Speed** - Always run required validation checks
- **User Requirements > Assumptions** - Clarify ambiguous requirements rather than assume

## 🎯 **Core Principles Summary**

**Remember these key priorities when developing:**

1. **🛡️ Security First** - Always consider security implications in every change
2. **🌐 Google Ecosystem** - Prefer Google/Firebase services except for LLM capabilities
3. **🧪 Smart Testing** - Use simulation system for learning flow, individual tests for unique logic
4. **🚀 Codex Compatibility** - Maintain offline development workflow for 80% of development tasks
5. **📊 Performance** - Consider cost implications of OpenAI API and Google Cloud services
6. **🦊 User Experience** - Always prioritize user privacy and personalized learning experience

### **Validation Checklist (Before Completion)**
Before finishing any task, ensure:
- [ ] All required programmatic checks pass
- [ ] Git worktree is clean (`git status`)
- [ ] Changes are committed with descriptive message
- [ ] No sensitive information exposed
- [ ] Google services used where applicable
- [ ] Appropriate tests created or updated
- [ ] Documentation updated if needed

**When in doubt:**
- **Security**: Ask "Is this secure and compliant?"
- **Architecture**: Ask "Can this be done with Google services?"
- **Testing**: Ask "Does this need individual tests or is simulation sufficient?"
- **Performance**: Ask "What's the cost impact of this change?"
- **Validation**: Ask "Have I run all required checks?" 