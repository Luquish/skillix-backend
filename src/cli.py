import click
import requests
import json
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import print as rprint
import os
from pathlib import Path

console = Console()

BASE_URL = "http://localhost:8000"
current_user = None
SESSION_FILE = Path.home() / ".skillix" / "session.json"

def load_session():
    global current_user
    try:
        if SESSION_FILE.exists():
            with open(SESSION_FILE) as f:
                current_user = json.load(f)
    except Exception:
        current_user = None

def save_session():
    global current_user
    try:
        SESSION_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(SESSION_FILE, "w") as f:
            json.dump(current_user, f)
    except Exception as e:
        print_error(f"Error guardando sesión: {str(e)}")

def clear_session():
    global current_user
    current_user = None
    if SESSION_FILE.exists():
        SESSION_FILE.unlink()

# Cargar sesión al inicio
load_session()

def print_error(message):
    console.print(f"[red]Error: {message}[/red]")

def print_success(message):
    console.print(f"[green]{message}[/green]")

def validate_email(value):
    if "@" not in value:
        raise click.BadParameter("El email debe contener @")
    return value

@click.group()
def cli():
    """CLI para Skillix - Plataforma de Aprendizaje Personalizado"""
    pass

@cli.command()
def signup():
    """Registrar un nuevo usuario"""
    console.print("[bold blue]Registro de Usuario[/bold blue]")
    
    email = click.prompt("Email", type=str, value_proc=validate_email)
    name = click.prompt("Nombre", type=str)
    password = click.prompt("Contraseña", type=str, hide_input=True)
    password_confirm = click.prompt("Confirmar Contraseña", type=str, hide_input=True)
    
    if password != password_confirm:
        print_error("Las contraseñas no coinciden")
        return
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/signup",
            json={
                "email": email,
                "name": name,
                "password": password
            }
        )
        
        if response.status_code == 200:
            print_success("Usuario registrado exitosamente!")
            user_data = response.json()
            console.print(Panel.fit(
                f"Email: {user_data['email']}\nNombre: {user_data['name']}\nCreado: {user_data['created_at']}",
                title="Datos del Usuario"
            ))
        else:
            print_error(response.json()["detail"])
            
    except requests.exceptions.ConnectionError:
        print_error("No se pudo conectar al servidor. Asegúrate de que esté corriendo.")

@cli.command()
def login():
    """Iniciar sesión"""
    global current_user
    
    console.print("[bold blue]Inicio de Sesión[/bold blue]")
    
    email = click.prompt("Email", type=str)
    password = click.prompt("Contraseña", type=str, hide_input=True)
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={
                "email": email,
                "password": password
            }
        )
        
        if response.status_code == 200:
            current_user = response.json()
            save_session()  # Guardar sesión
            print_success("Sesión iniciada correctamente!")
            console.print(Panel.fit(
                f"Email: {current_user['email']}\nNombre: {current_user['name']}",
                title="Usuario Conectado"
            ))
        else:
            print_error(response.json()["detail"])
            
    except requests.exceptions.ConnectionError:
        print_error("No se pudo conectar al servidor. Asegúrate de que esté corriendo.")

@cli.command()
def logout():
    """Cerrar sesión"""
    global current_user
    if current_user:
        clear_session()
        print_success("Sesión cerrada correctamente")
    else:
        print_error("No hay sesión activa")

@cli.command()
def create_course():
    """Crear un nuevo curso personalizado"""
    if not current_user:
        print_error("Debes iniciar sesión primero")
        return
    
    console.print("[bold blue]Creación de Curso Personalizado[/bold blue]")
    
    # Opciones predefinidas
    experience_levels = ["beginner", "intermediate", "advanced"]
    time_options = ["5min", "10min", "15min", "20min"]
    learning_styles = ["visual", "reading", "interactive"]
    
    # Recopilar información
    skill = click.prompt("¿Qué habilidad quieres aprender?", type=str)
    
    experience = click.prompt(
        "Nivel de experiencia",
        type=click.Choice(experience_levels),
        default="beginner"
    )
    
    time = click.prompt(
        "Tiempo disponible por día",
        type=click.Choice(time_options),
        default="10min"
    )
    
    learning_style = click.prompt(
        "Estilo de aprendizaje preferido",
        type=click.Choice(learning_styles),
        default="visual"
    )
    
    motivation = click.prompt("¿Cuál es tu motivación para aprender esto?", type=str)
    goal = click.prompt("¿Cuál es tu objetivo específico?", type=str)
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/plan",
            json={
                "email": current_user["email"],
                "skill": skill,
                "experience": experience,
                "motivation": motivation,
                "time": time,
                "learning_style": learning_style,
                "goal": goal
            }
        )
        
        if response.status_code == 200:
            course_data = response.json()
            print_success("¡Curso creado exitosamente!")
            
            # Mostrar información del roadmap
            roadmap = course_data["roadmap"]
            console.print("\n[bold]Plan de Aprendizaje:[/bold]")
            console.print(Panel.fit(roadmap["overview"], title="Descripción General"))
            
            # Mostrar secciones en una tabla
            table = Table(title="Secciones del Curso")
            table.add_column("Sección", style="cyan")
            table.add_column("Días", style="magenta")
            
            for section in roadmap["sections"]:
                days_info = "\n".join([f"• {day['title']}" for day in section["days"]])
                table.add_row(section["title"], days_info)
            
            console.print(table)
            
            # Mostrar primer día
            first_day = course_data["first_day"]
            console.print("\n[bold]Primer Día:[/bold]")
            console.print(Panel.fit(
                f"Título: {first_day['title']}\nBloques: {len(first_day['blocks'])} actividades",
                title="Contenido del Día 1"
            ))
            
        else:
            print_error(response.json()["detail"])
            
    except requests.exceptions.ConnectionError:
        print_error("No se pudo conectar al servidor. Asegúrate de que esté corriendo.")

@cli.command()
def status():
    """Ver estado actual de la sesión"""
    if current_user:
        console.print(Panel.fit(
            f"Email: {current_user['email']}\nNombre: {current_user['name']}",
            title="Usuario Conectado"
        ))
    else:
        console.print("[yellow]No hay sesión activa[/yellow]")

if __name__ == "__main__":
    cli() 