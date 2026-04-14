import React, {
  useState,
  useRef,
  useLayoutEffect,
  useEffect,
  useId,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSimulationStore } from "../utils/store";
import themes from "../../features/ui/themes/palettes/color_palettes.json";

interface SmartTooltipProps {
  children: React.ReactNode;
  content: string;
  description?: React.ReactNode;
  shortcut?: string;
  position?: "top" | "bottom" | "left" | "right";
  width?: string;
}

export const SmartTooltip: React.FC<SmartTooltipProps> = ({
  children,
  content,
  description,
  shortcut,
  position = "right",
  width,
}) => {
  const id = useId();
  const activeTooltipId = useSimulationStore((state) => state.activeTooltipId);
  const setActiveTooltipId = useSimulationStore(
    (state) => state.setActiveTooltipId,
  );
  const isVisible = activeTooltipId === id;

  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [actualPosition, setActualPosition] = useState(position);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const lastUpdateRef = useRef({ x: 0, y: 0, pos: position });

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const frameId = requestAnimationFrame(() => {
      const rect = triggerRef.current!.getBoundingClientRect();
      const padding = 32; // Increased padding for safety
      const viewportWidth = Math.min(
        window.innerWidth,
        document.documentElement.clientWidth,
      );
      const viewportHeight = Math.min(
        window.innerHeight,
        document.documentElement.clientHeight,
      );

      // Measure or fallback
      const tooltipWidth =
        tooltipRef.current?.offsetWidth || (width ? parseInt(width) : 260);
      const tooltipHeight = tooltipRef.current?.offsetHeight || 180;

      let targetPos = position;

      const calculateCoords = (pos: typeof position) => {
        let tx = 0;
        let ty = 0;
        const offset = 6;

        switch (pos) {
          case "right":
            tx = rect.right + offset;
            ty = rect.top + rect.height / 2;
            break;
          case "left":
            tx = rect.left - offset;
            ty = rect.top + rect.height / 2;
            break;
          case "top":
            tx = rect.left + rect.width / 2;
            ty = rect.top - offset;
            break;
          case "bottom":
            tx = rect.left + rect.width / 2;
            ty = rect.bottom + offset;
            break;
        }
        return { tx, ty };
      };

      const originalCoords = calculateCoords(targetPos);
      let tx = originalCoords.tx;
      let ty = originalCoords.ty;

      // Position Flipping Strategy (with hysteresis)
      if (targetPos === "right") {
        const overflow = tx + tooltipWidth > viewportWidth - padding;
        const spaceOnLeft = rect.left - tooltipWidth - padding > padding;
        if (overflow && spaceOnLeft) targetPos = "left";
      } else if (targetPos === "left") {
        const overflow = tx - tooltipWidth < padding;
        const spaceOnRight =
          rect.right + tooltipWidth + padding < viewportWidth;
        if (overflow && spaceOnRight) targetPos = "right";
      }

      if (targetPos !== position) {
        const flipped = calculateCoords(targetPos);
        tx = flipped.tx;
        ty = flipped.ty;
      }

      // Final Clamping (Stay in View)
      if (targetPos === "right" || targetPos === "left") {
        const hh = tooltipHeight / 2;
        ty = Math.max(
          padding + hh,
          Math.min(ty, viewportHeight - padding - hh),
        );

        if (targetPos === "right") {
          tx = Math.max(
            padding,
            Math.min(tx, viewportWidth - padding - tooltipWidth),
          );
        } else {
          tx = Math.max(
            padding + tooltipWidth,
            Math.min(tx, viewportWidth - padding),
          );
        }
      } else {
        const hw = tooltipWidth / 2;
        tx = Math.max(padding + hw, Math.min(tx, viewportWidth - padding - hw));
        if (targetPos === "bottom") {
          ty = Math.max(
            padding,
            Math.min(ty, viewportHeight - padding - tooltipHeight),
          );
        } else {
          ty = Math.max(
            padding + tooltipHeight,
            Math.min(ty, viewportHeight - padding),
          );
        }
      }

      // Only update state if values changed significantly (prevent sub-pixel jitter)
      const dx = Math.abs(tx - lastUpdateRef.current.x);
      const dy = Math.abs(ty - lastUpdateRef.current.y);
      const posChanged = targetPos !== lastUpdateRef.current.pos;

      if (dx > 1 || dy > 1 || posChanged) {
        lastUpdateRef.current = { x: tx, y: ty, pos: targetPos };
        setActualPosition(targetPos);
        setCoords({ x: tx, y: ty });
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, [position]);

  useEffect(() => {
    if (isVisible) {
      // Use a debounced ResizeObserver or frame-bound one
      const observer = new ResizeObserver(() => {
        updatePosition();
      });

      if (tooltipRef.current) observer.observe(tooltipRef.current);
      if (triggerRef.current) observer.observe(triggerRef.current);

      window.addEventListener("scroll", updatePosition, {
        passive: true,
        capture: true,
      });
      window.addEventListener("resize", updatePosition, { passive: true });
      updatePosition();

      return () => {
        observer.disconnect();
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [isVisible, updatePosition]);

  const variants = {
    initial: {
      opacity: 0,
      scale: 0.98,
      filter: "blur(4px)",
    },
    animate: {
      opacity: 1,
      scale: 1,
      filter: "blur(0px)",
      transition: {
        type: "spring" as const,
        stiffness: 500,
        damping: 40,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.98,
      transition: { duration: 0.1 },
    },
  };

  const tooltipContent = (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={tooltipRef}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={variants}
          style={{
            position: "fixed",
            left: coords.x,
            top: coords.y,
            transform:
              actualPosition === "right" || actualPosition === "left"
                ? "translateY(-50%)"
                : "translateX(-50%)",
            zIndex: 99999,
            pointerEvents: "none",
            willChange: "transform, opacity",
            width: width || "max-content",
            maxWidth: "calc(100vw - 48px)",
          }}
          className="relative flex items-center"
        >
          <div
            className={`absolute top-1/2 -translate-y-1/2 ${actualPosition === "right" ? "left-0 -ml-[-1px]" : actualPosition === "left" ? "right-0 -mr-[-1px] order-2" : ""}`}
          >
            {actualPosition === "right" && (
              <div className="w-0 h-0 border-y-[6px] border-y-transparent border-r-[8px] border-r-primary/20 mr-[-1px]" />
            )}
            {actualPosition === "left" && (
              <div className="w-0 h-0 border-y-[6px] border-y-transparent border-l-[8px] border-l-primary/20 ml-[-1px] order-2" />
            )}
            {actualPosition === "top" && (
              <div className="absolute left-1/2 -translate-x-1/2 -top-[7px] w-0 h-0 border-x-[6px] border-x-transparent border-t-[8px] border-t-primary/20" />
            )}
            {actualPosition === "bottom" && (
              <div className="absolute left-1/2 -translate-x-1/2 -bottom-[7px] w-0 h-0 border-x-[6px] border-x-transparent border-b-[8px] border-b-primary/20" />
            )}

            <div className="bg-background/90 backdrop-blur-2xl border border-primary/30 rounded-xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.4)] relative overflow-hidden h-max w-full box-border">
              <div className="absolute -top-10 -right-10 w-20 h-20 bg-primary/10 blur-3xl rounded-full" />

              <div
                className={`flex flex-col gap-2 relative z-10 min-w-0 ${description ? "min-w-[10rem]" : ""}`}
              >
                <div className="flex items-center justify-between gap-4 min-w-0">
                  <span className="text-[11px] font-bold text-text tracking-tight uppercase whitespace-nowrap flex-shrink-0">
                    {content}
                  </span>
                  {shortcut && (
                    <span className="px-1.5 py-0.5 rounded bg-text/10 border border-text/5 text-[9px] font-mono text-primary font-bold whitespace-nowrap flex-shrink-0">
                      {shortcut}
                    </span>
                  )}
                </div>

                {description && (
                  <div className="text-[10px] text-text/50 leading-relaxed font-medium break-words">
                    {description}
                  </div>
                )}
              </div>

              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r via-primary/40 to-transparent origin-center"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div
      ref={triggerRef}
      onMouseEnter={() => setActiveTooltipId(id)}
      onMouseLeave={() => setActiveTooltipId(null)}
      onClick={() => setActiveTooltipId(null)}
      className="relative inline-block"
    >
      {children}
      {typeof document !== "undefined" &&
        createPortal(tooltipContent, document.body)}
    </div>
  );
};
