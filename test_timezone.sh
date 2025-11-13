#!/bin/bash

# Test script for Colombian timezone correction
# This script verifies that scheduling works correctly with UTC-5 timezone

echo "🕐 Colombian Timezone Test"
echo "=========================="
echo ""

# Create a Node.js test script
cat > /tmp/test_timezone.js << 'EOF'
// Colombian timezone helper functions (UTC-5)
function getColombianTime() {
  const now = new Date();
  const colombianTime = new Date(now.getTime() - (5 * 60 * 60 * 1000));
  return colombianTime;
}

function addHoursToColombianTime(hours) {
  return new Date(Date.now() + (hours * 60 * 60 * 1000));
}

function convertColombianTimeToUTC(colombianDate) {
  return new Date(colombianDate.getTime() + (5 * 60 * 60 * 1000));
}

// Test cases
console.log("📊 Current Time Analysis:");
console.log("========================");
const now = new Date();
console.log(`UTC Time:       ${now.toISOString()}`);
console.log(`UTC readable:   ${now.toLocaleString('es-CO', { timeZone: 'UTC' })}`);

const colombianTime = getColombianTime();
console.log(`Colombia Time:  ${colombianTime.toISOString()} (calculated)`);
console.log(`Colombia readable: ${now.toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`);

console.log("\n⏰ Scheduling Tests:");
console.log("==================");

const testHours = [1, 2, 6, 12, 24];

testHours.forEach(hours => {
  const scheduled = addHoursToColombianTime(hours);
  const scheduledInColombia = scheduled.toLocaleString('es-CO', { 
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const hoursFromNow = Math.round((scheduled - Date.now()) / (1000 * 60 * 60));
  console.log(`En ${hours} hora(s):`);
  console.log(`  Scheduled UTC: ${scheduled.toISOString()}`);
  console.log(`  Colombia time: ${scheduledInColombia}`);
  console.log(`  Hours from now: ${hoursFromNow}h`);
  console.log("");
});

console.log("✅ Test Complete!");
EOF

node /tmp/test_timezone.js
rm /tmp/test_timezone.js
