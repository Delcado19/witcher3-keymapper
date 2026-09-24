/**
 * Semantische Bindungen für Witcher 3 Keymapper
 *
 * Dieses Modul implementiert ein semantisches Datenmodell, das Aktionen in logische Gruppen
 * (Interaction, Combat, Movement etc.) zusammenfasst und kontextabhängige Darstellung ermöglicht.
 */

/**
 * Semantische Aktionengruppen
 */
const SEMANTIC_GROUPS = {
  // Interaktionen
  INTERACTION: {
    name: 'Interaktion',
    description: 'Interaktionen mit Objekten, NPCs und Umgebung',
    actions: [
      'PickOilLamp', 'PlaceOilLamp', 'PlaceCrystal', 'SitDown', 'Knock', 'Spare',
      'Unequip', 'FastTravel', 'GatherHerbs', 'Examine', 'EnterBoat', 'EnterBoatFromSwimming',
      'MountHorse', 'Talk', 'Stash', 'Container', 'Interact', 'InteractHold', 'Use',
      'UseDevice', 'Finish', 'Open', 'Close', 'Lock', 'Unlock', 'Take', 'Push',
      'Pull', 'Locked', 'Destroy', 'PrayForSun', 'PrayForStorm', 'Arm', 'Disarm',
      'GatherBrushwood', 'PlaceHerbs', 'Drink', 'PlaceOffering', 'Grab', 'Free',
      'Ignite', 'UnblockGate', 'UseItem', 'Read', 'PullAxe', 'Interaction',
      'Extinguish', 'CallJohnny', 'HideBible', 'SitAndWait', 'PlaceBottle',
      'WineSlot', 'BurnBody', 'PutBack', 'Debung', 'Touch', 'CutRope',
      'KneelDown', 'PlaceTribute', 'HangPainting', 'PlaceArmor', 'PlaceSword',
      'GiveAlms', 'PlaceLure', 'PlaceBeans', 'Look', 'TakePaintGreen',
      'TakePaintBlue', 'TakePaintRed', 'TakePaintYellow', 'TakePaintPurple',
      'DisposePaint', 'HideIn', 'PlaceTrophy', 'BuryBody'
    ]
  },

  // Kampf
  COMBAT: {
    name: 'Kampf',
    description: 'Kampfaktionen und Angriffe',
    actions: [
      'AttackHeavy', 'AttackLight', 'AttackWithAlternateLight',
      'AttackWithAlternateHeavy', 'SpecialAttackHeavy', 'SpecialAttackLight',
      'SpecialAttackWithAlternateHeavy', 'SpecialAttackWithAlternateLight',
      'Dodge', 'CbtRoll', 'CbtDash', 'CbtJump', 'LockAndGuard', 'Sprint',
      'SprintToggle', 'SpawnHorse', 'CbtSpecialAttack', 'CbtAttack'
    ]
  },

  // Bewegung
  MOVEMENT: {
    name: 'Bewegung',
    description: 'Bewegungssteuerung und Navigation',
    actions: [
      'GI_AxisLeftX', 'GI_AxisLeftY', 'GI_AxisRightX', 'GI_AxisRightY',
      'GI_MouseDampX', 'GI_MouseDampY', 'MovementDoubleTapA', 'MovementDoubleTapD',
      'MovementDoubleTapS', 'MovementDoubleTapW'
    ]
  },

  // Signe
  SIGNS: {
    name: 'Signe',
    description: 'Zauber und Signe',
    actions: [
      'CastSign', 'CastSignHold', 'SelectAard', 'SelectYrden', 'SelectIgni',
      'SelectQuen', 'SelectAxii', 'ToggleSigns'
    ]
  },

  // Gegenstände
  ITEMS: {
    name: 'Gegenstände',
    description: 'Gegenstandsauswahl und -verwaltung',
    actions: [
      'ThrowItem', 'ThrowItemHold', 'OilSteel', 'OilSilver', 'OilSteelKB',
      'OilSilverKB', 'SteelSword', 'SilverSword', 'SwordSheathe', 'SwordSheatheSteel',
      'SwordSheatheSilver', 'DrinkPotion1', 'DrinkPotion1Hold', 'DrinkPotion2',
      'DrinkPotion2Hold', 'DrinkPotion3', 'DrinkPotion3Hold', 'DrinkPotion4',
      'DrinkPotion4Hold', 'DrinkPotionUpperHold', 'DrinkPotionLowerHold',
      'ComboDigitLeft', 'ComboDigitRight'
    ]
  },

  // Menüs und Panel
  MENUS: {
    name: 'Menüs & Panel',
    description: 'Spielmenüs und Panelsteuerung',
    actions: [
      'PanelGlossary', 'PanelGwintDeckEditor', 'PanelInv', 'PanelJour', 'PanelChar',
      'PanelMap', 'PanelMapPC', 'PanelAlch', 'PanelCrafting', 'PanelBestiary',
      'PanelMeditation', 'HubMenu', 'IngameMenu', 'ShowEntryInPanel',
      'ToggleHud', 'HighlightObjective', 'TrackQuest', 'ToggleTrueAutoLoot',
      'TrueRangeAutoLoot0', 'TrueRangeAutoLoot1', 'TrueRangeAutoLoot2',
      'TrueRangeAutoLoot3', 'TrueRangeAutoLoot4', 'TrueRangeAutoLoot5',
      'RadiusRangeAutoLoot0', 'RadiusRangeAutoLoot1', 'RadiusRangeAutoLoot2',
      'RadiusRangeAutoLoot3', 'RadiusRangeAutoLoot4', 'RadiusRangeAutoLoot5',
      'AutoLootRadius', 'AutoLootRadiusHold', 'FiltersToggleAutoLoot',
      'FiltersInfoAutoLoot'
    ]
  },

  // Navigation
  NAVIGATION: {
    name: 'Navigation',
    description: 'Karten- und Navigationssteuerung',
    actions: [
      'PanelMap', 'PanelMapPC', 'HoldToSeeMap', 'Toggle3DMarkers',
      'ToggleEssentials', 'PauseGameToggle', 'OnShowControlsHelp'
    ]
  },

  // Explorationsmodi
  EXPLORATION: {
    name: 'Exploration',
    description: 'Explorationsmodi und Umgebungsaufgaben',
    actions: [
      'DiveUp', 'DiveDown', 'ExplorationInteraction', 'ToggleSigns'
    ]
  },

  // Pferd
  HORSE: {
    name: 'Pferd',
    description: 'Pferdeaktionen',
    actions: [
      'MountHorse', 'Dismount', 'Follow', 'Sprint', 'SprintToggle', 'SpawnHorse'
    ]
  }
};

