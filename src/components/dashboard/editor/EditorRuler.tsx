import { useState, useRef, useCallback, useEffect } from "react";

interface EditorRulerProps {
  /** Total ruler width in px (matches A4 canvas width) */
  widthPx: number;
  /** Page left padding in px (maps to PDF margin-left) */
  pagePaddingLeft: number;
  /** Page right padding in px (maps to PDF margin-right) */
  pagePaddingRight: number;
  /** Left indent in px (margin-left on paragraphs) */
  leftIndent: number;
  /** Right indent in px */
  rightIndent: number;
  /** First-line indent in px (text-indent) */
  firstLineIndent: number;
  onLeftIndentChange: (px: number) => void;
  onRightIndentChange: (px: number) => void;
  onFirstLineIndentChange: (px: number) => void;
  /** Called when a drag begins (useful to snapshot editor selection) */
  onDragStart?: () => void;
  zoom?: number;
}

type DragTarget = "left" | "right" | "firstLine" | null;

/* ─── Theme-aware palette ─── */
const RULER_BG = "hsl(var(--muted))";
const RULER_BORDER = "hsl(var(--border))";
const TICK_MAJOR = "hsl(var(--muted-foreground) / 0.5)";
const TICK_MINOR = "hsl(var(--muted-foreground) / 0.25)";
const TICK_LABEL = "hsl(var(--muted-foreground) / 0.7)";
const ACCENT = "hsl(var(--primary))";
const ACCENT_DIM = "hsl(var(--primary) / 0.25)";
const ACCENT_BRIGHT = "hsl(var(--primary) / 0.55)";
const USABLE_BG = "hsl(var(--primary) / 0.08)";
const ACTIVE_BG = "hsl(var(--primary) / 0.18)";
const TOOLTIP_BG = "hsl(var(--popover))";
const TOOLTIP_FG = "hsl(var(--popover-foreground))";
const MARKER_STROKE = "hsl(var(--background))";

