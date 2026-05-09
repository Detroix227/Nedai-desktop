import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

type Props = {
  content: string;
};

export function MarkdownMessage({ content }: Props) {
  return (
    <div className="prose prose-slate prose-p:leading-relaxed prose-pre:bg-slate-100 prose-pre:text-slate-900 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg max-w-none break-words text-slate-900 dark:text-slate-100 opacity-100">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { strict: false }]]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
