/**
 * Centralized Typography Constants for Villaggio Terrace
 * Ensures Lexend Deca is standard across all rendering contexts.
 */

export const TYPOGRAPHY = {
  /** The primary font family used across the simulation */
  FONT_FAMILY: "'Lexend Deca', 'Lexend', sans-serif",
  
  /** 
   * Specific font settings for different render contexts 
   * to ensure visual parity between HUD and 3D space.
   */
  CONTEXTS: {
    /** 2D Overlay GUI elements (Panels, HUD, Toolbars) */
    GUI: {
      fontFamily: "'Lexend Deca', sans-serif",
      fontWeight: '400',
    },
    /** Interactive form elements (Buttons, Textboxes) */
    INTERACTIVE: {
      fontFamily: "'Lexend Deca', sans-serif",
      fontWeight: '500', // Slightly heavier for clarity
    },
    /** 3D Simulation Space elements (Floating text, Indicators) */
    SIMULATION_3D: {
      fontFamily: "'Lexend Deca', sans-serif",
      fontWeight: '600', // Bolder for 3D legibility
    }
  }
} as const;

export type TypographyContext = keyof typeof TYPOGRAPHY.CONTEXTS;
