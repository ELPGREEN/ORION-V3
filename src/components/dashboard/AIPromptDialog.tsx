import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export interface AIPromptCheckbox {
  id: string;
  label: string;
  defaultChecked?: boolean;
}

interface AIPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  placeholder?: string;
  /** If provided, renders checkboxes instead of (or in addition to) textarea */
  checkboxes?: AIPromptCheckbox[];
  /** Whether to show the text input (default: true) */
  showTextInput?: boolean;
  loading?: boolean;
  submitLabel?: string;
  /** Allow submission with empty text input */
  allowEmpty?: boolean;
  onSubmit: (data: { text: string; checkedOptions: string[] }) => void;
}

export function AIPromptDialog({
  open,
  onOpenChange,
  title,
  description,
  placeholder,
  checkboxes,
  showTextInput = true,
  loading = false,
  submitLabel = "Confirmar",
  allowEmpty = false,
  onSubmit,
}: AIPromptDialogProps) {
  const [text, setText] = useState("");
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    checkboxes?.forEach((cb) => {
      initial[cb.id] = cb.defaultChecked ?? true;
    });
    return initial;
  });

  const handleSubmit = () => {
    const checkedOptions = Object.entries(checked)
      .filter(([, v]) => v)
      .map(([k]) => k);
    onSubmit({ text: text.trim(), checkedOptions });
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setText("");
      // Reset checkboxes to defaults
      const initial: Record<string, boolean> = {};
      checkboxes?.forEach((cb) => {
        initial[cb.id] = cb.defaultChecked ?? true;
      });
      setChecked(initial);
    }
    onOpenChange(val);
  };

  const hasAnyInput = allowEmpty ? true : (showTextInput
    ? text.trim().length > 0
    : Object.values(checked).some(Boolean));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{title}</DialogTitle>
          <DialogDescription className="text-sm">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {checkboxes && checkboxes.length > 0 && (
            <div className="space-y-3">
              {checkboxes.map((cb) => (
                <div key={cb.id} className="flex items-center gap-2">
                  <Checkbox
                    id={cb.id}
                    checked={checked[cb.id] ?? false}
                    onCheckedChange={(val) =>
                      setChecked((prev) => ({ ...prev, [cb.id]: !!val }))
                    }
                    disabled={loading}
                  />
                  <Label htmlFor={cb.id} className="text-sm cursor-pointer">
                    {cb.label}
                  </Label>
                </div>
              ))}
            </div>
          )}

          {showTextInput && (
            <Textarea
              placeholder={placeholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={loading}
              className="min-h-[80px] text-sm"
              autoFocus
            />
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleClose(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={loading || !hasAnyInput}
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                Processando...
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
