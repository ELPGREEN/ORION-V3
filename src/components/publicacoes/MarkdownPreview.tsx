import ReactMarkdown from "react-markdown";
import { sanitizeHTML } from "@/lib/sanitize";

interface MarkdownPreviewProps {
  content: string;
}

function isHtml(str: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(str);
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  if (!content.trim()) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm p-8">
        O preview aparecerá aqui conforme você escreve...
      </div>
    );
  }

  // If content is HTML (from TipTap), render as sanitized HTML
  if (isHtml(content)) {
    const clean = sanitizeHTML(content);
    return (
      <div className="p-4 sm:p-6 overflow-y-auto max-h-[400px]">
        <article
          className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-serif prose-headings:text-foreground prose-p:text-muted-foreground prose-p:leading-relaxed prose-a:text-primary prose-blockquote:border-l-primary/40 prose-blockquote:bg-primary/5"
          dangerouslySetInnerHTML={{ __html: clean }}
        />
      </div>
    );
  }

  // Fallback: render as Markdown
  return (
    <div className="p-4 sm:p-6 overflow-y-auto max-h-[400px]">
      <article className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown
          components={{
            h1: ({ children }) => (
              <h1 className="text-2xl font-serif text-foreground mt-6 mb-3">{children}</h1>
            ),
            h2: ({ children }) => (
              <div className="mt-6 mb-3">
                <h2 className="text-xl font-serif text-foreground mb-2">{children}</h2>
                <div className="h-px w-12 bg-primary/40" />
              </div>
            ),
            h3: ({ children }) => (
              <h3 className="text-lg font-serif text-foreground mt-4 mb-2">{children}</h3>
            ),
            p: ({ children }) => (
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">{children}</p>
            ),
            strong: ({ children }) => (
              <strong className="text-foreground font-semibold">{children}</strong>
            ),
            ul: ({ children }) => (
              <ul className="space-y-1.5 my-3 ml-1">{children}</ul>
            ),
            li: ({ children }) => (
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 h-1 w-1 rounded-full bg-primary/60 flex-shrink-0" />
                <span>{children}</span>
              </li>
            ),
            hr: () => (
              <div className="my-6 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="h-1 w-1 rounded-full bg-primary/30" />
                <span className="h-px flex-1 bg-border" />
              </div>
            ),
            blockquote: ({ children }) => (
              <blockquote className="my-4 border-l-2 border-primary/40 pl-4 py-2 bg-primary/5 rounded-r text-sm">
                {children}
              </blockquote>
            ),
            a: ({ href, children }) => (
              <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </article>
    </div>
  );
}
