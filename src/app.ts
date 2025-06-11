import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { getConfig } from './config';

// Importar el router principal de la API (asumiendo que hay un index.ts en api/)
import apiRouter from './api';

const config = getConfig();

const app: Application = express();

// Middlewares globales
app.use(cors()); // Habilita CORS para todas las rutas
app.use(express.json()); // Permite al servidor entender JSON en los bodies de las peticiones

// Ruta de salud para verificar que el servidor está funcionando
app.get('/', (req: Request, res: Response) => {
  res.send('Tovi Backend is up and running! 🦊');
});

// Registrar el router principal de la API
app.use('/api', apiRouter);

// Iniciar el servidor
app.listen(config.port, () => {
  console.log(`🦊 Tovi Backend listening on port ${config.port}`);
  if (process.env.NODE_ENV === 'development') {
    console.log(`Local endpoint: http://localhost:${config.port}`);
  }
});

export default app;
