// src/components/common/LatexRenderer.tsx
'use client';

import { useEffect, useRef } from 'react';

interface LatexRendererProps {
  latex: string;
  inline?: boolean;
  className?: string;
}

export default function LatexRenderer({ 
  latex, 
  inline = true, 
  className = '' 
}: LatexRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderLatex = async () => {
      if (!containerRef.current) return;

      try {
        // Dynamic import of KaTeX to avoid SSR issues
        const katex = await import('katex');

        const html = katex.default.renderToString(latex, {
          throwOnError: false,
          displayMode: !inline,
          output: 'html',
        });

        containerRef.current.innerHTML = html;
      } catch (error) {
        console.error('LaTeX rendering error:', error);
        // Fallback to plain text
        if (containerRef.current) {
          containerRef.current.textContent = latex;
        }
      }
    };

    renderLatex();
  }, [latex, inline]);

  return (
    <div
      ref={containerRef}
      className={`katex-container ${className}`}
      style={{ 
        fontSize: inline ? 'inherit' : '1.2em',
        display: inline ? 'inline' : 'block',
        textAlign: inline ? 'left' : 'center',
      }}
    />
  );
}

// Helper component for mixed text and LaTeX
export function MathText({ children }: { children: string }) {
  // Split text by LaTeX delimiters: $...$ for inline, $$...$$ for display
  const parts = children.split(/(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$)/g);

  return (
    <span>
      {parts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          // Display math
          return (
            <LatexRenderer
              key={index}
              latex={part.slice(2, -2)}
              inline={false}
            />
          );
        } else if (part.startsWith('$') && part.endsWith('$')) {
          // Inline math
          return (
            <LatexRenderer
              key={index}
              latex={part.slice(1, -1)}
              inline={true}
            />
          );
        } else {
          // Plain text
          return <span key={index}>{part}</span>;
        }
      })}
    </span>
  );
}