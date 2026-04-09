/**
 * Interface for CSG cutout definitions
 */
export interface WindowCutout {
    x: number;
    y: number;
    z: number;
    w: number;
    h: number;
    d: number;
}

/**
 * Configuration for window generation
 */
export interface WindowGenerationConfig {
    roomWidth: number;
    roomHeight: number;
    roomDepth: number;
    cutoutWidth: number;
    cutoutHeight: number;
    verticalOffset?: number;
    penetrationDepth?: number;
}

/**
 * Generates an array of architectural window cutouts for CSG subtraction.
 * Standardizes cell-based 10-unit positioning and high readability.
 */
export const generateWindowCutouts = (config: WindowGenerationConfig): WindowCutout[] => {
    const {
        roomWidth,
        roomDepth,
        cutoutWidth,
        cutoutHeight,
        verticalOffset = 0,
        penetrationDepth = 20.0,
    } = config;

    const cellCount = Math.max(1, Math.round(roomWidth / 10));
    const cellWidth = 10.0;
    const startX = -roomWidth / 2 + cellWidth / 2;

    return Array.from({ length: cellCount }).map((_, i) => {
        const horizontalCellPosition = startX + i * cellWidth;

        return {
            x: horizontalCellPosition,
            y: verticalOffset,
            z: -roomDepth / 2, // Flush with the back-wall center
            w: cutoutWidth,
            h: cutoutHeight,
            d: penetrationDepth,
        };
    });
};
