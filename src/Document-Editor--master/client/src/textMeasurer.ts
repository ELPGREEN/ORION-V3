import { PAGE_CONFIG } from './types';

export class TextMeasurer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.font = `${PAGE_CONFIG.fontSize}px ${PAGE_CONFIG.fontFamily}`;
  }

  measureText(text: string): number {
    return this.ctx.measureText(text).width;
  }

  breakIntoLines(text: string, maxWidth: number): string[] {
    if (!text) return [''];

    // Replace tabs with 4 spaces (standard tab width)
    const processedText = text.replace(/\t/g, '    ');
    
    // Handle explicit line breaks
    const paragraphs = processedText.split('\n');
    const allLines: string[] = [];

    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) {
        // Preserve empty lines
        allLines.push('');
        continue;
      }

      // Word wrap algorithm that preserves spaces
      const words = paragraph.split(/(\s+)/); // Split but keep spaces
      const lines: string[] = [];
      let currentLine = '';

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const testLine = currentLine + word;
        const width = this.measureText(testLine);

        if (width > maxWidth && currentLine.trim()) {
          // Line would overflow, push current line and start new
          lines.push(currentLine);
          
          // Skip leading space on new line if current word is whitespace
          if (word.trim() === '') {
            currentLine = '';
          } else {
            currentLine = word;
          }
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        lines.push(currentLine);
      }

      allLines.push(...(lines.length > 0 ? lines : ['']));
    }

    return allLines;
  }
}