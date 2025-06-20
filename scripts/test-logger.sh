#!/bin/bash

# Test Logger Script - Gestiona logs de tests de manera avanzada
# Uso: ./scripts/test-logger.sh [comando]

# Crear directorio de logs si no existe
mkdir -p test-logs

# Función para crear un nombre de archivo con timestamp
create_log_filename() {
    local prefix=$1
    local timestamp=$(date +%Y%m%d-%H%M%S)
    echo "test-logs/${prefix}-${timestamp}.log"
}

# Función para limpiar logs antiguos (mantener solo los últimos 10)
clean_old_logs() {
    local pattern=$1
    echo "🧹 Limpiando logs antiguos de $pattern..."
    ls -t test-logs/${pattern}-*.log 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
}

# Función para mostrar información de logs
show_log_info() {
    echo "📊 Información de logs de tests:"
    echo "📁 Directorio: test-logs/"
    echo "📄 Archivos de log disponibles:"
    ls -la test-logs/ 2>/dev/null || echo "  (No hay logs disponibles)"
    echo ""
}

case "$1" in
    "e2e")
        echo "🚀 Ejecutando tests E2E con logging..."
        clean_old_logs "e2e"
        LOGFILE=$(create_log_filename "e2e")
        echo "📝 Guardando logs en: $LOGFILE"
        firebase emulators:exec --project=skillix-db "pnpm test:run" 2>&1 | tee "$LOGFILE"
        echo "✅ Logs guardados en: $LOGFILE"
        ;;
    "unit")
        echo "🧪 Ejecutando tests unitarios con logging..."
        clean_old_logs "unit"
        LOGFILE=$(create_log_filename "unit")
        echo "📝 Guardando logs en: $LOGFILE"
        jest --runInBand --verbose 2>&1 | tee "$LOGFILE"
        echo "✅ Logs guardados en: $LOGFILE"
        ;;
    "debug")
        echo "🐛 Ejecutando tests en modo debug con logging..."
        clean_old_logs "debug"
        LOGFILE=$(create_log_filename "debug")
        echo "📝 Guardando logs en: $LOGFILE"
        jest --runInBand --verbose --detectOpenHandles --forceExit 2>&1 | tee "$LOGFILE"
        echo "✅ Logs guardados en: $LOGFILE"
        ;;
    "show")
        show_log_info
        ;;
    "clean")
        echo "🧹 Limpiando todos los logs..."
        rm -f test-logs/*.log
        echo "✅ Logs eliminados"
        ;;
    "latest")
        echo "📄 Mostrando el log más reciente:"
        LATEST=$(ls -t test-logs/*.log 2>/dev/null | head -n 1)
        if [ -n "$LATEST" ]; then
            echo "📁 Archivo: $LATEST"
            echo "📝 Contenido:"
            cat "$LATEST"
        else
            echo "❌ No hay logs disponibles"
        fi
        ;;
    *)
        echo "🔧 Test Logger - Herramienta para gestionar logs de tests"
        echo ""
        echo "Uso: $0 [comando]"
        echo ""
        echo "Comandos disponibles:"
        echo "  e2e     - Ejecutar tests E2E con logging"
        echo "  unit    - Ejecutar tests unitarios con logging"
        echo "  debug   - Ejecutar tests en modo debug con logging"
        echo "  show    - Mostrar información de logs disponibles"
        echo "  latest  - Mostrar el contenido del log más reciente"
        echo "  clean   - Limpiar todos los logs"
        echo ""
        echo "Ejemplos:"
        echo "  $0 e2e     # Ejecutar tests E2E y guardar logs"
        echo "  $0 show    # Ver qué logs están disponibles"
        echo "  $0 latest  # Ver el log más reciente"
        ;;
esac 