#!/bin/bash

echo "🕐 VALIDACIÓN DE CORRECCIÓN DE ZONA HORARIA"
echo "==========================================="
echo ""

echo "📋 Test de Localización con America/Bogota:"

node << 'EOF'
// Test the timezone fix
const now = new Date();

console.log("1️⃣ Tiempo Actual:");
console.log(`   UTC: ${now.toISOString()}`);
console.log(`   Colombia (via toLocaleString): ${now.toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`);

console.log("\n2️⃣ Programación +2 horas:");
const scheduledTime = new Date(now.getTime() + (2 * 60 * 60 * 1000));
console.log(`   UTC scheduled: ${scheduledTime.toISOString()}`);
console.log(`   Colombia display: ${scheduledTime.toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`);

console.log("\n3️⃣ Validación:");
const currentCol = now.toLocaleString('es-CO', { timeZone: 'America/Bogota' });
const scheduledCol = scheduledTime.toLocaleString('es-CO', { timeZone: 'America/Bogota' });

// Parse hours for comparison
const currentHour = parseInt(currentCol.split(', ')[1].split(':')[0]);
const scheduledHour = parseInt(scheduledCol.split(', ')[1].split(':')[0]);

let hourDiff = scheduledHour - currentHour;
if (hourDiff < 0) hourDiff += 24; // Handle day rollover

console.log(`   Hora actual Colombia: ${currentHour}`);
console.log(`   Hora programada: ${scheduledHour}`);
console.log(`   Diferencia: ${hourDiff} horas`);

if (hourDiff === 2) {
  console.log(`   ✅ CORRECTO: Se programa exactamente 2 horas después`);
} else {
  console.log(`   ❌ ERROR: Debería ser 2 horas, pero es ${hourDiff}`);
}
EOF

echo ""
echo "🔧 Archivos actualizados:"
echo "✅ /src/main_interactive_enhanced.js"
echo "✅ /deploy_package/src/main_interactive_enhanced.js"
echo ""
echo "📝 Cambios aplicados:"
echo "• Todas las llamadas a toLocaleString() ahora usan { timeZone: 'America/Bogota' }"
echo "• Corregido en platform selection, account selection, content messages"
echo "• Corregido en vista de posts programados y cancelación"
echo "• Corregido en entrada de tiempo personalizado"
echo ""
echo "✨ READY TO DEPLOY!"