export function EditorRuler({
  widthPx,
  pagePaddingLeft,
  pagePaddingRight,
  leftIndent,
  rightIndent,
  firstLineIndent,
  onLeftIndentChange,
  onRightIndentChange,
  onFirstLineIndentChange,
  onDragStart,
  zoom = 100,
}: EditorRulerProps) {
  const rulerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<DragTarget>(null);

  // Use local state during drag for visual feedback
  const [localLeft, setLocalLeft] = useState(leftIndent);
  const [localRight, setLocalRight] = useState(rightIndent);
  const [localFirstLine, setLocalFirstLine] = useState(firstLineIndent);

  // Refs for stable access in drag handlers (avoids re-registering listeners)
  const localValuesRef = useRef({ left: localLeft, right: localRight, firstLine: localFirstLine });
  localValuesRef.current = { left: localLeft, right: localRight, firstLine: localFirstLine };

  const callbacksRef = useRef({ onLeftIndentChange, onRightIndentChange, onFirstLineIndentChange });
  callbacksRef.current = { onLeftIndentChange, onRightIndentChange, onFirstLineIndentChange };

  const dragRef = useRef<{
    target: DragTarget;
    startX: number;
    startValue: number;
  } | null>(null);

  const scale = zoom / 100;

  // Sync local state from props when NOT dragging
  useEffect(() => {
    if (!dragging) {
      setLocalLeft(leftIndent);
      setLocalRight(rightIndent);
      setLocalFirstLine(firstLineIndent);
    }
  }, [leftIndent, rightIndent, firstLineIndent, dragging]);

  // Convert ruler position to cm marks
  const totalCm = 21; // A4 = 21cm
  const pxPerCm = widthPx / totalCm;

  // Usable area boundaries
  const usableLeft = pagePaddingLeft;
  const usableRight = widthPx - pagePaddingRight;
  const usableWidth = usableRight - usableLeft;
  const MIN_CONTENT_WIDTH = 40;
  const usableWidthRef = useRef(usableWidth);
  usableWidthRef.current = usableWidth;

  const handleMouseDown = useCallback(
    (target: DragTarget, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Notify parent to snapshot editor selection before drag
      onDragStart?.();

      const startValue =
        target === "left" ? localLeft : target === "right" ? localRight : localFirstLine;

      dragRef.current = { target, startX: e.clientX, startValue };
      setDragging(target);
    },
    [localLeft, localRight, localFirstLine, onDragStart]
  );

  // Register listeners only when dragging starts/stops (not on every pixel change)
  useEffect(() => {
    if (!dragging || !dragRef.current) return;

    const scaleVal = scale;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const { target, startX, startValue } = dragRef.current;
      const dx = (e.clientX - startX) / scaleVal;
      const newVal = startValue + (target === "right" ? -dx : dx);
      const vals = localValuesRef.current;

      const maxForTarget =
        target === "left"
          ? usableWidthRef.current - vals.right - MIN_CONTENT_WIDTH
          : target === "right"
            ? usableWidthRef.current - vals.left - MIN_CONTENT_WIDTH
            : usableWidthRef.current - vals.left - vals.right - MIN_CONTENT_WIDTH;

      const clamped = Math.round(Math.max(0, Math.min(newVal, Math.max(0, maxForTarget))));

      if (target === "left") setLocalLeft(clamped);
      else if (target === "right") setLocalRight(clamped);
      else if (target === "firstLine") setLocalFirstLine(clamped);
    };

    const handleMouseUp = () => {
      if (dragRef.current) {
        const { target } = dragRef.current;
        const vals = localValuesRef.current;
        // Commit final value to parent using ref (always fresh)
        if (target === "left") callbacksRef.current.onLeftIndentChange(vals.left);
        else if (target === "right") callbacksRef.current.onRightIndentChange(vals.right);
        else if (target === "firstLine") {
          const maxFirst = Math.max(0, usableWidthRef.current - vals.left - vals.right - MIN_CONTENT_WIDTH);
          callbacksRef.current.onFirstLineIndentChange(Math.max(0, Math.min(vals.firstLine, maxFirst)));
        }
      }
      dragRef.current = null;
      setDragging(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, scale]); // Only re-register when drag state or scale changes

  // Marker positions — use LOCAL values during drag
  const leftMarkerX = usableLeft + localLeft;
  const rightMarkerX = usableRight - localRight;
  const maxFirstLine = Math.max(0, usableWidth - localLeft - localRight - MIN_CONTENT_WIDTH);
  const safeFirstLine = Math.max(0, Math.min(localFirstLine, maxFirstLine));
  const firstLineMarkerX = leftMarkerX + safeFirstLine;

  return (
    <div
      ref={rulerRef}
      className="relative select-none"
      style={{ width: widthPx, height: 28 }}
    >
      {/* Ruler background */}
      <div
        className="absolute inset-0 rounded-t-sm"
        style={{
          background: RULER_BG,
          borderBottom: `1px solid ${RULER_BORDER}`,
        }}
      />

      {/* Cm tick marks */}
      {Array.from({ length: totalCm + 1 }, (_, i) => {
        const x = i * pxPerCm;
        return (
          <div key={`cm-${i}`}>
            {/* Major tick */}
            <div
              className="absolute"
              style={{
                left: x,
                bottom: 0,
                width: 1,
                height: 10,
                background: TICK_MAJOR,
              }}
            />
            {/* Half tick */}
            {i < totalCm && (
              <div
                className="absolute"
                style={{
                  left: x + pxPerCm / 2,
                  bottom: 0,
                  width: 1,
                  height: 6,
                  background: TICK_MINOR,
                }}
              />
            )}
            {/* Label */}
            {i > 0 && i < totalCm && (
              <span
                className="absolute text-[8px] font-mono"
                style={{
                  left: x,
                  top: 2,
                  transform: "translateX(-50%)",
                  color: TICK_LABEL,
                }}
              >
                {i}
              </span>
            )}
          </div>
        );
      })}

      {/* Usable area highlight */}
      <div
        className="absolute"
        style={{
          left: usableLeft,
          right: widthPx - usableRight,
          bottom: 0,
          height: 3,
          background: USABLE_BG,
          borderRadius: 1,
        }}
      />

      {/* Active text area (between indent markers) */}
      <div
        className="absolute"
        style={{
          left: leftMarkerX,
          right: widthPx - rightMarkerX,
          bottom: 0,
          height: 3,
          background: ACTIVE_BG,
          borderRadius: 1,
        }}
      />

      {/* First-line indent marker (▼ triangle at top) */}
      <Marker
        x={firstLineMarkerX}
        type="firstLine"
        dragging={dragging === "firstLine"}
        onMouseDown={(e) => handleMouseDown("firstLine", e)}
        tooltip="Recuo 1ª linha"
      />

      {/* Left indent marker (▲ triangle at bottom) */}
      <Marker
        x={leftMarkerX}
        type="left"
        dragging={dragging === "left"}
        onMouseDown={(e) => handleMouseDown("left", e)}
        tooltip="Recuo esquerdo"
      />

      {/* Right indent marker (▲ triangle at bottom, mirrored) */}
      <Marker
        x={rightMarkerX}
        type="right"
        dragging={dragging === "right"}
        onMouseDown={(e) => handleMouseDown("right", e)}
        tooltip="Recuo direito"
      />

      {/* Value tooltip during drag */}
      {dragging && (
        <div
          className="absolute text-[9px] font-mono px-1.5 py-0.5 rounded shadow-sm pointer-events-none border"
          style={{
            left:
              dragging === "left"
                ? leftMarkerX
                : dragging === "right"
                  ? rightMarkerX
                  : firstLineMarkerX,
            top: -20,
            transform: "translateX(-50%)",
            background: TOOLTIP_BG,
            color: TOOLTIP_FG,
            borderColor: RULER_BORDER,
          }}
        >
          {(() => {
            const val =
              dragging === "left" ? localLeft : dragging === "right" ? localRight : safeFirstLine;
            return `${(val / pxPerCm).toFixed(1)}cm`;
          })()}
        </div>
      )}
    </div>
  );
}

function Marker({
  x,
  type,
  dragging,
  onMouseDown,
  tooltip,
}: {
  x: number;
  type: "left" | "right" | "firstLine";
  dragging: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  tooltip: string;
}) {
  const isTop = type === "firstLine";
  const color = dragging ? ACCENT : ACCENT_BRIGHT;

  return (
    <div
      className="absolute cursor-col-resize group/marker"
      style={{
        left: x - 6,
        [isTop ? "top" : "bottom"]: 0,
        width: 12,
        height: 14,
        zIndex: 10,
      }}
      onMouseDown={onMouseDown}
      title={tooltip}
    >
      {/* Triangle SVG */}
      <svg
        width="12"
        height="10"
        viewBox="0 0 12 10"
        className="absolute left-0"
        style={{
          [isTop ? "top" : "bottom"]: 0,
          transform: isTop ? "none" : "rotate(180deg)",
        }}
      >
        <polygon
          points="6,0 0,10 12,10"
          fill={color}
          stroke={MARKER_STROKE}
          strokeWidth="0.5"
        />
      </svg>
      {/* Vertical guide line when dragging */}
      {dragging && (
        <div
          className="absolute left-[5px] pointer-events-none"
          style={{
            width: 1,
            top: isTop ? 10 : -1000,
            height: 1000,
            background: ACCENT_DIM,
          }}
        />
      )}
    </div>
  );
}