/**
 * Kontextabhängige Funktionen
 */
const CONTEXT_FUNCTIONS = {
  // Erkundung
  EXPLORATION: {
    name: 'Erkundung',
    description: 'Erkundungsmodi und Umgebungsaufgaben',
    context: ['Exploration', 'Diving'],
    actions: ['DiveUp', 'DiveDown', 'ExplorationInteraction']
  },

  // Kampf
  COMBAT: {
    name: 'Kampf',
    description: 'Kampfmodi',
    context: ['Combat', 'Combat_Replacer_Ciri'],
    actions: ['Dodge', 'CbtRoll', 'CbtDash', 'CbtJump', 'LockAndGuard', 'Sprint']
  },

  // Ciri
  CIRI: {
    name: 'Ciri',
    description: 'Ciri-Spezialaktionen',
    context: ['Combat_Replacer_Ciri'],
    actions: ['CiriDodge', 'CiriDash', 'CiriSpecialAttack', 'CiriAttackHeavy',
              'CiriSpecialAttackHeavy', 'CiriDrawWeapon']
  },

  // Pferd
  HORSE: {
    name: 'Pferd',
    description: 'Pferdeaktionen',
    context: ['Boat', 'BoatPassenger'],
    actions: ['MountHorse', 'Dismount', 'Follow', 'Sprint']
  },

  // Boot
  BOAT: {
    name: 'Boot',
    description: 'Bootsspezifische Aktionen',
    context: ['Boat', 'BoatPassenger'],
    actions: ['BoatDismount', 'GI_Accelerate', 'GI_Decelerate']
  }
};

/**
 * Technische Hilfsaktionen
 */
const TECHNICAL_ACTIONS = {
  // Eingabehilfen
  INPUT_HELPERS: {
    name: 'Eingabehilfen',
    description: 'Technische Eingabehilfen',
    actions: ['PinModuleModfier', 'Alternate', 'Focus', 'Reprocess']
  },

  // Debugging
  DEBUGGING: {
    name: 'Debugging',
    description: 'Debugging-Aktionen',
    actions: ['DebugInput', 'Debug_KillAllEnemies', 'Debug_KillTarget',
              'Debug_TeleportToPin']
  }
};

/**
 * Konfliktgruppen für Sicherheitsmechanismen
 */
