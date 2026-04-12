"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import MarkdownRenderer from "@/components/MarkdownRenderer/MarkdownRenderer";

type CarouselItem = {
  title: string;
  image: string;
  markdown: string;
  slug: string;
  date: string;
};

type CollectionCarouselProps = {
  items: CarouselItem[];
};

export default function CollectionCarousel({ items }: CollectionCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeItem = items[activeIndex];

  const goTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, items.length - 1));
      setActiveIndex(clamped);
    },
    [items.length],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        goTo(activeIndex + 1);
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(activeIndex - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, goTo]);

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--text-light)]/60">
        No items in this collection yet.
      </div>
    );
  }

  const visibleRange = 3;

  return (
    <div ref={containerRef} className="flex flex-col py-4">
      {/* Full-width overview at the top */}
      <div className="w-full mb-6 px-2 py-3">
        <div className="flex items-center justify-start gap-0 min-h-[36px] overflow-x-auto pb-2">
          {items.map((item, index) => {
            const isActive = index === activeIndex;
            const thumbSize = Math.max(20, Math.min(32, 800 / items.length));

            return (
              <button
                key={`shelf-${item.slug}`}
                type="button"
                onClick={() => goTo(index)}
                className="flex-shrink-0 overflow-hidden border transition-all duration-200 focus:outline-none"
                style={{
                  width: `${thumbSize}px`,
                  height: `${thumbSize}px`,
                  marginLeft:
                    index > 0 ? `-${Math.ceil(thumbSize * 0.35)}px` : "0",
                  zIndex: isActive ? items.length + 2 : index,
                  borderColor: isActive
                    ? "var(--color-primary)"
                    : "rgba(156,175,136,0.45)",
                  borderWidth: isActive ? "1px" : "0px",
                  transform: isActive ? "scaleY(1.2)" : "scale(1)",
                  boxShadow: isActive
                    ? "0 3px 10px rgba(127,255,0,0.35)"
                    : "0 1px 4px rgba(0,0,0,0.4)",
                }}
                aria-label={`Jump to ${item.title}`}
              >
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover"
                    unoptimized={item.image.startsWith("/api/images/")}
                    sizes="32px"
                  />
                ) : (
                  <div className="w-full h-full bg-[var(--color-dark)]" />
                )}
                {!isActive && <div className="absolute inset-0 bg-black/25" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hero and description in flex row */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-start">
        <div className="w-full lg:w-auto flex flex-col items-center shrink-0">
          <div
            className="relative w-[280px] h-[280px] sm:w-[340px] sm:h-[340px] md:w-[400px] md:h-[400px]"
            style={{ perspective: "800px" }}
          >
            {items.map((item, index) => {
              const offset = index - activeIndex;
              const absOffset = Math.abs(offset);

              if (absOffset > visibleRange) return null;

              const translateY = offset * 32;
              const translateZ = -absOffset * 60;
              const opacity =
                absOffset === 0 ? 1 : Math.max(0.2, 1 - absOffset * 0.3);
              const scale =
                absOffset === 0 ? 1 : Math.max(0.85, 1 - absOffset * 0.05);
              const isActive = index === activeIndex;

              return (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => goTo(index)}
                  className="absolute inset-0 rounded-lg overflow-hidden border-2 cursor-pointer focus:outline-none"
                  style={{
                    transform: `translateY(${translateY}px) translateZ(${translateZ}px) scale(${scale})`,
                    opacity,
                    zIndex: items.length - absOffset,
                    transition:
                      "transform 0.4s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.4s ease",
                    borderColor: isActive
                      ? "var(--color-primary)"
                      : "rgba(156,175,136,0.3)",
                    boxShadow: isActive
                      ? "0 8px 32px rgba(127,255,0,0.2)"
                      : "0 4px 16px rgba(0,0,0,0.4)",
                  }}
                >
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover"
                      unoptimized={item.image.startsWith("/api/images/")}
                      sizes="400px"
                    />
                  ) : (
                    <div className="w-full h-full bg-[var(--color-dark)] flex items-center justify-center text-[var(--text-light)]/40 text-lg">
                      {item.title}
                    </div>
                  )}
                  {!isActive && (
                    <div className="absolute inset-0 bg-black/30" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => goTo(activeIndex - 1)}
              disabled={activeIndex === 0}
              className="px-3 py-1 rounded border border-[var(--color-secondary)]/40 bg-black/35 text-[var(--text-light)] disabled:opacity-30 cursor-pointer"
              aria-label="Previous item"
            >
              ▲
            </button>
            <span className="text-sm text-[var(--text-light)]/70 tabular-nums">
              {activeIndex + 1} / {items.length}
            </span>
            <button
              type="button"
              onClick={() => goTo(activeIndex + 1)}
              disabled={activeIndex === items.length - 1}
              className="px-3 py-1 rounded border border-[var(--color-secondary)]/40 bg-black/35 text-[var(--text-light)] disabled:opacity-30 cursor-pointer"
              aria-label="Next item"
            >
              ▼
            </button>
          </div>

          <p className="mt-2 text-xs text-[var(--text-light)]/50 text-center">
            Use arrow keys or buttons to navigate.
          </p>
        </div>

        <div className="flex-1 min-w-0 lg:pt-4">
          <div
            key={activeItem.slug}
            className="animate-in fade-in duration-300"
          >
            <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-1">
              {activeItem.title}
            </h2>
            <p className="text-sm text-[var(--text-light)]/60 mb-4">
              {activeItem.date}
            </p>

            {activeItem.markdown && (
              <div className="jowtowarticle prose prose-invert max-w-none text-[var(--text-light)]/85 leading-7">
                <MarkdownRenderer content={activeItem.markdown} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
