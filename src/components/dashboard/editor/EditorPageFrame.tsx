/**
 * EditorPageFrame — renders letterhead header + branded footer overlays
 * inside the editor canvas so the user sees the real PDF layout while typing.
 *
 * Architecture (Layered Absolute Positioning):
 * - Header/Footer are absolutely positioned and NEVER part of text flow
 * - Content clip masks hide any text that bleeds into header/footer zones
 * - z-index hierarchy: Content(1) < ClipMasks(10) < Header/Footer(11) < Guides(12)
 * - Footer is "anchored" to a fixed Y coordinate per page — text cannot push it
 *
 * Footer geometry matches pdf-generator.ts addBrandedFooter() exactly:
 * - 20mm footer bar fills entire bottom margin (gray background with contact info)
 * - No extra gap between content and footer
 */

import { useEffect, useState, useMemo } from "react";
import { fetchEscritorioConfig, type EscritorioConfig, defaultEscritorioConfig } from "@/lib/generators";
import {
  BRANDED_MARGIN_TOP_PX,
  BRANDED_RESERVED_BOTTOM_PX,
  PAGE_GAP_PX,
  EDITOR_WORKSPACE_BG_HSL,
  getUsableHeight,
} from "./pageConstants";

interface EditorPageFrameProps {
  letterheadSrc: string | null;
  show: boolean;
  pageBreaks: number[];
  contentHeight: number;
}