const CONFLICT_GROUPS = [
  {
    name: 'Kampfaktionen',
    description: 'Kampfaktionen, die sich gegenseitig beeinflussen',
    actions: ['AttackHeavy', 'AttackLight', 'SpecialAttackHeavy', 'SpecialAttackLight'],
    conflicts: ['AttackWithAlternateLight', 'AttackWithAlternateHeavy']
  },
  {
    name: 'Signe',
    description: 'Signe und ihre Spezialaktionen',
    actions: ['CastSign', 'CastSignHold'],
    conflicts: ['SelectAard', 'SelectYrden', 'SelectIgni', 'SelectQuen', 'SelectAxii']
  },
  {
    name: 'Gegenstände',
    description: 'Gegenstandsauswahl und -verwendung',
    actions: ['ThrowItem', 'ThrowItemHold'],
    conflicts: ['OilSteel', 'OilSilver', 'SteelSword', 'SilverSword']
  }
];

/**
 * Funktion zur Konvertierung von raw Bindings zu semantischen Gruppen
 * @param {Object} rawBindings - Die rohen Bindings aus input.settings
 * @returns {Object} Semantische Bindungen
 */
function convertToSemanticBindings(rawBindings) {
  // Implementierung des Konvertierungsprozesses
  const semanticBindings = {};

  // Für jedes Binding wird eine semantische Gruppe bestimmt
  Object.keys(rawBindings).forEach(bindingKey => {
    const binding = rawBindings[bindingKey];

    // Bestimme die semantische Gruppe basierend auf der Aktion
    const action = binding.Action;
    const semanticGroup = getSemanticGroupForAction(action);

    if (!semanticBindings[semanticGroup]) {
      semanticBindings[semanticGroup] = [];
    }

    semanticBindings[semanticGroup].push({
      key: bindingKey,
      action: action,
      state: binding.State,
      idleTime: binding.IdleTime,
      value: binding.Value
    });
  });

  return semanticBindings;
}

/**
 * Bestimmt die semantische Gruppe für eine Aktion
 * @param {string} action - Die Aktion
 * @returns {string} Die semantische Gruppe
 */
function getSemanticGroupForAction(action) {
  for (const [groupKey, group] of Object.entries(SEMANTIC_GROUPS)) {
    if (group.actions.includes(action)) {
      return groupKey;
    }
  }

  // Wenn keine Gruppe gefunden wurde, zurückgeben als "UNDEFINED"
  return 'UNDEFINED';
}

/**
 * Prüft auf Konflikte zwischen Aktionen
 * @param {Object} binding1 - Erste Aktion
 * @param {Object} binding2 - Zweite Aktion
 * @returns {boolean} Ob Konflikt besteht
 */
function checkConflict(binding1, binding2) {
  // Prüfe ob die Aktionen in konfliktären Gruppen sind
  const group1 = getSemanticGroupForAction(binding1.action);
  const group2 = getSemanticGroupForAction(binding2.action);

  // Prüfe ob beide Aktionen in einer Konfliktgruppe sind
  for (const conflictGroup of CONFLICT_GROUPS) {
    if (conflictGroup.actions.includes(binding1.action) &&
        conflictGroup.actions.includes(binding2.action)) {
      return true;
    }

    if (conflictGroup.conflicts.includes(binding1.action) &&
        conflictGroup.conflicts.includes(binding2.action)) {
      return true;
    }
  }

  return false;
}

/**
 * Erstellt eine Liste von Aktionen für einen bestimmten Kontext
 * @param {string} context - Der Spielkontext
 * @returns {Array} Liste der Aktionen für den Kontext
 */
function getActionsForContext(context) {
  const actions = [];

  // Füge Aktionen aus semantischen Gruppen hinzu
  Object.values(SEMANTIC_GROUPS).forEach(group => {
    if (group.context && group.context.includes(context)) {
      actions.push(...group.actions);
    }
  });

  // Füge Aktionen aus Kontextfunktionen hinzu
  Object.values(CONTEXT_FUNCTIONS).forEach(contextFunc => {
    if (contextFunc.context && contextFunc.context.includes(context)) {
      actions.push(...contextFunc.actions);
    }
  });

  return actions;
}

/**
 * Funktion zur Überprüfung von Konflikten zwischen Aktionen
 * @param {Array} bindings - Liste von Bindings
 * @returns {Array} Liste von Konflikten
 */
function findConflicts(bindings) {
  const conflicts = [];

  // Vergleiche jedes Binding mit allen anderen Bindings
  for (let i = 0; i < bindings.length; i++) {
    for (let j = i + 1; j < bindings.length; j++) {
      if (checkConflict(bindings[i], bindings[j])) {
        conflicts.push({
          binding1: bindings[i],
          binding2: bindings[j]
        });
      }
    }
  }

  return conflicts;
}

export {
  SEMANTIC_GROUPS,
  CONTEXT_FUNCTIONS,
  TECHNICAL_ACTIONS,
  CONFLICT_GROUPS,
  convertToSemanticBindings,
  getSemanticGroupForAction,
  checkConflict,
  getActionsForContext,
  findConflicts
};