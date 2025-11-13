# 📋 Manual de Pruebas Interactivas de Botones

## 🎯 Objetivo
Validar que todos los botones del bot responden correctamente en producción antes del lanzamiento.

---

## 🔧 Preparación

### 1. Verificar que el bot está corriendo
```bash
pm2 list
# Debe mostrar "social-hub" con estado "online"
```

### 2. Obtener el Chat ID de tu usuario
Envía `/start` al bot y verifica que recibas el menú principal.

### 3. Configurar variables de entorno para pruebas
```bash
export TELEGRAM_BOT_TOKEN="YOUR_BOT_TOKEN"
export CHAT_ID="YOUR_CHAT_ID"
```

---

## 🧪 Pruebas Sistemáticas

### Nivel 1️⃣: Navegación Básica

**Prueba 1.1: Menú Principal**
- [ ] Envía `/start`
- ✅ Resultado esperado: Ves el menú principal con 5 botones principales
- ✅ Idioma: Español (por defecto)

**Prueba 1.2: Cambiar a Inglés**
- [ ] Haz click en "🌍 Cambiar Idioma / Change Language"
- [ ] Haz click en "English"
- ✅ Resultado esperado: Todos los textos cambian a inglés
- ✅ Callback usado: `lang_en`

**Prueba 1.3: Volver a Español**
- [ ] Haz click en "🌍 Change Language / Cambiar Idioma"
- [ ] Haz click en "Español"
- ✅ Resultado esperado: Todos los textos cambian a español
- ✅ Callback usado: `lang_es`

**Prueba 1.4: Navegar a Menú de Programación**
- [ ] Haz click en "⏰ Programar Publicación"
- ✅ Resultado esperado: Ves opciones de tiempo (1h, 3h, 6h, etc.)
- ✅ Callback usado: `menu_schedule`

**Prueba 1.5: Volver al Menú Principal**
- [ ] Haz click en "🏠 Menú Principal"
- ✅ Resultado esperado: Vuelves al menú principal
- ✅ Callback usado: `menu_main`

---

### Nivel 2️⃣: Publicación Rápida

**Prueba 2.1: Seleccionar Publicación Rápida**
- [ ] Desde menú principal, haz click en "🚀 Publicar Rápido"
- ✅ Resultado esperado: Se abre un cuadro de diálogo pidiendo contenido
- ✅ Callback usado: `post_quick`

**Prueba 2.2: Enviar Contenido de Texto**
- [ ] Escribe un mensaje de prueba: "🧪 Prueba de bot - Testing"
- ✅ Resultado esperado: Se muestra confirmación con opciones de editar/confirmar
- ✅ Estado: `awaiting_content`

**Prueba 2.3: Confirmar Publicación**
- [ ] Haz click en "✅ Confirmar"
- ✅ Resultado esperado: Se muestra "✅ Publicado" y opciones de qué hacer ahora
- ✅ Callback usado: `confirm_yes`

**Prueba 2.4: Cancelar Publicación**
- [ ] Repite Prueba 2.1
- [ ] Envía contenido
- [ ] Haz click en "❌ Cancelar"
- ✅ Resultado esperado: Regresa al menú principal
- ✅ Callback usado: `confirm_no`

---

### Nivel 3️⃣: Programación de Posts

**Prueba 3.1: Acceder a Programación**
- [ ] Haz click en "⏰ Programar Publicación"
- ✅ Resultado esperado: Ves 6 opciones de tiempo

**Prueba 3.2: Programar en 1 Hora**
- [ ] Haz click en "⏰ 1 Hora"
- ✅ Resultado esperado: Te pregunta qué plataforma
- ✅ Callback usado: `time_1h`

**Prueba 3.3: Elegir Plataforma (Twitter)**
- [ ] Haz click en "🐦 Twitter/X"
- ✅ Resultado esperado: Para Twitter muestra lista de cuentas disponibles
- ✅ Callback usado: `schedule_platform_twitter_<timestamp>`

**Prueba 3.4: Seleccionar Cuenta de Twitter**
- [ ] Si hay múltiples cuentas, elige una (ej: "pnpmethdaddy")
- ✅ Resultado esperado: Pide contenido a publicar
- ✅ Callback usado: `schedule_twitter_account_<accountName>_twitter_<timestamp>`

**Prueba 3.5: Enviar Contenido para Programar**
- [ ] Envía texto: "🐦 Post de prueba #bot"
- ✅ Resultado esperado: Se muestra resumen y opción de confirmar
- ✅ Estado: `awaiting_schedule_content`

**Prueba 3.6: Confirmar Programación**
- [ ] Haz click en "✅ Confirmar Programación"
- ✅ Resultado esperado: "✅ Post programado" + opciones
- ✅ Callback usado: `confirm_yes`

