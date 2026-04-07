import { AdvancedProductEditor } from './AdvancedProductEditor';
import { Block } from './types';

interface FullscreenWixEditorProps {
  productId?: string;
  productName?: string;
  productDescription?: string;
  productPrice?: number;
  productOriginalPrice?: number | null;
  productImage?: string;
  initialBlocks?: Block[];
  onSave?: (blocks: Block[]) => void;
  isLoading?: boolean;
}

export function FullscreenWixEditor(props: FullscreenWixEditorProps) {
  return (
    <AdvancedProductEditor
      {...props}
      canSwitchEditor={false}
    />
  );
}
