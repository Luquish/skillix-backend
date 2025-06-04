// src/config/firebaseAdmin.ts
import * as admin from 'firebase-admin';
import { ServiceAccount } from 'firebase-admin';
import { getDataConnect, DataConnect } from 'firebase-admin/data-connect';
import { getConfig } from './index'; 

const logger = console; 
const effectiveConfig = getConfig(); 

let app: admin.app.App;
let dataConnectInstance: DataConnect;

// Initialize Firebase Admin App (ensures default app is available)
if (!admin.apps.length) {
  try {
    const serviceAccountJsonString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    let credential;

    if (serviceAccountJsonString) {
      const serviceAccount = JSON.parse(serviceAccountJsonString) as ServiceAccount;
      credential = admin.credential.cert(serviceAccount);
      logger.info('Firebase Admin SDK: Initializing with FIREBASE_SERVICE_ACCOUNT_JSON environment variable.');
    } else if (effectiveConfig.firebaseServiceAccount) { 
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const serviceAccountFromFile = require(effectiveConfig.firebaseServiceAccount);
      credential = admin.credential.cert(serviceAccountFromFile);
      logger.info(`Firebase Admin SDK: Initializing with service account file from path: ${effectiveConfig.firebaseServiceAccount}`);
    } else {
      credential = admin.credential.applicationDefault();
      logger.info('Firebase Admin SDK: Initializing with Application Default Credentials (ADC).');
    }
    
    // Initialize the default Firebase app
    app = admin.initializeApp({
      credential,
      // databaseURL: effectiveConfig.firebaseDatabaseUrl, 
      // storageBucket: effectiveConfig.firebaseStorageBucket, 
    });
    logger.info('Firebase Admin App initialized successfully (default app).');

  } catch (error: any) {
    logger.error('Firebase Admin SDK: CRITICAL - Failed to initialize app:', error.message, error.stack);
    throw new Error(`Failed to initialize Firebase Admin SDK: ${error.message}`); 
  }
} else {
  app = admin.app(); // Get default app if already initialized
  logger.info('Firebase Admin SDK: Using existing default app.');
}

// Initialize DataConnect - now uses the default app implicitly
try {
  if (!effectiveConfig.dataConnectServiceId) {
    throw new Error('DATA_CONNECT_SERVICE_ID is not configured in config/index.ts (leído de variables de entorno).');
  }
  if (!effectiveConfig.dataConnectLocation) {
    throw new Error('DATA_CONNECT_LOCATION is not configured in config/index.ts (leído de variables de entorno).');
  }

  // This form of getDataConnect uses the default initialized Firebase App
  dataConnectInstance = getDataConnect({ 
    serviceId: effectiveConfig.dataConnectServiceId,
    location: effectiveConfig.dataConnectLocation,
  });
  logger.info(`Firebase Data Connect SDK initialized for service: ${effectiveConfig.dataConnectServiceId} in ${effectiveConfig.dataConnectLocation}`);
  
  if (process.env.DATA_CONNECT_EMULATOR_HOST) {
    logger.info(`Firebase Data Connect: Emulator detected at ${process.env.DATA_CONNECT_EMULATOR_HOST}. The SDK will connect to the emulator.`);
  }

} catch (error: any) {
  logger.error('Firebase Data Connect SDK: CRITICAL - Failed to initialize:', error.message, error.stack);
  throw new Error(`Failed to initialize Firebase Data Connect SDK: ${error.message}`);
}

export { app as firebaseAdminApp, dataConnectInstance as dataConnect };
