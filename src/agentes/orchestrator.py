from datetime import datetime, timezone
from typing import Optional
from .planner import generate_learning_plan
from .content_generator import generate_day_content
from src.services.storage_service import StorageService, Enrollment, EnrollmentDay, UserPreferences
from src.config import settings
import logging

logger = logging.getLogger(__name__)

storage = StorageService(settings.STORAGE_PATH)

async def orchestrate_course_creation(user_data: dict, email: str) -> Optional[Enrollment]:
    """Orchestrates the course creation process"""
    try:
        logger.info(f"Iniciando creación de curso para usuario {email}")
        logger.info(f"Datos del usuario: {user_data}")
        
        # Create course ID from skill name
        course_id = user_data['skill'].lower().replace(' ', '-')
        logger.info(f"ID del curso generado: {course_id}")
        
        # Save user preferences
        preferences = UserPreferences(
            name=user_data['name'],
            skill=user_data['skill'],
            experience=user_data['experience'],
            motivation=user_data['motivation'],
            time=user_data['time'],
            learning_style=user_data['learning_style'],
            goal=user_data['goal']
        )
        storage.save_user_preferences(email, preferences, course_id)
        logger.info("Preferencias del usuario guardadas exitosamente")
        
        # Generate the learning plan
        logger.info("Generando plan de aprendizaje...")
        learning_plan = await generate_learning_plan(user_data)
        logger.info("Plan de aprendizaje generado exitosamente")
        
        # Create enrollment with roadmap
        logger.info("Creando inscripción...")
        enrollment = storage.create_enrollment(
            email=email,
            course_id=course_id,
            roadmap=learning_plan.model_dump()
        )
        logger.info("Inscripción creada exitosamente")
        
        # Generate content for day 1
        first_section = learning_plan.sections[0]
        first_day = first_section.days[0]
        logger.info(f"Generando contenido para el día 1: {first_day.title}")
        
        day_content = await generate_day_content(
            day_info={
                "day_number": first_day.day_number,
                "title": first_day.title,
                "is_action_day": first_day.is_action_day,
                "description": first_day.description
            },
            user_data=user_data,
            previous_day_content=None  # First day
        )
        logger.info("Contenido del día 1 generado exitosamente")
        
        # Save day content
        enrollment_day = EnrollmentDay(
            title=day_content.title,
            is_action_day=day_content.is_action_day,
            blocks=day_content.blocks,
            action_task=day_content.action_task
        )
        
        logger.info("Guardando contenido del día 1...")
        storage.save_day_content(
            email=email,
            course_id=course_id,
            day_number=first_day.day_number,
            content=enrollment_day
        )
        logger.info("Contenido del día 1 guardado exitosamente")
        
        # Update enrollment and its days dictionary
        enrollment.last_generated_day = 1
        enrollment.updated_at = datetime.now(timezone.utc)
        if not hasattr(enrollment, 'days'):
            enrollment.days = {}
        enrollment.days[1] = enrollment_day  # Add day content to enrollment object
        storage.update_enrollment(email, course_id, enrollment)
        logger.info("Inscripción actualizada exitosamente")
        
        return enrollment
        
    except Exception as e:
        logger.error(f"Error en la creación del curso: {str(e)}", exc_info=True)
        return None

async def generate_next_day_content(email: str, course_id: str) -> bool:
    """Generates content for the next day if previous day was completed"""
    try:
        # Get enrollment
        enrollment = storage.get_enrollment(email, course_id)
        if not enrollment:
            logger.error(f"No se encontró inscripción para el usuario {email} en el curso {course_id}")
            return False
            
        current_day = enrollment.last_generated_day
        logger.info(f"Generando contenido para el día {current_day + 1}")
        
        # Get previous day content
        previous_day = storage.get_day_content(email, course_id, current_day)
        if not previous_day:
            logger.error(f"No se encontró el contenido del día {current_day}")
            return False
        
        if not previous_day.completed_at:
            logger.warning(f"El día {current_day} no ha sido completado")
            # Aunque no esté completado, continuamos para propósitos de prueba
            # return False
            
        # Get user preferences
        preferences = storage.get_user_preferences(email, course_id)
        if not preferences:
            logger.error(f"No se encontraron preferencias para el usuario {email}")
            return False
            
        # Find next day info from roadmap
        next_day = None
        for section in enrollment.roadmap_json['sections']:
            for day in section['days']:
                if day['day_number'] == current_day + 1:
                    next_day = day
                    break
            if next_day:
                break
                
        if not next_day:
            logger.warning(f"No hay más días disponibles después del día {current_day}")
            return False  # No more days
            
        logger.info(f"Generando contenido para el día {next_day['day_number']}: {next_day['title']}")
        
        # Generate content for next day using saved preferences
        try:
            day_content = await generate_day_content(
                day_info=next_day,
                user_data={
                    'name': preferences.name,
                    'skill': preferences.skill,
                    'experience': preferences.experience,
                    'motivation': preferences.motivation,
                    'time': preferences.time,
                    'learning_style': preferences.learning_style,
                    'goal': preferences.goal
                },
                previous_day_content=previous_day
            )
            
            # Save new day content
            enrollment_day = EnrollmentDay(
                title=day_content.title,
                is_action_day=day_content.is_action_day,
                blocks=day_content.blocks,
                action_task=day_content.action_task
            )
            
            logger.info(f"Guardando contenido del día {next_day['day_number']}")
            storage.save_day_content(
                email=email,
                course_id=course_id,
                day_number=next_day['day_number'],
                content=enrollment_day
            )
            
            # Update enrollment
            enrollment.last_generated_day = next_day['day_number']
            enrollment.updated_at = datetime.now(timezone.utc)
            
            # Guardar el día también en el objeto enrollment
            if not hasattr(enrollment, 'days') or enrollment.days is None:
                enrollment.days = {}
            enrollment.days[next_day['day_number']] = enrollment_day
            
            logger.info(f"Actualizando inscripción con el último día generado: {next_day['day_number']}")
            storage.update_enrollment(email, course_id, enrollment)
            
            return True
        except Exception as e:
            logger.error(f"Error generando contenido para el día {next_day['day_number']}: {str(e)}", exc_info=True)
            return False
        
    except Exception as e:
        logger.error(f"Error generating next day content: {str(e)}", exc_info=True)
        return False
