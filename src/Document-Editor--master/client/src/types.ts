export const PAGE_CONFIG = {
  width: 794,
  height: 1123,
  marginTop: 72,
  marginBottom: 72,
  marginLeft: 72,
  marginRight: 72,
  lineHeight: 24,
  fontSize: 16,
  fontFamily: 'Arial, sans-serif'
};

export interface ContentBlock {
  id: string;
  text: string;
}

export interface Document {
  id?: string;
  title: string;
  content: ContentBlock[];
  created_at?: string;
  updated_at?: string;
}

export interface Line {
  text: string;
  y: number;
  blockId: string;
}

export interface Page {
  pageNumber: number;
  lines: Line[];
}