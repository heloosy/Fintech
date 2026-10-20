#!/usr/bin/env python3
"""
InsureOS Production Document Ingestion & Selective OCR Pipeline
- Attempts native text extraction with PyMuPDF first
- Selectively runs OCR ONLY on pages with missing or insufficient text (< min_chars)
- Configurable OCR engines: 'pymupdf', 'tesseract', 'paddleocr', 'auto'
- Preserves document ID, page numbers, extraction method, and status per page
"""

import sys
import os
import json
import argparse
from typing import Dict, Any, List, Optional

# Try importing dependencies
try:
    import pymupdf
except ImportError:
    try:
        import fitz as pymupdf
    except ImportError:
        pymupdf = None

try:
    from PIL import Image
    import io
except ImportError:
    Image = None

try:
    import pytesseract
    # Auto-detect standard Windows Tesseract path if not in PATH
    default_win_tess = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    if os.path.exists(default_win_tess) and not os.environ.get("TESSERACT_PATH"):
        pytesseract.pytesseract.tesseract_cmd = default_win_tess
except ImportError:
    pytesseract = None


def check_ocr_availability() -> Dict[str, bool]:
    """Check which OCR engines are installed and functional on the host."""
    availability = {
        "pymupdf": False,
        "tesseract": False,
        "paddleocr": False
    }

    # PyMuPDF built-in OCR
    if pymupdf is not None:
        try:
            # Check if get_textpage_ocr is supported
            availability["pymupdf"] = True
        except Exception:
            availability["pymupdf"] = False

    # Tesseract
    if pytesseract is not None:
        try:
            version = pytesseract.get_tesseract_version()
            if version:
                availability["tesseract"] = True
        except Exception:
            # Check standard windows location
            win_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
            if os.path.exists(win_path):
                pytesseract.pytesseract.tesseract_cmd = win_path
                try:
                    v = pytesseract.get_tesseract_version()
                    if v:
                        availability["tesseract"] = True
                except Exception:
                    pass

    # PaddleOCR
    try:
        import paddleocr
        availability["paddleocr"] = True
    except ImportError:
        availability["paddleocr"] = False

    return availability


def run_ocr_on_pil_image(image: Any, engine: str = "auto") -> tuple[str, str]:
    """
    Run OCR on a PIL Image using the selected engine.
    Returns: (extracted_text, engine_used)
    """
    if image is None:
        return "", "none"

    avail = check_ocr_availability()

    # Engine selection logic
    selected_engine = engine.lower()
    if selected_engine == "auto":
        if avail["tesseract"]:
            selected_engine = "tesseract"
        elif avail["paddleocr"]:
            selected_engine = "paddleocr"
        else:
            selected_engine = "none"

    if selected_engine == "tesseract":
        if not avail["tesseract"]:
            return "", "tesseract_unavailable"
        try:
            text = pytesseract.image_to_string(image)
            return text.strip(), "tesseract"
        except Exception as e:
            return f"[Tesseract error: {str(e)}]", "tesseract_failed"

    elif selected_engine == "paddleocr":
        if not avail["paddleocr"]:
            return "", "paddleocr_unavailable"
        try:
            from paddleocr import PaddleOCR
            ocr = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)
            import numpy as np
            img_arr = np.array(image)
            result = ocr.ocr(img_arr, cls=True)
            lines = []
            if result and result[0]:
                for line in result[0]:
                    lines.append(line[1][0])
            return "\n".join(lines).strip(), "paddleocr"
        except Exception as e:
            return f"[PaddleOCR error: {str(e)}]", "paddleocr_failed"

    return "", "none"


