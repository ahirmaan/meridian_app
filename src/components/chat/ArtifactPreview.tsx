"use client";

import React, { useState } from "react";
import { Code2, MonitorPlay, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";

interface ArtifactPreviewProps {
    code: string;
    language: string;
    onClose?: () => void;
}

export function ArtifactPreview({ code, language, onClose }: ArtifactPreviewProps) {
    const [activeTab, setActiveTab] = useState<"preview" | "code">(
        language.toLowerCase() === "html" ? "preview" : "code"
    );

    const renderPreview = () => {
        if (["html", "javascript", "js", "jsx", "tsx", "ts"].includes(language.toLowerCase())) {
            const isReact = ["jsx", "tsx", "javascript", "js", "ts"].includes(language.toLowerCase());

            let htmlContent = code;

            // If it's React/JS code, we need to wrap it in a complete HTML document that loads React + Babel
            if (isReact) {
                // Strip out imports as they won't work in the browser standalone version
                const cleanCode = code.replace(/^import.*from.*$/gm, "").trim();

                htmlContent = `
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = { darkMode: 'class' }
  </script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <!-- Load lucide fallback for icons if they try to use them -->
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    body { background-color: #0a0a0a; color: #ffffff; padding: 1rem; }
  </style>
</head>
<body>
  <div id="root"></div>

  <script type="text/babel" data-presets="react,typescript">
    // Make common hooks available globally so AI doesn't need to import them
    const { useState, useEffect, useRef, useMemo, useCallback, useContext } = React;
    
    ${cleanCode}

    // Try to find the default export or the main component to render
    const root = ReactDOM.createRoot(document.getElementById('root'));
    
    try {
      if (typeof App !== 'undefined') {
        root.render(<App />);
      } else if (typeof Default !== 'undefined') {
        root.render(<Default />);
      } else {
        // Try to find any component (starts with capital letter)
        const components = Object.keys(window).filter(key => key.match(/^[A-Z]/) && typeof window[key] === 'function');
        if (components.length > 0) {
          const Comp = window[components[0]];
          root.render(<Comp />);
        } else {
          // If no component found, just log it
          console.log("No React component found to render. Make sure your component is named 'App' or is capitalized.");
        }
      }
      
      // Initialize lucide icons if used
      lucide.createIcons();
    } catch(e) {
      document.getElementById('root').innerHTML = '<div style="color: #ef4444; font-family: monospace;">' + e.toString() + '</div>';
    }
  </script>
</body>
</html>`;
            }

            return (
                <iframe
                    title="Artifact Preview"
                    srcDoc={htmlContent}
                    className="w-full h-full bg-neutral-950 border-0"
                    sandbox="allow-scripts allow-forms allow-same-origin"
                />
            );
        }

        return (
            <div className="flex items-center justify-center h-full text-neutral-500 text-sm bg-neutral-950">
                Preview not available for {language}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-neutral-900 border-l border-neutral-800 w-full min-w-[400px] shrink-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950 shrink-0">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setActiveTab("preview")}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                            activeTab === "preview" ? "bg-neutral-800 text-white" : "text-neutral-500 hover:text-neutral-300"
                        )}
                    >
                        <MonitorPlay className="w-4 h-4" /> Preview
                    </button>
                    <button
                        onClick={() => setActiveTab("code")}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                            activeTab === "code" ? "bg-neutral-800 text-white" : "text-neutral-500 hover:text-neutral-300"
                        )}
                    >
                        <Code2 className="w-4 h-4" /> Code
                    </button>
                </div>
                {onClose && (
                    <button onClick={onClose} className="p-1.5 text-neutral-500 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-hidden relative">
                <AnimatePresence mode="wait">
                    {activeTab === "preview" ? (
                        <motion.div
                            key="preview"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="absolute inset-0"
                        >
                            {renderPreview()}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="code"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="absolute inset-0 overflow-auto bg-neutral-950 p-4"
                        >
                            <pre className="text-[13px] text-neutral-300 font-mono whitespace-pre-wrap break-words">
                                {code}
                            </pre>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
