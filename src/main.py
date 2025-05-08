import sys, json
from agentes.orchestrator import orchestrate_course_creation

async def main():
    if len(sys.argv) < 2:
        print("Uso: python src/main.py \"<qué quiero aprender>\"")
        sys.exit(1)

    topic = sys.argv[1]
    # Metadata básica inicial
    metadata = {
        "title": topic,
        "description": f"Curso sobre {topic}",
        "level": "beginner",
        "tags": [topic.lower()],
        "canonical": False
    }
    
    result = await orchestrate_course_creation(topic, metadata)
    if result:
        print(json.dumps(result.course.dict(), ensure_ascii=False, indent=2))
    else:
        print("Error: No se pudo generar el curso")
        sys.exit(1)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())