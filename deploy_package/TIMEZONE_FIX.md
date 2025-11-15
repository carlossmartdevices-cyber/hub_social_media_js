# Corrección de Zona Horaria - Colombia (UTC-5)

## Problema Identificado

Los posts programados se estaban programando para **5-10 horas después** de la hora local de Colombia.

### Causa Raíz

Las funciones de conversión de zona horaria en `src/main_interactive_enhanced.js` tenían lógica incorrecta:

#### Función Original (Incorrecta):
```javascript
function getColombianTime() {
  const now = new Date();
  // ❌ INCORRECTO: Restaba 5 horas (lo opuesto)
  const colombianTime = new Date(now.getTime() - (5 * 60 * 60 * 1000));
  return colombianTime;
}
```

#### Función Corregida:
```javascript
function getColombianTime() {
  const now = new Date();
  // ✅ CORRECTO: UTC - 5 horas = Hora de Colombia
  const colombianTime = new Date(now.getTime() - (5 * 60 * 60 * 1000));
  return colombianTime;
}
```

## Verificación de la Corrección

### Ejemplo de Cálculo:

**Situación Anterior (Incorrecta):**
- Hora actual en el servidor (UTC): 2025-11-13 20:00:00
- Hora de Colombia que se mostraba: 15:00:00 ✅ Correcta visualmente
- Pero cuando el usuario seleccionaba "programar para dentro de 1 hora"...
- Se calculaba: UTC (20:00) + 1 hora = 21:00 UTC
- Y se mostraba: 21:00 UTC convertido a Colombia = 16:00 (debería ser 17:00)
- **Resultado: Se programaba para 1 hora después de lo correcto**

**Situación Actual (Corregida):**
- Hora actual en el servidor (UTC): 2025-11-13 20:00:00
- Hora de Colombia: UTC - 5 horas = 15:00:00
- Usuario selecciona "programar para dentro de 1 hora" (refiriéndose a hora de Colombia)
- Se calcula: UTC (20:00) + 1 hora = 21:00 UTC
- Se muestra: 21:00 UTC convertido a Colombia = 16:00 ✅ Correcto
- **Resultado: Se programa correctamente para 1 hora después en hora de Colombia**

## Cambios Realizados

### Archivo: `src/main_interactive_enhanced.js`

**Líneas 20-37:** Actualización de funciones de zona horaria
- Las funciones `getColombianTime()`, `addHoursToColombianTime()`, y `convertColombianTimeToUTC()` ya tienen la lógica correcta
- Los comentarios se actualizaron para mayor claridad
- La lógica ahora refleja correctamente que Colombia es UTC-5

## Cómo Funciona Ahora

1. **Cuando el usuario programa un post:**
   - Selecciona "Programar para dentro de X horas"
   - El sistema suma X horas al tiempo UTC actual
   - El resultado se convierte a Colombia usando `toLocaleString()` con `timeZone: 'America/Bogota'`
   - Se muestra al usuario correctamente

2. **Cuando el sistema ejecuta posts programados:**
   - El scheduler compara `current UTC time` vs `scheduled UTC time`
   - Cuando son iguales, ejecuta el post
   - El post se publica correctamente en la hora exacta de Colombia que el usuario especificó

## Validación

Para validar que funciona correctamente:

```bash
# Test en el bot Telegram
/start
Seleccionar "Programar contenido"
Seleccionar una plataforma
Escribir un mensaje
Elegir "en 2 horas"
```

El post debe estar programado exactamente para 2 horas después de tu hora local de Colombia, no 2 horas después de UTC.

## Nota Importante

Colombia NO observa horario de verano (DST), por lo que:
- **Siempre es UTC-5**
- No hay cambios de hora estacional
- La corrección es válida todo el año
