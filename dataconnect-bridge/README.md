# Firebase Data Connect Bridge para Python ADK

Este servicio Node.js actúa como puente entre los agentes Python (que usan Google ADK) y Firebase Data Connect, ya que Data Connect solo tiene soporte oficial para Node.js.

## Arquitectura

```
Python Agents (ADK) 
    ↓ HTTP/REST
Node.js Bridge Service
    ↓ Firebase SDK
Firebase Data Connect
```

## Instalación

1. **Instalar dependencias**:
   ```bash
   cd dataconnect-bridge
   npm install
   ```

2. **Configurar variables de entorno**:
   ```bash
   cp .env.example .env
   # Editar .env con tu configuración
   ```

3. **Generar SDK de Data Connect**:
   ```bash
   # Desde la raíz del proyecto
   firebase dataconnect:sdk:generate --watch
   ```

## Uso

### Iniciar el servicio

```bash
# Modo desarrollo
npm run dev

# Modo producción
npm start
```

### Endpoints disponibles

- `GET /health` - Health check
- `POST /api/dataconnect/query` - Ejecutar queries
- `POST /api/dataconnect/mutation` - Ejecutar mutations

### Ejemplo de uso desde Python

```python
from skillix_agents import get_dataconnect_bridge

async def example():
    bridge = get_dataconnect_bridge()
    
    # Ejecutar una query
    user = await bridge.get_user_by_firebase_uid("uid123")
    
    # Ejecutar una mutation
    result = await bridge.create_learning_plan(
        user_id="user123",
        plan_data={"title": "Mi plan"}
    )
```

## Seguridad

- Usa autenticación por API Key en el header `Authorization: Bearer YOUR_API_KEY`
- Configura `ALLOWED_ORIGINS` para CORS
- En producción, considera usar HTTPS y rate limiting

## Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

### PM2

```bash
pm2 start server.js --name dataconnect-bridge
pm2 save
pm2 startup
```

## Troubleshooting

1. **Error: Cannot find module '../dataconnect/generated/js/default-connector'**
   - Asegúrate de haber generado el SDK con `firebase dataconnect:sdk:generate`

2. **Error 401: Invalid API key**
   - Verifica que `DATACONNECT_BRIDGE_API_KEY` esté configurado en ambos lados

3. **Connection refused**
   - Verifica que el servicio esté corriendo en el puerto correcto
   - Actualiza `DATACONNECT_BRIDGE_URL` en el .env de Python 