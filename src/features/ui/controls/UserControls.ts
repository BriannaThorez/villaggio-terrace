/**
 * Shared mouse interaction handlers for UI and world controls.
 * Ensures consistent behavior:
 * - Left click: Interaction/Selection
 * - Right click: Cancellation/Deselection
 * - Right click + Drag: Panning (handled at scene level)
 */

export const isRightClick = (e: { button: number }): boolean => e.button === 2;

export const handlePointerDown = (
  e: any,
  callback: () => void,
  preventPropagation: boolean = true,
) => {
  // Right-click should only trigger cancellation, not selection/action
  if (isRightClick(e)) {
    return;
  }

  if (preventPropagation) {
    e.stopPropagation();
  }

  callback();
};

export const shouldIgnoreInteraction = (e: { button: number }): boolean => {
  // If right-click, we want to allow it to bubble to global controls for pan/cancel
  return isRightClick(e);
};