---

### Nivel 4️⃣: Programación en Otras Plataformas

**Prueba 4.1: Programar para Telegram**
- [ ] Vuelve a "⏰ Programar Publicación"
- [ ] Haz click en "⏰ 3 Horas"
- [ ] Haz click en "📱 Telegram"
- ✅ Resultado esperado: Pide contenido (Telegram no necesita selector de cuenta)
- ✅ Callback usado: `schedule_platform_telegram_<timestamp>`

**Prueba 4.2: Programar para Instagram**
- [ ] Repite pero elige "📸 Instagram"
- ✅ Resultado esperado: Pide contenido
- ✅ Callback usado: `schedule_platform_instagram_<timestamp>`

**Prueba 4.3: Programar para TikTok**
- [ ] Repite pero elige "🎵 TikTok"
- ✅ Resultado esperado: Pide contenido
- ✅ Callback usado: `schedule_platform_tiktok_<timestamp>`

**Prueba 4.4: Programar para Todas las Plataformas**
- [ ] Repite pero elige "🌐 Todas las Plataformas"
- ✅ Resultado esperado: Pide contenido (se enviará a todas)
- ✅ Callback usado: `schedule_platform_all_<timestamp>`

---

### Nivel 5️⃣: Tiempo Personalizado

**Prueba 5.1: Acceder a Tiempo Personalizado**
- [ ] Ve a "⏰ Programar Publicación"
- [ ] Haz click en "⏰ 6 Horas"
- [ ] Haz click en cualquier plataforma
- [ ] En la siguiente pantalla, haz click en "🕐 Hora Personalizada"
- ✅ Resultado esperado: Te pide que envíes fecha y hora
- ✅ Callback usado: `time_custom`

**Prueba 5.2: Enviar Fecha y Hora**
- [ ] Envía: "25/12/2024 14:30"
- ✅ Resultado esperado: Valida el formato y confirma
- ✅ Estado: `awaiting_custom_time`

---

### Nivel 6️⃣: Ver y Cancelar Posts Programados

**Prueba 6.1: Ver Posts Programados**
- [ ] Desde menú principal, haz click en "📋 Ver Programados"
- ✅ Resultado esperado: Lista de posts programados (si los hay)
- ✅ Callback usado: `schedule_view`

**Prueba 6.2: Acceder a Cancelación de Posts**
- [ ] Desde menú principal, haz click en "🗑️ Cancelar"
- ✅ Resultado esperado: Lista de posts que se pueden cancelar
- ✅ Callback usado: `schedule_cancel`

**Prueba 6.3: Cancelar un Post Específico**
- [ ] Si hay posts, haz click en uno de ellos (ej: "Cancelar #1")
- [ ] Confirma la cancelación
- ✅ Resultado esperado: "✅ Post cancelado"
- ✅ Callback usado: `cancel_post_<postId>`

---

### Nivel 7️⃣: Transmisión en Vivo

**Prueba 7.1: Acceder a Menú en Vivo**
- [ ] Desde menú principal, haz click en "📡 Transmisión en Vivo"
- ✅ Resultado esperado: Opciones para transmisión
- ✅ Callback usado: `menu_live`

**Prueba 7.2: Terminar Transmisión (Simulado)**
- [ ] Si hay transmisión activa, haz click en "📡 End Stream"
- ✅ Resultado esperado: Confirmación de fin de transmisión
- ✅ Callback usado: `live_end`

**Prueba 7.3: Enviar Actualización en Vivo**
- [ ] Haz click en "📢 Send Update"
- ✅ Resultado esperado: Pide contenido de actualización
- ✅ Callback usado: `live_update`

---

### Nivel 8️⃣: Multimedia

**Prueba 8.1: Publicar con Imagen**
- [ ] Selecciona "🚀 Publicar Rápido"
- [ ] Envía una foto con caption
- ✅ Resultado esperado: Reconoce la imagen y la incluye en la publicación
- ✅ Formato: Foto + texto opcional

**Prueba 8.2: Publicar con Video**
- [ ] Selecciona "🚀 Publicar Rápido"
- [ ] Envía un video
- ✅ Resultado esperado: Reconoce el video
- ✅ Nota: El video debe ser < 50MB

**Prueba 8.3: Programar con Media**
- [ ] Ve a programación
- [ ] Cuando pida contenido, envía imagen/video
- ✅ Resultado esperado: Se programa correctamente con media

---

## 🎨 Validaciones de UX/UI

### Validación de Idioma

- [ ] **Español**: Todos los botones y mensajes están en español
  - Menú: ✅
  - Botones: ✅
  - Mensajes de error: ✅
  - Confirmaciones: ✅

