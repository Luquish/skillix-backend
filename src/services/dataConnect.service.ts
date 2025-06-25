/**
 * Este archivo sirve como el punto de entrada principal para todos los servicios
 * relacionados con Data Connect. Re-exporta todas las funciones de los módulos
 * especializados (.queries, .mutations, .complex) para que puedan ser importadas
 * desde un único lugar.
 * 
 * Ejemplo de uso en un controlador:
 * import { getUserByFirebaseUid, createLearningPlan } from '../services/dataConnect.service';
 */

export * from './dataConnect.queries';
export * from './dataConnect.mutations';
export * from './dataConnect.complex'; 