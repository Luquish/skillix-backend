# Test Logs - Sistema de Logging para Tests

Este directorio contiene los logs automáticos de los tests para análisis posterior y debugging.

## 📋 Propósito

Los logs de tests se guardan automáticamente para:
- **Debugging**: Analizar errores y fallos en tests
- **AI Analysis**: Permitir que OpenAI Codex pueda leer los resultados sin ejecutar tests
- **Historial**: Mantener un registro de resultados de tests para comparación
- **CI/CD**: Facilitar análisis de tests en pipelines de integración continua

## 🚀 Uso Rápido

### Métodos disponibles:

#### 1. Scripts de npm (recomendado)
```bash
# Tests E2E con logs automáticos
npm run test:e2e:log

# Tests unitarios con logs
npm run test:log

# Tests en modo debug
npm run test:debug
```

#### 2. Script personalizado
```bash
# Ejecutar tests E2E
./scripts/test-logger.sh e2e

# Ejecutar tests unitarios
./scripts/test-logger.sh unit

# Ejecutar tests en modo debug
./scripts/test-logger.sh debug

# Ver logs disponibles
./scripts/test-logger.sh show

# Ver el log más reciente
./scripts/test-logger.sh latest

# Limpiar todos los logs
./scripts/test-logger.sh clean
```

## 📁 Estructura de Archivos

Los logs se guardan con la siguiente nomenclatura:
```
test-logs/
├── e2e-YYYYMMDD-HHMMSS.log      # Logs de tests E2E
├── unit-YYYYMMDD-HHMMSS.log     # Logs de tests unitarios
├── debug-YYYYMMDD-HHMMSS.log    # Logs de tests en modo debug
└── jest-YYYYMMDD-HHMMSS.log     # Logs directos de Jest
```

## 🔧 Características

- **Auto-timestamp**: Cada log tiene fecha y hora únicas
- **Auto-cleanup**: Se mantienen solo los últimos 10 logs de cada tipo
- **Verbose output**: Logs detallados para mejor análisis
- **Dual output**: Los logs se muestran en consola Y se guardan en archivo
- **Git ignored**: Los logs no se suben al repositorio

## 🤖 Para OpenAI/Codex

Los logs contienen información detallada sobre:
- ✅ Tests que pasan
- ❌ Tests que fallan con stack traces completos
- 📊 Estadísticas de ejecución
- 🔍 Output de console.log/console.error del código
- 🏗️ Información de setup y teardown
- 📡 Respuestas de APIs y servicios externos

### Ejemplo de análisis de log:
```bash
# Ver el último log para análisis
./scripts/test-logger.sh latest

# O leer directamente el archivo más reciente
ls -t test-logs/*.log | head -1 | xargs cat
```

## 🛠️ Configuración Avanzada

### Personalizar Jest output
El archivo `jest.config.js` puede modificarse para incluir más información:
```javascript
module.exports = {
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  // ... otras configuraciones
};
```

### Variables de entorno para logs
```bash
# Activar logs más detallados
DEBUG=* npm run test:log

# Logs con colores (si el terminal lo soporta)
FORCE_COLOR=1 npm run test:log
```

## 📝 Notas

- Los logs se limpian automáticamente (se mantienen solo los 10 más recientes)
- Los archivos `.log` están excluidos del control de versiones
- El formato timestamp permite ordenamiento cronológico fácil
- Usar `tee` permite ver output en tiempo real mientras se guarda 