"""
Lightweight PDF Layout Analysis API
Runs on 2GB RAM (HF Spaces free tier)
Uses PyMuPDF + pdfplumber for layout extraction.
Compatible with the HURIDOCS API interface.
"""

import io
import base64
import hashlib
from typing import List, Optional

import fitz  # PyMuPDF
import pdfplumber
from fastapi import FastAPI, File, UploadFile, Query, Request
from fastapi.responses import JSONResponse, PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="PDF Layout Analysis (Lightweight)", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def classify_block(block: dict, page_width: float, page_height: float) -> str:
    """Classify a text block by its position and formatting."""
    x0 = block.get("x0", 0)
    y0 = block.get("y0", 0)
    x1 = block.get("x1", page_width)
    width = x1 - x0
    text = block.get("text", "").strip()

    if not text:
        return "empty"

    # Header detection: top 15% of page, or short bold-like text
    if y0 < page_height * 0.15 and len(text) < 200:
        return "title"

    # Footer detection: bottom 10% of page
    if y0 > page_height * 0.90:
        return "page_footer"

    # Narrow column or sidebar
    if width < page_width * 0.3:
        return "caption"

    # Numbered list detection
    lines = text.split("\n")
    numbered = sum(1 for l in lines if l.strip()[:3].rstrip(".):") .isdigit()) if lines else 0
    if numbered > len(lines) * 0.5 and len(lines) > 2:
        return "list_item"

    return "text"


