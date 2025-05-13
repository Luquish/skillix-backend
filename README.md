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

2. Instalar dependencias:
```bash
pip install -r requirements.txt
```

3. Configurar variables de entorno:
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

## Uso

1. Iniciar el servidor:
```bash
uvicorn src.main:app --reload
```

2. Usar el CLI:
```bash
python src/cli.py --help
```

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