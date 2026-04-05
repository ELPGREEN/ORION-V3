import { useState, useRef, useCallback } from "react";
import { ImageIcon, FileText, Loader2, X, CheckCircle2, FileUp, FileSpreadsheet, Eye, EyeOff, Wand2, Copy, FileType } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ChatFileUploadProps {
  onTextExtracted: (text: string, fileName: string, html?: string) => void;
  onInsertInDocument?: (text: string) => void;
  onSave?: () => void;
  compact?: boolean;
  disabled?: boolean;
}

const VALID_TYPES = [
  "image/png", "image/jpeg", "image/webp", "image/gif",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
];

const ACCEPT_STRING = "image/*,application/pdf,.docx,.doc,.txt,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

function isDocxFile(file: File): boolean {
  return file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.type === "application/msword" || file.name.endsWith(".docx") || file.name.endsWith(".doc");
}

function isTxtFile(file: File): boolean {
  return file.type === "text/plain" || file.name.endsWith(".txt");
}

/**
 * Post-process DOCX HTML to ensure TipTap compatibility.
 * Preserves original document indentation/margins exactly as-is.
 * Only adds line-height and text-align defaults when NOT present in source.
 */
function postProcessDocxHtml(html: string): string {
  // For paragraphs WITHOUT any style attribute, add minimal defaults (no forced indent)
  let processed = html.replace(/<p(?![^>]*style=)([^>]*)>/gi, (_match, attrs) => {
    return `<p${attrs} style="line-height: 1.5; text-align: justify;">`;
  });

  // For paragraphs WITH existing styles, only complement missing line-height/text-align
  processed = processed.replace(/<p([^>]*style="([^"]*)"[^>]*)>/gi, (_match, attrs, existingStyle) => {
    let style = existingStyle;
    if (!/line-height/i.test(style)) style += '; line-height: 1.5';
    if (!/text-align/i.test(style)) style += '; text-align: justify';
    // NEVER override original text-indent or margin-left — preserve exactly
    return `<p${attrs.replace(existingStyle, style)}>`;
  });

  // Style list paragraphs — preserve original margin-left if present
  processed = processed.replace(/<p([^>]*class="list-paragraph"[^>]*)>/gi, (_match, attrs) => {
    const hasStyle = /style="/i.test(attrs);
    if (hasStyle) {
      return `<p${attrs}>`.replace(/style="([^"]*)"/i, (_m, s) => {
        let style = s;
        if (!/margin-left/i.test(style)) style += '; margin-left: 1.25cm';
        if (!/line-height/i.test(style)) style += '; line-height: 1.5';
        return `style="${style}"`;
      });
    }
    return `<p${attrs} style="margin-left: 1.25cm; line-height: 1.5;">`;
  });

  // Ensure headings have proper sizing if not already styled
  processed = processed.replace(/<(h[1-3])(?![^>]*style=)([^>]*)>/gi, (_match, tag, attrs) => {
    const sizes: Record<string, string> = { h1: 'font-size: 16pt; font-weight: bold;', h2: 'font-size: 14pt; font-weight: bold;', h3: 'font-size: 12pt; font-weight: bold;' };
    return `<${tag}${attrs} style="${sizes[tag.toLowerCase()] || ''} line-height: 1.5; text-align: center;">`;
  });

  return processed;
}

