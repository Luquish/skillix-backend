import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import * as DataConnectService from '../services/dataConnect.service';

/**
 * ✅ NUEVO - Obtiene los mensajes de Tovi para una situación específica
 */
export const getToviMessagesController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'User not authenticated.' });
    }

    const { situation } = req.params;

    if (!situation) {
      return res.status(400).json({ message: 'Situation parameter is required.' });
    }

    const toviMessages = await DataConnectService.getToviMessages(user.firebaseUid, situation);

    if (!toviMessages || toviMessages.length === 0) {
      return res.status(404).json({ 
        message: `No Tovi messages found for situation: ${situation}` 
      });
    }

    res.status(200).json({
      message: 'Tovi messages retrieved successfully.',
      situation: situation,
      messages: toviMessages,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in getToviMessagesController:', errorMessage);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * ✅ NUEVO - Obtiene los mensajes de Tovi sin situación específica (query param)
 */
export const getToviMessagesBySituationController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'User not authenticated.' });
    }

    const { situation } = req.query;

    if (!situation || typeof situation !== 'string') {
      return res.status(400).json({ message: 'Situation query parameter is required and must be a string.' });
    }

    const toviMessages = await DataConnectService.getToviMessages(user.firebaseUid, situation);

    if (!toviMessages || toviMessages.length === 0) {
      return res.status(404).json({ 
        message: `No Tovi messages found for situation: ${situation}` 
      });
    }

    res.status(200).json({
      message: 'Tovi messages retrieved successfully.',
      situation: situation,
      messages: toviMessages,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in getToviMessagesBySituationController:', errorMessage);
    res.status(500).json({ message: 'Internal server error.' });
  }
}; 