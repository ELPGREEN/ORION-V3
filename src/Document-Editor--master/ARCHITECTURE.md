# Architecture Documentation

## Editor State Model

### State Hierarchy

```
App Component (Root)
  ├─ blocks: ContentBlock[]           // Source of truth for content
  ├─ pages: Page[]                    // Derived state from pagination
  ├─ docId: string                    // Current document ID
  ├─ cursorPositionRef: Map<blockId, absoluteOffset>  // Cursor tracking
  └─ isRestoringCursorRef: boolean    // Race condition guard
```

### State Flow

```
User Input → handleInput() → Update blocks[] → Trigger Pagination
                                                       ↓
                                              pages[] calculated
                                                       ↓
                                              React re-renders
                                                       ↓
                                              Cursor restoration
```

### ContentBlock (Data Model)

**Philosophy**: Blocks represent *semantic* content units (paragraphs), not visual layout.

```typescript
interface ContentBlock {
  id: string;    // "block-1701234567890-0.123456"
  text: string;  // Full paragraph text (unbounded length)
}
```

**Lifecycle**:
- Created: User presses Enter (splits current block)
- Modified: User types (text updates)
- Deleted: User backspaces at block start (merges with previous)
- **Never split due to pagination**

### BlockSegment (Rendering Model)

**Philosophy**: Segments are *ephemeral* or complete views of block data for rendering.

```typescript
interface BlockSegment {
  blockId: string;      // References ContentBlock
  startOffset: number;  // Character position in block.text
  endOffset: number;    // Character position in block.text
  startLine: number;    // Line index within block
  endLine: number;      // Line index within block
  y: number;           // Absolute Y on page
  height: number;      // Pixel height
  lines: string[];     // Actual visible text
}
```

**Properties**:
- Calculated during pagination (not stored)
- Multiple segments can reference same block
- Each segment renders only its portion of block text
- Segments on different pages have different offsets

## Pagination Algorithm

The `PaginationEngine` performs pagination by processing content blocks sequentially, breaking each block's text into lines that fit the page width using `TextMeasurer`. It tracks the current vertical position (`currentY`) and places lines on the active page until reaching the bottom margin. When a line won't fit, it finalizes the current page, creates a new one, and continues from the top margin. Each block is split into segments that record character offsets and line boundaries, allowing the engine to track exactly which portion of each block appears on each page.

### Input & Output

**Input**: `ContentBlock[]` (array of paragraphs)
**Output**: `Page[]` (array of pages with segments)

### Algorithm Steps

#### Phase 1: Text Measurement

  1. Canvas is used for Measuring text with it's inbuilt function ctx.measureText(text),
  2. This phase has:
  Word-wrapping algorithm
  Preserves whitespace and newlines
  Returns array of line strings

#### Phase 2: Line Breaking

For each block:
1. Split text by explicit newlines (`\n`)
2. For each paragraph:
   - Split into words (preserving spaces)
   - Build lines until width exceeds `maxWidth`
   - Track character offsets for each line


#### Phase 3: Page Layout

```javascript
let currentY = PAGE_CONFIG.marginTop;
let currentPage = { pageNumber: 1, segments: [] };

for (const block of blocks) {
  const lines = measurer.breakIntoLines(block.text, contentWidth);

  let segmentLines = [];
  let segmentStartLine = 0;

  for (let i = 0; i < lines.length; i++) {
    if (currentY + lineHeight > pageBottom) {
      // Finalize segment
      currentPage.segments.push({
        blockId: block.id,
        startOffset: lineOffsets[segmentStartLine].start,
        endOffset: lineOffsets[i-1].end,
        lines: segmentLines,
        y: segmentStartY,
        height: (i - segmentStartLine) * lineHeight
      });

      // New page
      pages.push(currentPage);
      currentPage = { pageNumber: pages.length + 1, segments: [] };
      currentY = PAGE_CONFIG.marginTop;

      // Reset segment tracking
      segmentLines = [];
      segmentStartLine = i;
    }

    segmentLines.push(lines[i]);
    currentY += lineHeight;
  }

  // Finalize last segment of block
  currentPage.segments.push({ /* ... */ });
}
```

### Edge Cases Handled

1. **Empty blocks**: Rendered as single blank line
2. **Very long words**: Break at character boundary if no spaces
3. **Multi-page blocks**: Single block can span 10+ pages

## Rendering Strategy

### Segment Rendering

Each segment is an independent `contentEditable` div:

**Critical**: Renders `segment.lines`, NOT full `block.text`


### Cursor Persistence

**Challenge**: React re-renders destroy DOM elements, losing cursor position.

**Solution**: Three-phase restoration

```javascript
// Phase 1: Save (during input)
const cursorOffset = getCursorOffset(element);
const absoluteOffset = segmentStart + cursorOffset;
cursorPositionRef.current.set(blockId, absoluteOffset);

// Phase 2: Re-render
// React updates DOM, cursor position lost

// Phase 3: Restore (after render)

```

**Race Condition Prevention**:
- `isRestoringCursorRef`: Guards against concurrent restorations
- Input blocking during restoration
- Cleared cursor map after each restoration

## Persistence Flow

### Save Flow

```
User clicks "Save"
  ↓
POST /documents { title, content: blocks[] }
  ↓
Server generates UUID
  ↓
Server writes JSON file: data/{uuid}.json
  ↓
Server returns { id: uuid }
  ↓
Client displays document ID
```

### Load Flow

```
User enters document ID
  ↓
GET /documents/{id}
  ↓
Server reads data/{id}.json
  ↓
Server returns { id, title, content, created_at, updated_at }
  ↓
Client: setBlocks(response.content)
  ↓
Pagination recalculates
  ↓
Editor displays loaded content
```

### Storage Format

File: `server/data/71b8d791-d7b2-44e3-bf5b-bfa4ca3a34de.json`

```json
{
  "id": "71b8d791-d7b2-44e3-bf5b-bfa4ca3a34de",
  "title": "My Document",
  "content": [
    {
      "id": "block-1701234567890-0.123",
      "text": "First paragraph with potentially very long text..."
    },
    {
      "id": "block-1701234567891-0.456",
      "text": "Second paragraph..."
    }
  ],
  "created_at": "2024-11-26T10:30:00.000Z",
  "updated_at": "2024-11-26T10:30:00.000Z"
}
```

**Benefits**:
- Human-readable
- Version control friendly
- Easy debugging
- Simple backup/restore

**Trade-offs**:
- Not suitable for large-scale production
- No concurrent write protection
- File I/O overhead


**Current Status**: Optimized for documents up to 50-100 pages. Beyond that, consider implementing above optimizations.

## Design Decisions


### Why Canvas for Text Measurement?


**Canvas API Benefits**:
- Pixel-perfect accuracy
- No DOM manipulation
- Fast (native code)
- Matches actual rendering

### Why File-Based Storage?

**Decision**: Simplicity for prototype/demo
- Fast to implement
- Zero configuration
- Easy to inspect
- Human-readable

**Production Alternative**: PostgreSQL for block content
