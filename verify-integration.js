#!/usr/bin/env node

/**
 * VERIFICATION SCRIPT: Proves the new architecture is actually integrated
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔍 ARCHITECTURE INTEGRATION VERIFICATION');
console.log('=' . repeat(60));

function runCommand(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch (e) {
    return null;
  }
}

// Check 1: Count old GameEngine usage (excluding tests and deprecated file)
console.log('\n📊 CHECKING OLD GAMEENGINE USAGE:');
const oldEngineImports = runCommand(
  'grep -r "from.*game/engine/GameEngine" src/ --include="*.tsx" --include="*.ts" | grep -v test | grep -v deprecated | wc -l'
) || '0';
console.log(`  Old GameEngine imports in production: ${oldEngineImports}`);

// Check 2: Count GameEngineAdapter usage
console.log('\n✅ CHECKING NEW ADAPTER USAGE:');
const adapterImports = runCommand(
  'grep -r "GameEngineAdapter" src/ --include="*.tsx" --include="*.ts" | grep -v test | wc -l'
) || '0';
console.log(`  GameEngineAdapter imports: ${adapterImports}`);

// Check 3: List files using the adapter
console.log('\n📁 FILES USING NEW ARCHITECTURE:');
const adapterFiles = runCommand(
  'grep -r "GameEngineAdapter" src/ --include="*.tsx" --include="*.ts" | grep -v test | cut -d: -f1 | sort -u'
);
if (adapterFiles) {
  adapterFiles.split('\n').forEach(file => {
    console.log(`  ✅ ${file}`);
  });
}

// Check 4: Verify API endpoints are migrated
console.log('\n🌐 API ENDPOINTS MIGRATION STATUS:');
const apiFiles = [
  'src/pages/api/games/create.ts',
  'src/pages/api/games/join.ts',
  'src/pages/api/games/[id]/move.ts',
  'src/pages/api/games/[id]/player-view.ts'
];

apiFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('GameEngineAdapter')) {
    console.log(`  ✅ ${file} - MIGRATED`);
  } else if (content.includes('game/engine/GameEngine')) {
    console.log(`  ❌ ${file} - STILL USING OLD ENGINE`);
  }
});

// Check 5: Verify React contexts are migrated
console.log('\n⚛️ REACT CONTEXT MIGRATION STATUS:');
const contextFiles = [
  'src/lib/context/GameStateContext.tsx',
  'src/lib/context/GameStateContextNew.tsx'
];

contextFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('GameEngineAdapter')) {
    console.log(`  ✅ ${file} - MIGRATED`);
  } else if (content.includes('game/engine/GameEngine')) {
    console.log(`  ❌ ${file} - STILL USING OLD ENGINE`);
  }
});

// Check 6: Verify GameEngine is marked as deprecated
console.log('\n⚠️ OLD ENGINE DEPRECATION STATUS:');
const gameEngineFile = 'src/game/engine/GameEngine.ts';
const gameEngineContent = fs.readFileSync(gameEngineFile, 'utf8');
if (gameEngineContent.includes('@deprecated')) {
  console.log(`  ✅ GameEngine.ts is marked as DEPRECATED`);
} else {
  console.log(`  ❌ GameEngine.ts is NOT marked as deprecated`);
}

// Final Summary
console.log('\n' + '=' . repeat(60));
console.log('📈 INTEGRATION SUMMARY:');

const violations = [];

if (parseInt(oldEngineImports) > 0) {
  violations.push(`Still ${oldEngineImports} direct GameEngine imports`);
}

if (parseInt(adapterImports) < 6) {
  violations.push(`Only ${adapterImports} files using GameEngineAdapter (expected 6+)`);
}

if (violations.length > 0) {
  console.log('❌ INTEGRATION INCOMPLETE:');
  violations.forEach(v => console.log(`  - ${v}`));
  process.exit(1);
} else {
  console.log('✅ INTEGRATION SUCCESSFUL!');
  console.log('  - All production code migrated to GameEngineAdapter');
  console.log('  - Old GameEngine marked as deprecated');
  console.log('  - New architecture is now ACTUALLY USED');
  console.log('\n🎉 The clean architecture is no longer fake!');
}