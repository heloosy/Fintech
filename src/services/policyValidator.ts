// Deterministic Business Logic & Security Enforcer
// Enforces authorization, recipient allowlisting, deductible rules, and approval gates
// in application code, completely independent of AI outputs or document claims.

import type { Claim, Policy } from '../types';

export class SecurityValidationError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'SecurityValidationError';
  }
}

export const PolicyValidator = {
  /**
   * Enforces tenancy and role-based access control (RBAC).
   * Blocks access if a user attempts to access a policy or claim outside their tenancy.
   */
  enforceAuthorization(policyId: string, allowedPolicyIds: string[]): boolean {
    if (!allowedPolicyIds.includes(policyId)) {
      throw new SecurityValidationError(
        'ERR_UNAUTHORIZED_ACCESS',
        `Access Denied: Tenancy boundary enforced. Policy '${policyId}' does not belong to authorized workspace.`
      );
    }
    return true;
  },

  /**
   * Enforces recipient allowlisting.
   * Outbound transmissions can ONLY be routed to pre-whitelisted carrier endpoints.
   */
  validateRecipient(recipient: string, policy: Policy): boolean {
    const whitelist = policy.carrierContact.allowedRecipientWhitelist;
    const isAllowed = whitelist.some(
      allowed => allowed.toLowerCase().trim() === recipient.toLowerCase().trim()
    );

    if (!isAllowed) {
      throw new SecurityValidationError(
        'ERR_UNAUTHORIZED_RECIPIENT',
        `Recipient Blocked: Address '${recipient}' is not on the verified carrier allowlist [${whitelist.join(', ')}]. Outbound dispatch rejected.`
      );
    }
    return true;
  },

  /**
   * Enforces contractual deductible rules.
   * Deductibles are strictly determined by contract terms, NEVER by AI or user-uploaded text.
   */
  enforceContractualDeductible(policy: Policy, proposedDeductible?: number): number {
    // Contract value is the single source of truth
    const contractDeductible = policy.deductibleAmount;

    if (proposedDeductible !== undefined && proposedDeductible !== contractDeductible) {
      // Security override: force contract deductible
      return contractDeductible;
    }
    return contractDeductible;
  },

  /**
   * Enforces mandatory document requirements for claim progression.
   * If any mandatory document is missing, progression to submission is blocked
   * UNLESS an explicit demo exemption was authorized by the human administrator.
   */
  validateClaimEvidence(claim: Claim): {
    canProceed: boolean;
    missingDocuments: string[];
    blockingReason?: string;
  } {
    const missingDocs: string[] = [];

    for (const doc of claim.documents) {
      if (doc.required && (!doc.uploaded || doc.status === 'missing' || doc.status === 'quarantined')) {
        missingDocs.push(doc.name);
      }
    }

    if (missingDocs.length > 0) {
      if (claim.exemptionGranted) {
        return {
          canProceed: true,
          missingDocuments: missingDocs,
          blockingReason: `Exemption explicitly authorized by human reviewer (${claim.exemptionReason}).`,
        };
      }
      return {
        canProceed: false,
        missingDocuments: missingDocs,
        blockingReason: `Mandatory evidence missing: ${missingDocs.join(', ')}. Submission blocked until all required evidence is uploaded or an authorized exemption is recorded.`,
      };
    }

    return {
      canProceed: true,
      missingDocuments: [],
    };
  },

  /**
   * Enforces explicit approval and statutory fraud declaration before carrier dispatch.
   */
  validateSubmissionApproval(claim: Claim): boolean {
    if (!claim.statutoryDeclarationSigned) {
      throw new SecurityValidationError(
        'ERR_DECLARATION_MISSING',
        'Submission Blocked: Policyholder must explicitly review and sign the statutory declaration before transmission.'
      );
    }
    return true;
  },
};
