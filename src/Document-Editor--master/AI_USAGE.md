# AI Usage Documentation

This document details how AI tools (specifically Claude by Anthropic) were used throughout the development of this document editor, the AI tools were relied on for codegen and documentation.

## AI Tool Used

**Primary Tool**: Claude (Anthropic AI Assistant)

## Development Phases

NOTE: AI was used to generate but much of the refactoring, debugging and testing was mannual and has not been mentioned in this document. Many features and improvements were attempted and discarded due to the time constraint and those have not been mentioned in this file as well. Only the bits used are written here.

### Phase 1: Initial Architecture & Pagination

**Task**: Design and implement basic pagination system

**AI Contribution**:
Gave a useable skeleton schema for types.ts adn textMeasurer.ts which was reviewed and updated along the project

**Key Prompts**:
```
I am building a document editor with pagination, give me the initial static requirement files which will be used as a base throughout the project and will hold the truth about the content that the user inputs for consistency. This is for a standard A4 size document assume any general case for any missing information that you may need. 
```

**Code Generated**:
- `paginationEngine.ts` (initial version)
- `textMeasurer.ts` (initial version)
- `types.ts` (ContentBlock, Page, Line interfaces)

### Phase 2: Bug Fixes - Pagination Overlapping Issues
(These errors were faced after the data structure archtecture was changed to achieve a better approach which is also closer to industry standard)

**Task**: Fix content overlapping across pages and improve React key handling as there are contenboxes with similar key and they are overlapping when the content over them reflows instead of rearranging themselves.

**AI Contribution**:
- Implemented unique key generation per segment
- Added block height calculation based on actual line count
- Improved auto-split logic for blocks spanning pages


**Code Generated**:
- Unique key generation: `page-${pageNumber}-block-${blockId}-instance-${count}`
- Auto-split useEffect (lines 25-76 in initial version)
- Block height calculation logic
- willBlockOverflowPage() and splitOverflowingBlock() functions


### Phase 3: Major Refactor - Data Model Separation

**Task**: Separate data model from page rendering layer to fix selection issues

**AI Contribution**:
- Designed new segment-based architecture
- Removed all block-splitting logic
- Implemented BlockSegment interface
- Updated PaginationEngine to generate layout metadata
- Rewrote rendering to use segments

**Key Prompts**:
```
"Refactor to separate data model from page rendering layer. Keep text blocks
intact - only break on user intent (Enter key). Create separate page layout
layer with metadata."
```

**Code Generated**:
- New `BlockSegment` interface with startOffset/endOffset
- Complete rewrite of PaginationEngine.paginate()
- Removed willBlockOverflowPage() and splitOverflowingBlock()
- Simplified handleInput() to not check for overflow
- New segment-based rendering logic


### Phase 4: Feature Additions

**Task**: Add clear document button and improve UX

**AI Contribution**:
- Implemented handleClear function with confirmation dialog
- Added red-styled clear button to UI
- Added user-select CSS for cross-block selection

**Code Generated**:
- handleClear() function with window.confirm
- Clear button in controls with custom styling
- userSelect CSS properties for all browsers