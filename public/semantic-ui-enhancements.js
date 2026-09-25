/**
 * UI-Verbesserungen für das semantische Bindings-Modell
 * Implementiert visuelle Feedback-Mechanismen und verbesserte Darstellung
 *
 * Loaded as a classic <script> before app.js, so these functions are browser
 * globals (app.js and inline onmouse* handlers call them directly). This file is
 * the single source; do not re-declare them in app.js — a later function
 * declaration would silently override these.
 */

/**
 * Erstellt eine visuelle Darstellung für semantische Gruppen
 * @param {string} groupKey - Der Schlüssel der semantischen Gruppe
 * @returns {Object} Stil- und Darstellungsinformationen
 */
function getSemanticGroupStyle(groupKey) {
  const styles = {
    INTERACTION: {
      color: '#4CAF50',      // Grün für Interaktionen
      backgroundColor: '#E8F5E9',
      borderColor: '#4CAF50',
      icon: '🔍',            // Such-Icon für Interaktion
      hoverColor: '#45a049'
    },
    COMBAT: {
      color: '#F44336',      // Rot für Kampf
      backgroundColor: '#FFEBEE',
      borderColor: '#F44336',
      icon: '⚔️',            // Schwert-Icon für Kampf
      hoverColor: '#d32f2f'
    },
    MOVEMENT: {
      color: '#2196F3',      // Blau für Bewegung
      backgroundColor: '#E3F2FD',
      borderColor: '#2196F3',
      icon: '🏃',            // Lauf-Icon für Bewegung
      hoverColor: '#1976D2'
    },
    SIGNS: {
      color: '#9C27B0',      // Lila für Signe
      backgroundColor: '#F3E5F5',
      borderColor: '#9C27B0',
      icon: '✨',            // Glitzer-Icon für Signe
      hoverColor: '#7B1FA2'
    },
    ITEMS: {
      color: '#FF9800',      // Orange für Gegenstände
      backgroundColor: '#FFF3E0',
      borderColor: '#FF9800',
      icon: '📦',            // Paket-Icon für Gegenstände
      hoverColor: '#F57C00'
    },
    MENUS: {
      color: '#3F51B5',      // Blau-Grün für Menüs
      backgroundColor: '#E8EAF6',
      borderColor: '#3F51B5',
      icon: '📋',            // Dokument-Icon für Menüs
      hoverColor: '#303F9F'
    },
    NAVIGATION: {
      color: '#607D8B',      // Grau für Navigation
      backgroundColor: '#F5F5F5',
      borderColor: '#607D8B',
      icon: '🗺️',            // Karten-Icon für Navigation
      hoverColor: '#455A64'
    },
    EXPLORATION: {
      color: '#8BC34A',      // Hellgrün für Exploration
      backgroundColor: '#F1F8E9',
      borderColor: '#8BC34A',
      icon: '🧭',            // Kompass-Icon für Exploration
      hoverColor: '#689F38'
    },
    HORSE: {
      color: '#FF5722',      // Orange-Rot für Pferd
      backgroundColor: '#FFF3E0',
      borderColor: '#FF5722',
      icon: '🐴',            // Pferd-Icon für Pferd
      hoverColor: '#E64A19'
    },
    UNDEFINED: {
      color: '#9E9E9E',      // Grau für undefinierte Aktionen
      backgroundColor: '#FAFAFA',
      borderColor: '#9E9E9E',
      icon: '❓',            // Fragezeichen-Icon
      hoverColor: '#616161'
    }
  };

  return styles[groupKey] || styles.UNDEFINED;
}

/**
 * Erstellt eine visuelle Darstellung für Konflikte
 * @param {Object} conflict - Der Konflikt
 * @returns {Object} Stil- und Darstellungsinformationen für Konflikte
 */
function getConflictStyle(conflict) {
  return {
    color: '#F44336',
    backgroundColor: 'rgba(255, 235, 238, 0.1)', // Light red with transparency
    borderColor: '#F44336',
    borderWidth: '2px',
    borderStyle: 'solid',
    boxShadow: '0 2px 4px rgba(244, 67, 54, 0.2)',
    borderRadius: '4px',
    padding: '4px 6px'
  };
}

/**
 * Erstellt ein visuelles Feedback für Tastenaktionen
 * @param {HTMLElement} element - Das HTML-Element
 * @param {string} eventType - Der Event-Typ ('press', 'release', 'hover')
 */
function applyButtonFeedback(element, eventType) {
  const styles = {
    press: {
      transform: 'scale(0.97)',
      transition: 'transform 100ms ease-out'
    },
    release: {
      transform: 'scale(1)',
      transition: 'transform 160ms ease-out'
    },
    hover: {
      transform: 'scale(1.02)',
      transition: 'transform 120ms ease-out'
    }
  };

  if (element && styles[eventType]) {
    Object.assign(element.style, styles[eventType]);
  }
}

/**
 * Erstellt eine visuelle Unterscheidung für verschiedene Aktionstypen
 * @param {string} actionType - Der Aktionstyp
 * @returns {Object} Stil- und Darstellungsinformationen
 */
function getActionTypeStyle(actionType) {
  const styles = {
    'normal': {
      color: '#333',
      backgroundColor: '#f5f5f5',
      borderColor: '#ddd'
    },
    'conflict': {
      color: '#F44336',
      backgroundColor: '#FFEBEE',
      borderColor: '#F44336',
      fontWeight: 'bold'
    },
    'context': {
      color: '#2196F3',
      backgroundColor: '#E3F2FD',
      borderColor: '#2196F3'
    },
    'technical': {
      color: '#9E9E9E',
      backgroundColor: '#FAFAFA',
      borderColor: '#9E9E9E'
    }
  };

  return styles[actionType] || styles.normal;
}

/**
 * Erstellt eine animierte Übergangsdarstellung
 * @param {HTMLElement} element - Das HTML-Element
 * @param {string} animationType - Der Animations-Typ ('fade', 'slide', 'bounce')
 */
function applyAnimation(element, animationType) {
  const animations = {
    fade: {
      transition: 'opacity 200ms ease-out',
      opacity: '0.7'
    },
    slide: {
      transition: 'transform 200ms ease-out',
      transform: 'translateX(-5px)'
    },
    bounce: {
      transition: 'transform 300ms cubic-bezier(0.23, 1, 0.32, 1)',
      transform: 'scale(0.95)'
    }
  };

  if (element && animations[animationType]) {
    Object.assign(element.style, animations[animationType]);
  }
}

/**
 * Erstellt eine visuelle Darstellung für leere Zustände
 * @param {string} type - Der Typ des leeren Zustands
 * @returns {Object} Stil- und Darstellungsinformationen
 */
function getEmptyStateStyle(type) {
  const styles = {
    'no-conflicts': {
      color: '#9E9E9E',
      backgroundColor: '#FAFAFA',
      border: '1px dashed #E0E0E0',
      textAlign: 'center',
      padding: '20px',
      borderRadius: '4px'
    },
    'no-bindings': {
      color: '#9E9E9E',
      backgroundColor: '#FAFAFA',
      border: '1px solid #E0E0E0',
      textAlign: 'center',
      padding: '30px',
      borderRadius: '4px'
    }
  };

  return styles[type] || styles['no-conflicts'];
}