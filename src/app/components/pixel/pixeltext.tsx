import { memo } from "react";
import { GLYPH_HEIGHT, textPixels } from "./bitmapfont";
import { INK, outline, paths } from "./pixelart";

interface PixelTextProps {
    text: string;
    /** Fill colour; the outline is always dark. */
    color?: string;
    className?: string;
}

/**
 * Short text in the bitmap font, outlined, as crisp SVG. It's sized in art
 * pixels through --px, so it lines up with the pixel art around it.
 */
export const PixelText = memo(({ text, color = "#ffffff", className }: PixelTextProps) => {
    const rows = textPixels(text);
    // A pixel of room on every side for the outline
    const framed = outline(["." + ".".repeat(rows[0].length) + ".", ...rows.map(row => `.${row}.`), "." + ".".repeat(rows[0].length) + "."]);
    const width = framed[0].length;
    const height = GLYPH_HEIGHT + 2;

    return (
        <svg
            className={className}
            viewBox={`0 0 ${width} ${height}`}
            shapeRendering="crispEdges"
            style={{ width: `calc(var(--px) * ${width})`, height: `calc(var(--px) * ${height})` }}
            role="img"
            aria-label={text}
        >
            {paths(framed, { "#": color, k: INK }).map(({ color: fill, d }) => <path key={fill} fill={fill} d={d} />)}
        </svg>
    );
});

PixelText.displayName = "PixelText";
