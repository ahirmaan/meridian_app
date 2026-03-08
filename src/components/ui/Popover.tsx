"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";

interface PopoverProps {
  trigger: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  className?: string;
  align?: "left" | "right";
  offset?: number;
}

export function Popover({ trigger, children, className, align = "right", offset = 4 }: PopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let top = rect.bottom + offset;
      let left = align === "right" ? rect.right : rect.left;

      // Clamping logic
      // If right aligned, the popover extends to the left of 'left'
      // If left aligned, the popover extends to the right of 'left'
      // Since we use translateX(-100%) for right align, we need to be careful.

      // For now, let's just ensure it doesn't go off the right edge
      if (left > viewportWidth - 10) left = viewportWidth - 10;
      if (left < 10) left = 10;

      setCoords({ top, left });
    }
  }, [align, offset]);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
    }
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <div ref={triggerRef} className="inline-block">
      <div onClick={(e) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
      }}>{trigger}</div>
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={popoverRef}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
              style={{
                position: "fixed",
                top: coords.top,
                left: coords.left,
                transform: align === "right" ? "translateX(-100%)" : "none",
                zIndex: 4000,
              }}
              className={cn(
                "bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl min-w-[160px] overflow-hidden",
                className
              )}
            >
              {children(() => setIsOpen(false))}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
