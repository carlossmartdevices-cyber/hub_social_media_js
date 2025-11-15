# ⚡ Guía de Referencia Rápida - Callbacks del Bot

## 🔍 Vista Rápida de Todos los Prefijos

```
menu_*              → handleMenuNavigation           [Navegación]
lang_*              → handleLanguageChange            [Idioma]
post_*              → handlePostAction                [Publicación]
schedule_platform_* → handleSchedulePlatformSelection [Plataforma]
schedule_twitter_*  → handleTwitterAccountSelection   [Cuenta Twitter]
schedule_*          → handleScheduleAction            [Programación]
time_*              → handleTimeSelection             [Tiempo]
confirm_*           → handleConfirmation              [Confirmación]
cancel_post_*       → handleCancelPost                [Cancelación]
live_*              → handleLiveAction                [En Vivo]
quick_*             → handleQuickAction               [Rápido]
platform_*          → handlePlatformSelection         [Plataforma]
```

---

## 📌 Callbacks Más Usados

| Callback | Ubicación | Qué Hace |
|----------|-----------|----------|
| `menu_main` | Todos los menús | Ir a menú principal |
| `menu_schedule` | Menú principal | Ir a programación |
| `post_quick` | Menú principal | Publicar ahora |
| `lang_es` | Cualquier lugar | Cambiar a español |
| `lang_en` | Cualquier lugar | Cambiar a inglés |
| `confirm_yes` | Confirmaciones | Confirmar acción |
| `confirm_no` | Confirmaciones | Cancelar acción |
| `time_1h` | Programación | Programar en 1 hora |
| `schedule_cancel` | Programación | Ir a cancelar |
| `cancel_post_<id>` | Cancelación | Cancelar post específico |

---

## 🎯 Flujos Principales

### Publicación Rápida (2 clicks + contenido)
```
/start
└─ menu_main
   └─ post_quick
      └─ [envía contenido]
         └─ confirm_yes → ✅ PUBLICADO
```

### Programación en Twitter (5 clicks + contenido)
```
/start
└─ menu_main
   └─ menu_schedule (o post_schedule)
      └─ time_3h
         └─ schedule_platform_twitter_<ts>
            └─ schedule_twitter_account_<name>_<ts>
               └─ [envía contenido]
                  └─ confirm_yes → ✅ PROGRAMADO
```

### Cambiar Idioma (2 clicks)
```
Cualquier lugar
└─ menu_language
   └─ lang_es (o lang_en) → ✅ IDIOMA CAMBIADO
```

### Cancelar Post (2-3 clicks)
```
/start
└─ menu_main
   └─ menu_schedule
      └─ schedule_cancel
         └─ cancel_post_<id>
            └─ confirm_yes → ✅ CANCELADO
```

---

## 🔧 Debugging Rápido

### Si un botón no responde:
1. Verificar que el callback existe (buscar en `main_interactive_enhanced.js`)
2. Verificar que tiene un handler (buscar `async handle*`)
3. Verificar que el handler está registrado en `handleCallbackQuery()`
4. Ejecutar: `node validate_callbacks.js`

### Si un menú se duplica:
- Verificar que usa `.editMessageText()` no `.sendMessage()`
- El bot debe editar el mensaje existente, no enviar uno nuevo

### Si un usuario no tiene acceso:
- Verificar que su ID está en `adminUsers[]` array
- `menu_language` y `lang_*` son accesibles sin admin

### Si hay errores en logs:
- Buscar callback_data en logs
- Verificar que hay handler para ese prefijo
- Verificar que el handler tiene try-catch

---

## 📊 Resumen de Validación

```
Total Prefijos:        12 ✅
Total Handlers:        14 ✅
Total Callbacks:       16 ✅
Botones Huérfanos:      0 ✅
Handlers Inaccesibles:  0 ✅
Idiomas:                2 ✅ (ES/EN)
Estado:              LISTO ✅
```

---

## 🚀 Checklist de Operación

Antes de considerar un cambio completado:

- [ ] Ejecutar `validate_callbacks.js` sin errores
- [ ] Probar el botón manualmente en ambos idiomas
- [ ] Verificar que se puede volver al menú anterior
- [ ] Revisar logs para errores: `pm2 logs social-hub`
- [ ] Confirmar que cambios están en deploy si aplica

---

## 📚 Documentos de Referencia

1. **EXECUTIVE_SUMMARY.md** ← Empieza aquí
2. **BUTTON_VALIDATION_REPORT.md** - Detallado
3. **INTERACTIVE_TESTING_GUIDE.md** - Pruebas paso a paso
4. **USE_CASES_VALIDATED.md** - 12 casos de uso
5. **validate_callbacks.js** - Validador automático

---

## 💡 Tips Pro

- Los callbacks con `${variable}` se reemplazan dinámicamente
- `menu_main` es el fallback seguro para cualquier error
- Los cambios de idioma se guardan en sesión de usuario
- Twitter requiere selector de cuenta
- Las otras plataformas van directo a pedir contenido

---

**Última actualización:** 2024  
**Estado:** ✅ Production Ready  
**Versión:** Quick Reference v1.0
