import { Router } from 'express';
import { analyzeSkillController } from '../controllers/onboarding.controller';
import { asyncHandler } from '../utils/errorHandler';

const router = Router();

/**
 * @route   POST /api/onboarding/analyze-skill
 * @desc    Analiza la viabilidad de la habilidad y devuelve el análisis.
 * @access  Public
 */
router.post('/analyze-skill', asyncHandler(analyzeSkillController));

export default router;
