/**
 * Shared page dimension constants for A4 at 96 DPI.
 * Used by PageBreakSpacerExtension, PageBreakOverlay, EditorPageFrame, and PDF export.
 * Single source of truth to guarantee editor ↔ PDF alignment.
 *
 * Branded layout geometry (with letterhead):
 * ┌─────────────────────────┐ ← 0mm (page top)
 * │   Letterhead header     │ 25mm
 * │─────────────────────────│ ← 25mm (content starts here)
 * │                         │
 * │   Content zone          │ 252mm usable
 * │                         │
 * │─────────────────────────│ ← 277mm (content ends = 297 - 20)
 * │   20mm footer bar       │ (fills entire bottom margin)
 * └─────────────────────────┘ ← 297mm (page bottom)
 *
 * Non-branded (ABNT official):
 * ┌─────────────────────────┐ ← 0mm
 * │   25mm top margin       │
 * │─────────────────────────│ ← 25mm
 * │   Content zone          │ 252mm usable
 * │─────────────────────────│ ← 277mm (= 297 - 20)
 * │   20mm bottom margin    │
 * └─────────────────────────┘ ← 297mm
 */

export const MM_TO_PX = 96 / 25.4; // ~3.7795 px/mm
export const PAGE_HEIGHT_MM = 297;
export const PAGE_WIDTH_MM = 210;
export const PAGE_HEIGHT_PX = Math.round(PAGE_HEIGHT_MM * MM_TO_PX); // 1123px

// ─── Standard ABNT margins (matching :root CSS vars) ───
export const STD_MARGIN_TOP_MM = 25;   // --m-top: 25mm
export const STD_MARGIN_BOTTOM_MM = 20; // --m-bottom: 20mm
export const STD_MARGIN_TOP_PX = Math.ceil(STD_MARGIN_TOP_MM * MM_TO_PX); // 95px — must match --doc-margin-top-px in index.css
export const STD_MARGIN_BOTTOM_PX = Math.round(STD_MARGIN_BOTTOM_MM * MM_TO_PX); // ~76px
export const STD_USABLE_PX = PAGE_HEIGHT_PX - STD_MARGIN_TOP_PX - STD_MARGIN_BOTTOM_PX; // ~952px

// ─── Branded layout ───
// All values must match pdf-generator.ts (jsPDF) addBrandedFooter()
export const BRANDED_MARGIN_TOP_MM = 25; // letterhead header height (matches --m-top: 25mm)
export const BRANDED_MARGIN_BOTTOM_MM = 0; // no extra gap — footer fills entire bottom margin
export const BRANDED_FOOTER_HEIGHT_MM = 20.0; // footer bar = 20mm (matches --m-bottom: 20mm)

export const BRANDED_MARGIN_TOP_PX = Math.ceil(BRANDED_MARGIN_TOP_MM * MM_TO_PX); // 95px
export const BRANDED_MARGIN_BOTTOM_PX = Math.round(BRANDED_MARGIN_BOTTOM_MM * MM_TO_PX); // 0px
export const BRANDED_FOOTER_HEIGHT_PX = Math.round(BRANDED_FOOTER_HEIGHT_MM * MM_TO_PX); // ~76px

// Total reserved at bottom = 0mm gap + 20mm footer = 20mm
export const BRANDED_RESERVED_BOTTOM_MM = BRANDED_MARGIN_BOTTOM_MM + BRANDED_FOOTER_HEIGHT_MM; // 20mm
export const BRANDED_RESERVED_BOTTOM_PX = BRANDED_MARGIN_BOTTOM_PX + BRANDED_FOOTER_HEIGHT_PX; // ~76px

// Usable = 297 - 25 - 20 = 252mm ≈ 952px
export const BRANDED_USABLE_PX = PAGE_HEIGHT_PX - BRANDED_MARGIN_TOP_PX - BRANDED_RESERVED_BOTTOM_PX;

// ─── Page gap (visual space between pages in editor) ───
export const PAGE_GAP_PX = 32;

// Shared workspace color to keep editor canvas masking and background in sync.
export const EDITOR_WORKSPACE_BG_HSL = "hsl(220 8% 82%)";

// Keep 0 to preserve exact editor ↔ PDF break parity.
export const VISUAL_BREAK_COMPENSATION_PX = 0;

/** Get usable height in px based on branded flag (editor-side) */
export function getUsableHeight(branded: boolean): number {
  const base = branded ? BRANDED_USABLE_PX : STD_USABLE_PX;
  return Math.max(0, base - VISUAL_BREAK_COMPENSATION_PX);
}

/** Get reserved bottom area in px used by pagination (content cannot occupy this zone) */
export function getReservedBottom(branded: boolean): number {
  return branded ? BRANDED_RESERVED_BOTTOM_PX : STD_MARGIN_BOTTOM_PX;
}

/** Get spacer base height (reserved bottom area + visual page gap + next page top margin) */
export function getSpacerBase(branded: boolean): number {
  const reservedBottom = getReservedBottom(branded);
  const marginTop = branded ? BRANDED_MARGIN_TOP_PX : STD_MARGIN_TOP_PX;
  return reservedBottom + PAGE_GAP_PX + marginTop;
}
