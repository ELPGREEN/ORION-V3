/**
 * EditorVerticalRuler — régua lateral vertical que exibe:
 * - Zona do cabeçalho (header/timbre)
 * - Margem superior
 * - Zona de conteúdo útil
 * - Margem inferior / zona do rodapé
 * - Marcas em cm (A4 = 29.7cm)
 *
 * Indicadores visuais coloridos mostram onde cada zona começa/termina.
 * O botão "Sincronizar" valida se as zonas estão corretas.
 */

import { useMemo } from "react";
import {
  PAGE_HEIGHT_PX,
  PAGE_HEIGHT_MM,
  MM_TO_PX,
  STD_MARGIN_TOP_MM,
  STD_MARGIN_TOP_PX,
  STD_MARGIN_BOTTOM_MM,
  STD_MARGIN_BOTTOM_PX,
  BRANDED_MARGIN_TOP_MM,
  BRANDED_MARGIN_TOP_PX,
  BRANDED_FOOTER_HEIGHT_MM,
  BRANDED_MARGIN_BOTTOM_MM,
  BRANDED_RESERVED_BOTTOM_PX,
  getUsableHeight,
  getSpacerBase,
} from "./pageConstants";

interface EditorVerticalRulerProps {
  /** Total page height in px */
  heightPx: number;
  /** Whether branded/letterhead mode is active */
  branded: boolean;
  /** Current zoom level */
  zoom?: number;
  /** Page breaks Y positions for multi-page indicator */
  pageBreaks?: number[];
}

interface ZoneInfo {
  label: string;
  startMm: number;
  endMm: number;
  color: string;
  textColor: string;
}

