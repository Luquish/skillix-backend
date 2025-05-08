import sys, json
from datetime import datetime
from agentes.orchestrator import orchestrate_course_creation

def datetime_handler(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f'Object of type {type(obj)} is not JSON serializable')

async def main():
    if len(sys.argv) < 2:
        print("Uso: python src/main.py \"<qué quiero aprender>\"")
        sys.exit(1)

    print("\n=== Iniciando Generación de Curso ===")
    topic = sys.argv[1]
    print(f"📚 Tema solicitado: {topic}")
    
    # Metadata básica inicial
    metadata = {
        "title": topic,
        "description": f"Curso sobre {topic}",
        "level": "beginner",
        "tags": [topic.lower()],
        "canonical": False
    }
    print("📋 Metadata inicial configurada:")
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