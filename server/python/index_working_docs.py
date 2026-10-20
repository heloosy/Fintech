import os, sys, json, time
sys.path.insert(0, os.path.dirname(__file__))
from document_extractor import process_pdf

workspace_id = "LOCAL-WORKSPACE"
storage_dir = os.path.join(r"c:\Users\SYLVIA TOM\.gemini\antigravity-ide\scratch\insure-os\server\data\workspaces", workspace_id)
os.makedirs(storage_dir, exist_ok=True)

files = [
    {
        "filename": "01_Aegis_Auto_Policy_Schedule.pdf",
        "category": "Policy Contract",
        "doc_id": "doc-working-01-policy"
    },
    {
        "filename": "02_Apex_Collision_Repair_Estimate.pdf",
        "category": "Estimate",
        "doc_id": "doc-working-02-estimate"
    },
    {
        "filename": "03_Official_Police_Accident_Report.pdf",
        "category": "Claim Evidence",
        "doc_id": "doc-working-03-police"
    },
    {
        "filename": "04_St_Jude_Medical_Billing_Summary.pdf",
        "category": "Medical",
        "doc_id": "doc-working-04-medical"
    }
]

for item in files:
    f_path = os.path.join(r"C:\Users\SYLVIA TOM\Downloads", item["filename"])
    res = process_pdf(f_path)
    file_size = os.path.getsize(f_path)
    full_text = res["fullText"]

    # Keep whole page intact as 1 cohesive chunk!
    tokens = [w.lower() for w in full_text.replace('\n', ' ').split() if len(w) > 1]
    chunks = [{
        "id": f"{item['doc_id']}-p1-c0",
        "documentId": item["doc_id"],
        "filename": item["filename"],
        "page": 1,
        "chunkIndex": 0,
        "startOffset": 0,
        "endOffset": len(full_text),
        "text": full_text,
        "tokens": tokens,
        "extractionMethod": "pymupdf-native",
        "ocrEngineUsed": None,
        "status": "clean"
    }]

    doc_record = {
        "id": item["doc_id"],
        "filename": item["filename"],
        "originalName": item["filename"],
        "mimeType": "application/pdf",
        "fileSizeBytes": file_size,
        "fileSizeFormatted": f"{round(file_size / 1024)} KB",
        "pageCount": 1,
        "wordCount": res["totalWords"],
        "chunks": chunks,
        "pages": res["pages"],
        "fullText": full_text,
        "extractionMethod": "pymupdf-native",
        "ocrStatus": "Indexed",
        "ocrEngineUsed": None,
        "warnings": [],
        "uploadDate": time.strftime("%Y-%m-%d"),
        "workspaceId": workspace_id,
        "category": item["category"]
    }

    out_file = os.path.join(storage_dir, f"{item['doc_id']}.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(doc_record, f, indent=2)
    print(f"Indexed {item['filename']} -> {out_file}")

print("Clean indexing complete!")
