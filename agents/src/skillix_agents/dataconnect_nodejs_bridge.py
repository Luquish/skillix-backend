"""
Bridge para comunicación con Firebase Data Connect a través de Node.js
"""
import os
import json
import logging
from typing import Dict, Any, Optional, List
import requests
from functools import lru_cache

logger = logging.getLogger(__name__)

class DataConnectNodeBridge:
    """Cliente para el servicio Node.js que maneja Firebase Data Connect"""
    
    def __init__(self):
        self.base_url = os.getenv('DATACONNECT_BRIDGE_URL', 'http://localhost:3001')
        self.api_key = os.getenv('DATACONNECT_API_KEY', 'development-key')
        self.headers = {
            'Content-Type': 'application/json',
            'X-API-Key': self.api_key
        }
        
    def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Dict[str, Any]:
        """Realiza una petición al servicio Node.js"""
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=self.headers, params=data)
            elif method == 'POST':
                response = requests.post(url, headers=self.headers, json=data)
            else:
                raise ValueError(f"Método HTTP no soportado: {method}")
                
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error en petición a {url}: {str(e)}")
            raise
            
    # ==================== QUERIES ====================
    
    def get_user_by_firebase_uid(self, firebase_uid: str) -> Optional[Dict[str, Any]]:
        """Obtiene un usuario por su Firebase UID"""
        return self._make_request('POST', '/query', {
            'queryName': 'GetUserByFirebaseUid',
            'variables': {'firebaseUid': firebase_uid}
        })
        
    def get_user_learning_plan(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Obtiene el plan de aprendizaje completo de un usuario"""
        return self._make_request('POST', '/query', {
            'queryName': 'GetUserLearningPlan',
            'variables': {'userId': user_id}
        })
        
    def get_day_content(self, day_content_id: str) -> Optional[Dict[str, Any]]:
        """Obtiene el contenido completo de un día específico"""
        return self._make_request('POST', '/query', {
            'queryName': 'GetDayContent',
            'variables': {'dayContentId': day_content_id}
        })
        
    def get_user_progress(self, user_id: str) -> List[Dict[str, Any]]:
        """Obtiene el progreso de aprendizaje del usuario"""
        return self._make_request('POST', '/query', {
            'queryName': 'GetUserProgress',
            'variables': {'userId': user_id}
        })
        
    def get_user_analytics(self, user_id: str, start_date: str, end_date: str) -> List[Dict[str, Any]]:
        """Obtiene analytics del usuario en un rango de fechas"""
        return self._make_request('POST', '/query', {
            'queryName': 'GetUserAnalytics',
            'variables': {
                'userId': user_id,
                'startDate': start_date,
                'endDate': end_date
            }
        })
        
    # ==================== MUTATIONS ====================
    
    def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Crea un nuevo usuario"""
        return self._make_request('POST', '/mutation', {
            'mutationName': 'CreateUser',
            'variables': user_data
        })
        
    def create_user_preference(self, preference_data: Dict[str, Any]) -> Dict[str, Any]:
        """Crea las preferencias de un usuario"""
        return self._make_request('POST', '/mutation', {
            'mutationName': 'CreateUserPreference',
            'variables': preference_data
        })
        
    def create_learning_plan(self, user_id: str, plan_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Crea un plan de aprendizaje completo con todas sus relaciones
        
        Args:
            user_id: ID del usuario
            plan_data: Diccionario con skill_analysis, learning_plan y pedagogical_analysis
            
        Returns:
            Dict con el ID del plan creado
        """
        return self._make_request('POST', '/create-learning-plan', {
            'userId': user_id,
            'planData': plan_data
        })
        
    def create_day_content(self, day_content_id: str, content_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Crea el contenido completo de un día con todos sus bloques
        
        Args:
            day_content_id: ID del día
            content_data: Diccionario con objectives, audio_blocks, read_blocks, quiz_blocks, action_tasks
            
        Returns:
            Dict con success: true si se creó correctamente
        """
        return self._make_request('POST', '/create-day-content', {
            'dayContentId': day_content_id,
            'contentData': content_data
        })
        
    def create_enrollment(self, user_id: str, learning_plan_id: str) -> Dict[str, Any]:
        """Crea un enrollment para un usuario en un plan de aprendizaje"""
        return self._make_request('POST', '/mutation', {
            'mutationName': 'CreateEnrollment',
            'variables': {
                'userId': user_id,
                'learningPlanId': learning_plan_id
            }
        })
        
    def update_content_progress(self, progress_data: Dict[str, Any]) -> Dict[str, Any]:
        """Actualiza el progreso en un bloque de contenido"""
        return self._make_request('POST', '/mutation', {
            'mutationName': 'UpdateContentProgress',
            'variables': progress_data
        })
        
    def update_user_analytics(self, analytics_data: Dict[str, Any]) -> Dict[str, Any]:
        """Actualiza las analytics del usuario"""
        return self._make_request('POST', '/mutation', {
            'mutationName': 'UpdateUserAnalytics',
            'variables': analytics_data
        })
        
    def create_adk_session(self, user_id: str, app_name: str, session_id: str) -> Dict[str, Any]:
        """Crea o obtiene una sesión ADK"""
        return self._make_request('POST', '/mutation', {
            'mutationName': 'CreateOrGetAdkSession',
            'variables': {
                'userId': user_id,
                'appName': app_name,
                'sessionId': session_id
            }
        })
        
    def update_adk_session_state(self, session_id: str, state_data: Dict[str, Any]) -> Dict[str, Any]:
        """Actualiza el estado de una sesión ADK"""
        return self._make_request('POST', '/mutation', {
            'mutationName': 'UpdateAdkSessionState',
            'variables': {
                'sessionId': session_id,
                **state_data
            }
        })
        
    def create_adk_message(self, session_id: str, role: str, content: str) -> Dict[str, Any]:
        """Crea un mensaje en una sesión ADK"""
        return self._make_request('POST', '/mutation', {
            'mutationName': 'CreateAdkMessage',
            'variables': {
                'sessionId': session_id,
                'role': role,
                'content': content
            }
        })
        
    # ==================== UTILIDADES ====================
    
    def health_check(self) -> bool:
        """Verifica si el servicio Node.js está funcionando"""
        try:
            response = self._make_request('GET', '/health', {})
            return response.get('status') == 'ok'
        except:
            return False
            
    def get_schema_info(self) -> Dict[str, Any]:
        """Obtiene información sobre el esquema de la base de datos"""
        return self._make_request('GET', '/schema-info', {})

# Singleton para usar en toda la aplicación
_bridge_instance = None

def get_dataconnect_bridge() -> DataConnectNodeBridge:
    """Obtiene la instancia singleton del bridge"""
    global _bridge_instance
    if _bridge_instance is None:
        _bridge_instance = DataConnectNodeBridge()
    return _bridge_instance 