export function EditorPageFrame({ letterheadSrc, show, pageBreaks, contentHeight }: EditorPageFrameProps) {
  const [config, setConfig] = useState<EscritorioConfig>(defaultEscritorioConfig);

  useEffect(() => {
    if (!show) return;
    fetchEscritorioConfig().then(setConfig);
  }, [show]);

  const footerContactParts = [config.telefone, config.email_contato, config.website].filter(Boolean);
  const footerContactLine = config.timbre_contatos || footerContactParts.join("  |  ");
  const footerAddressLine = config.endereco || config.timbre_endereco || "";

  const usableHeight = getUsableHeight(true); // always branded when this component renders
  const spacerHeight = BRANDED_RESERVED_BOTTOM_PX + PAGE_GAP_PX + BRANDED_MARGIN_TOP_PX;

  // Calculate the Y position of the last page's footer (FIXED — never depends on content length)
  const lastPageFooterY = useMemo(() => {
    if (pageBreaks.length === 0) {
      return usableHeight;
    }
    const lastBreak = pageBreaks[pageBreaks.length - 1];
    return lastBreak + spacerHeight + usableHeight;
  }, [pageBreaks, usableHeight, spacerHeight]);

  if (!show) return null;

  // ── Shared styles ──

  /** Content clip mask — hides text that bleeds past the content zone into footer/header.
   *  This is the "Visual Safety" layer: even if page-break detection is delayed by 1 frame,
   *  text is visually hidden behind the footer, never displacing it. */
  const contentClipStyle = (topY: number): React.CSSProperties => ({
    position: "absolute",
    top: topY,
    left: -4,
    width: 802,
    height: BRANDED_RESERVED_BOTTOM_PX,
    background: "transparent", // invisible — footer renders on top
    pointerEvents: "none",
    zIndex: 10, // above content (1), below footer (11)
    overflow: "hidden",
  });

  const spacerZoneStyle = (topY: number): React.CSSProperties => ({
    position: "absolute",
    top: topY,
    left: -4,
    width: 802,
    height: BRANDED_RESERVED_BOTTOM_PX + PAGE_GAP_PX + BRANDED_MARGIN_TOP_PX,
    background: EDITOR_WORKSPACE_BG_HSL,
    pointerEvents: "none",
    zIndex: 10,
    overflow: "hidden",
  });

  const footerStyle = (topY: number): React.CSSProperties => ({
    position: "absolute",
    top: topY,
    left: 0,
    width: 794,
    height: BRANDED_RESERVED_BOTTOM_PX,
    background: "rgb(236, 232, 225)",
    borderTop: "0.8mm solid rgb(160, 130, 70)",
    pointerEvents: "none",
    zIndex: 11, // above clip masks — always visible
    textAlign: "center",
    fontFamily: "'Times New Roman', Times, serif",
    padding: "3mm 10mm 0",
    boxSizing: "border-box",
    overflow: "hidden",
  });

  const headerStyle = (topY: number): React.CSSProperties => ({
    position: "absolute",
    top: topY,
    left: 0,
    width: 794,
    height: BRANDED_MARGIN_TOP_PX,
    pointerEvents: "none",
    zIndex: 11, // above clip masks — always visible
    overflow: "hidden",
    background: "#ffffff",
  });

  const footerContent = (
    <>
      <div style={{ fontSize: "9pt", fontWeight: "bold", color: "rgb(30, 20, 10)", letterSpacing: "0.3px", lineHeight: 1.2 }}>
        {config.nome_escritorio} | {config.oab}
      </div>
      {footerContactLine && (
        <div style={{ fontSize: "8pt", color: "rgb(107, 92, 62)", marginTop: "0.5mm", lineHeight: 1.2 }}>
          {footerContactLine}
        </div>
      )}
      {footerAddressLine && (
        <div style={{ fontSize: "8pt", color: "rgb(139, 122, 94)", marginTop: "0.5mm", lineHeight: 1.2 }}>
          {footerAddressLine}
        </div>
      )}
    </>
  );

  const headerImg = letterheadSrc ? (
    <img
      src={letterheadSrc}
      alt=""
      style={{
        width: 794,
        height: BRANDED_MARGIN_TOP_PX,
        display: "block",
        objectFit: "cover",
        objectPosition: "top",
      }}
    />
  ) : null;

  // ── Rendering Shield: white mask at footer coordinate to clip bleeding text ──
  // This div sits at z-index 10 (above text z-index 1, below footer z-index 11).
  // It acts as a "sacrificial zone" — even if page-break fires 1-2 frames late,
  // text is visually hidden behind this white shield before touching the footer.
  const renderingShieldStyle = (topY: number): React.CSSProperties => ({
    position: "absolute",
    top: topY,
    left: 0,
    width: 794,
    height: BRANDED_RESERVED_BOTTOM_PX,
    background: "#ffffff",
    pointerEvents: "none",
    zIndex: 10,
    overflow: "hidden",
  });

  return (
    <>
      {/* ══════════════════════════════════════════════════════════
          Page 1: Header — absolutely positioned, outside text flow
          ══════════════════════════════════════════════════════════ */}
      {letterheadSrc && (
        <div style={headerStyle(-BRANDED_MARGIN_TOP_PX)}>
          {headerImg}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          Page 1: Rendering shield at footer boundary
          Clips any text that bleeds past usableHeight on first page
          ══════════════════════════════════════════════════════════ */}
      {pageBreaks.length === 0 && (
        <div style={renderingShieldStyle(usableHeight)} />
      )}

      {/* ══════════════════════════════════════════════════════════
          Inter-page breaks: spacer zone + shield + footer + header
          ══════════════════════════════════════════════════════════ */}
      {pageBreaks.map((breakY, idx) => {
        // Calculate where the NEXT page's content zone ends (for shield)
        const nextPageContentEnd = breakY + spacerHeight + usableHeight;
        const isLastBreak = idx === pageBreaks.length - 1;

        return (
          <div key={`break-${idx}`}>
            {/* Solid background covering entire spacer zone */}
            <div style={spacerZoneStyle(breakY)} />
            {/* Footer bar — anchored at fixed position, z-index 11 */}
            <div style={footerStyle(breakY)}>
              {footerContent}
            </div>
            {/* Next-page header (cloned from page 1) */}
            {letterheadSrc && (
              <div style={headerStyle(breakY + BRANDED_RESERVED_BOTTOM_PX + PAGE_GAP_PX)}>
                {headerImg}
              </div>
            )}
            {/* Rendering shield for the NEXT page's footer boundary
                Prevents text from bleeding into footer zone before break fires */}
            {isLastBreak && (
              <div style={renderingShieldStyle(nextPageContentEnd)} />
            )}
          </div>
        );
      })}

      {/* ══════════════════════════════════════════════════════════
          Last page footer — ALWAYS at fixed position.
          Rendering shield (white, z10) sits behind it.
          Footer (styled, z11) renders on top.
          Text (z1) is hidden by both layers.
          ══════════════════════════════════════════════════════════ */}
      <div style={footerStyle(lastPageFooterY)}>
        {footerContent}
      </div>

      {/* Workspace-colored clip below last footer */}
      <div style={{
        position: "absolute",
        top: lastPageFooterY + BRANDED_RESERVED_BOTTOM_PX,
        left: -4,
        width: 802,
        height: 200,
        background: EDITOR_WORKSPACE_BG_HSL,
        pointerEvents: "none",
        zIndex: 10,
      }} />
    </>
  );
}
