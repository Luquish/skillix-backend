import sys
import json
from datetime import datetime
from .agentes.planner import generate_learning_plan

def get_user_input() -> dict:
    """Gets all required information from the user."""
    print("\n=== Skill Learning Journey Creator ===")
    
    # Get name
    name = input("\n👋 What's your name? ")
    
    # Get skill
    skill = input("\n📚 What skill would you like to learn? ")
    
    # Get experience level
    print("\n📊 What's your experience level?")
    print("1 - Beginner")
    print("2 - Intermediate")
    print("3 - Advanced")
    while True:
        try:
            level = int(input("\nYour selection (1/2/3): "))
            if level in [1, 2, 3]:
                experience = ["Beginner", "Intermediate", "Advanced"][level-1]
                break
        except ValueError:
            pass
        print("\n❌ Invalid option. Please select 1, 2, or 3.")

    # Get motivation
    print("\n🎯 Why do you want to learn this skill?")
    print("1 - Personal growth")
    print("2 - Curiosity")
    print("3 - Career opportunities")
    print("4 - School")
    print("5 - Other")
    while True:
        try:
            mot = int(input("\nYour selection (1-5): "))
            if mot in range(1,6):
                motivations = ["Personal growth", "Curiosity", "Career opportunities", "School", "Other"]
                motivation = motivations[mot-1]
                break
        except ValueError:
            pass
        print("\n❌ Invalid option. Please select a number between 1 and 5.")

    # Get daily time commitment
    print("\n⏰ How much time can you dedicate per day?")
    print("1 - 5 minutes")
    print("2 - 10 minutes")
    print("3 - 20 minutes")
    print("4 - 30+ minutes")
    while True:
        try:
            t = int(input("\nYour selection (1-4): "))
            if t in range(1,5):
                times = ["5 minutes", "10 minutes", "20 minutes", "30+ minutes"]
                time = times[t-1]
                break
        except ValueError:
            pass
        print("\n❌ Invalid option. Please select a number between 1 and 4.")

    # Get learning style preference
    print("\n📖 How do you learn best?")
    print("1 - Short daily tasks")
    print("2 - Flashcards & Quizzes")
    print("3 - Reading explanations")
    print("4 - Audio-based lessons")
    while True:
        try:
            style = int(input("\nYour selection (1-4): "))
            if style in range(1,5):
                styles = ["Short daily tasks", "Flashcards & Quizzes", "Reading explanations", "Audio-based lessons"]
                learning_style = styles[style-1]
                break
        except ValueError:
            pass
        print("\n❌ Invalid option. Please select a number between 1 and 4.")

    # Get learning goal
    print("\n🎯 What's your goal with this skill?")
    print("1 - Career growth")
    print("2 - Hobby")
    print("3 - School")
    print("4 - Personal project")
    print("5 - Other")
    while True:
        try:
            g = int(input("\nYour selection (1-5): "))
            if g in range(1,6):
                goals = ["Career growth", "Hobby", "School", "Personal project", "Other"]
                goal = goals[g-1]
                break
        except ValueError:
            pass
        print("\n❌ Invalid option. Please select a number between 1 and 5.")

    return {
        "name": name,
        "skill": skill,
        "experience": experience,
        "motivation": motivation,
        "time": time,
        "learning_style": learning_style,
        "goal": goal
    }

async def main():
    # Get user input
    user_data = get_user_input()
    
    print(f"\n=== Creating Your Learning Journey ===")
    print(f"👤 Name: {user_data['name']}")
    print(f"📚 Skill: {user_data['skill']}")
    print(f"📊 Experience: {user_data['experience']}")
    print(f"🎯 Motivation: {user_data['motivation']}")
    print(f"⏰ Daily time: {user_data['time']}")
    print(f"📖 Learning style: {user_data['learning_style']}")
    print(f"🎯 Goal: {user_data['goal']}")
    
    print("\n🔄 Creating your personalized learning plan...")
    result = await generate_learning_plan(user_data)
    
    if result:
        print("\n✅ Learning plan generated successfully!")
        print("\n📝 Your personalized learning journey:")
        plan_dict = result.model_dump()
        print(json.dumps(plan_dict, ensure_ascii=False, indent=2, default=lambda x: x.isoformat() if isinstance(x, datetime) else str(x)))
    else:
        print("\n❌ Error: Could not generate the learning plan")
        sys.exit(1)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main()) 