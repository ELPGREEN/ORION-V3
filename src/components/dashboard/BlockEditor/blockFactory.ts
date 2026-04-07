import { Block, BlockType, BLOCK_TEMPLATES } from './types';

export function createBlock(type: BlockType, order: number): Block {
  const template = BLOCK_TEMPLATES[type];
  return {
    id: crypto.randomUUID(),
    type,
    order,
    visible: true,
    content: JSON.parse(JSON.stringify(template.defaultContent)),
  };
}

export function getDefaultLayout(productName?: string, productDescription?: string): Block[] {
  const defaultTypes: BlockType[] = ['hero', 'video', 'benefits', 'features', 'pricing', 'testimonials', 'guarantee', 'faq', 'cta'];
  
  const blocks = defaultTypes.map((type, index) => createBlock(type, index));
  
  // Customize hero with product info
  if (blocks[0] && blocks[0].type === 'hero') {
    blocks[0].content.headline = productName || 'Seu Produto Incrível';
    blocks[0].content.subheadline = productDescription || 'Descrição do seu produto aqui';
  }
  
  return blocks;
}
