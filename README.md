# Skillix Backend - Plataforma de Aprendizaje Personalizado

## Descripción
Skillix es una plataforma de aprendizaje personalizado que utiliza IA para crear planes de estudio adaptados a las necesidades y preferencias de cada usuario. El sistema genera contenido dinámico y mantiene un seguimiento del progreso del usuario.

## Variables de Entorno

El sistema requiere las siguientes variables de entorno:

```bash
# OpenAI API
OPENAI_API_KEY=tu-api-key                # API Key de OpenAI
OPENAI_MODEL=gpt-4o-mini                 # Modelo de OpenAI para generación de contenido
OPENAI_EMBEDDING_MODEL=text-embedding-3-small  # Modelo para embeddings

# Almacenamiento
STORAGE_PATH=storage                      # Ruta para almacenamiento local
```

Para configurar:
1. Copia el archivo `.env.example` a `.env`
2. Reemplaza los valores con tus propias credenciales
3. Asegúrate de no compartir tu archivo `.env` (está incluido en .gitignore)

## Arquitectura

### Estructura de Almacenamiento
```
storage/
├── users/
│   └── email@ejemplo.com/
│       ├── user.json         (datos básicos + auth)
│       └── courses/
│           └── nombre-curso/
│               ├── preferences.json  (preferencias del curso)
│               ├── roadmap.json     (plan completo)
│               └── days/            (contenido diario)
├── courses/                  (roadmaps compartidos)
└── embeddings/              (vectores de similitud)
```

### Componentes Principales

#### 1. Sistema de Autenticación
- Utiliza email como identificador único
- Almacenamiento seguro con hash de contraseñas (bcrypt)
- Separación clara entre datos de usuario y datos de curso

#### 2. Gestión de Cursos
- Generación de ID único para cada curso
- Sistema de embeddings para detectar cursos similares
- Versionado de contenido por día
- Estructura modular para contenido y preferencias

#### 3. CLI Interactivo
Comandos principales:
- `signup`: Registro de nuevos usuarios
- `login`: Inicio de sesión
- `create-course`: Creación de curso personalizado
- `status`: Verificación de estado de sesión

### Flujo de Creación de Curso

1. **Onboarding**
   - Recolección de preferencias del usuario
   - Validación de datos
   - Generación de ID único del curso

2. **Generación de Plan**
   - Análisis de preferencias
   - Creación de roadmap personalizado
   - Estructuración en secciones y días

3. **Generación de Contenido**
   - Creación dinámica de contenido diario
   - Sistema de puntos y recompensas (XP)
   - Seguimiento de progreso

### Modelos de Datos

#### UserPreferences
```python
{
    "name": str,
    "skill": str,
    "experience": str,
    "motivation": str,
    "time": str,
    "learning_style": str,
    "goal": str
}
```

#### Enrollment
```python
{
    "roadmap_json": dict,
    "last_generated_day": int,
    "streak": int,
    "xp_total": int,
    "days": Dict[int, EnrollmentDay]
}
```

## Dependencias Principales
- `passlib[bcrypt]`: Hash seguro de contraseñas
- `click`: Interfaz de línea de comandos
- `rich`: Formato mejorado de CLI
- `requests`: Llamadas HTTP
- `fastapi`: API REST
- `pydantic`: Validación de datos

## Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/tu-usuario/skillix-backend.git
cd skillix-backend
```

2. Crear y activar un entorno virtual:
```bash
python3 -m venv venv
source venv/bin/activate
```
> **IMPORTANTE**: Siempre debes activar el entorno virtual (`source venv/bin/activate`) antes de ejecutar cualquier comando del proyecto.

3. Instalar dependencias:
```bash
pip install -r requirements.txt
```

4. Configurar variables de entorno:
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

## Uso

1. Activar el entorno virtual (si aún no está activado):
```bash
source venv/bin/activate
```

2. Iniciar el servidor:
```bash
uvicorn src.main:app --reload
```

3. Usar el CLI:
```bash
python src/cli.py --help
```

## Guía Detallada del CLI

El CLI de Skillix permite interactuar con la plataforma desde la terminal. A continuación se detallan los comandos disponibles:

### Registro de Usuario
```bash
python src/cli.py signup
```
Este comando solicitará:
- Email
- Nombre
- Contraseña
- Confirmación de contraseña

### Inicio de Sesión
```bash
python src/cli.py login
```
Este comando solicitará:
- Email
- Contraseña

Una vez iniciada la sesión, se guardará en `~/.skillix/session.json`.

### Verificar Estado de Sesión
```bash
python src/cli.py status
```
Muestra información del usuario actualmente conectado o indica que no hay sesión activa.

### Cerrar Sesión
```bash
python src/cli.py logout
```
Elimina la sesión actual.

### Crear Curso Personalizado
```bash
python src/cli.py create-course
```
Este comando guiará al usuario a través de un proceso interactivo para crear un curso personalizado:
1. Habilidad a aprender
2. Nivel de experiencia (beginner, intermediate, advanced)
3. Tiempo disponible (5min, 10min, 15min, 20min)
4. Estilo de aprendizaje (visual, reading, interactive)
5. Motivación
6. Objetivo específico

El sistema generará un plan de aprendizaje personalizado y mostrará:
- Descripción general del curso
- Secciones y días del curso
- Contenido del primer día

## Ejemplos de cURL para API

A continuación se muestran ejemplos de cómo interactuar con la API de Skillix usando cURL:

### Registro de Usuario
```bash
curl -X POST http://localhost:8000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@ejemplo.com",
    "name": "Nombre Usuario",
    "password": "contraseña123"
  }'
```

**Campos requeridos:**
- `email`: Correo electrónico del usuario (único)
- `name`: Nombre completo del usuario
- `password`: Contraseña para la cuenta

### Inicio de Sesión
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@ejemplo.com",
    "password": "contraseña123"
  }'
```

**Campos requeridos:**
- `email`: Correo electrónico registrado
- `password`: Contraseña asociada al correo

### Datos del Usuario Actual
```bash
curl -X GET http://localhost:8000/auth/me?email=usuario@ejemplo.com
```

**Parámetros de consulta requeridos:**
- `email`: Correo electrónico del usuario

### Crear Plan de Aprendizaje
```bash
curl -X POST http://localhost:8000/api/plan \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@ejemplo.com",
    "name": "Nombre Usuario",
    "skill": "programación python",
    "experience": "beginner",
    "motivation": "desarrollo profesional",
    "time": "10min",
    "learning_style": "visual",
    "goal": "crear aplicaciones web"
  }'
```

**Campos requeridos:**
- `email`: Correo electrónico del usuario
- `name`: Nombre del usuario
- `skill`: Habilidad que desea aprender
- `experience`: Nivel de experiencia (`beginner`, `intermediate` o `advanced`)
- `motivation`: Motivación para aprender
- `time`: Tiempo disponible por día (`5min`, `10min`, `15min` o `20min`)
- `learning_style`: Estilo de aprendizaje preferido (`visual`, `reading` o `interactive`)
- `goal`: Objetivo específico del aprendizaje

### Obtener Siguiente Día
```bash
curl -X POST http://localhost:8000/api/day \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@ejemplo.com",
    "course_id": "programacion-python",
    "current_day": 1,
    "completed": true,
    "score": 85.5,
    "feedback": "Me gustó mucho el contenido, fue muy claro"
  }'
```

**Campos requeridos:**
- `email`: Correo electrónico del usuario
- `course_id`: Identificador del curso (generalmente el nombre del skill con guiones)
- `current_day`: Número del día actual completado
- `completed`: Debe ser `true` para avanzar al siguiente día
- `score`: (Opcional) Puntuación obtenida en el día actual
- `feedback`: (Opcional) Comentarios sobre el contenido del día

**Nota importante:** Al crear un curso mediante el CLI o la API, el sistema genera automáticamente un `course_id` basado en el nombre de la habilidad (convertido a minúsculas y con espacios reemplazados por guiones). Por ejemplo, para la habilidad "Programación Python", el `course_id` sería "programacion-python".

## Características Avanzadas

### Sistema de Similitud de Cursos
- Utiliza embeddings de OpenAI para detectar cursos similares
- Permite reutilización eficiente de contenido
- Umbral de similitud configurable

### Versionado de Contenido
- Cada día tiene un sistema de versiones
- Permite actualizaciones sin perder historial
- Mantiene consistencia entre usuarios

### Sistema de Progreso
- Seguimiento de streak diario
- Sistema de XP por actividad
- Retroalimentación personalizada

## Contribución
1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia
Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE.md](LICENSE.md) para más detalles. 