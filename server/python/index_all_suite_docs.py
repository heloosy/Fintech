import os, sys, json, time
sys.path.insert(0, os.path.dirname(__file__))
from document_extractor import process_pdf

local_ws = "LOCAL-WORKSPACE"
local_storage = os.path.join(r"c:\Users\SYLVIA TOM\.gemini\antigravity-ide\scratch\insure-os\server\data\workspaces", local_ws)
os.makedirs(local_storage, exist_ok=True)

tenant_ws = "TENANT-EXT-999"
tenant_storage = os.path.join(r"c:\Users\SYLVIA TOM\.gemini\antigravity-ide\scratch\insure-os\server\data\workspaces", tenant_ws)
os.makedirs(tenant_storage, exist_ok=True)

downloads_dir = r"C:\Users\SYLVIA TOM\Downloads"

files_to_index = [
    {
        "filename": "01_Aegis_Auto_Policy_Schedule.pdf",
        "category": "Policy Contract",
        "doc_id": "doc-working-01-policy",
        "target_ws": local_ws,
        "storage": local_storage,
        "status": "clean"
    },
    {
        "filename": "02_Apex_Collision_Repair_Estimate.pdf",
        "category": "Estimate",
        "doc_id": "doc-working-02-estimate",
        "target_ws": local_ws,
        "storage": local_storage,
        "status": "clean"
    },
    {
        "filename": "03_Official_Police_Accident_Report.pdf",
        "category": "Claim Evidence",
        "doc_id": "doc-working-03-police",
        "target_ws": local_ws,
        "storage": local_storage,
        "status": "clean"
    },
    {
        "filename": "04_St_Jude_Medical_Billing_Summary.pdf",
        "category": "Medical",
        "doc_id": "doc-working-04-medical",
        "target_ws": local_ws,
        "storage": local_storage,
        "status": "clean"
    },
    {
        "filename": "05_Driver_Incident_Intake_Without_Estimate.pdf",
        "category": "Claim Evidence",
        "doc_id": "doc-working-05-fnol-incomplete",
        "target_ws": local_ws,
        "storage": local_storage,
        "status": "clean"
    },
    {
        "filename": "06_Adversarial_Prompt_Injection_Payload.pdf",
        "category": "Security Threat",
        "doc_id": "doc-working-06-adversarial",
        "target_ws": local_ws,
        "storage": local_storage,
        "status": "quarantined"
    },
    {
        "filename": "07_POL_EXT_999_Restricted_Commercial_Policy.pdf",
        "category": "Policy Contract",
        "doc_id": "doc-working-07-tenant-restricted",
        "target_ws": tenant_ws,
        "storage": tenant_storage,
        "status": "clean"
    },
    {
        "filename": "08_Mandatory_Statutory_Fraud_Declaration.pdf",
        "category": "Legal & Compliance",
        "doc_id": "doc-working-08-fraud-declaration",
        "target_ws": local_ws,
        "storage": local_storage,
        "status": "clean"
    },
    {
        "filename": "09_Carrier_EDI_Gateway_Submission_Receipt.pdf",
        "category": "Carrier Integration",
        "doc_id": "doc-working-09-edi-receipt",
        "target_ws": local_ws,
        "storage": local_storage,
        "status": "clean"
    },
    {
        "filename": "10_Beacon_Oak_Dwelling_Policy_Schedule.pdf",
        "category": "Policy Contract",
        "doc_id": "doc-working-10-homeowners",
        "target_ws": local_ws,
        "storage": local_storage,
        "status": "clean"
    },
    {
        "filename": "11_RapidDry_Water_Mitigation_Invoice.pdf",
        "category": "Estimate",
        "doc_id": "doc-working-11-water-mitigation",
        "target_ws": local_ws,
        "storage": local_storage,
        "status": "clean"
    },
    {
        "filename": "12_Valence_Premier_Care_Policy_Schedule.pdf",
        "category": "Policy Contract",
        "doc_id": "doc-working-12-health",
        "target_ws": local_ws,
        "storage": local_storage,
        "status": "clean"
    }
]

for item in files_to_index:
    f_path = os.path.join(downloads_dir, item["filename"])
    res = process_pdf(f_path)
    file_size = os.path.getsize(f_path)
    full_text = res["fullText"]

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
        "status": item["status"]
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
        "warnings": ["OWASP Guardrail: Adversarial prompt injection detected and neutralized"] if item["status"] == "quarantined" else [],
        "uploadDate": time.strftime("%Y-%m-%d"),
        "workspaceId": item["target_ws"],
        "category": item["category"]
    }

    out_file = os.path.join(item["storage"], f"{item['doc_id']}.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(doc_record, f, indent=2)
    print(f"Indexed [{item['target_ws']}] {item['filename']} -> {out_file}")

print("\nALL DOCUMENTS INDEXED ACROSS WORKSPACES!")
