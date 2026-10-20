// Simulated Carrier Gateway (EDI / API Dispatch)
// Enforces security allowlists, statutory declarations, and handles carrier failure simulation.

import { computeSha256 } from './hashChain';
import { inMemoryStore } from './inMemoryStore';
import { PolicyValidator, SecurityValidationError } from './policyValidator';
import type { Claim, Policy, TransmissionReceipt } from '../types';

export interface DispatchResult {
  success: boolean;
  receipt?: TransmissionReceipt;
  errorCode?: string;
  errorMessage?: string;
  canRetry: boolean;
}

export const CarrierGateway = {
  /**
   * Simulates dispatch to an insurer's automated claims ingestion gateway.
   * Prominently labeled as a simulated demo integration.
   */
  async submitClaim(claim: Claim, policy: Policy): Promise<DispatchResult> {
    // 1. Enforce statutory declaration approval gate
    PolicyValidator.validateSubmissionApproval(claim);

    // 2. Enforce recipient allowlisting
    PolicyValidator.validateRecipient(claim.recipientEmail, policy);

    // 3. Enforce mandatory evidence checklist
    const evidenceCheck = PolicyValidator.validateClaimEvidence(claim);
    if (!evidenceCheck.canProceed) {
      throw new SecurityValidationError('ERR_EVIDENCE_INCOMPLETE', evidenceCheck.blockingReason || 'Incomplete evidence.');
    }

    // 4. Enforce contractual deductible in application code
    const validatedDeductible = PolicyValidator.enforceContractualDeductible(policy, claim.deductibleApplied);
    claim.deductibleApplied = validatedDeductible;

    // Simulate network delay
    const latency = inMemoryStore.testState.latencyMs;
    await new Promise(r => setTimeout(r, latency));

    // 5. Test Case TC-06: Simulated Carrier Gateway Outage (503)
    if (inMemoryStore.testState.simulateCarrierOutage503) {
      await inMemoryStore.recordAudit(
        'CARRIER_DISPATCH_FAILED',
        'Carrier Gateway Simulator',
        `Simulated transmission failure to '${claim.recipientEmail}'. Endpoint returned HTTP 503 Service Unavailable.`,
        'warning'
      );

      return {
        success: false,
        errorCode: 'HTTP_503_CARRIER_ENDPOINT_BUSY',
        errorMessage: 'Simulated Carrier Gateway Error (503): Aegis Electronic Claims Ingestion service is temporarily unavailable. Claim draft is preserved; click Retry to resend.',
        canRetry: true,
      };
    }

    // 6. Generate official simulated receipt
    const refNumber = `CLM-2026-AEGIS-${Math.floor(1000 + Math.random() * 9000)}`;
    const timestamp = new Date().toISOString();
    const digest = await computeSha256(`${refNumber}|${timestamp}|${claim.recipientEmail}|${claim.estimatedLoss}|${validatedDeductible}`);

    const receipt: TransmissionReceipt = {
      referenceNumber: refNumber,
      timestamp,
      sha256Digest: digest,
      status: 'DELIVERED_SIMULATED',
      recipient: claim.recipientEmail,
      simulatedLatencyMs: latency,
    };

    claim.transmissionReceipt = receipt;
    claim.status = 'under_review';
    claim.submissionDate = timestamp.slice(0, 10);
    claim.currentStep = 11; // Move to Receipt step

    // Append to timeline
    claim.timeline.push({
      date: timestamp.replace('T', ' ').slice(0, 16),
      title: 'Claim Dossier Submitted (Simulated)',
      description: `Official submission transmitted to ${claim.recipientEmail}. Reference: ${refNumber}. Deductible locked at $${validatedDeductible}.`,
      type: 'success',
    });

    inMemoryStore.saveClaim(claim);

    await inMemoryStore.recordAudit(
      'CLAIM_DISPATCHED_SIMULATED',
      inMemoryStore.getUserProfile().fullName,
      `Claim ${claim.id} dispatched to simulated carrier gateway '${claim.recipientEmail}'. Ref: ${refNumber}. Deductible enforced: $${validatedDeductible}.`,
      'info'
    );

    return {
      success: true,
      receipt,
      canRetry: false,
    };
  },
};
