// src/config/firebaseAdmin.ts
import * as admin from 'firebase-admin';
import { DataConnect, getDataConnect } from 'firebase-admin/data-connect';
import { getConfig } from './index';
import * as path from 'path';

const config = getConfig();
let dataConnectInstance: DataConnect | null = null;

// --- CONSTANTES DE CONFIGURACIÓN ---
const IS_EMULATOR = process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.NODE_ENV === 'test';

// El ID del servicio DEBE coincidir con el 'serviceId' en dataconnect.yaml
const DATA_CONNECT_SERVICE_ID = 'skillix-db-service';
const DATA_CONNECT_LOCATION = 'us-central1'; // O la región que uses

function initialize() {
  if (admin.apps.length === 0) {
    // Si no hay app, la inicializamos
    try {
      const serviceAccountPath = path.resolve(process.cwd(), config.firebaseServiceAccountPath);
      console.log(`Firebase Admin SDK: Initializing with service account file from path: ${serviceAccountPath}`);
      const credential = admin.credential.cert(serviceAccountPath);
      admin.initializeApp({ credential });
      console.log('Firebase Admin App initialized successfully (default app).');
    } catch (error: any) {
      console.error(`CRITICAL: Failed to initialize Firebase Admin SDK. Error: ${error.message}`);
      return; // No continuar si falla la inicialización de admin
    }
  }

  // Una vez que la app de admin está garantizada, inicializamos DataConnect si no lo hemos hecho ya.
  if (!dataConnectInstance) {
    try {
      dataConnectInstance = getDataConnect({
        serviceId: DATA_CONNECT_SERVICE_ID,
        location: DATA_CONNECT_LOCATION,
      });
      console.log(`Firebase Data Connect SDK initialized for service: ${DATA_CONNECT_SERVICE_ID} in ${DATA_CONNECT_LOCATION}`);
      if (IS_EMULATOR) {
        console.log(`Firebase Data Connect: Emulator detected. The SDK will connect to the emulator.`);
      }
    } catch (error: any) {
      console.error('Failed to initialize Firebase Data Connect SDK:', error);
    }
  }
}

initialize();

export function getDb(): DataConnect {
  if (!dataConnectInstance) {
    throw new Error('DataConnect instance has not been initialized. Check Firebase Admin SDK setup.');
  }
  return dataConnectInstance;
}

export { admin };
