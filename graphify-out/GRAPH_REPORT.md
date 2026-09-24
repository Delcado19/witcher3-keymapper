# Graph Report - witcher3-keymapper  (2026-09-24)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 285 nodes · 685 edges · 16 communities
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 71 edges (avg confidence: 0.85)
- Token cost: 21,460 input · 142 output

## Graph Freshness
- Built from commit: `9fc32368`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Editor Functionality
- Server Utilities
- Device Rendering
- DOM Manipulation
- Display Names
- Localization
- Language Handling
- Input Processing
- Server Logic
- Command Rendering
- Input Parsing
- Project Metadata
- Popover Controls
- Conflict Detection
- Key Assignment
- Color Mapping

## God Nodes (most connected - your core abstractions)
1. `t()` - 35 edges
2. `renderDeviceView()` - 23 edges
3. `buildScan()` - 21 edges
4. `openPopover()` - 15 edges
5. `server` - 14 edges
6. `onLeaderDrag()` - 12 edges
7. `load()` - 12 edges
8. `El` - 11 edges
9. `svgNode()` - 11 edges
10. `showToast()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `seedProfile()` --calls--> `computeLeaderLayout()`  [EXTRACTED]
  scripts/seed-leader-layout.js → public/app.js

## Import Cycles
- None detected.

## Communities (16 total, 0 thin omitted)

### Community 0 - "Editor Functionality"
Cohesion: 0.07
Nodes (42): activeProfileId(), activeProfileIds(), adjustEditorFont(), applyConflicts(), applyLeaderLabels(), attachLeaderEditor(), boundActionNames(), buildDebugGrid() (+34 more)

### Community 1 - "Server Utilities"
Cohesion: 0.08
Nodes (33): ref_node_child_process, ref_node_crypto, ref_node_http, ref_node_url, assertValidProfilePayload(), BENIGN_COMMAND_GROUPS, CIRI_TWINS_BY_GERALT, compareInputKeys() (+25 more)

### Community 2 - "Device Rendering"
Cohesion: 0.11
Nodes (30): applyColoring(), attachKeyInteractions(), buildLegend(), deviceHasBindings(), deviceLabel(), getProfile(), I18N, LEADER (+22 more)

### Community 3 - "DOM Manipulation"
Cohesion: 0.10
Nodes (14): ref_node_assert, ref_node_fs, ref_node_path, assert, El, fs, gamepad, makeClassList() (+6 more)

### Community 4 - "Display Names"
Cohesion: 0.10
Nodes (18): COLORS, KEYCODE_TO_IK, ref_node_os, ALIAS_COMMAND_CANONICAL, CIRI_TWIN_ACTION, cleanLocalizedDisplayName(), CURATED_DISPLAY_NAMES, humanizeDisplayName() (+10 more)

### Community 5 - "Localization"
Cohesion: 0.14
Nodes (21): buildLocalizationMap(), collectLocalizationCsvFiles(), collectLocalizationDictionaryKeys(), collectW3StringsFiles(), collectWitcherScriptFiles(), detectLocalizationLanguage(), findExecutableOnPath(), findLocalizationCsvFiles() (+13 more)

### Community 6 - "Language Handling"
Cohesion: 0.23
Nodes (20): applyStaticTexts(), clearBinding(), confirmClear(), currentLanguage(), decodeInputSettingsBuffer(), detectBrowserLanguage(), getLanguageChoice(), handleLoadFile() (+12 more)

### Community 7 - "Input Processing"
Cohesion: 0.14
Nodes (14): buildScan(), collectModInputXmlFiles(), collectRelevantFiles(), curatedDisplayName(), deviceForKey(), findActionSources(), findModInputXmlFiles(), isEngineInternalCommand() (+6 more)

### Community 8 - "Server Logic"
Cohesion: 0.18
Nodes (13): decodeBuffer(), detectDevicesWin32(), detectLayoutLanguageWin32(), extractMultipartFile(), handleDevices(), isAllowedHost(), isAllowedOrigin(), resolvePublicPath() (+5 more)

### Community 9 - "Command Rendering"
Cohesion: 0.33
Nodes (11): commandSourceLine(), commandTitleText(), escapeHtml(), groupConflicts(), hasResolvedName(), keyChip(), render(), renderCommands() (+3 more)

### Community 10 - "Input Parsing"
Cohesion: 0.24
Nodes (11): addSyntaxDiagnostic(), assertValidInputSettings(), expandActionsWithCiriTwins(), handleSave(), parseInputSettings(), parseInputSettingsText(), parseOptionalInputSettings(), remap() (+3 more)

### Community 11 - "Project Metadata"
Cohesion: 0.20
Nodes (9): description, engines, node, name, private, scripts, start, test (+1 more)

### Community 12 - "Popover Controls"
Cohesion: 0.32
Nodes (8): closePopover(), commandActionsLine(), highlightConflicts(), onOutsideClick(), onPopoverKeydown(), openPopover(), positionPopover(), uniqueInformativeActions()

### Community 13 - "Conflict Detection"
Cohesion: 0.25
Nodes (8): activationBucket(), conflictRelevantItems(), findConflicts(), isBenignCommandSet(), isDebugCommand(), isVanillaOnlyConflict(), labelKey(), riskyKey()

### Community 14 - "Key Assignment"
Cohesion: 0.38
Nodes (7): assignKeyToCommand(), buildRemapPreview(), ikForKeyboardEvent(), openRemap(), renderRemapPreview(), startKeyCapture(), stopKeyCapture()

### Community 15 - "Color Mapping"
Cohesion: 0.40
Nodes (6): buildColorMap(), computeTopMods(), dominantVanillaCategory(), rebuildColorMap(), vanillaCategoryForAction(), vanillaCategoryForCommand()

## Knowledge Gaps
- **51 isolated node(s):** `{ computeLeaderLayout }`, `fs`, `path`, `PROFILES`, `BENIGN_COMMAND_GROUPS` (+46 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 68 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `computeLeaderLayout()` connect `Editor Functionality` to `Device Rendering`, `Display Names`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `findConflicts()` connect `Conflict Detection` to `Server Utilities`, `Display Names`, `Input Processing`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `openPopover()` (e.g. with `onOutsideClick()` and `onPopoverKeydown()`) actually correct?**
  _`openPopover()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `{ computeLeaderLayout }`, `fs`, `path` to the rest of the system?**
  _51 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Editor Functionality` be split into smaller, more focused modules?**
  _Cohesion score 0.07293868921775898 - nodes in this community are weakly interconnected._
- **Should `Server Utilities` be split into smaller, more focused modules?**
  _Cohesion score 0.0766488413547237 - nodes in this community are weakly interconnected._
- **Should `Device Rendering` be split into smaller, more focused modules?**
  _Cohesion score 0.10967741935483871 - nodes in this community are weakly interconnected._