def process_pdf(
    file_path: str,
    ocr_engine: str = "auto",
    min_chars_per_page: int = 50
) -> Dict[str, Any]:
    """
    Process a PDF file page by page:
    - Attempt native text extraction with PyMuPDF
    - Detect pages with insufficient text (< min_chars_per_page)
    - Apply OCR ONLY on those insufficient pages
    """
    if pymupdf is None:
        return {
            "success": False,
            "error": "PyMuPDF (pymupdf) is not installed in the Python environment.",
            "pages": [],
            "overallMethod": "failed"
        }

    try:
        doc = pymupdf.open(file_path)
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to open PDF document: {str(e)}",
            "pages": [],
            "overallMethod": "failed"
        }

    total_pages = len(doc)
    pages_result: List[Dict[str, Any]] = []
    has_native = False
    has_ocr = False
    has_incomplete = False
    warnings: List[str] = []

    for page_idx in range(total_pages):
        page = doc[page_idx]
        page_num = page_idx + 1

        # 1. Native text extraction
        native_text = page.get_text("text").strip()
        char_count = len(native_text)

        # 2. Check if text is sufficient
        if char_count >= min_chars_per_page:
            # Sufficient native text! No OCR needed for this page.
            has_native = True
            words = len(native_text.split())
            pages_result.append({
                "pageNumber": page_num,
                "text": native_text,
                "characterCount": char_count,
                "wordCount": words,
                "extractionMethod": "pymupdf-native",
                "ocrEngineUsed": None,
                "status": "clean",
                "insufficientText": False,
                "warning": None
            })
        else:
            # Insufficient text detected: page is scanned, blank, or an image!
            # Render page to high-res pixmap for OCR
            ocr_text = ""
            engine_used = "none"

            try:
                # First try PyMuPDF built-in OCR if configured
                if ocr_engine in ("pymupdf", "auto"):
                    try:
                        tp = page.get_textpage_ocr(language='eng')
                        ocr_text = tp.extractText().strip()
                        if len(ocr_text) > 10:
                            engine_used = "pymupdf"
                    except Exception:
                        pass

                # If PyMuPDF OCR didn't produce text, render pixmap and run configured engine
                if not ocr_text:
                    pix = page.get_pixmap(dpi=200)
                    if Image is not None:
                        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                        ocr_text, engine_used = run_ocr_on_pil_image(img, ocr_engine)
            except Exception as ocr_err:
                warnings.append(f"Page {page_num}: OCR attempt failed ({str(ocr_err)})")

            if ocr_text and len(ocr_text.strip()) > 10:
                has_ocr = True
                words = len(ocr_text.split())
                pages_result.append({
                    "pageNumber": page_num,
                    "text": ocr_text,
                    "characterCount": len(ocr_text),
                    "wordCount": words,
                    "extractionMethod": f"ocr-{engine_used}",
                    "ocrEngineUsed": engine_used,
                    "status": "ocr_applied",
                    "insufficientText": True,
                    "warning": None
                })
            else:
                # OCR was unavailable or produced no text
                has_incomplete = True
                warn_msg = (
                    f"Page {page_num}: Native text was insufficient ({char_count} chars) "
                    f"and OCR ({ocr_engine}) yielded no text."
                )
                warnings.append(warn_msg)
                combined_text = native_text if native_text else f"[Scanned page {page_num} - no text layer detected]"
                pages_result.append({
                    "pageNumber": page_num,
                    "text": combined_text,
                    "characterCount": len(combined_text),
                    "wordCount": len(combined_text.split()),
                    "extractionMethod": "insufficient_text",
                    "ocrEngineUsed": None,
                    "status": "incomplete",
                    "insufficientText": True,
                    "warning": warn_msg
                })

    doc.close()

    # Determine overall document extraction method & status
    if has_native and not has_ocr and not has_incomplete:
        overall_method = "pymupdf-native"
        overall_status = "Indexed"
    elif has_ocr and not has_native and not has_incomplete:
        overall_method = "ocr-complete"
        overall_status = "OCR Verified"
    elif (has_native and has_ocr) and not has_incomplete:
        overall_method = "hybrid"
        overall_status = "Indexed"
    elif has_incomplete and (has_native or has_ocr):
        overall_method = "partial"
        overall_status = "Needs Review"
    else:
        overall_method = "empty"
        overall_status = "Empty Extraction"

    total_words = sum(p["wordCount"] for p in pages_result)
    full_text = "\n\n".join(p["text"] for p in pages_result)

    return {
        "success": True,
        "pageCount": total_pages,
        "totalWords": total_words,
        "fullText": full_text,
        "overallMethod": overall_method,
        "overallStatus": overall_status,
        "pages": pages_result,
        "warnings": warnings,
        "ocrAvailability": check_ocr_availability()
    }


