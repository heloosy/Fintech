import { Router } from 'express';
import { StorageService } from '../services/storage.js';

export const claimsRouter = Router();

// POST /api/claims/extract-facts - Extract structured facts from uploaded policy & evidence docs
claimsRouter.post('/extract-facts', async (req, res) => {
  try {
    const { policyDocumentId, evidenceDocumentIds = [], workspaceId = 'DEFAULT-WORKSPACE' } = req.body;

    // 1. Fetch Policy Document if selected
    let policyDoc = null;
    if (policyDocumentId) {
      policyDoc = await StorageService.getDocument(workspaceId, policyDocumentId);
    }

    // 2. Fetch Evidence Documents
    const evidenceDocs = [];
    for (const eid of evidenceDocumentIds) {
      const edoc = await StorageService.getDocument(workspaceId, eid);
      if (edoc) evidenceDocs.push(edoc);
    }

    // 3. Extract Policy Parameters Deterministically from Text
    let policyNumber = 'POL-UNVERIFIED';
    let policyName = 'Unverified Policy (No document provided)';
    let carrier = 'Pending Verification';
    let collisionDeductible: number | null = null;
    let collisionLimit: number | null = null;
    let comprehensiveDeductible: number | null = null;
    let vehicle = '';
    let coverageVerified = false;
    const policyCitations: Array<{ field: string; value: string | number; source: string; excerpt: string }> = [];

    if (policyDoc) {
      const pText = policyDoc.fullText;
      coverageVerified = true;
      policyName = policyDoc.filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');

      // Deductible regex matching
      const dedMatch = pText.match(/collision\s+deductible[:\s]*\$?([0-9,]+)/i) ||
                       pText.match(/deductible[:\s]*\$?([0-9,]+)/i);
      if (dedMatch) {
        collisionDeductible = Number(dedMatch[1].replace(/,/g, ''));
        policyCitations.push({
          field: 'collisionDeductible',
          value: collisionDeductible,
          source: policyDoc.filename,
          excerpt: dedMatch[0],
        });
      }

      // Limit regex matching
      const limMatch = pText.match(/collision\s+limit[:\s]*\$?([0-9,]+)/i) ||
                       pText.match(/limit\s+of\s+liability[:\s]*\$?([0-9,]+)/i) ||
                       pText.match(/coverage\s+limit[:\s]*\$?([0-9,]+)/i);
      if (limMatch) {
        collisionLimit = Number(limMatch[1].replace(/,/g, ''));
        policyCitations.push({
          field: 'collisionLimit',
          value: collisionLimit,
          source: policyDoc.filename,
          excerpt: limMatch[0],
        });
      }

      // Carrier match
      const carrierMatch = pText.match(/(Aegis\s+Shield|Beacon\s+Mutual|Apex\s+Underwriters|Zenith\s+Surety)/i);
      if (carrierMatch) {
        carrier = carrierMatch[0];
      }

      // Policy number match
      const polNumMatch = pText.match(/POL-[A-Z0-9-]+/i) || pText.match(/Policy\s+#?:\s*([A-Z0-9-]+)/i);
      if (polNumMatch) {
        policyNumber = polNumMatch[0];
      }

      // Vehicle match
      const vehMatch = pText.match(/20\d\d\s+[A-Za-z]+\s+[A-Za-z0-9]+/);
      if (vehMatch) {
        vehicle = vehMatch[0];
      }
    }

    // 4. Extract Evidence Facts (Estimate & Incident)
    let estimatedLoss = 0;
    let partsAmount = 0;
    let laborAmount = 0;
    let incidentDate = new Date().toISOString().split('T')[0];
    let incidentLocation = 'Downtown Metro Intersection';
    let incidentSummary = '';
    const evidenceCitations: Array<{ field: string; value: any; source: string; excerpt: string }> = [];

    for (const edoc of evidenceDocs) {
      const eText = edoc.fullText;

      // Extract Repair Estimate Amounts
      const totalMatch = eText.match(/total\s+(amount|estimate|due|cost)[:\s]*\$?([0-9,]+\.?\d*)/i) ||
                         eText.match(/grand\s+total[:\s]*\$?([0-9,]+\.?\d*)/i);
      if (totalMatch) {
        const val = parseFloat(totalMatch[2].replace(/,/g, ''));
        if (val > estimatedLoss) {
          estimatedLoss = val;
          evidenceCitations.push({
            field: 'estimatedLoss',
            value: estimatedLoss,
            source: edoc.filename,
            excerpt: totalMatch[0],
          });
        }
      }

      const partsMatch = eText.match(/parts[:\s]*\$?([0-9,]+\.?\d*)/i);
      if (partsMatch) {
        partsAmount = parseFloat(partsMatch[1].replace(/,/g, ''));
        evidenceCitations.push({
          field: 'partsBreakdown',
          value: partsAmount,
          source: edoc.filename,
          excerpt: partsMatch[0],
        });
      }

      const laborMatch = eText.match(/labor[:\s]*\$?([0-9,]+\.?\d*)/i);
      if (laborMatch) {
        laborAmount = parseFloat(laborMatch[1].replace(/,/g, ''));
        evidenceCitations.push({
          field: 'laborBreakdown',
          value: laborAmount,
          source: edoc.filename,
          excerpt: laborMatch[0],
        });
      }

      // Extract Incident Date
      const dateMatch = eText.match(/202[0-9]-[0-1][0-9]-[0-3][0-9]/) ||
                        eText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+202[0-9]/i);
      if (dateMatch) {
        incidentDate = dateMatch[0];
        evidenceCitations.push({
          field: 'incidentDate',
          value: incidentDate,
          source: edoc.filename,
          excerpt: dateMatch[0],
        });
      }

      // Extract Location
      const locMatch = eText.match(/location[:\s]*([^\n,.]+)/i);
      if (locMatch) {
        incidentLocation = locMatch[1].trim();
      }

      // Incident statement excerpt
      if (edoc.category === 'Claim Evidence' && !incidentSummary) {
        incidentSummary = edoc.fullText.slice(0, 300).trim();
      }
    }

    // 5. Deterministic Arithmetic (NO LLM Hallucinations for Math)
    const effectiveDeductible = collisionDeductible !== null ? collisionDeductible : 500;
    const netClaimAmount = Math.max(0, estimatedLoss - effectiveDeductible);
    const isExceedingLimit = collisionLimit !== null ? estimatedLoss > collisionLimit : false;

    // 6. Evidence Checklist Determination
    const evidenceChecklist = [
      {
        type: 'Itemized Repair Estimate',
        required: true,
        uploaded: evidenceDocs.some(d => d.category === 'Estimate' || d.filename.toLowerCase().includes('estimate')),
        matchedDoc: evidenceDocs.find(d => d.category === 'Estimate' || d.filename.toLowerCase().includes('estimate'))?.filename,
      },
      {
        type: 'Police Incident Report',
        required: estimatedLoss > 1500,
        uploaded: evidenceDocs.some(d => d.filename.toLowerCase().includes('police') || d.filename.toLowerCase().includes('blotter')),
        matchedDoc: evidenceDocs.find(d => d.filename.toLowerCase().includes('police') || d.filename.toLowerCase().includes('blotter'))?.filename,
      },
      {
        type: 'Scene Photos / Dashcam Footage',
        required: false,
        uploaded: evidenceDocs.some(d => d.filename.toLowerCase().includes('photo') || d.filename.toLowerCase().includes('dashcam')),
        matchedDoc: evidenceDocs.find(d => d.filename.toLowerCase().includes('photo') || d.filename.toLowerCase().includes('dashcam'))?.filename,
      },
    ];

    return res.json({
      success: true,
      extractedFacts: {
        policy: {
          policyNumber,
          policyName,
          carrier,
          vehicle,
          collisionDeductible,
          collisionLimit,
          coverageVerified,
          citations: policyCitations,
        },
        incident: {
          incidentDate,
          incidentLocation,
          incidentSummary,
          estimatedLoss,
          partsAmount,
          laborAmount,
          citations: evidenceCitations,
        },
        settlement: {
          totalLoss: estimatedLoss,
          deductibleApplied: effectiveDeductible,
          netPayable: netClaimAmount,
          isExceedingLimit,
          formulaApplied: 'Net Payable = Total Loss - Contractual Deductible (Deterministic Code)',
        },
        evidenceChecklist,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Failed to extract claim facts: ${err.message}`,
    });
  }
});
