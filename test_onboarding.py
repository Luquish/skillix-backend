import asyncio
import httpx
import json
from datetime import datetime

async def test_onboarding():
    print("\n=== Skillix Onboarding Test ===\n")
    
    # Simular información del usuario
    user_data = {
        "uid": "test_user_" + datetime.now().strftime("%Y%m%d%H%M%S"),
        "name": "Test User",
        "skill": "Python Programming",
        "experience": "Beginner",
        "motivation": "Career opportunities",
        "time": "20 minutes",
        "learning_style": "Reading explanations",
        "goal": "Career growth"
    }
    
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        try:
            # 1. Crear plan inicial
            print("1. Creating learning plan...")
            plan_response = await client.post("/plan", json=user_data)
            plan_data = plan_response.json()
            
            print("\nPlan created successfully!")
            print(f"Course ID: {plan_data['course_id']}")
            print(f"Number of sections: {len(plan_data['roadmap']['sections'])}")
            print("\nFirst day content preview:")
            print(f"Title: {plan_data['first_day']['title']}")
            print(f"Number of blocks: {len(plan_data['first_day']['blocks'])}")
            
            # 2. Simular completar el primer día
            print("\n2. Completing first day...")
            completion_data = {
                "uid": user_data["uid"],
                "course_id": plan_data["course_id"],
                "current_day": 1,
                "completed": True,
                "score": 0.85,
                "feedback": "Really enjoyed the first day!"
            }
            
            day_response = await client.post("/day", json=completion_data)
            next_day_data = day_response.json()
            
            print("\nNext day content received!")
            print(f"Day number: {next_day_data['day_number']}")
            print(f"Title: {next_day_data['content']['title']}")
            print(f"Is last day: {next_day_data['is_last_day']}")
            
            print("\n✅ Onboarding test completed successfully!")
            
        except httpx.RequestError as e:
            print(f"\n❌ Error: {str(e)}")
            print("\nMake sure the server is running with 'uvicorn src.main:app --reload'")
        except Exception as e:
            print(f"\n❌ Error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_onboarding()) 