# Nuevas Funcionalidades Implementadas

## 1. Borrado Masivo de Posts

### Descripción
Permite eliminar múltiples posts de una vez basándose en períodos de tiempo específicos.

### Características
- **Períodos disponibles:**
  - Últimas 24 horas
  - Últimos 7 días
  - Últimos 30 días
  - Toda la vida (todos los posts)

- **Filtrado opcional por plataforma:**
  - Twitter
  - Instagram
  - Facebook
  - LinkedIn
  - TikTok
  - YouTube
  - O todas las plataformas

### API Endpoint
```
DELETE /api/posts/bulk-delete
```

**Request Body:**
```json
{
  "period": "24h" | "7d" | "30d" | "all",
  "platform": "twitter" (opcional)
}
```

**Response:**
```json
{
  "message": "Successfully deleted 15 post(s)",
  "deletedCount": 15,
  "period": "7d",
  "platform": "twitter"
}
```

### UI
- Accesible desde: **Settings → Bulk Delete**
- Incluye advertencia de confirmación antes de eliminar
- Muestra feedback visual del proceso de eliminación

---

## 2. Acciones Automatizadas

### Descripción
Sistema de automatización para respuestas automáticas y promociones programadas.

### Tipos de Automatizaciones

#### 1. Auto Reply to Mentions (Respuesta automática a menciones)
- Responde automáticamente cuando alguien menciona tu cuenta
- Configurable por plataforma
- Intervalo de ejecución: cada 5 minutos

#### 2. Auto Reply to Inbox (Respuesta automática a mensajes directos)
- Responde automáticamente a mensajes en inbox/DM
- Configurable por plataforma
- Intervalo de ejecución: cada 5 minutos

#### 3. Scheduled Promotion (Promociones programadas)
- Publica automáticamente mensajes promocionales
- Frecuencias disponibles:
  - Diaria (cada 24 horas)
  - Semanal (cada 7 días)
  - Mensual (cada 30 días)

### API Endpoints

#### Crear Automatización
```
POST /api/automated-actions
```

**Request Body:**
```json
{
  "name": "Auto reply to mentions",
  "type": "auto_reply_mentions" | "auto_reply_inbox" | "scheduled_promotion",
  "platforms": ["twitter", "instagram"],
  "config": {
    "replyMessage": "¡Gracias por tu mensaje!" // Para auto_reply
    // O
    "message": "¡Oferta especial!",
    "frequency": "monthly" // Para scheduled_promotion
  }
}
```

#### Listar Automatizaciones
```
GET /api/automated-actions
```

**Query Parameters:**
- `type`: Filtrar por tipo
- `platform`: Filtrar por plataforma
- `enabled`: true/false

#### Obtener Automatización
```
GET /api/automated-actions/:id
```

#### Actualizar Automatización
```
PUT /api/automated-actions/:id
```

#### Eliminar Automatización
```
DELETE /api/automated-actions/:id
```

#### Toggle (Activar/Desactivar)
```
PATCH /api/automated-actions/:id/toggle
```

#### Ver Logs de Ejecución
```
GET /api/automated-actions/:id/logs
```

### Base de Datos

#### Tabla: `automated_actions`
```sql
- id: UUID
- user_id: UUID
- name: VARCHAR(255)
- type: VARCHAR(50)
- platforms: TEXT[]
- config: JSONB
- is_enabled: BOOLEAN
- last_executed_at: TIMESTAMP
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### Tabla: `automated_action_logs`
```sql
- id: UUID
- action_id: UUID
- platform: VARCHAR(50)
- status: VARCHAR(50) -- 'success', 'failure', 'skipped'
- details: JSONB
- error: TEXT
- executed_at: TIMESTAMP
```

### UI
- Accesible desde: **Settings → Automation**
- Funciones disponibles:
  - Crear nuevas automatizaciones
  - Ver lista de automatizaciones activas/inactivas
  - Activar/desactivar automatizaciones
  - Eliminar automatizaciones
  - Ver estado y plataformas configuradas

### Servicio de Ejecución

El servicio `AutomatedActionsService` ejecuta automáticamente las acciones configuradas:
- Se ejecuta cada 60 segundos
- Verifica qué acciones deben ejecutarse según su último tiempo de ejecución
- Registra cada ejecución en la tabla de logs
- Maneja errores y reintentos

**Para iniciar el servicio:**
```typescript
import automatedActionsService from './services/AutomatedActionsService';
automatedActionsService.start();
```

---

## Migraciones de Base de Datos

### Ejecutar Migración
La migración `005_automated_actions.sql` debe ejecutarse para crear las tablas necesarias:

```bash
# Usando psql
psql -U your_user -d your_database -f src/database/migrations/005_automated_actions.sql
```

O desde tu script de migración existente.

---

## Archivos Modificados/Creados

### Backend
- ✅ `src/database/migrations/005_automated_actions.sql` - Nueva migración
- ✅ `src/api/controllers/PostController.ts` - Método bulkDelete agregado
- ✅ `src/api/controllers/AutomatedActionsController.ts` - Nuevo controlador
- ✅ `src/api/routes/posts.ts` - Ruta bulk-delete agregada
- ✅ `src/api/routes/automatedActions.ts` - Nuevas rutas
- ✅ `src/api/routes/index.ts` - Rutas automatizadas registradas
- ✅ `src/services/AutomatedActionsService.ts` - Nuevo servicio

### Frontend
- ✅ `client/src/app/settings/page.tsx` - Nuevas pestañas y UI

---

## Instalación Completada ✅

1. **✅ Migración de base de datos ejecutada**
   - Tabla `automated_actions` creada
   - Tabla `automated_action_logs` creada
   - Índices y triggers configurados

2. **✅ Servicio de automatizaciones integrado**
   - Iniciado automáticamente en `src/index.ts`
   - Se detiene correctamente durante el shutdown
   - Ejecuta cada 60 segundos

3. **Para desplegar en producción:**
   ```bash
   # Compilar proyecto (ya completado)
   npm run build

   # Reiniciar aplicación con PM2
   pm2 restart ecosystem.config.js
   ```

---

## Testing

### Probar Borrado Masivo
1. Ve a Settings → Bulk Delete
2. Selecciona un período de tiempo
3. (Opcional) Selecciona una plataforma específica
4. Haz clic en "Delete Posts"

### Probar Automatizaciones
1. Ve a Settings → Automation
2. Haz clic en "+ New Automation"
3. Configura una automatización (ej: respuesta automática)
4. Actívala y espera a que se ejecute

---

## Notas Importantes

- ⚠️ El borrado masivo es **irreversible**. Los usuarios recibirán una advertencia antes de confirmar.
- 🔄 Las automatizaciones se ejecutan en background cada 60 segundos.
- 📊 Todos los logs de ejecución se guardan en la base de datos para auditoría.
- 🔒 Todas las operaciones requieren autenticación del usuario.