def process_image(file_path: str, ocr_engine: str = "auto") -> Dict[str, Any]:
    """Process a standalone image file (JPG, PNG, TIFF) with OCR."""
    if Image is None:
        return {
            "success": False,
            "error": "PIL / Pillow is not installed in Python.",
            "pages": [],
            "overallMethod": "failed"
        }

    try:
        img = Image.open(file_path)
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to open image: {str(e)}",
            "pages": [],
            "overallMethod": "failed"
        }

    ocr_text, engine_used = run_ocr_on_pil_image(img, ocr_engine)
    words = len(ocr_text.split()) if ocr_text else 0

    if ocr_text and words > 0:
        return {
            "success": True,
            "pageCount": 1,
            "totalWords": words,
            "fullText": ocr_text,
            "overallMethod": f"ocr-{engine_used}",
            "overallStatus": "OCR Verified",
            "pages": [
                {
                    "pageNumber": 1,
                    "text": ocr_text,
                    "characterCount": len(ocr_text),
                    "wordCount": words,
                    "extractionMethod": f"ocr-{engine_used}",
                    "ocrEngineUsed": engine_used,
                    "status": "ocr_applied",
                    "insufficientText": False,
                    "warning": None
                }
            ],
            "warnings": [],
            "ocrAvailability": check_ocr_availability()
        }
    else:
        warn = f"Image OCR using {ocr_engine} yielded no text or OCR binary is not installed."
        return {
            "success": True,
            "pageCount": 1,
            "totalWords": 0,
            "fullText": "[Scanned visual evidence without embedded text layer]",
            "overallMethod": "unsupported",
            "overallStatus": "Needs Review",
            "pages": [
                {
                    "pageNumber": 1,
                    "text": "[Scanned visual evidence without embedded text layer]",
                    "characterCount": 51,
                    "wordCount": 7,
                    "extractionMethod": "unsupported",
                    "ocrEngineUsed": None,
                    "status": "incomplete",
                    "insufficientText": True,
                    "warning": warn
                }
            ],
            "warnings": [warn],
            "ocrAvailability": check_ocr_availability()
        }


def main():
    parser = argparse.ArgumentParser(description="InsureOS Document Ingestion & OCR Bridge")
    parser.add_argument("--input", required=True, help="Path to PDF or image file")
    parser.add_argument("--engine", default="auto", choices=["auto", "pymupdf", "tesseract", "paddleocr"], help="OCR Engine")
    parser.add_argument("--min-chars", type=int, default=50, help="Minimum native characters threshold per page")
    parser.add_argument("--status-only", action="store_true", help="Only check and output OCR engine availability")

    args = parser.parse_args()

    if args.status_only:
        print(json.dumps(check_ocr_availability()))
        return

    input_path = args.input
    if not os.path.exists(input_path):
        print(json.dumps({"success": False, "error": f"File not found: {input_path}"}))
        sys.exit(1)

    lower = input_path.lower()
    if lower.endswith(".pdf"):
        result = process_pdf(input_path, ocr_engine=args.engine, min_chars_per_page=args.min_chars)
    elif lower.endswith((".png", ".jpg", ".jpeg", ".tiff", ".bmp")):
        result = process_image(input_path, ocr_engine=args.engine)
    else:
        print(json.dumps({"success": False, "error": f"Unsupported file type for OCR bridge: {input_path}"}))
        sys.exit(1)

    print(json.dumps(result))


if __name__ == "__main__":
    main()
