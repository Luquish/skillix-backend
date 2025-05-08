import sys, json
from datetime import datetime
from agentes.orchestrator import orchestrate_course_creation

def datetime_handler(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f'Object of type {type(obj)} is not JSON serializable')

def get_level_from_key(key: str) -> str:
    """Convierte la tecla presionada en un nivel de dificultad."""
    level_map = {
        'p': 'beginner',
        'i': 'intermediate',
        'a': 'advanced'
    }
    return level_map.get(key.lower(), 'beginner')

def get_user_input() -> tuple[str, str]:
    """Obtiene el tema y nivel del curso del usuario."""
    # Solicitar tema
    print("\n=== Generador de Cursos ===")
    topic = input("\n📚 ¿Qué tema te gustaría aprender? ")
    
    # Solicitar nivel
    while True:
        print("\n📊 Selecciona el nivel de dificultad:")
        print("p - Principiante")
        print("i - Intermedio")
        print("a - Avanzado")
        level_key = input("\nTu selección (p/i/a): ")
        
        if level_key.lower() in ['p', 'i', 'a']:
            return topic, get_level_from_key(level_key)
        else:
            print("\n❌ Opción no válida. Por favor, selecciona 'p', 'i' o 'a'.")

async def main():
    # Obtener input del usuario
    topic, level = get_user_input()
    
    print(f"\n=== Iniciando Generación de Curso ===")
    print(f"📚 Tema solicitado: {topic}")
    print(f"📊 Nivel seleccionado: {level}")
    
    # Metadata básica inicial
    metadata = {
        "title": topic,
        "description": f"Curso sobre {topic}",
        "level": level,
        "tags": [topic.lower()],
        "canonical": False
    }
    print("\n📋 Metadata inicial configurada:")
    print(json.dumps(metadata, ensure_ascii=False, indent=2))
    
    print("\n🔄 Iniciando proceso de orquestación...")
    result = await orchestrate_course_creation(topic, metadata)
    if result:
        print("\n✅ Curso generado exitosamente!")
        print("\n📝 Contenido del curso:")
        course_dict = result.course.model_dump()
        print(json.dumps(course_dict, ensure_ascii=False, indent=2, default=datetime_handler))
    else:
        print("\n❌ Error: No se pudo generar el curso")
        sys.exit(1)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())