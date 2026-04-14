# SynCom_BuildToolbarMetadata-2026-04-12

## Current Subject
Build toolbar metadata refactor and handoff

## Conversation Compendium

### 1) Initial toolbar cleanup and active build toolbar selection
The current work started with the user wanting the old build-toolbar path removed and the active GUI to use the intended build toolbar implementation [kept]. The user had multiple toolbar variants in play and wanted the UI to preserve the working build toolbar while eliminating redundant or confusing legacy paths [kept].

The active goals were:
- remove the old build toolbar render path [worked]
- keep the functioning build toolbar implementation [kept]
- preserve the toolbar’s existing visual identity [kept]
- avoid broad rewrites [kept]

This set the direction for the work: targeted cleanup only, not a complete redesign.

---

### 2) Main toolbar and build toolbar background restoration
As changes accumulated, the main toolbar and build toolbar backgrounds were temporarily impacted by container-style edits [didn't work]. The user specifically objected when backgrounds disappeared or the visual shell became too abstract or theme-driven [kept].

The recovery approach was:
- restore visible panel backgrounds [worked]
- keep toolbar shells distinct [kept]
- avoid forcing the toolbars to share identical styling [kept]
- keep the build toolbar functional above the canvas with popup menus [worked]

This stabilized the visual presence of the toolbars while preserving their identity.

---

### 3) Build toolbar v2 migration into the active build toolbar
The user asked for the expanding menu logic from the old `BuildToolbarV2` to be migrated into the active `BuildToolbar.tsx`, but without bringing the theme/global-styling system into that path [kept]. The key requirement was to preserve the self-populating room menu logic [kept].

That meant:
- room definitions should populate from `roomMetadata.json` [worked]
- the expanding hover menus should remain [worked]
- the active build toolbar should generate its own display labels [worked]
- no theme-based toolbar styling should be introduced into this path [kept]

This was the main functional migration task.

---

### 4) Room metadata schema redesign
The conversation then moved into a deep room metadata schema redesign. The user wanted the room metadata to support a clean semantic model:
- `class` = what it is
- `size` = how big it is
- `form` = structural type
- `specialization` = what it does
- `quality` = how premium it is

This was a major conceptual shift [worked]. The user wanted the metadata to support natural language room names in the UI and to preserve meaning in the structured fields rather than relying on raw names alone [kept].

---

### 5) Size tiering by cell count
The user clarified that room size should be calculated from the geometry:
- `width * height` gives the cell count [kept]
- size should then be tiered from that number [worked]

The agreed tier thresholds were refined to:
- `Small` = 6 cells or less
- `Medium` = 7 to 10 cells
- `Large` = 11 to 19 cells
- `XL` = 20 cells or more

This was a practical compromise that preserves room scale while avoiding an overly coarse system [worked].

The user also explicitly rejected `HQ Suite` as a size tier and preferred `XL` [kept].

---

### 6) Structural form vocabulary
The `form` field was positioned as the structural descriptor rather than a duplicate of `class` [worked]. The vocabulary evolved into real-world structural terms that still preserve natural language readability:
- `Studio`
- `One-Bedroom`
- `Two-Bedroom`
- `Duplex`
- `Loft`
- `Suite`
- `Executive Suite`
- `Counter Service`
- `Dining Hall`
- `Fine Dining`

This allowed the room data to communicate structure clearly without overloading the `class` field [worked].

The user specifically wanted `Executive Suite` to be used for office HQ-type forms [kept], and wanted `Loft` preserved as a valid structural form [kept].

---

### 7) Specialization rules by room domain
The user clarified how `specialization` should behave:

#### Residences
Residences do not have advanced specializations, so the user wanted them grouped under:
- `specialization: "Residence"` [kept]

This applies to apartment/residence entries and is meant to keep residential data simple and readable [worked].

#### Offices
Offices should keep meaningful specializations such as:
- `Insurance`
- `Accounting`
- `Legal`
- `Creative`
- `Financial`
- `Engineering`
- `Tech`
- `Medical`
- `Government Offices`
- `Bank Headquarters`

These are the real functional descriptors that matter for office modules [kept].

#### Restaurants
Restaurants should keep meaningful specializations such as:
- `Chinese`
- `Indian`
- `Seafood`
- `Thai`
- `Cafes`
- `Fast Food`
- `Diners`
- `Sandwich Shops`
- `Salad and Hot Bars`
- `Pizza Places`
- `Sports Bars`
- `Italian`
- `Mexican`
- `Brunch Spots`
- `Family Restaurants`
- `Food Courts`

These preserve the cuisine / service identity of the restaurant rooms [worked].

The user explicitly rejected a broad “Restaurant” specialization for restaurant entries [didn't work], so the specialization values were restored to their specific meanings [worked].

---

### 8) Quality as premium/descriptor
The `quality` field was clarified as a premium/style descriptor rather than a hard-limited enum [kept]. The user explicitly wanted values like:
- `Basic`
- `Deluxe`
- `Luxury`
- `Standard`
- `Gourmet`

to be supported where they preserve meaning [kept].

This is especially relevant to:
- apartment/residence entries
- premium office suites
- gourmet restaurant entries

The user specifically wanted `Gourmet` preserved for upscale restaurant modules [kept], and that was reflected in the data [worked].

---

### 9) Menu label generation from metadata
The build toolbar menu labels were updated to be generated from metadata rather than raw room names [worked]. The user wanted display naming rules that were short, readable, and natural-language-like.

The agreed display rules became:
- **menu button labels**: `[size] [specialization] [form]`
- **tooltip first line**: `[size] [specialization] [form]`
- **tooltip second line**: `[quality] [class]`

The display text was title-cased for readability [worked].

This made the build toolbar a more usable metadata browser and reduced reliance on the raw JSON `name` field [worked].

---

### 10) Build toolbar display formatting refinements
The user iterated on the label order to ensure the menus would visually distinguish similar rooms [kept]. The final chosen order for menu readability became:
- size first
- specialization second
- form third

This produced labels that clearly describe the room in a compact way, such as:
- `Small Insurance Suite`
- `Medium Accounting Suite`
- `XL Government Offices Executive Suite`
- `Small Residence Studio`

The tooltips were intentionally kept compact with tight line spacing to avoid excessive ballooning [kept].

---

### 11) Continuing metadata normalization
The room metadata underwent several normalization passes:
- `size` was repeatedly normalized toward the tier set
- `form` was refined to preserve structural meaning
- `specialization` was corrected back to the meaningful office/restaurant lists where needed
- `quality` was preserved for premium/style values like `Gourmet`

The user requested targeted changes only [kept], so each pass tried to minimize unrelated data changes. Some passes were too broad or misapplied and had to be corrected [didn't work], but the final data direction was preserved [worked].

---

### 12) Restaurant specializations restored
At one stage restaurant specializations had been over-generalized [didn't work]. The user then explicitly requested restoration of the actual cuisine/service labels. The data was corrected so restaurant specializations again reflected the room’s true identity [worked].

This was important because the restaurant specialization is part of the room’s meaning and should not be flattened into a generic bucket [kept].

---

### 13) Office HQ forms and execution suite naming
The user preferred `Executive Suite` as the form label for HQ-like office rooms [kept], replacing `Penthouse Suite` for that use case. This aligned the office structural naming better with the intended real-world feel [worked].

The office HQ entries now preserve:
- large size tiers
- executive suite form
- meaningful office specializations like government, bank, and company HQs
- luxury quality

---

## What worked

### A. Migrating the build toolbar to JSON-driven menu population
The self-populating menu system works and reflects the room metadata structure [worked].

### B. Preserving distinct UI identity
The toolbar shells remain visually distinct and usable [worked].

### C. Size tier normalization
The cell-count approach and the resulting tier system are coherent [worked].

### D. Residential specialization simplification
Using `Residence` for apartment-like entries simplifies the schema without losing the key meaning [worked].

### E. Restaurant specialization restoration
Restaurant entries once again carry meaningful cuisine/service specialization labels [worked].

### F. Gourmet quality preservation
`Gourmet` is now preserved as a meaningful premium quality term [worked].

### G. Compact natural-language menu labels
The `[size] [specialization] [form]` display pattern works well for the menu and tooltip first line [worked].

---

## What did not work

### A. Over-broad specialization flattening
Replacing restaurant specializations with a generic term [didn't work]. The user rejected that and it was corrected.

### B. Theme-driven toolbar styling experiments
Some attempts to over-wire toolbar styling through theme/global styles caused background and icon regressions [didn't work].

### C. Ambiguous or stale schema values
Some transitional metadata values briefly existed in the wrong field before later normalization [didn't work]. These had to be corrected with targeted cleanup.

---

## Source reference list
Sources used in this work included:
- `src/entities/rooms/roomMetadata.json`
- `src/features/ui/toolbars/BuildToolbar.tsx`
- `src/features/ui/toolbars/BuildToolbarV2.old..tsx`
- `src/features/ui/toolbars/MainToolbar.tsx`
- `src/features/ui/toolbars/MainToolbar.old..tsx`
- `src/features/ui/themes/core/theme.ts`
- `src/features/ui/themes/styles/globalStyles.ts`
- `src/features/ui/globalStyles.css`
- `development/newThread_skill.md`

No external URL sources were introduced in this conversation turn.

---

## Current desire / request
The current request is to conclude the current build-toolbar metadata work and start a new thread with the handoff compendium as the source of truth.

## Recommendations for proceeding
1. Open a new thread focused on the build-toolbar metadata display and room schema normalization.
2. Continue with only targeted edits.
3. Keep:
   - `size` as a tier
   - `form` as structural shape
   - `specialization` meaningful by room domain
   - `quality` for premium/style terms like `Basic`, `Deluxe`, `Luxury`, `Standard`, `Gourmet`
4. Avoid reopening the theme/global-style refactor unless specifically needed.
5. If more metadata cleanup is needed, prefer precise room-level adjustments over broad schema rewrites.