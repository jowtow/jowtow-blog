"use client";

import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Lightbox from "@/components/Lightbox/Lightbox";

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(
    null,
  );

  const handleImageClick = useCallback((src: string, alt: string) => {
    setLightbox({ src, alt });
  }, []);

  return (
    <>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          p: ({ children, node }: any) => {
            const nodeChildren: any[] = node?.children ?? [];
            const nonWhitespace = nodeChildren.filter(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (child: any) =>
                !(child.type === "text" && /^\s*$/.test(child.value ?? "")),
            );
            const imgCount = nonWhitespace.filter(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (child: any) =>
                child.type === "element" && child.tagName === "img",
            ).length;

            if (imgCount > 1 && imgCount === nonWhitespace.length) {
              return <div className="photo-row">{children}</div>;
            }
            return <p>{children}</p>;
          },
          img: ({ src, alt }) => (
            <img
              src={src || ""}
              alt={alt ?? ""}
              loading="lazy"
              className="article-img"
              onClick={() => src && handleImageClick(src, alt ?? "")}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
      {lightbox && (
        <Lightbox
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}
