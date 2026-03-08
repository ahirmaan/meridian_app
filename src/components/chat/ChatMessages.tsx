"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { MessageLoading } from "../ui/message-loading";
import { getModelLogoSrc } from "../../lib/modelLogos";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

export interface Attachment {
  id: string;
  type: string;
  name: string;
  data: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
  attachments?: Attachment[];
  modelId?: string;
}

interface ChatMessagesProps {
  messages: Message[];
}

const ModelIcon = ({ name }: { name: string }) => {
  const logo = getModelLogoSrc(name);

  if (logo) {
    return <img src={logo} alt={name} className="w-5 h-5 object-contain" />;
  }

  // Fallback generic AI icon
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 w-4 h-4">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
};

const CodeBlock = ({ className, children }: { className?: string, children: React.ReactNode }) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";

  const handleCopy = () => {
    // Extract raw text from children
    const textToCopy = Array.isArray(children)
      ? children.join("")
      : String(children);

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl overflow-hidden mb-8 border border-neutral-800 bg-neutral-900">
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-900/50 border-b border-neutral-800">
        <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
          {language || "text"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-500" />
              <span className="text-green-500">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto text-sm text-neutral-200">
        <code className={className}>{children}</code>
      </div>
    </div>
  );
};

export function ChatMessages({ messages }: ChatMessagesProps) {
  return (
    <div className="flex flex-col gap-8 w-full py-8">
      {messages.map((msg) => (
        <motion.div
          key={msg.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={cn(
            "flex",
            msg.role === "user" ? "justify-end" : "justify-start"
          )}
        >
          {msg.role === "user" ? (
            <div className="flex flex-col items-end gap-2 max-w-[70%]">
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-end mt-1">
                  {msg.attachments.map(att => (
                    <div key={att.id} className="rounded-lg overflow-hidden border border-neutral-700 bg-neutral-800/50">
                      {att.type.startsWith("image/") ? (
                        <img src={att.data} alt={att.name} className="max-w-[200px] max-h-[200px] object-cover" />
                      ) : (
                        <div className="px-3 py-2 flex items-center gap-2">
                          <span className="text-xl">📄</span>
                          <span className="text-xs text-neutral-300 font-medium">{att.name}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {msg.content && (
                <div className="bg-neutral-800 text-white rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </div>
              )}
            </div>
          ) : (() => {
            // Check if this is a multi-model response prefixed with "**ModelName:** "
            const multiModelMatch = msg.content?.match(/^\*\*([a-zA-Z0-9_-]+):\*\*\s*(.*)/s);
            const isMultiModel = !!multiModelMatch;
            const modelName = isMultiModel ? multiModelMatch[1] : null;
            const contentToRender = isMultiModel ? multiModelMatch[2] : msg.content;

            return (
              <div className={cn(
                "text-neutral-100 text-[15px] leading-7 w-full",
                isMultiModel ? "mt-6 pt-6 border-t border-neutral-800 w-full" : "max-w-[85%]"
              )}>
                {isMultiModel && (
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                      <ModelIcon name={modelName || ""} />
                    </div>
                    <span className="text-sm font-semibold text-neutral-300 shadow-sm">{modelName}</span>
                  </div>
                )}
                {msg.loading && !contentToRender ? (
                  <MessageLoading />
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-3xl font-bold mt-10 mb-5 text-white tracking-tight">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-2xl font-semibold mt-9 mb-4 text-white tracking-tight">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-xl font-semibold mt-8 mb-3 text-white">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="mb-5 text-neutral-200 leading-7">
                          {children}
                        </p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc pl-6 mb-6 space-y-2 text-neutral-200">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal pl-6 mb-6 space-y-2 text-neutral-200">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="leading-7">
                          {children}
                        </li>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold text-white">
                          {children}
                        </strong>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-neutral-700 pl-5 italic text-neutral-300 my-6">
                          {children}
                        </blockquote>
                      ),
                      hr: () => (
                        <div className="my-10 border-t border-neutral-800" />
                      ),
                      img: ({ src, alt }) => (
                        <div className="my-4 rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950 flex justify-center relative group">
                          <img src={src} alt={alt || "Generated Output"} className="max-w-full max-h-[512px] object-contain" />
                          <a
                            href={src}
                            download="generated-image.png"
                            className="absolute top-2 right-2 p-2 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm hover:bg-black/80"
                            title="Download Image"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          </a>
                        </div>
                      ),
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-8">
                          <table className="min-w-full border border-neutral-800 text-sm">
                            {children}
                          </table>
                        </div>
                      ),
                      th: ({ children }) => (
                        <th className="border border-neutral-800 bg-neutral-900 px-4 py-2 text-left text-white font-medium">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="border border-neutral-800 px-4 py-2 text-neutral-200">
                          {children}
                        </td>
                      ),
                      code: ({ node, className, children, ...props }) => {
                        const isInline = !className;

                        return isInline ? (
                          <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-[13px] text-white">
                            {children}
                          </code>
                        ) : (
                          <CodeBlock className={className}>
                            {children}
                          </CodeBlock>
                        );
                      },
                    }}
                  >
                    {contentToRender}
                  </ReactMarkdown>
                )}
                {msg.loading && contentToRender && (
                  <div className="mt-4 inline-block">
                    <MessageLoading />
                  </div>
                )}
              </div>
            );
          })()}
        </motion.div>
      ))}
    </div>
  );
}