async function extractDocx(file: File): Promise<{ text: string; html: string; wordCount: number }> {
  let lastError: any = null;

  // Attempt 1: docshift (best fidelity)
  try {
    const { toHtml } = await import("docshift");
    const html = await toHtml(file);
    if (html && html.trim().length > 0) {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = html;
      const plainText = tempDiv.textContent || tempDiv.innerText || "";
      const wordCount = plainText.split(/\s+/).filter(Boolean).length;
      if (wordCount > 0) {
        const enhancedHtml = postProcessDocxHtml(html);
        return { text: plainText, html: enhancedHtml, wordCount };
      }
    }
  } catch (err) {
    console.warn("[DOCX] docshift failed, trying mammoth:", err);
    lastError = err;
  }

  // Attempt 2: mammoth
  try {
    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer }, {
      includeDefaultStyleMap: true,
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='Subtitle'] => h2:fresh",
        "p[style-name='List Paragraph'] => p.list-paragraph:fresh",
        "p[style-name='No Spacing'] => p:fresh",
        "b => strong", "i => em", "u => u", "strike => s",
      ],
    });
    const textResult = await mammoth.extractRawText({ arrayBuffer });
    const wordCount = textResult.value.split(/\s+/).filter(Boolean).length;
    if (wordCount > 0) {
      const enhancedHtml = postProcessDocxHtml(htmlResult.value);
      return { text: textResult.value, html: enhancedHtml, wordCount };
    }
  } catch (err) {
    console.warn("[DOCX] mammoth also failed:", err);
    lastError = err;
  }

  // Attempt 3: raw text fallback (better than nothing)
  try {
    const arrayBuffer = await file.arrayBuffer();
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const raw = decoder.decode(arrayBuffer);
    // Extract readable text fragments from the XML inside the docx zip
    const textFragments = raw.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
    if (textFragments && textFragments.length > 0) {
      const plainText = textFragments
        .map(f => f.replace(/<[^>]+>/g, ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      const wordCount = plainText.split(/\s+/).filter(Boolean).length;
      if (wordCount > 5) {
        const html = `<p style="line-height: 1.5; text-align: justify;">${plainText}</p>`;
        return { text: plainText, html, wordCount };
      }
    }
  } catch (err) {
    console.warn("[DOCX] raw fallback failed:", err);
  }

  throw lastError || new Error("Não foi possível extrair conteúdo do documento DOCX.");
}

/**
 * Extract formatted HTML from a PDF using pdfjs-dist (client-side).
 * Falls back to null if the PDF is image-based (scanned) with little text.
 */
async function extractPdf(file: File): Promise<{ text: string; html: string; wordCount: number } | null> {
  try {
    const pdfjsLib = await import("pdfjs-dist");

    // Try multiple worker paths for compatibility
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();
    } catch {
      // Fallback: disable worker (slower but always works)
      pdfjsLib.GlobalWorkerOptions.workerSrc = "";
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const totalPages = pdf.numPages;

    let allText = "";
    let htmlParts: string[] = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const items = textContent.items.filter((it: any) => "str" in it && it.str) as any[];

      if (items.length === 0) continue;

      // Determine dominant font size for "normal" text
      const sizeFreq = new Map<number, number>();
      for (const it of items) {
        const h = Math.round(it.transform[0]);
        sizeFreq.set(h, (sizeFreq.get(h) || 0) + it.str.length);
      }
      let normalSize = 12;
      let maxChars = 0;
      for (const [sz, cnt] of sizeFreq) {
        if (cnt > maxChars) { maxChars = cnt; normalSize = sz; }
      }

      // Group items by Y coordinate (same line)
      const LINE_THRESHOLD = 3;
      type LineGroup = { y: number; items: any[] };
      const lines: LineGroup[] = [];

      for (const it of items) {
        const y = Math.round(it.transform[5]);
        const existing = lines.find(l => Math.abs(l.y - y) < LINE_THRESHOLD);
        if (existing) {
          existing.items.push(it);
        } else {
          lines.push({ y, items: [it] });
        }
      }

      lines.sort((a, b) => b.y - a.y);

      for (const line of lines) {
        line.items.sort((a: any, b: any) => a.transform[4] - b.transform[4]);

        const fontSize = Math.round(line.items[0].transform[0]);
        const isBold = line.items.some((it: any) =>
          (it.fontName || "").toLowerCase().includes("bold")
        );
        const lineText = line.items.map((it: any) => it.str).join(" ").trim();
        if (!lineText) continue;

        allText += lineText + "\n";

        const sizeRatio = fontSize / normalSize;
        let tag = "p";
        if (sizeRatio >= 1.6) tag = "h1";
        else if (sizeRatio >= 1.3) tag = "h2";
        else if (sizeRatio >= 1.1 && isBold) tag = "h3";

        const styles: string[] = [];
        if (tag === "p") {
          styles.push("text-indent: 1.25cm", "line-height: 1.5", "text-align: justify", "margin-bottom: 0.5em");
        } else {
          styles.push("line-height: 1.5", "margin-bottom: 0.5em", "text-align: center", "font-weight: bold");
          if (tag === "h1") styles.push("font-size: 16pt");
          else if (tag === "h2") styles.push("font-size: 14pt");
          else styles.push("font-size: 12pt");
        }

        const content = isBold && tag === "p" ? `<strong>${lineText}</strong>` : lineText;
        htmlParts.push(`<${tag} style="${styles.join("; ")}">${content}</${tag}>`);
      }

      if (pageNum < totalPages) {
        htmlParts.push('<hr style="page-break-after: always; border: none; margin: 1em 0;">');
      }
    }

    const wordCount = allText.split(/\s+/).filter(Boolean).length;
    if (wordCount < 20) return null;

    return { text: allText.trim(), html: htmlParts.join("\n"), wordCount };
  } catch (err) {
    console.warn("[PDF] pdfjs extraction failed:", err);
    return null;
  }
}

