import sys, json
from utils.logger import logger
from agents.planner import generate_course

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python src/main.py \"<qué quiero aprender>\"")
        sys.exit(1)

    prompt = sys.argv[1]
    try:
        course = generate_course(prompt)
        print(json.dumps(course, ensure_ascii=False, indent=2))
    except Exception as e:
        logger.error("failed", error=str(e))
        sys.exit(2)