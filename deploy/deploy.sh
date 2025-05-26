#!/bin/bash

# Configuración
PROJECT_ID="tu-proyecto-id"
REGION="us-central1"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🚀 Iniciando despliegue de Skillix Backend${NC}"

# Verificar que estamos en el directorio correcto
if [ ! -d "agents" ] || [ ! -d "dataconnect-bridge" ]; then
    echo -e "${RED}❌ Error: Ejecuta este script desde la raíz del proyecto${NC}"
    exit 1
fi

# Configurar proyecto de GCP
echo -e "${GREEN}📋 Configurando proyecto GCP...${NC}"
gcloud config set project $PROJECT_ID

# Crear secrets si no existen
echo -e "${GREEN}🔐 Configurando secrets...${NC}"
echo -n "Ingresa tu API Key de OpenAI: "
read -s OPENAI_KEY
echo
echo -n "Ingresa tu API Key para Data Connect Bridge: "
read -s DATACONNECT_KEY
echo

# Crear secrets en Secret Manager
echo "$OPENAI_KEY" | gcloud secrets create openai-api-key --data-file=- 2>/dev/null || \
    echo "$OPENAI_KEY" | gcloud secrets versions add openai-api-key --data-file=-

echo "$DATACONNECT_KEY" | gcloud secrets create dataconnect-api-key --data-file=- 2>/dev/null || \
    echo "$DATACONNECT_KEY" | gcloud secrets versions add dataconnect-api-key --data-file=-

# Crear cuenta de servicio para Firebase
if [ -f "service-account.json" ]; then
    gcloud secrets create firebase-service-account --data-file=service-account.json 2>/dev/null || \
        gcloud secrets versions add firebase-service-account --data-file=service-account.json
else
    echo -e "${RED}⚠️  Advertencia: service-account.json no encontrado${NC}"
fi

# Crear cuentas de servicio
echo -e "${GREEN}👤 Creando cuentas de servicio...${NC}"
gcloud iam service-accounts create skillix-agents \
    --display-name="Skillix Agents Service Account" 2>/dev/null || true

gcloud iam service-accounts create skillix-dataconnect \
    --display-name="Skillix DataConnect Bridge Service Account" 2>/dev/null || true

# Asignar permisos
echo -e "${GREEN}🔑 Asignando permisos...${NC}"
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:skillix-agents@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:skillix-dataconnect@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:skillix-dataconnect@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/firebase.admin"

# Desplegar Data Connect Bridge primero
echo -e "${GREEN}🌉 Desplegando Data Connect Bridge...${NC}"
gcloud builds submit --config deploy/cloudbuild-bridge.yaml .

# Obtener la URL del servicio desplegado
BRIDGE_URL=$(gcloud run services describe skillix-dataconnect-bridge \
    --platform managed \
    --region $REGION \
    --format 'value(status.url)')

echo -e "${GREEN}✅ Data Connect Bridge desplegado en: $BRIDGE_URL${NC}"

# Actualizar la URL en el archivo de Cloud Build de agentes
sed -i "s|_DATACONNECT_BRIDGE_URL:.*|_DATACONNECT_BRIDGE_URL: '$BRIDGE_URL'|" deploy/cloudbuild-agents.yaml

# Desplegar Agents
echo -e "${GREEN}🤖 Desplegando Agents...${NC}"
gcloud builds submit --config deploy/cloudbuild-agents.yaml .

# Obtener URLs de los servicios
AGENTS_URL=$(gcloud run services describe skillix-agents \
    --platform managed \
    --region $REGION \
    --format 'value(status.url)')

echo -e "${GREEN}✅ Agents desplegado en: $AGENTS_URL${NC}"

# Configurar permisos de invocación entre servicios
echo -e "${GREEN}🔗 Configurando permisos entre servicios...${NC}"
gcloud run services add-iam-policy-binding skillix-dataconnect-bridge \
    --member="serviceAccount:skillix-agents@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/run.invoker" \
    --region=$REGION

echo -e "${GREEN}🎉 ¡Despliegue completado!${NC}"
echo -e "${YELLOW}URLs de los servicios:${NC}"
echo -e "  Agents API: ${GREEN}$AGENTS_URL${NC}"
echo -e "  DataConnect Bridge: ${GREEN}$BRIDGE_URL${NC} (interno)"
echo
echo -e "${YELLOW}Próximos pasos:${NC}"
echo -e "  1. Actualiza la URL de Agents en tu aplicación móvil"
echo -e "  2. Verifica los logs: gcloud logging read --project=$PROJECT_ID"
echo -e "  3. Monitorea en: https://console.cloud.google.com/run?project=$PROJECT_ID" 