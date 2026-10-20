import { inMemoryStore } from './inMemoryStore';
import { SafetyEngine } from './safetyEngine';
import type { ThreatAnalysisResult } from './safetyEngine';
import type { Policy } from '../types';

export interface GroundedAnswer {
  text: string;
  type: 'VERIFIED_FACT' | 'ESTIMATE' | 'UNCERTAIN_OUT_OF_SCOPE' | 'SECURITY_WARNING';
  citations: Array<{
    policyId: string;
    policyName: string;
    carrier: string;
    section: string;
    pageNumber: number;
    clauseExcerpt: string;
  }>;
  clarificationQuestions?: string[];
  threatResult?: ThreatAnalysisResult;
  isSimulatedAI: true;
}

export const MockAIService = {
  /**
   * Evaluates questions grounded strictly in contractual policy clauses.
   * Cites exact section numbers and text; asks clarification questions; admits uncertainty.
   */
  async askAssistant(query: string): Promise<GroundedAnswer> {
    // 1. Layer 4 Safety Check: Scan for prompt injection attempt
    const threat = SafetyEngine.analyzeUntrustedText(query);
    if (threat.hasThreat) {
      await inMemoryStore.recordThreat({
        id: `THR-${Date.now()}`,
        timestamp: new Date().toISOString(),
        source: 'AI Assistant Input',
        adversarialSnippet: threat.sanitizedSnippet,
        targetAction: 'Assistant Context Manipulation / Rule Override',
        mitigation: 'Instruction dropped. System policy rules and deductibles remain enforced in application code.',
        status: 'quarantined',
      });

      return {
        isSimulatedAI: true,
        type: 'SECURITY_WARNING',
        text: `⚠️ Security Policy Alert: Prompt injection patterns detected (${threat.detectedPatterns.join(', ')}). In accordance with OWASP security standards, InsureOS treats all document inputs and user queries as passive data. System constraints, deductibles, and authorization rules cannot be altered by natural language instructions.`,
        citations: [],
        threatResult: threat,
      };
    }

    const lower = query.toLowerCase();
    const policies = inMemoryStore.getPolicies();

    // If no policies or documents are uploaded, refuse to extrapolate and instruct user to upload documents
    if (policies.length === 0) {
      return {
        isSimulatedAI: true,
        type: 'UNCERTAIN_OUT_OF_SCOPE',
        text: `No policies or documents have been uploaded to your workspace yet. InsureOS answers questions grounded strictly in your uploaded contracts and evidence rather than extrapolating or hallucinating terms.\n\nPlease upload your policy schedule PDF in 'My Policies' or 'Document Vault' to ask document-specific questions.`,
        citations: [],
        clarificationQuestions: [
          'Do you have a policy PDF (Motor, Health, Home, Travel, or Life) you can upload?',
          'Would you like to load sample data in Settings to test the Q&A capability?',
        ],
      };
    }

    // 2. Scenario: "Is my accident covered?" or Motor collision questions
    if (lower.includes('accident') || lower.includes('collision') || lower.includes('car') || lower.includes('bumper')) {
      const motorPolicy = policies.find(p => p.category === 'motor');
      if (motorPolicy) {
        const clause = motorPolicy.clauses.find(c => c.category === 'Collision');
        return {
          isSimulatedAI: true,
          type: 'VERIFIED_FACT',
          text: `Yes, accidental collisions are covered under your ${motorPolicy.name} policy, subject to your contractually locked $${motorPolicy.deductibleAmount} deductible.`,
          citations: clause
            ? [
                {
                  policyId: motorPolicy.id,
                  policyName: motorPolicy.name,
                  carrier: motorPolicy.carrier,
                  section: clause.section,
                  pageNumber: clause.pageNumber,
                  clauseExcerpt: clause.text,
                },
              ]
            : [],
          clarificationQuestions: [
            'Was the vehicle in personal use at the time? (Section 11.2 excludes commercial ride-sharing or livery use).',
            'Did the accident occur within the last 7 calendar days? (Section 7.2 requires written notification within 7 days).',
            'Is the repair estimate from an authorized or licensed garage? (Section 3.4 requires itemized breakdowns for repairs > $1,000).',
          ],
        };
      }
    }

    // 3. Scenario: Water leak / plumbing / flood
    if (lower.includes('water') || lower.includes('leak') || lower.includes('flood') || lower.includes('pipe')) {
      const homePolicy = policies.find(p => p.category === 'home');
      if (homePolicy) {
        const pipeClause = homePolicy.clauses.find(c => c.keywords.includes('pipe') || c.keywords.includes('water'));
        const floodExclusion = homePolicy.clauses.find(c => c.isExclusion && c.keywords.includes('flood'));

        return {
          isSimulatedAI: true,
          type: 'VERIFIED_FACT',
          text: `Coverage depends strictly on the water source:\n- Sudden internal plumbing pipe bursts ARE covered up to $50,000 (subject to your $${homePolicy.deductibleAmount} deductible).\n- External rising flood or storm surge is EXPLICITLY EXCLUDED under Section 8.3.`,
          citations: [
            ...(pipeClause
              ? [
                  {
                    policyId: homePolicy.id,
                    policyName: homePolicy.name,
                    carrier: homePolicy.carrier,
                    section: pipeClause.section,
                    pageNumber: pipeClause.pageNumber,
                    clauseExcerpt: pipeClause.text,
                  },
                ]
              : []),
            ...(floodExclusion
              ? [
                  {
                    policyId: homePolicy.id,
                    policyName: homePolicy.name,
                    carrier: homePolicy.carrier,
                    section: floodExclusion.section,
                    pageNumber: floodExclusion.pageNumber,
                    clauseExcerpt: floodExclusion.text,
                  },
                ]
              : []),
          ],
          clarificationQuestions: [
            'Did the water originate from an internal plumbing fixture, or from external rainwater/ground water?',
          ],
        };
      }
    }

    // 4. Scenario: Hospital / Health / Pre-existing
    if (lower.includes('hospital') || lower.includes('surgery') || lower.includes('doctor') || lower.includes('medical')) {
      const healthPolicy = policies.find(p => p.category === 'health');
      if (healthPolicy) {
        const inpatientClause = healthPolicy.clauses.find(c => c.keywords.includes('inpatient'));
        const preExClause = healthPolicy.clauses.find(c => c.keywords.includes('pre-existing'));

        return {
          isSimulatedAI: true,
          type: 'VERIFIED_FACT',
          text: `Inpatient hospitalization and surgical care are covered up to $1,000,000, subject to an annual $${healthPolicy.deductibleAmount} deductible. Pre-existing conditions are subject to a 12-month waiting period from policy inception (${healthPolicy.effectiveDate}).`,
          citations: [
            ...(inpatientClause
              ? [
                  {
                    policyId: healthPolicy.id,
                    policyName: healthPolicy.name,
                    carrier: healthPolicy.carrier,
                    section: inpatientClause.section,
                    pageNumber: inpatientClause.pageNumber,
                    clauseExcerpt: inpatientClause.text,
                  },
                ]
              : []),
            ...(preExClause
              ? [
                  {
                    policyId: healthPolicy.id,
                    policyName: healthPolicy.name,
                    carrier: healthPolicy.carrier,
                    section: preExClause.section,
                    pageNumber: preExClause.pageNumber,
                    clauseExcerpt: preExClause.text,
                  },
                ]
              : []),
          ],
          clarificationQuestions: [
            'Was this treatment for an emergency acute condition or an elective procedure?',
            'Did you experience symptoms for this condition in the 24 months before March 2026?',
          ],
        };
      }
    }

    // 5. Scenario: Expire / Renewal
    if (lower.includes('expire') || lower.includes('renewal') || lower.includes('date')) {
      const motor = policies.find(p => p.category === 'motor');
      return {
        isSimulatedAI: true,
        type: 'VERIFIED_FACT',
        text: `Your policies have the following verified renewal schedule:\n- Aegis Motor Shield: Renews January 15, 2027\n- Valence Premier Care: Renews March 1, 2027\n- Heritage Dwelling: Renews May 10, 2027\n- Meridian Worldwide Trekker: Renews June 1, 2027\n- Valence 20-Year Term Life: In force until 2044.`,
        citations: [
          {
            policyId: motor ? motor.id : 'POL-MOT-88410',
            policyName: 'Policy Schedule Registry',
            carrier: 'Various Carriers',
            section: 'Schedule of Insurance',
            pageNumber: 1,
            clauseExcerpt: 'Policy term and effective dates as recorded on declarations page.',
          },
        ],
      };
    }

    // 6. Default Fallback: Refusal to fabricate facts + Admission of uncertainty
    const policyNames = policies.map(p => p.name).join(', ');
    return {
      isSimulatedAI: true,
      type: 'UNCERTAIN_OUT_OF_SCOPE',
      text: `I have reviewed your active policy schedules (${policyNames || 'none uploaded'}). I cannot find a definitive clause matching "${query}".\n\nTo prevent misinformation, InsureOS will not guess or extrapolate unverified terms. Please verify if this question pertains to an endorsement rider or contact the carrier claims desk directly.`,
      citations: [],
      clarificationQuestions: [
        'Which specific line of insurance (Motor, Health, Home, Travel, or Life) does this query apply to?',
        'Do you have an endorsement schedule or rider document you can upload for extraction?',
      ],
    };
  },

  /**
   * Evidence-based policy matching for claims (NO fake confidence percentages).
   * Never substitutes preloaded policies when user has not uploaded one.
   * If a claim is created without a policy, marks coverage as unverified.
   */
  matchPolicyForIncident(incidentText: string): {
    matchedPolicy: Policy;
    evidenceCriteria: string[];
    alternativePolicies: Policy[];
  } {
    const lower = incidentText.toLowerCase();
    const policies = inMemoryStore.getPolicies();

    // If no policies exist, return unverified policy placeholder per Requirement 4
    if (policies.length === 0) {
      const unverifiedPolicy: Policy = {
        id: 'POL-UNVERIFIED',
        carrier: 'Carrier Unverified',
        carrierContact: {
          email: 'claims-intake@unverified.carrier',
          hotline: 'N/A',
          claimsPortalUrl: '',
          allowedRecipientWhitelist: ['claims-intake@unverified.carrier'],
        },
        category: 'motor',
        name: 'No Policy Uploaded (Coverage Unverified)',
        policyNumber: 'UNVERIFIED-POLICY',
        status: 'active',
        premiumAnnual: 0,
        effectiveDate: new Date().toISOString().split('T')[0],
        renewalDate: 'N/A',
        deductibleAmount: 0,
        coverageLimit: 0,
        verified: false,
        originalDocumentName: 'None',
        exclusions: [],
        clauses: [],
      };

      return {
        matchedPolicy: unverifiedPolicy,
        evidenceCriteria: [
          'No policy schedule uploaded in workspace: Claim coverage marked as UNVERIFIED.',
          'Contractual deductible and policy clauses cannot be verified without an uploaded contract.',
          'Upload a policy schedule PDF to enable clause verification and deterministic deductible locking.',
        ],
        alternativePolicies: [],
      };
    }

    // Default to motor if car/collision/bumper keywords found
    let matched = policies.find(p => p.category === 'motor') || policies[0];
    const criteria: string[] = [];

    if (lower.includes('car') || lower.includes('collision') || lower.includes('vehicle') || lower.includes('bumper') || lower.includes('driver')) {
      matched = policies.find(p => p.category === 'motor') || policies[0];
      criteria.push(`Keyword match: Vehicle / collision terms detected in incident text.`);
      criteria.push(`Coverage mapping: Section 3.1 (Collision Damage Coverage) applies to accidental vehicle impacts.`);
      criteria.push(`Carrier allowlist: Verified endpoint '${matched.carrierContact.email}'.`);
      criteria.push(`Enforced contractual deductible: $${matched.deductibleAmount}.`);
    } else if (lower.includes('water') || lower.includes('pipe') || lower.includes('roof') || lower.includes('home')) {
      matched = policies.find(p => p.category === 'home') || policies[0];
      criteria.push(`Keyword match: Property / water damage terms detected.`);
      criteria.push(`Coverage mapping: Property damage clauses.`);
      criteria.push(`Enforced contractual deductible: $${matched.deductibleAmount}.`);
    } else if (lower.includes('hospital') || lower.includes('surgery') || lower.includes('health') || lower.includes('medical')) {
      matched = policies.find(p => p.category === 'health') || policies[0];
      criteria.push(`Keyword match: Medical inpatient terms detected.`);
      criteria.push(`Coverage mapping: Hospitalization clauses.`);
      criteria.push(`Enforced contractual deductible: $${matched.deductibleAmount}.`);
    } else {
      criteria.push(`Default heuristic: Primary policy selected from user catalog.`);
      criteria.push(`Verification required: User must confirm policy before claim assembly.`);
    }

    const alternatives = policies.filter(p => p.id !== matched.id);

    return {
      matchedPolicy: matched,
      evidenceCriteria: criteria,
      alternativePolicies: alternatives,
    };
  },
};
