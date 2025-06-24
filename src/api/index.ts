import { Router } from 'express';
import onboardingRoutes from './onboarding.routes';
import learningPlanRoutes from './learningPlan.routes';
import authRoutes from './auth.routes';
import contentRoutes from './content.routes';
import userRoutes from './user.routes';
import toviRoutes from './tovi.routes';
import chatRoutes from './chat.routes';

const router = Router();

// Rutas de la API
router.use('/auth', authRoutes);
router.get('/health', (req, res) => res.status(200).send('OK'));
router.use('/onboarding', onboardingRoutes);
router.use('/learning-plan', learningPlanRoutes);
router.use('/user', userRoutes);
// router.use('/chat', chatRoutes);
router.use('/content', contentRoutes);
router.use('/tovi', toviRoutes);
router.use('/chat', chatRoutes);

export default router;
