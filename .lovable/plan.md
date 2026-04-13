

# Plan: Implement Orion Floating Widget + PDF/Vision Rules

## What's Already Done
- Anti-hallucination rules ✅
- Voice/STT rules ✅  
- Speed/latency rules ✅
- AquaMonkey personality ✅
- Vision emotional rules ✅

## What's New (2 Features)

### 1. PDF/Document Analysis Rules in System Prompt
**File: `supabase/functions/neural-ops/index.ts`**

Add a new `ORION_DOCUMENT_RULES_BLOCK` (~100 tokens) with the PDF/photo analysis protocol:
- Confirm receipt and describe content objectively (type, pages, visible text, tables)
- List main elements in short bullets
- Then answer the user's specific question
- For scanned PDFs: treat as image, warn about OCR limitations
- For large PDFs (>50 pages): warn about partial processing
- Inject this block into `ORION_SYSTEM_PROMPT_FULL` and `ORION_SYSTEM_PROMPT_COMPACT` (not the ultra-fast voice prompt, since PDFs aren't voice queries)

### 2. Floating Orion Widget with Auto-Minimize + YouTube PiP
**New component + modifications to existing routing**

This is the main feature. Currently Orion lives at `/consulta` as a full-page experience. The user wants Orion to:
- Stay active as a floating widget when navigating away
- Auto-minimize to bottom-right corner during navigation
- Support Picture-in-Picture for YouTube videos
- Never close unless explicitly requested

**Implementation:**

a) **New `FloatingOrionWidget.tsx` component** (~200 lines)
- Wraps `NeuralVision` in a draggable/resizable floating container
- Two states: **expanded** (full chat) and **minimized** (small orb in bottom-right)
- Auto-minimize triggers: route change detected via `useLocation()`
- Expand on click when minimized
- Maintains conversation context across navigation (state persists in React context)

b) **New `OrionWidgetContext.tsx`** — React context to manage widget state globally
- `isOpen`, `isMinimized`, `openOrion()`, `minimizeOrion()`, `closeOrion()`
- Persists across page navigation since it lives at the App level

c) **YouTube PiP detection** in `FloatingOrionWidget.tsx`
- Detect YouTube embeds or video elements on page
- When detected: call `videoElement.requestPictureInPicture()` and auto-minimize Orion
- Show brief confirmation: "Minimizando para o canto..."

d) **Update `App.tsx`** — wrap routes with `OrionWidgetProvider`, render `FloatingOrionWidget` at app level (outside route switches)

e) **Update `PublicOrionListener.tsx`** — instead of navigating to `/consulta`, open the floating widget via context

f) **Update `ConsultaIA.tsx`** — when accessed directly, expand the floating widget instead of rendering inline `NeuralVision`

### Technical Details

```text
App.tsx
├── OrionWidgetProvider (context)
│   ├── Routes (all pages)
│   └── FloatingOrionWidget (fixed position, z-50+)
│       ├── Minimized: small orb (bottom-right)
│       └── Expanded: NeuralVision in floating card
```

**Auto-minimize logic:**
- Listen to `useLocation()` changes
- If widget is expanded and route changes → minimize with toast "Minimizando para o canto..."
- Click minimized orb → expand back

**PiP logic:**
- On route change, check for `<video>` elements or YouTube iframes
- If found: `video.requestPictureInPicture()` (browser API)
- Orion minimizes alongside

### Files to Create/Edit
1. **Create** `src/contexts/OrionWidgetContext.tsx` — widget state context
2. **Create** `src/components/FloatingOrionWidget.tsx` — floating container with minimize/expand
3. **Edit** `src/App.tsx` — add provider + render widget
4. **Edit** `src/components/PublicOrionListener.tsx` — use context instead of navigate
5. **Edit** `src/pages/ConsultaIA.tsx` — delegate to floating widget
6. **Edit** `supabase/functions/neural-ops/index.ts` — add PDF/document rules block
7. **Redeploy** `neural-ops` edge function