def extract_segments_pymupdf(pdf_bytes: bytes) -> List[dict]:
    """Extract layout segments using PyMuPDF (fast, low memory)."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    segments = []
    seg_id = 0

    for page_num in range(len(doc)):
        page = doc[page_num]
        page_width = page.rect.width
        page_height = page.rect.height

        # Extract text blocks with position info
        blocks = page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE)["blocks"]

        for block in blocks:
            if block["type"] == 0:  # text block
                # Concatenate all spans in all lines
                text_parts = []
                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        text_parts.append(span.get("text", ""))
                text = " ".join(text_parts).strip()

                if not text:
                    continue

                bbox = block["bbox"]  # (x0, y0, x1, y1)
                block_info = {
                    "x0": bbox[0],
                    "y0": bbox[1],
                    "x1": bbox[2],
                    "y1": bbox[3],
                    "text": text,
                }
                seg_type = classify_block(block_info, page_width, page_height)

                segments.append({
                    "id": seg_id,
                    "content": text,
                    "type": seg_type,
                    "page": page_num + 1,
                    "bbox": {
                        "x": round(bbox[0], 2),
                        "y": round(bbox[1], 2),
                        "width": round(bbox[2] - bbox[0], 2),
                        "height": round(bbox[3] - bbox[1], 2),
                    },
                })
                seg_id += 1

            elif block["type"] == 1:  # image block
                bbox = block["bbox"]
                segments.append({
                    "id": seg_id,
                    "content": "[image]",
                    "type": "figure",
                    "page": page_num + 1,
                    "bbox": {
                        "x": round(bbox[0], 2),
                        "y": round(bbox[1], 2),
                        "width": round(bbox[2] - bbox[0], 2),
                        "height": round(bbox[3] - bbox[1], 2),
                    },
                })
                seg_id += 1

    doc.close()
    return segments


def extract_tables_pdfplumber(pdf_bytes: bytes) -> List[dict]:
    """Extract tables using pdfplumber."""
    tables_data = []
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for page_num, page in enumerate(pdf.pages):
                tables = page.extract_tables()
                for table_idx, table in enumerate(tables):
                    if not table:
                        continue
                    # Convert table to markdown
                    md_rows = []
                    for row_idx, row in enumerate(table):
                        cells = [str(c or "").strip() for c in row]
                        md_rows.append("| " + " | ".join(cells) + " |")
                        if row_idx == 0:
                            md_rows.append("| " + " | ".join(["---"] * len(cells)) + " |")

                    tables_data.append({
                        "page": page_num + 1,
                        "table_index": table_idx,
                        "markdown": "\n".join(md_rows),
                        "rows": len(table),
                        "cols": max(len(r) for r in table) if table else 0,
                    })
    except Exception as e:
        print(f"pdfplumber table extraction error: {e}")

    return tables_data


def segments_to_markdown(segments: List[dict], tables: List[dict]) -> str:
    """Convert segments and tables to structured markdown."""
    md_parts = []
    current_page = 0
    table_pages = {t["page"] for t in tables}

    for seg in segments:
        if seg["page"] != current_page:
            current_page = seg["page"]
            if md_parts:
                md_parts.append("")
            md_parts.append(f"---\n**Página {current_page}**\n")

            # Insert tables for this page
            page_tables = [t for t in tables if t["page"] == current_page]
            for t in page_tables:
                md_parts.append(f"\n**Tabela {t['table_index'] + 1}** ({t['rows']}×{t['cols']}):\n")
                md_parts.append(t["markdown"])
                md_parts.append("")

        seg_type = seg.get("type", "text")
        content = seg["content"]

        if seg_type == "title":
            md_parts.append(f"## {content}\n")
        elif seg_type == "page_footer":
            md_parts.append(f"*{content}*\n")
        elif seg_type == "figure":
            md_parts.append(f"[Figura]\n")
        elif seg_type == "caption":
            md_parts.append(f"> {content}\n")
        elif seg_type == "list_item":
            for line in content.split("\n"):
                line = line.strip()
                if line:
                    md_parts.append(f"- {line}")
            md_parts.append("")
        else:
            md_parts.append(f"{content}\n")

    return "\n".join(md_parts)


# ============================================================
# API Endpoints — compatible with HURIDOCS interface
# ============================================================

@app.get("/")
async def health():
    return {"status": "ok", "engine": "pymupdf+pdfplumber", "version": "1.0.0"}


@app.post("/")
async def analyze(file: UploadFile = File(...), fast: bool = Query(False), language: Optional[str] = Query(None)):
    """Analyze PDF layout and return segments (HURIDOCS-compatible)."""
    pdf_bytes = await file.read()
    segments = extract_segments_pymupdf(pdf_bytes)
    return JSONResponse(content=segments)


@app.post("/markdown")
async def to_markdown(file: UploadFile = File(...), fast: bool = Query(False), language: Optional[str] = Query(None)):
    """Convert PDF to structured markdown."""
    pdf_bytes = await file.read()
    segments = extract_segments_pymupdf(pdf_bytes)
    tables = extract_tables_pdfplumber(pdf_bytes)
    md = segments_to_markdown(segments, tables)
    return PlainTextResponse(content=md)


@app.post("/html")
async def to_html(file: UploadFile = File(...), fast: bool = Query(False), language: Optional[str] = Query(None)):
    """Convert PDF to HTML."""
    pdf_bytes = await file.read()
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    html_parts = ['<html><body style="font-family:sans-serif;">']

    for page_num in range(len(doc)):
        page = doc[page_num]
        html_parts.append(f'<div class="page" data-page="{page_num + 1}">')
        html_parts.append(f'<h3 style="color:#666;border-bottom:1px solid #ccc;">Página {page_num + 1}</h3>')

        blocks = page.get_text("dict")["blocks"]
        for block in blocks:
            if block["type"] == 0:
                text_parts = []
                for line in block.get("lines", []):
                    line_text = ""
                    for span in line.get("spans", []):
                        t = span.get("text", "")
                        size = span.get("size", 12)
                        flags = span.get("flags", 0)
                        if size > 16:
                            t = f"<strong>{t}</strong>"
                        if flags & 2:  # italic
                            t = f"<em>{t}</em>"
                        line_text += t
                    text_parts.append(line_text)
                html_parts.append(f'<p>{"<br>".join(text_parts)}</p>')
        html_parts.append("</div>")

    doc.close()
    html_parts.append("</body></html>")
    return PlainTextResponse(content="\n".join(html_parts), media_type="text/html")


@app.post("/generate-pdf")
async def generate_pdf_from_html(request: Request):
    """Generate PDF from HTML string using WeasyPrint (server-side rendering).
    
    Request body: { "html": "<full HTML document string>" }
    Response: { "pdfBase64": "base64-encoded PDF" }
    
    WeasyPrint renders CSS @page, margins, backgrounds, fonts — perfect fidelity.
    """
    from weasyprint import HTML as WeasyHTML

    body = await request.json()
    html_content = body.get("html", "")

    if not html_content:
        return JSONResponse(
            content={"error": "html field is required"},
            status_code=400,
        )

    try:
        # WeasyPrint renders the HTML with full CSS support (A4, margins, backgrounds)
        pdf_bytes = WeasyHTML(string=html_content).write_pdf()

        # Encode as base64 for JSON transport
        pdf_b64 = base64.b64encode(pdf_bytes).decode("utf-8")

        return JSONResponse(content={
            "pdfBase64": pdf_b64,
            "size": len(pdf_bytes),
        })
    except Exception as e:
        return JSONResponse(
            content={"error": f"PDF generation failed: {str(e)}"},
            status_code=500,
        )