function getFileIcon(fileType: string) {
  switch (fileType) {
    case "pdf": return <FileText className="h-3 w-3 text-red-400" />;
    case "docx": return <FileSpreadsheet className="h-3 w-3 text-blue-400" />;
    case "image": return <ImageIcon className="h-3 w-3 text-green-400" />;
    case "txt": return <FileType className="h-3 w-3 text-muted-foreground" />;
    default: return <FileUp className="h-3 w-3" />;
  }
}

export function ChatFileUpload({ onTextExtracted, onInsertInDocument, onSave, compact = false, disabled = false }: ChatFileUploadProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ text: string; html?: string; fileName: string; wordCount: number; fileType: string } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const processFile = useCallback(async (file: File) => {
    if (!VALID_TYPES.includes(file.type) && !file.name.endsWith(".docx") && !file.name.endsWith(".doc") && !file.name.endsWith(".txt")) {
      toast({ title: "Formato não suportado", description: "Use PNG, JPG, WebP, PDF, DOCX ou TXT.", variant: "destructive" });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 20MB.", variant: "destructive" });
      return;
    }

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }

    setLoading(true);
    setResult(null);
    setProgress(10);

    try {
      // ─── TXT: direct read ───
      if (isTxtFile(file)) {
        setProgress(50);
        const text = await file.text();
        const wordCount = text.split(/\s+/).filter(Boolean).length;
        if (!text.trim()) {
          toast({ title: "Arquivo vazio", description: "Nenhum conteúdo encontrado.", variant: "destructive" });
          return;
        }
        setProgress(100);
        const res = { text, fileName: file.name, wordCount, fileType: "txt" };
        setResult(res);
        onTextExtracted(text, file.name);
        toast({ title: "TXT processado!", description: `${wordCount} palavras extraídas de ${file.name}` });
        return;
      }

      // ─── DOCX: Client-side parsing ───
      if (isDocxFile(file)) {
        setProgress(30);
        const docxResult = await extractDocx(file);
        setProgress(100);
        if (!docxResult.text.trim()) {
          toast({ title: "Documento vazio", description: "Nenhum conteúdo encontrado.", variant: "destructive" });
          return;
        }
        const res = { text: docxResult.text, html: docxResult.html, fileName: file.name, wordCount: docxResult.wordCount, fileType: "docx" };
        setResult(res);
        onTextExtracted(docxResult.text, file.name, docxResult.html);
        toast({ title: "DOCX processado!", description: `${docxResult.wordCount} palavras extraídas com formatação` });
        return;
      }

      // ─── PDF: try client-side extraction first, fallback to OCR ───
      if (file.type === "application/pdf") {
        setProgress(20);
        const pdfResult = await extractPdf(file);
        if (pdfResult && pdfResult.wordCount >= 20) {
          setProgress(100);
          const res = { text: pdfResult.text, html: pdfResult.html, fileName: file.name, wordCount: pdfResult.wordCount, fileType: "pdf" };
          setResult(res);
          onTextExtracted(pdfResult.text, file.name, pdfResult.html);
          toast({ title: "PDF processado!", description: `${pdfResult.wordCount} palavras extraídas com formatação` });
          return;
        }
        // Fallback to OCR for scanned PDFs
        setProgress(30);
      } else {
        setProgress(20);
      }

      // ─── Images & scanned PDFs: OCR with timeout ───
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setProgress(40);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      let extracted = "";
      let wordCount = 0;

      try {
        const response = await supabase.functions.invoke("ocr-document", {
          body: { imageBase64: base64 },
        });
        clearTimeout(timeoutId);
        setProgress(80);

        if (response.error) throw response.error;
        extracted = response.data?.fullText || "";
        wordCount = response.data?.wordCount || 0;
      } catch (ocrErr: any) {
        clearTimeout(timeoutId);

        if (file.type === "application/pdf") {
          try {
            const fallbackText = await file.text();
            if (fallbackText.trim().length > 50) {
              extracted = fallbackText;
              wordCount = fallbackText.split(/\s+/).filter(Boolean).length;
              toast({ title: "OCR falhou — texto extraído diretamente", description: `Fallback com ${wordCount} palavras` });
            }
          } catch { /* ignore fallback failure */ }
        }

        if (!extracted) {
          const isTimeout = ocrErr?.name === "AbortError" || ocrErr?.message?.includes("abort");
          throw new Error(isTimeout ? "OCR demorou demais (>30s). Tente um arquivo menor." : ocrErr?.message || "Falha ao processar arquivo.");
        }
      }

      setProgress(100);

      if (!extracted) {
        toast({ title: "Nenhum texto encontrado", description: "O documento não contém texto legível.", variant: "destructive" });
        return;
      }

      const res = { text: extracted, fileName: file.name, wordCount, fileType: file.type.includes("pdf") ? "pdf" : "image" };
      setResult(res);
      onTextExtracted(extracted, file.name);
      toast({ title: "OCR concluído!", description: `${wordCount} palavras extraídas de ${file.name}` });
    } catch (err: any) {
      toast({ title: "Erro ao processar", description: err.message || "Falha ao processar arquivo.", variant: "destructive" });
    } finally {
      setLoading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [onTextExtracted, toast]);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const dismiss = () => { setResult(null); setPreview(null); setShowFullPreview(false); };

  const fileTypeLabel = result?.fileType === "docx" ? "DOCX" : result?.fileType === "pdf" ? "PDF" : result?.fileType === "txt" ? "TXT" : "OCR";
  const previewText = result?.text?.substring(0, showFullPreview ? 2000 : 500) || "";

  if (compact) {
    return (
      <>
        <input ref={fileInputRef} data-chat-file-upload type="file" accept={ACCEPT_STRING} onChange={handleFile} className="hidden" />
        <Button type="button" variant="ghost" size="icon"
          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-primary"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || loading}
          title="Enviar imagem, PDF, DOCX ou TXT">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
        </Button>

        {/* Progress bar during processing */}
        {loading && progress > 0 && (
          <div className="absolute bottom-full left-0 right-0 mb-1 mx-3">
            <div className="bg-muted border border-border rounded-md p-2 space-y-1">
              <div className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                <span className="text-[9px] text-muted-foreground">Processando...</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          </div>
        )}

        {/* Result banner */}
        {result && (
          <div className="absolute bottom-full left-0 right-0 mb-1 mx-3">
            <div className="bg-primary/10 border border-primary/30 rounded-md p-2 space-y-1.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {getFileIcon(result.fileType)}
                    <p className="text-[10px] text-foreground font-medium truncate">{result.fileName}</p>
                  </div>
                  <p className="text-[9px] text-muted-foreground">
                    {result.wordCount} palavras • {fileTypeLabel}
                    {result.html ? " • com formatação" : ""}
                  </p>
                </div>
                <button onClick={dismiss} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </div>

              {/* Expandable preview */}
              {previewText && (
                <div className="text-[9px] text-muted-foreground">
                  <p className="line-clamp-3 whitespace-pre-wrap">{previewText}{previewText.length >= 500 && !showFullPreview ? "..." : ""}</p>
                  {result.text.length > 500 && (
                    <button onClick={() => setShowFullPreview(!showFullPreview)}
                      className="text-primary/70 hover:text-primary flex items-center gap-0.5 mt-0.5">
                      {showFullPreview ? <EyeOff className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
                      <span>{showFullPreview ? "Ver menos" : "Ver mais"}</span>
                    </button>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {onInsertInDocument && result.html && (
                  <Button size="sm" variant="outline" className="h-6 text-[9px] px-2 shrink-0" onClick={() => { onInsertInDocument(result.html!); dismiss(); }}>
                    <FileText className="h-2.5 w-2.5 mr-1" /> Inserir HTML
                  </Button>
                )}
                {onInsertInDocument && !result.html && (
                  <Button size="sm" variant="outline" className="h-6 text-[9px] px-2 shrink-0" onClick={() => { onInsertInDocument(result.text); dismiss(); }}>
                    <FileText className="h-2.5 w-2.5 mr-1" /> Inserir
                  </Button>
                )}
                {onInsertInDocument && onSave && (
                  <Button size="sm" variant="default" className="h-6 text-[9px] px-2 shrink-0" onClick={() => { onInsertInDocument(result.html || result.text); onSave(); dismiss(); }}>
                    <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Salvar
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-6 text-[9px] px-2 shrink-0 text-muted-foreground" onClick={() => { navigator.clipboard.writeText(result.text); toast({ title: "Copiado!" }); }}>
                  <Copy className="h-2.5 w-2.5 mr-1" /> Copiar
                </Button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Full-size version
  return (
    <div className="relative">
      <input ref={fileInputRef} data-chat-file-upload type="file" accept={ACCEPT_STRING} onChange={handleFile} className="hidden" />
      <Button type="button" variant="ghost" size="icon"
        className="h-12 w-12 p-0 flex items-center justify-center flex-shrink-0 text-muted-foreground hover:text-primary border border-border hover:border-primary/40 transition-colors"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || loading}
        title="Enviar imagem, PDF, DOCX ou TXT">
        {loading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <FileUp className="h-5 w-5" />}
      </Button>

      {/* Progress */}
      {loading && progress > 0 && (
        <div className="absolute bottom-full left-0 mb-2 w-80 z-50">
          <div className="bg-card border border-border rounded-lg p-3 shadow-lg space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Processando arquivo...</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      )}

      {/* Result banner */}
      {result && (
        <div className="absolute bottom-full left-0 mb-2 w-80 z-50">
          <div className="bg-card border border-primary/30 rounded-lg p-3 shadow-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                {getFileIcon(result.fileType)}
                <span className="text-xs font-medium text-foreground">{fileTypeLabel} Processado</span>
              </div>
              <button onClick={dismiss} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
            </div>
            {preview && <img src={preview} alt="Preview" className="w-full h-24 object-contain rounded border border-border" />}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px]">{getFileIcon(result.fileType)} {result.fileName}</Badge>
              <Badge variant="outline" className="text-[10px]">{result.wordCount} palavras</Badge>
              {result.html && <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">Com layout</Badge>}
            </div>
            <p className="text-[10px] text-muted-foreground line-clamp-3">{result.text}</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {onInsertInDocument && (
                <Button size="sm" variant="outline" className="h-6 text-[9px] px-2" onClick={() => { onInsertInDocument(result.html || result.text); dismiss(); }}>
                  <Wand2 className="h-2.5 w-2.5 mr-1" /> Inserir no documento
                </Button>
              )}
              {onInsertInDocument && onSave && (
                <Button size="sm" variant="default" className="h-6 text-[9px] px-2" onClick={() => { onInsertInDocument(result.html || result.text); onSave(); dismiss(); }}>
                  <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Inserir e Salvar
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-6 text-[9px] px-2 text-muted-foreground" onClick={() => { navigator.clipboard.writeText(result.text); toast({ title: "Copiado!" }); }}>
                <Copy className="h-2.5 w-2.5 mr-1" /> Copiar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