export function EditorVerticalRuler({
  heightPx,
  branded,
  zoom = 100,
  pageBreaks = [],
}: EditorVerticalRulerProps) {
  const totalCm = 30; // A4 ≈ 29.7cm, show 30 marks
  const pxPerMm = heightPx / PAGE_HEIGHT_MM;
  const pxPerCm = pxPerMm * 10;
  const scale = zoom / 100;

  const zones = useMemo<ZoneInfo[]>(() => {
    if (branded) {
      return [
        {
          label: "Cabeçalho",
          startMm: 0,
          endMm: BRANDED_MARGIN_TOP_MM,
          color: "hsl(210, 60%, 50%, 0.15)",
          textColor: "hsl(210, 60%, 60%)",
        },
        {
          label: "Conteúdo",
          startMm: BRANDED_MARGIN_TOP_MM,
          endMm: PAGE_HEIGHT_MM - BRANDED_MARGIN_BOTTOM_MM - BRANDED_FOOTER_HEIGHT_MM,
          color: "hsl(120, 40%, 50%, 0.08)",
          textColor: "hsl(120, 40%, 55%)",
        },
        {
          label: "Rodapé",
          startMm: PAGE_HEIGHT_MM - BRANDED_MARGIN_BOTTOM_MM - BRANDED_FOOTER_HEIGHT_MM,
          endMm: PAGE_HEIGHT_MM,
          color: "hsl(30, 60%, 50%, 0.15)",
          textColor: "hsl(30, 60%, 60%)",
        },
      ];
    }
    return [
      {
        label: "Margem sup.",
        startMm: 0,
        endMm: STD_MARGIN_TOP_MM,
        color: "hsl(210, 60%, 50%, 0.15)",
        textColor: "hsl(210, 60%, 60%)",
      },
      {
        label: "Conteúdo",
        startMm: STD_MARGIN_TOP_MM,
        endMm: PAGE_HEIGHT_MM - STD_MARGIN_BOTTOM_MM,
        color: "hsl(120, 40%, 50%, 0.08)",
        textColor: "hsl(120, 40%, 55%)",
      },
      {
        label: "Margem inf.",
        startMm: PAGE_HEIGHT_MM - STD_MARGIN_BOTTOM_MM,
        endMm: PAGE_HEIGHT_MM,
        color: "hsl(30, 60%, 50%, 0.15)",
        textColor: "hsl(30, 60%, 60%)",
      },
    ];
  }, [branded]);

  const totalPages = pageBreaks.length + 1;

  return (
    <div
      className="relative select-none flex-shrink-0"
      style={{
        width: 28,
        height: heightPx,
      }}
    >
      {/* Background */}
      <div
        className="absolute inset-0 rounded-l-sm"
        style={{
          background: "hsl(220, 15%, 16%)",
          borderRight: "1px solid hsl(220, 10%, 25%)",
        }}
      />

      {/* Zone indicators for page 1 */}
      {zones.map((zone, i) => (
        <div key={`zone-${i}`}>
          {/* Zone background */}
          <div
            className="absolute"
            style={{
              top: zone.startMm * pxPerMm,
              left: 20,
              width: 7,
              height: (zone.endMm - zone.startMm) * pxPerMm,
              background: zone.color,
              borderRadius: 1,
            }}
          />
          {/* Zone boundary line */}
          {zone.startMm > 0 && (
            <div
              className="absolute"
              style={{
                top: zone.startMm * pxPerMm,
                left: 18,
                width: 10,
                height: 1,
                background: zone.textColor,
                opacity: 0.5,
              }}
            />
          )}
          {/* Zone label (rotated) */}
          {(zone.endMm - zone.startMm) > 15 && (
            <span
              className="absolute text-[7px] font-mono whitespace-nowrap pointer-events-none"
              style={{
                top: ((zone.startMm + zone.endMm) / 2) * pxPerMm,
                left: 2,
                transform: "rotate(-90deg) translateX(-50%)",
                transformOrigin: "left center",
                color: zone.textColor,
                opacity: 0.8,
              }}
            >
              {zone.label}
            </span>
          )}
        </div>
      ))}

      {/* Cm tick marks */}
      {Array.from({ length: totalCm + 1 }, (_, i) => {
        const y = i * pxPerCm;
        if (y > heightPx) return null;
        return (
          <div key={`cm-${i}`}>
            {/* Major tick */}
            <div
              className="absolute"
              style={{
                top: y,
                right: 0,
                width: 10,
                height: 1,
                background: "hsl(40, 10%, 40%)",
              }}
            />
            {/* Half tick */}
            {i < totalCm && (
              <div
                className="absolute"
                style={{
                  top: y + pxPerCm / 2,
                  right: 0,
                  width: 6,
                  height: 1,
                  background: "hsl(40, 10%, 30%)",
                }}
              />
            )}
            {/* Label */}
            {i > 0 && i < totalCm && (
              <span
                className="absolute text-[7px] font-mono"
                style={{
                  top: y,
                  right: 12,
                  transform: "translateY(-50%)",
                  color: "hsl(40, 10%, 50%)",
                }}
              >
                {i}
              </span>
            )}
          </div>
        );
      })}

      {/* Page break indicators */}
      {pageBreaks.map((breakY, idx) => (
        <div
          key={`pb-${idx}`}
          className="absolute"
          style={{
            top: breakY,
            left: 0,
            width: 28,
            height: 2,
            background: "hsl(0, 70%, 55%, 0.6)",
          }}
          title={`Quebra de página ${idx + 1} → ${idx + 2}`}
        />
      ))}

      {/* Page number indicators */}
      <div
        className="absolute text-[7px] font-mono text-center"
        style={{
          top: 4,
          left: 0,
          width: 18,
          color: "hsl(46, 65%, 52%)",
        }}
      >
        P1
      </div>
      {totalPages > 1 && pageBreaks.map((breakY, idx) => (
        <div
          key={`pn-${idx}`}
          className="absolute text-[7px] font-mono text-center"
          style={{
            top: breakY + 6,
            left: 0,
            width: 18,
            color: "hsl(46, 65%, 52%)",
          }}
        >
          P{idx + 2}
        </div>
      ))}
    </div>
  );
}

/** Validate that page geometry matches expected values */
export interface SyncValidationResult {
  valid: boolean;
  issues: string[];
}

export function validatePageGeometry(opts: {
  branded: boolean;
  editorContentHeight: number;
  pageBreaks: number[];
}): SyncValidationResult {
  const { branded, editorContentHeight, pageBreaks } = opts;
  const issues: string[] = [];

  const usablePerPage = getUsableHeight(branded);
  const spacerTotal = getSpacerBase(branded);

  // Validação de sanidade (sem limite superior rígido de intervalo):
  // blocos grandes/indivisíveis podem atravessar múltiplas páginas.
  pageBreaks.forEach((breakY, idx) => {
    const prevBreak = idx === 0 ? -Infinity : pageBreaks[idx - 1];
    const prevBreakEnd = idx === 0 ? 0 : pageBreaks[idx - 1] + spacerTotal;
    const interval = breakY - prevBreakEnd;

    if (breakY <= prevBreak) {
      issues.push(
        `Quebra fora de ordem na página ${idx + 1}: ${Math.round(breakY)}px`
      );
    }

    if (interval < 50) {
      issues.push(
        `Intervalo da página ${idx + 1} muito pequeno: ${Math.round(interval)}px — possível quebra duplicada`
      );
    }
  });

  // Check if content exceeds expected bounds without proper breaks
  if (pageBreaks.length === 0 && editorContentHeight > usablePerPage + 10) {
    issues.push(
      `Conteúdo (${Math.round(editorContentHeight)}px) excede zona útil (${usablePerPage}px) sem quebra de página`
    );
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
