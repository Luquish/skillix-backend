import { Router } from 'express';
import onboardingRoutes from './onboarding.routes';
import learningPlanRoutes from './learningPlan.routes';
import authRoutes from './auth.routes';
// Importa aquí las otras rutas a medida que las crees
// import chatRoutes from './chat.routes';
// import contentRoutes from './content.routes';

const router = Router();

// Rutas de la API
router.use('/auth', authRoutes);
router.get('/health', (req, res) => res.status(200).send('OK'));
router.use('/onboarding', onboardingRoutes);
router.use('/learning-plan', learningPlanRoutes);
// router.use('/chat', chatRoutes);
// router.use('/content', contentRoutes);


export default router;
