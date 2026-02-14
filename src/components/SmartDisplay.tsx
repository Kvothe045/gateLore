import katex from "katex";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";

interface SmartDisplayProps {
  html: string;
  className?: string;
}

export function SmartDisplay({ html, className }: SmartDisplayProps) {
  const processContent = (rawHtml: string) => {
    if (!rawHtml) return "";
    let cleaned = rawHtml;

    // 1. Decode rogue HTML entities that break math syntax (like &gt; and &lt;)
    cleaned = cleaned.replace(/&lt;/g, '<')
                     .replace(/&gt;/g, '>')
                     .replace(/&amp;/g, '&')
                     .replace(/&nbsp;/g, ' ');

    // 2. Fix 404 Image errors (Replace dummy base64 and prepend the true domain)
    cleaned = cleaned.replace(/src="data:image[^"]+"/g, ""); 
    cleaned = cleaned.replace(/(src|data-src)="(\/wp-content[^"]+)"/g, 'src="https://practicepaper.in$2"');

    // 3. Normalize legacy [latex] tags into modern delimiters
    cleaned = cleaned.replace(/\[latex\]/g, "\\(").replace(/\[\/latex\]/g, "\\)");

    // 4. Parse Block Math: \[ ... \]
    cleaned = cleaned.replace(/\\\[([\s\S]*?)\\\]/g, (match, math) => {
      try {
        return katex.renderToString(math, { throwOnError: false, displayMode: true });
      } catch (e) {
        return match; 
      }
    });

    // 5. Parse Inline Math: \( ... \) (This catches the raw \(\bar{A}\) from your JSON)
    // Using a non-capturing group for the delimiters to ensure safety
    cleaned = cleaned.replace(/(?:\\\(|\\\()([\s\S]*?)(?:\\\)|\\[\)])/g, (match, math) => {
      try {
        return katex.renderToString(math, { throwOnError: false, displayMode: false });
      } catch (e) {
        return match;
      }
    });

    return cleaned;
  };

  return (
    <div
      className={cn(
        "prose prose-invert max-w-none text-zinc-300",
        // Force beautiful, bordered, shadowed images
        "[&>img]:max-w-full [&>img]:rounded-lg [&>img]:my-5 [&>img]:border [&>img]:border-zinc-800/80 [&>img]:shadow-lg",
        "[&>p]:m-0 [&>p]:leading-relaxed",
        // Subtly tint math equations so they pop
        "[&_.katex]:text-cyan-100", 
        className
      )}
      dangerouslySetInnerHTML={{ __html: processContent(html) }}
    />
  );
}