- [ ] **Inglés**: Todos los textos están en inglés
  - Menú: ✅
  - Botones: ✅
  - Mensajes de error: ✅
  - Confirmaciones: ✅

### Validación de Emojis

- [ ] Los emojis son consistentes
  - Navegación: 🏠 (casa)
  - Volver: 🔙 (flecha)
  - Cancelar: ❌ (error)
  - Confirmar: ✅ (check)
  - Twitter: 🐦 (pájaro)
  - Telegram: 📱 (móvil)
  - Instagram: 📸 (cámara)
  - TikTok: 🎵 (música)

### Validación de Edición

- [ ] Los menús se actualizan sin reenviar mensajes (se edita el existente)
- [ ] No hay mensajes duplicados
- [ ] No hay duplicación de botones

---

## 🔍 Validación de Errores

### Prueba de Casos Extremos

**Prueba E.1: Contenido Vacío**
- [ ] Haz click en "🚀 Publicar Rápido"
- [ ] Intenta enviar un mensaje vacío
- ✅ Resultado esperado: Mensaje de error: "Por favor envía un mensaje con contenido"

**Prueba E.2: Cancelar a Mitad del Flujo**
- [ ] Inicia programación
- [ ] Haz click en "❌ Cancelar"
- ✅ Resultado esperado: Regresa al menú anterior

**Prueba E.3: Cambiar Idioma a Mitad**
- [ ] Inicia una acción
- [ ] Haz click en idioma
- [ ] Cambia a otro idioma
- ✅ Resultado esperado: Los nuevos mensajes están en el nuevo idioma

**Prueba E.4: Tiempo en el Pasado**
- [ ] Intenta ingresar una fecha pasada en tiempo personalizado
- ✅ Resultado esperado: Mensaje de error o ajuste automático

---

## 📊 Matriz de Validación Final

```
┌─────────────────────────────┬──────────┬──────────┬──────────┐
│ Funcionalidad               │ Español  │ Inglés   │ General  │
├─────────────────────────────┼──────────┼──────────┼──────────┤
│ Menú Principal              │    ✅    │    ✅    │    ✅    │
│ Cambio de Idioma            │    ✅    │    ✅    │    ✅    │
│ Publicación Rápida          │    ✅    │    ✅    │    ✅    │
│ Publicación Programada      │    ✅    │    ✅    │    ✅    │
│ Selección de Plataforma     │    ✅    │    ✅    │    ✅    │
│ Selección de Cuenta Twitter │    ✅    │    ✅    │    ✅    │
│ Ver Posts Programados       │    ✅    │    ✅    │    ✅    │
│ Cancelar Posts              │    ✅    │    ✅    │    ✅    │
│ Transmisión en Vivo         │    ✅    │    ✅    │    ✅    │
│ Manejo de Media             │    ✅    │    ✅    │    ✅    │
│ Manejo de Errores           │    ✅    │    ✅    │    ✅    │
│ Navegación de Ida y Vuelta  │    ✅    │    ✅    │    ✅    │
│ Performance (<1s respuesta) │    ✅    │    ✅    │    ✅    │
│ Sin Duplicación de Mensajes │    ✅    │    ✅    │    ✅    │
└─────────────────────────────┴──────────┴──────────┴──────────┘
```

---

## 🚀 Procedimiento de Validación en Producción

1. **Preparación** (30 min)
   - [ ] Verificar bot está online
   - [ ] Obtener Chat ID personal
   - [ ] Configurar variables de entorno
   - [ ] Revisar logs recientes

2. **Pruebas Básicas** (30 min)
   - [ ] Completar todas las pruebas de Nivel 1-3

3. **Pruebas Avanzadas** (45 min)
   - [ ] Completar Nivel 4-8
   - [ ] Probar casos extremos (Nivel E)

4. **Validación Final** (15 min)
   - [ ] Completar matriz de validación
   - [ ] Revisar logs para errores
   - [ ] Confirmar que no hay mensajes de error

**Tiempo Total: ~2 horas**

---

## 📝 Registro de Resultados

```
Fecha: ________________
Probador: ________________
Entorno: [ ] Producción [ ] Staging [ ] Local

Resultados:
- Pruebas Nivel 1: ✅ / ❌
- Pruebas Nivel 2: ✅ / ❌
- Pruebas Nivel 3: ✅ / ❌
- Pruebas Nivel 4: ✅ / ❌
- Pruebas Nivel 5: ✅ / ❌
- Pruebas Nivel 6: ✅ / ❌
- Pruebas Nivel 7: ✅ / ❌
- Pruebas Nivel 8: ✅ / ❌
- Pruebas de Error: ✅ / ❌

Observaciones:
_________________________________
_________________________________

Aprobación: ✅ / ❌
```

---

**Última actualización: 2024**
**Versión: v1.0 - Production Ready**
