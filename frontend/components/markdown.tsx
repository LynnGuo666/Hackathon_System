"use client";

import { Button } from "@heroui/react";
import { ExternalLink } from "lucide-react";
import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Markdown 渲染组件。
 *
 * 后端只存原始字符串，渲染全部在前端完成，避免 XSS（react-markdown 默认不渲染原始 HTML）。
 * 项目未引入 @tailwindcss/typography，这里用基础 className 兜底样式。
 */
export function MarkdownRenderer({ content }: { content: string }) {
  const cleaned = useMemo(() => (content ?? "").trim(), [content]);
  if (!cleaned) return null;

  return (
    <div className="text-sm leading-relaxed text-foreground/85">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline underline-offset-2"
            >
              {children}
            </a>
          ),
          h1: ({ children }) => <h1 className="mb-2 mt-3 text-lg font-semibold">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-2 mt-3 text-base font-semibold">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-1 mt-2 text-sm font-semibold">{children}</h3>,
          p: ({ children }) => <p className="my-1.5">{children}</p>,
          ul: ({ children }) => <ul className="my-1.5 list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-1.5 list-decimal space-y-1 pl-5">{children}</ol>,
          code: ({ className, children }) => {
            const isBlock = (className ?? "").includes("language-");
            if (isBlock) {
              return (
                <code className="block overflow-x-auto rounded bg-foreground/5 p-3 font-mono text-xs">
                  {children}
                </code>
              );
            }
            return (
              <code className="rounded bg-foreground/5 px-1 py-0.5 font-mono text-xs">
                {children}
              </code>
            );
          },
          pre: ({ children }) => <pre className="my-2">{children}</pre>,
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-foreground/20 pl-3 text-foreground/70">
              {children}
            </blockquote>
          ),
        }}
      >
        {cleaned}
      </ReactMarkdown>
    </div>
  );
}

/**
 * 说明文档区块：外链按钮 + Markdown 渲染，两者皆空则不渲染。
 */
export function DocSection({
  url,
  markdown,
}: {
  url?: string;
  markdown?: string;
}) {
  const docUrl = (url ?? "").trim();
  const docMarkdown = (markdown ?? "").trim();
  if (!docUrl && !docMarkdown) return null;

  return (
    <div className="grid gap-2">
      {docUrl && (
        <div>
          <Button
            as="a"
            href={docUrl}
            target="_blank"
            rel="noreferrer"
            size="sm"
            variant="flat"
            startContent={<ExternalLink size={14} />}
          >
            查看说明文档
          </Button>
        </div>
      )}
      {docMarkdown && <MarkdownRenderer content={docMarkdown} />}
    </div>
  );
}
