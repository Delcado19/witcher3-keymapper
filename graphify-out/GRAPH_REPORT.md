# Graph Report - witcher3-keymapper  (2026-09-24)

## Corpus Check
- 32 files · ~241,888 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 4, .css 1, .bat 1)

## Summary
- 424 nodes · 824 edges · 28 communities (23 shown, 5 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 78 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a07afbea`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- onLeaderDrag
- server.js
- app.js
- DOM Manipulation
- device-ui.test.js
- buildLocalizationMap
- What You Must Do When Invoked
- buildScan
- handleDevices
- test-semantic-bindings.js
- server
- Project Metadata
- Witcher 3 Keymapper
- AGENTS.md - Entry Point For AI Coding Tools
- Requirements: Device-Centric UI
- graphify reference: extra exports and benchmark
- Design: Device-Centric UI
- graphify reference: query, path, explain
- Tasks: Device-Centric UI
- decodeW3StringsToCachedCsv
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- extraction-spec.md
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
9. `What You Must Do When Invoked` - 12 edges
10. `Requirements: Device-Centric UI` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Server Components` --references--> `parseInputSettingsText()`  [INFERRED]
  docs/specs/device-centric-ui/design.md → server.js
- `Client Components` --references--> `applyStaticTexts()`  [INFERRED]
  docs/specs/device-centric-ui/design.md → public/app.js
- `Client Components` --references--> `remapSessionContent()`  [INFERRED]
  docs/specs/device-centric-ui/design.md → public/app.js
- `Client Components` --references--> `openPopover()`  [INFERRED]
  docs/specs/device-centric-ui/design.md → public/app.js
- `Client Components` --references--> `matchDevice()`  [INFERRED]
  docs/specs/device-centric-ui/design.md → public/app.js

## Import Cycles
- None detected.

## Communities (28 total, 5 thin omitted)

### Community 0 - "onLeaderDrag"
Cohesion: 0.09
Nodes (33): applyLeaderLabels(), boundActionNames(), buildDebugGrid(), buildDeviceSvg(), buildKeyEl(), buildLeaderSceneInto(), collectSnapTargets(), computeLeaderLayout() (+25 more)

### Community 1 - "server.js"
Cohesion: 0.08
Nodes (34): ref_node_child_process, ref_node_crypto, ref_node_http, ref_node_url, activationBucket(), assertValidProfilePayload(), BENIGN_COMMAND_GROUPS, CIRI_TWINS_BY_GERALT (+26 more)

### Community 2 - "app.js"
Cohesion: 0.06
Nodes (91): Client Components, activeProfileId(), activeProfileIds(), adjustEditorFont(), applyColoring(), applyConflicts(), applyStaticTexts(), assignKeyToCommand() (+83 more)

### Community 3 - "DOM Manipulation"
Cohesion: 0.10
Nodes (14): ref_node_assert, ref_node_fs, ref_node_path, assert, El, fs, gamepad, makeClassList() (+6 more)

### Community 4 - "device-ui.test.js"
Cohesion: 0.09
Nodes (21): buildRemapPreview(), COLORS, KEYCODE_TO_IK, ref_node_os, ALIAS_COMMAND_CANONICAL, CIRI_TWIN_ACTION, cleanLocalizedDisplayName(), CURATED_DISPLAY_NAMES (+13 more)

### Community 5 - "buildLocalizationMap"
Cohesion: 0.16
Nodes (19): buildLocalizationMap(), collectLocalizationCsvFiles(), collectLocalizationDictionaryKeys(), collectW3StringsFiles(), collectWitcherScriptFiles(), detectLocalizationLanguage(), findLocalizationCsvFiles(), findW3StringsFiles() (+11 more)

### Community 6 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 7 - "buildScan"
Cohesion: 0.12
Nodes (16): buildScan(), collectModInputXmlFiles(), collectRelevantFiles(), curatedDisplayName(), detectLayoutLanguageWin32Sync(), detectLayoutLanguageWin32SyncUncached(), deviceForKey(), findActionSources() (+8 more)

### Community 8 - "handleDevices"
Cohesion: 0.40
Nodes (6): detectDevicesWin32(), detectLayoutLanguageWin32(), handleDevices(), runPowerShell(), sendJson(), uiLanguageForTag()

### Community 9 - "test-semantic-bindings.js"
Cohesion: 0.16
Nodes (17): checkConflict(), CONFLICT_GROUPS, CONTEXT_FUNCTIONS, convertToSemanticBindings(), findConflicts(), getActionsForContext(), getSemanticGroupForAction(), SEMANTIC_GROUPS (+9 more)

### Community 10 - "server"
Cohesion: 0.15
Nodes (18): addSyntaxDiagnostic(), assertValidInputSettings(), decodeBuffer(), expandActionsWithCiriTwins(), extractMultipartFile(), handleSave(), isAllowedHost(), isAllowedOrigin() (+10 more)

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

### Community 15 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 16 - "Design: Device-Centric UI"
Cohesion: 0.22
Nodes (8): Data Flow, Design: Device-Centric UI, Device Profiles, Goals, Localization Rules, Overview, Safety, Server Components

### Community 17 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 18 - "Tasks: Device-Centric UI"
Cohesion: 0.33
Nodes (5): Completed, Current Verification, Maintenance Notes, Open Follow-Ups, Tasks: Device-Centric UI

### Community 19 - "decodeW3StringsToCachedCsv"
Cohesion: 0.50
Nodes (5): decodeW3StringsToCachedCsv(), hashW3StringsDictionaryKeys(), sortedW3StringsDictionaryKeys(), w3StringsToolKind(), writeW3StringsDictionary()

### Community 20 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 21 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 22 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

## Knowledge Gaps
- **146 isolated node(s):** `name`, `version`, `private`, `description`, `start` (+141 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 179 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Design: Device-Centric UI` connect `Design: Device-Centric UI` to `app.js`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `Client Components` connect `app.js` to `Design: Device-Centric UI`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `openPopover()` (e.g. with `Client Components` and `onOutsideClick()`) actually correct?**
  _`openPopover()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _146 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `onLeaderDrag` be split into smaller, more focused modules?**
  _Cohesion score 0.09243697478991597 - nodes in this community are weakly interconnected._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07563025210084033 - nodes in this community are weakly interconnected._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.062111801242236024 - nodes in this community are weakly interconnected._