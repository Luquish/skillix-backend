import { Router } from 'express';
import { analyzeSkillController } from '../controllers/onboarding.controller';

const router = Router();

/**
 * @route   POST /api/onboarding/analyze-skill
 * @desc    Analiza la viabilidad de la habilidad y devuelve el análisis.
 * @access  Public
 */
router.post('/analyze-skill', analyzeSkillController);

export default router;
