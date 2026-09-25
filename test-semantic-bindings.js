/**
 * Testfunktionen für das semantische Bindings-Modul
 */

import {
  convertToSemanticBindings,
  getSemanticGroupForAction,
  checkConflict,
  getActionsForContext,
  findConflicts,
  SEMANTIC_GROUPS,
  CONFLICT_GROUPS
} from './public/semantic-bindings.js';

// Testdaten für die Tests
const testBindings = {
  'binding1': {
    Action: 'AttackHeavy',
    State: 'Pressed',
    IdleTime: 0,
    Value: 1
  },
  'binding2': {
    Action: 'PickOilLamp',
    State: 'Pressed',
    IdleTime: 0,
    Value: 1
  },
  'binding3': {
    Action: 'CastSign',
    State: 'Pressed',
    IdleTime: 0,
    Value: 1
  },
  'binding4': {
    Action: 'Dodge',
    State: 'Pressed',
    IdleTime: 0,
    Value: 1
  }
};

// Test der Konvertierung von rohen Bindings zu semantischen Gruppen
console.log('Test: Konvertierung von rohen Bindings');
const semanticBindings = convertToSemanticBindings(testBindings);
console.log('Ergebnis:', semanticBindings);

// Test der semantischen Gruppenzuordnung
console.log('\nTest: Semantische Gruppenzuordnung');
console.log('AttackHeavy gehört zu:', getSemanticGroupForAction('AttackHeavy'));
console.log('PickOilLamp gehört zu:', getSemanticGroupForAction('PickOilLamp'));
console.log('CastSign gehört zu:', getSemanticGroupForAction('CastSign'));
console.log('Dodge gehört zu:', getSemanticGroupForAction('Dodge'));

// Test der Konflikterkennung
console.log('\nTest: Konflikterkennung');
const binding1 = { action: 'AttackHeavy' };
const binding2 = { action: 'AttackWithAlternateLight' };
const binding3 = { action: 'CastSign' };
const binding4 = { action: 'SelectAard' };

console.log('Konflikt zwischen AttackHeavy und AttackWithAlternateLight:', checkConflict(binding1, binding2));
console.log('Konflikt zwischen CastSign und SelectAard:', checkConflict(binding3, binding4));

// Test der Kontextfunktionen
console.log('\nTest: Kontextfunktionen');
console.log('Aktionen für den Kampfkontext:', getActionsForContext('Combat'));
console.log('Aktionen für den Erkundungskontext:', getActionsForContext('Exploration'));

// Test der Konfliktfindung
console.log('\nTest: Konfliktfindung');
const testBindingsArray = [
  { action: 'AttackHeavy', key: 'binding1' },
  { action: 'AttackWithAlternateLight', key: 'binding2' },
  { action: 'CastSign', key: 'binding3' }
];
const conflicts = findConflicts(testBindingsArray);
console.log('Gefundene Konflikte:', conflicts);

console.log('\nAlle Tests abgeschlossen.');