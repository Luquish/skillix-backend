# Guía de Despliegue - Skillix Backend

Este proyecto contiene dos servicios que trabajan juntos:
- **Agents** (Python): API principal con los agentes de IA
- **DataConnect Bridge** (Node.js): Puente para Firebase Data Connect

## Arquitectura

```
┌─────────────┐     HTTP      ┌─────────────────┐     gRPC       ┌──────────────┐
│   Cliente   │ ─────────────▶│     Agents      │───────────────▶│  DataConnect │
│   (Mobile)  │               │    (Python)     │                │    Bridge    │
└─────────────┘               └─────────────────┘                │   (Node.js)  │
                                                                 └──────┬───────┘
                                                                        │
                                                                        ▼
                                                                 ┌──────────────┐
                                                                 │   Firebase   │
                                                                 │ Data Connect │
                                                                 └──────────────┘
```

## Microservicios Separados

**Ventajas:**
- ✅ Escalabilidad independiente
- ✅ Aislamiento de fallos
- ✅ Actualizaciones independientes
- ✅ Mejor uso de recursos
- ✅ Logs separados

**Desventajas:**
- ❌ Configuración más compleja
- ❌ Latencia adicional entre servicios

#### Desarrollo Local
```bash
# Usando Docker Compose
docker-compose up

# O ejecutar individualmente
cd dataconnect-bridge && npm run dev
cd agents && uvicorn src.main:app --reload
```

#### Despliegue en Cloud Run
```bash
# Configurar tu proyecto
export PROJECT_ID="tu-proyecto-id"

# Ejecutar el script de despliegue
./deploy/deploy.sh
```

## Configuración de Secrets

### 1. Crear secrets en Google Secret Manager
```bash
# OpenAI API Key
echo -n "tu-api-key" | gcloud secrets create openai-api-key --data-file=-

# DataConnect API Key
echo -n "tu-api-key" | gcloud secrets create dataconnect-api-key --data-file=-

# Firebase Service Account
gcloud secrets create firebase-service-account --data-file=service-account.json
```

### 2. Asignar permisos
```bash
# Para el servicio de agentes
gcloud secrets add-iam-policy-binding openai-api-key \
  --member="serviceAccount:skillix-agents@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Para el bridge
gcloud secrets add-iam-policy-binding firebase-service-account \
  --member="serviceAccount:skillix-dataconnect@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Variables de Entorno

### Agents (Python)
```env
ENVIRONMENT=production
DATACONNECT_BRIDGE_URL=https://bridge-url.run.app
DATACONNECT_API_KEY=<secret>
OPENAI_API_KEY=<secret>
FIREBASE_PROJECT_ID=tu-proyecto-id
```

### DataConnect Bridge (Node.js)
```env
NODE_ENV=production
PORT=3001
FIREBASE_PROJECT_ID=tu-proyecto-id
FIREBASE_SERVICE_ACCOUNT_PATH=/secrets/service-account.json
API_KEY=<secret>
```

## Monitoreo y Logs

### Ver logs en tiempo real
```bash
# Agents
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=skillix-agents" \
  --limit 50 --format json

# Bridge
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=skillix-dataconnect-bridge" \
  --limit 50 --format json
```

### Configurar alertas
```bash
# Alerta por errores
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="Skillix Backend Errors" \
  --condition-threshold-value=10 \
  --condition-threshold-duration=60s
```

## Troubleshooting

### Problema: Los servicios no se pueden comunicar
```bash
# Verificar que el servicio de agentes puede invocar al bridge
gcloud run services add-iam-policy-binding skillix-dataconnect-bridge \
  --member="serviceAccount:skillix-agents@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.invoker" \
  --region=us-central1
```

### Problema: Error de autenticación con Firebase
```bash
# Verificar que el service account tiene los permisos correctos
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:skillix-dataconnect@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/firebase.admin"
```

### Problema: Alto consumo de memoria
```yaml
# Ajustar en cloudbuild.yaml
- '--memory'
- '2Gi'  # Aumentar según necesidad
- '--cpu'
- '2'    # Aumentar CPUs también
```

## CI/CD con Cloud Build

### Trigger automático en push a main
```bash
gcloud beta builds triggers create github \
  --repo-name=skillix-backend \
  --repo-owner=tu-usuario \
  --branch-pattern=^main$ \
  --build-config=deploy/cloudbuild-agents.yaml
```

### Build manual
```bash
gcloud builds submit --config deploy/cloudbuild-agents.yaml
```

## Costos Estimados

### Microservicios
- **Agents**: ~$50-100/mes (1 instancia mínima)
- **Bridge**: ~$25-50/mes (1 instancia mínima)
- **Total**: ~$75-150/mes

*Nota: Los costos varían según el tráfico y la región*

## Mejores Prácticas

1. **Seguridad**
   - Nunca exponer el DataConnect Bridge públicamente
   - Usar service accounts con permisos mínimos
   - Rotar API keys regularmente

2. **Performance**
   - Configurar min-instances=1 para evitar cold starts
   - Usar connection pooling en el bridge
   - Implementar caching donde sea posible

3. **Monitoreo**
   - Configurar alertas para errores 5xx
   - Monitorear latencia p95
   - Revisar logs regularmente

4. **Despliegue**
   - Usar Cloud Build para CI/CD
   - Hacer rollbacks rápidos si hay problemas
   - Probar en staging antes de producción 