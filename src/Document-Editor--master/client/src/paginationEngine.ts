import { PAGE_CONFIG, ContentBlock, Page, Line } from './types';
import { TextMeasurer } from './textMeasurer';

export class PaginationEngine {
  private measurer: TextMeasurer;

  constructor() {
    this.measurer = new TextMeasurer();
  }

  private getContentWidth(): number {
    return PAGE_CONFIG.width - PAGE_CONFIG.marginLeft - PAGE_CONFIG.marginRight;
  }

  private getContentHeight(): number {
    return PAGE_CONFIG.height - PAGE_CONFIG.marginTop - PAGE_CONFIG.marginBottom;
  }

  paginate(blocks: ContentBlock[]): Page[] {
    const pages: Page[] = [];
    let currentPage: Page = { pageNumber: 1, lines: [] };
    let currentY = PAGE_CONFIG.marginTop;

    for (const block of blocks) {
      // Handle completely empty blocks
      if (block.text.length === 0) {
        const lineHeight = PAGE_CONFIG.lineHeight;
        
        if (currentY + lineHeight > PAGE_CONFIG.height - PAGE_CONFIG.marginBottom) {
          pages.push(currentPage);
          currentPage = { pageNumber: pages.length + 1, lines: [] };
          currentY = PAGE_CONFIG.marginTop;
        }

        currentPage.lines.push({
          text: '',
          y: currentY,
          blockId: block.id
        });
        currentY += lineHeight;
        continue;
      }

      // Break text into lines (preserving whitespace)
      const lines = this.measurer.breakIntoLines(
        block.text,
        this.getContentWidth()
      );

      for (const lineText of lines) {
        const lineHeight = PAGE_CONFIG.lineHeight;

        // Check if line fits on current page
        if (currentY + lineHeight > PAGE_CONFIG.height - PAGE_CONFIG.marginBottom) {
          pages.push(currentPage);
          currentPage = { pageNumber: pages.length + 1, lines: [] };
          currentY = PAGE_CONFIG.marginTop;
        }

        currentPage.lines.push({
          text: lineText,
          y: currentY,
          blockId: block.id
        });

        currentY += lineHeight;
      }
    }

    // Push last page
    if (currentPage.lines.length > 0) {
      pages.push(currentPage);
    }

    return pages;
  }
}