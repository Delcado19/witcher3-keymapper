# Graph Report - witcher3-keymapper  (2026-09-25)

## Corpus Check
- 23 files · ~58,631 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 4, .css 2, .bat 1)

## Summary
- 375 nodes · 787 edges · 21 communities (18 shown, 3 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 78 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c69870a9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- seed-leader-layout.js
- server.js
- app.js
- DOM Manipulation
- device-ui.test.js
- buildLocalizationMap
- openPopover
- buildScan
- server
- test-semantic-bindings.js
- parseInputSettingsText
- Project Metadata
- Witcher 3 Keymapper
- AGENTS.md - Entry Point For AI Coding Tools
- Requirements: Device-Centric UI
- findConflicts
- Design: Device-Centric UI
- Tasks: Device-Centric UI
- assets/README.md
- w3strings-ng/README.md

## God Nodes (most connected - your core abstractions)
1. `t()` - 35 edges
2. `renderDeviceView()` - 23 edges
3. `buildScan()` - 21 edges
4. `openPopover()` - 16 edges
5. `server` - 14 edges
6. `Witcher 3 Keymapper` - 13 edges
7. `load()` - 12 edges
8. `onLeaderDrag()` - 12 edges
9. `Requirements: Device-Centric UI` - 12 edges
10. `svgNode()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Server Components` --references--> `parseInputSettingsText()`  [INFERRED]
  docs/specs/device-centric-ui/design.md → server.js
- `Client Components` --references--> `openPopover()`  [INFERRED]
  docs/specs/device-centric-ui/design.md → public/app.js
- `Client Components` --references--> `applyStaticTexts()`  [INFERRED]
  docs/specs/device-centric-ui/design.md → public/app.js
- `Client Components` --references--> `remapSessionContent()`  [INFERRED]
  docs/specs/device-centric-ui/design.md → public/app.js
- `Client Components` --references--> `matchDevice()`  [INFERRED]
  docs/specs/device-centric-ui/design.md → public/app.js

## Import Cycles
- None detected.

## Communities (21 total, 3 thin omitted)

### Community 0 - "seed-leader-layout.js"
Cohesion: 0.25
Nodes (6): ref_fs, ref_path, { computeLeaderLayout }, fs, path, PROFILES

### Community 1 - "server.js"
Cohesion: 0.08
Nodes (33): ref_node_child_process, ref_node_crypto, ref_node_http, ref_node_url, assertValidProfilePayload(), BENIGN_COMMAND_GROUPS, CIRI_TWINS_BY_GERALT, compareInputKeys() (+25 more)

### Community 2 - "app.js"
Cohesion: 0.06
Nodes (91): Client Components, activeProfileId(), activeProfileIds(), adjustEditorFont(), applyColoring(), applyConflicts(), applyLeaderLabels(), applyStaticTexts() (+83 more)

### Community 3 - "DOM Manipulation"
Cohesion: 0.10
Nodes (14): ref_node_assert, ref_node_fs, ref_node_path, assert, El, fs, gamepad, makeClassList() (+6 more)

### Community 4 - "device-ui.test.js"
Cohesion: 0.10
Nodes (18): COLORS, KEYCODE_TO_IK, ref_node_os, ALIAS_COMMAND_CANONICAL, CIRI_TWIN_ACTION, cleanLocalizedDisplayName(), CURATED_DISPLAY_NAMES, humanizeDisplayName() (+10 more)

### Community 5 - "buildLocalizationMap"
Cohesion: 0.14
Nodes (21): buildLocalizationMap(), collectLocalizationCsvFiles(), collectLocalizationDictionaryKeys(), collectW3StringsFiles(), collectWitcherScriptFiles(), detectLocalizationLanguage(), findExecutableOnPath(), findLocalizationCsvFiles() (+13 more)

### Community 6 - "openPopover"
Cohesion: 0.11
Nodes (31): assignKeyToCommand(), attachKeyInteractions(), boundActionNames(), buildRemapPreview(), closePopover(), commandActionsLine(), commandSourceLine(), commandTitleText() (+23 more)

### Community 7 - "buildScan"
Cohesion: 0.14
Nodes (14): buildScan(), collectModInputXmlFiles(), collectRelevantFiles(), curatedDisplayName(), deviceForKey(), findActionSources(), findModInputXmlFiles(), isEngineInternalCommand() (+6 more)

### Community 8 - "server"
Cohesion: 0.18
Nodes (13): decodeBuffer(), detectDevicesWin32(), detectLayoutLanguageWin32(), extractMultipartFile(), handleDevices(), isAllowedHost(), isAllowedOrigin(), resolvePublicPath() (+5 more)

### Community 9 - "test-semantic-bindings.js"
Cohesion: 0.16
Nodes (17): checkConflict(), CONFLICT_GROUPS, CONTEXT_FUNCTIONS, convertToSemanticBindings(), findConflicts(), getActionsForContext(), getSemanticGroupForAction(), SEMANTIC_GROUPS (+9 more)

### Community 10 - "parseInputSettingsText"
Cohesion: 0.24
Nodes (11): addSyntaxDiagnostic(), assertValidInputSettings(), expandActionsWithCiriTwins(), handleSave(), parseInputSettings(), parseInputSettingsText(), parseOptionalInputSettings(), remap() (+3 more)

### Community 11 - "Project Metadata"
Cohesion: 0.20
Nodes (9): description, engines, node, name, private, scripts, start, test (+1 more)

### Community 12 - "Witcher 3 Keymapper"
Cohesion: 0.14
Nodes (13): Artwork, CI, Configuration, Cross-Platform Status, Device Registry, Features, HTTP API, Language (+5 more)

### Community 13 - "AGENTS.md - Entry Point For AI Coding Tools"
Cohesion: 0.15
Nodes (12): 0. Quick Orientation, 1. Project And Structure, 2. Commands, 3. Git Context, 4. Documentation Protocol For Every Code Change, 5. Safety And Configuration, 6. Roadmap, AGENTS.md - Entry Point For AI Coding Tools (+4 more)

### Community 14 - "Requirements: Device-Centric UI"
Cohesion: 0.15
Nodes (12): Requirement 10: Local Safety, Requirement 11: Property Checks, Requirement 1: Device Profiles, Requirement 2: SVG Rendering, Requirement 3: Coloring, Requirement 4: Conflict Display, Requirement 5: Remap And Clear, Requirement 6: Load And Save (+4 more)

### Community 15 - "findConflicts"
Cohesion: 0.25
Nodes (8): activationBucket(), conflictRelevantItems(), findConflicts(), isBenignCommandSet(), isDebugCommand(), isVanillaOnlyConflict(), labelKey(), riskyKey()

### Community 16 - "Design: Device-Centric UI"
Cohesion: 0.22
Nodes (8): Data Flow, Design: Device-Centric UI, Device Profiles, Goals, Localization Rules, Overview, Safety, Server Components

### Community 18 - "Tasks: Device-Centric UI"
Cohesion: 0.33
Nodes (5): Completed, Current Verification, Maintenance Notes, Open Follow-Ups, Tasks: Device-Centric UI

## Knowledge Gaps
- **105 isolated node(s):** `name`, `version`, `private`, `description`, `start` (+100 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 136 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Design: Device-Centric UI` connect `Design: Device-Centric UI` to `app.js`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `Client Components` connect `app.js` to `Design: Device-Centric UI`, `openPopover`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `openPopover()` (e.g. with `Client Components` and `onOutsideClick()`) actually correct?**
  _`openPopover()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _105 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.0766488413547237 - nodes in this community are weakly interconnected._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05913978494623656 - nodes in this community are weakly interconnected._
- **Should `DOM Manipulation` be split into smaller, more focused modules?**
  _Cohesion score 0.10153846153846154 - nodes in this community are weakly interconnected._