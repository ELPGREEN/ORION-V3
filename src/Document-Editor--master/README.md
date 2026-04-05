# Document Editor - Multi-Page Text Editor with Real-Time Pagination

Try It out Here: https://document-editor-qqg3-r8zfcn2ag.vercel.app/

A sophisticated document editor with automatic pagination, multi-block editing, and persistent storage. Text flows naturally across pages with real-time layout calculation.

## Prerequisites

- Node.js 16+ and npm
- Modern browser (Chrome, Firefox, Safari, Edge)

## Quick Start

```bash
# Install dependencies
cd server && npm install express
cd ../client && npm install

# Start backend (Terminal 1)
cd server && node index.js

# Start frontend (Terminal 2)
cd client && npm start
```

The editor will open at `http://localhost:3000` with the backend API at `http://localhost:3001`.

## Project Structure

```
Document-Editor-/
├── client/               # React TypeScript frontend
│   ├── src/
│   │   ├── App.tsx              # Main editor component
│   │   ├── paginationEngine.ts  # Pagination algorithm
│   │   ├── textMeasurer.ts      # Text measurement utilities
│   │   ├── types.ts             # TypeScript interfaces
│   │   └── App.css              # Styling
│   └── package.json
├── server/               # Express.js backend
│   ├── index.js         # API server
│   ├── data/            # Document storage (JSON files)
│   └── package.json
├── README.md
├── ARCHITECTURE.md
└── AI_USAGE.md
```

## Features

### Core Functionality
- ✅ Multi-page document editing with automatic pagination
- ✅ Real-time text reflow across pages
- ✅ Cursor persistence across edits and page boundaries
- ✅ Multi-block selection and deletion
- ✅ Block-based content model (paragraphs remain intact)
- ✅ Save/Load documents with unique IDs
- ✅ Clear document functionality

### Technical Highlights
- **Segment-Based Rendering**: Blocks can span pages without splitting in data model
- **Accurate Text Measurement**: Canvas-based character width calculation
- **Cursor Restoration**: Complex logic to maintain cursor position across re-renders
- **Race Condition Prevention**: Guards against concurrent cursor restoration
- **Keyboard Navigation**: Arrow keys, Enter, Backspace work across pages

## API Endpoints

### POST /documents
Create and save a new document.

**Request:**
```json
{
  "title": "My Document",
  "content": [
    { "id": "block-1", "text": "First paragraph..." },
    { "id": "block-2", "text": "Second paragraph..." }
  ]
}
```

**Response:**
```json
{
  "id": "71b8d791-d7b2-44e3-bf5b-bfa4ca3a34de"
}
```

### GET /documents/:id
Retrieve a saved document by ID.

**Response:**
```json
{
  "id": "71b8d791-d7b2-44e3-bf5b-bfa4ca3a34de",
  "title": "My Document",
  "content": [
    { "id": "block-1", "text": "First paragraph..." },
    { "id": "block-2", "text": "Second paragraph..." }
  ],
  "created_at": "2024-11-26T10:30:00.000Z",
  "updated_at": "2024-11-26T10:30:00.000Z"
}
```

## Data Model

### ContentBlock
```typescript
interface ContentBlock {
  id: string;      // Unique identifier (e.g., "block-1234567890")
  text: string;    // Complete paragraph text (can span multiple pages)
}
```

**Key Principle**: Blocks represent logical content units (paragraphs), NOT page fragments. A block is only split when the user presses Enter, never due to pagination.

### BlockSegment (Rendering Layer)
```typescript
interface BlockSegment {
  blockId: string;      // Reference to ContentBlock
  startOffset: number;  // Character offset where segment starts
  endOffset: number;    // Character offset where segment ends
  startLine: number;    // First line index in this segment
  endLine: number;      // Last line index in this segment
  y: number;           // Y position on page
  height: number;      // Height of segment
  lines: string[];     // Visible text lines for this segment
}
```

### Page
```typescript
interface Page {
  pageNumber: number;
  lines: Line[];              // Legacy compatibility
  segments: BlockSegment[];   // Primary rendering data
}
```

### Document (Persistence)
```typescript
interface Document {
  id: string;
  title: string;
  content: ContentBlock[];
  created_at: string;
  updated_at: string;
}
```

## Pagination Strategy

### Overview
The editor uses a **two-layer architecture**:
1. **Data Layer**: Immutable blocks (paragraphs)
2. **Rendering Layer**: Dynamic segments (visual layout)

### How It Works

#### 1. Text Measurement
- Uses HTML5 Canvas API for pixel-perfect text width calculation
- Accounts for font family, size, and browser rendering
- Breaks text into lines at word boundaries

#### 2. Line Breaking Algorithm
```
For each block:
  1. Measure text with current font
  2. Break into lines that fit page width
  3. Track character offsets for each line
  4. Preserve whitespace and newlines
```

#### 3. Page Assignment
```
currentY = marginTop
For each line:
  If (currentY + lineHeight > pageBottom):
    - Finalize current segment
    - Start new page
    - Reset Y position
  Add line to current segment
  currentY += lineHeight
```

#### 4. Segment Creation
When a block spans multiple pages, create separate segments:
```javascript
// Block spans pages 1 and 2
Segment 1: { blockId: "block-1", startOffset: 0, endOffset: 150, lines: [...] }
Segment 2: { blockId: "block-1", startOffset: 151, endOffset: 300, lines: [...] }
```

### Key Benefits
- ✅ **Clean Data Model**: Content structure independent of layout
- ✅ **Seamless Editing**: Text selection works across page boundaries
- ✅ **Version Control Friendly**: Changes tracked at paragraph level
- ✅ **Efficient Reflow**: Only pagination recalculates, data unchanged

## Cursor Persistence

Critical for user experience. Implementation uses:
1. **Absolute Offset Tracking**: Store cursor position relative to full block
2. **Segment Mapping**: Find which segment contains cursor position
3. **Relative Calculation**: Convert absolute offset to segment-relative position
4. **Race Condition Guards**: Prevent overlapping restoration attempts
5. **Async Restoration**: Use `requestAnimationFrame` + `setTimeout` for DOM readiness


### Environment Variables
No environment variables required. Default configuration:
- Backend: `http://localhost:3001`
- Frontend: `http://localhost:3000`
- Data storage: `server/data/` directory

### Known Limitations
- No collaborative editing (single user)
- No rich text formatting (plain text only)
- File-based storage (no database)
- No authentication/authorization

## Troubleshooting

**Cursor jumps to beginning**
- Fixed in latest version with concurrent restoration guards

**Content overlaps pages**
- Ensure using segment-based rendering (post-refactor architecture)

**Backend not starting**
- Check port 3001 is available
- Verify Node.js 16+ installed

**Frontend build errors**
- Clear cache: `rm -rf node_modules && npm install`
- Check Node version matches prerequisites

## License

MIT

## Contributors

Built with assistance from Claude (Anthropic AI) for architecture design, pagination algorithm implementation, and bug fixes.
