import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Importar el router principal de la API (asumiendo que hay un index.ts en api/)
import apiRouter from './api';
import { errorHandler, notFoundHandler } from './utils/errorHandler';
import logger from './utils/logger';

// Cargar variables de entorno
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors()); // Habilita CORS para todas las rutas
app.use(express.json()); // Permite al servidor entender JSON en los bodies de las peticiones

// Ruta de salud para verificar que el servidor está funcionando
app.get('/', (req: Request, res: Response) => {
  res.send('Tovi Backend is up and running! 🦊');
});

// Registrar el router principal de la API
app.use('/api', apiRouter);

// Middleware para rutas no encontradas (404) - debe ir antes del error handler
app.use(notFoundHandler);

// Middleware de manejo de errores global - debe ir al final
app.use(errorHandler);

// Iniciar el servidor
// Start the server and log the startup
app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`);
});

export default app;
