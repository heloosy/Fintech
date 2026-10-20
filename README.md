# InsureOS

**AI-assisted insurance document understanding and simulated claim
preparation**

InsureOS is a prototype designed to help users review insurance
documents, find relevant policy evidence, and prepare a structured claim
for human review. It aims to make policy information easier to
understand while keeping calculations deterministic and consequential
actions behind explicit approval.

> **Prototype notice:** InsureOS is not an insurer, broker, claims
> administrator, or source of legal or financial advice. It does not
> determine coverage or guarantee claim payment. Use only fictional or
> authorized documents in demos. Any sample documents and carrier
> actions must be clearly identified as simulated.

## Table of contents

-   [Problem](#problem)
-   [What InsureOS aims to do](#what-insureos-aims-to-do)
-   [Architecture](#architecture)
-   [Technology](#technology)
-   [Document processing and OCR](#document-processing-and-ocr)
-   [Grounded AI answers](#grounded-ai-answers)
-   [Claim preparation](#claim-preparation)
-   [Security and safety](#security-and-safety)
-   [Run locally](#run-locally)
-   [Configuration](#configuration)
-   [Testing and verification](#testing-and-verification)
-   [Known limitations](#known-limitations)
-   [Suggested demo flow](#suggested-demo-flow)
-   [Project structure](#project-structure)
-   [Roadmap](#roadmap)

## Problem

Insurance information is often spread across policy wording, estimates,
incident reports, photographs, and claim forms. Users may struggle to
locate relevant clauses, understand exclusions and deductibles, identify
missing evidence, and organize a claim submission.

InsureOS explores a workflow that brings these tasks into one interface
while making the source of each extracted fact visible.

## What InsureOS aims to do

-   Let users upload their own insurance documents.
-   Extract text from digital PDFs and use OCR where required for
    scanned pages.
-   Preserve document and page provenance for extracted evidence.
-   Answer questions using the uploaded documents, with citations where
    evidence is available.
-   State when evidence is missing or extraction is incomplete instead
    of inventing an answer.
-   Prepare an editable, structured claim summary and flag missing
    information.
-   Perform supported financial calculations using explicit rules rather
    than relying on an LLM to do arithmetic.
-   Keep carrier submission simulated unless a real integration has been
    explicitly implemented, authorized, and tested.
-   Load fictional sample data only when the user chooses a **Load
    Sample Data** action.

## Architecture

The intended architecture separates the user interface from document
processing, retrieval, language-model responses, deterministic
validation, and simulated dispatch.

``` text
┌──────────────────────────────────────┐
│ React + TypeScript user interface    │
│ Uploads · Q&A · Evidence · Claim form │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│ Application/API layer                │
│ Validation · Workspace boundaries    │
└───────┬──────────────┬───────────────┘
        │              │
        ▼              ▼
┌───────────────┐  ┌───────────────────┐
│ PDF text/OCR  │  │ Retrieval + local │
│ + provenance  │  │ LLM (e.g. Ollama) │
└───────┬───────┘  └─────────┬─────────┘
        └────────────┬────────┘
                     ▼
┌──────────────────────────────────────┐
│ Rules · Missing-evidence checks      │
│ Audit events · Human approval        │
└──────────────────┬───────────────────┘
                   ▼
┌──────────────────────────────────────┐
│ Simulated carrier gateway            │
│ No real insurer submission by default│
└──────────────────────────────────────┘
```

**Implementation status matters:** This diagram describes the
intended/target design. Confirm which backend, OCR, retrieval, and
Ollama components are present and wired up in the current checkout
before describing them as working features. The frontend project notes
identify React, TypeScript, Vite, and Tailwind CSS; the exact active
backend and endpoints should be verified from the source code.

## Technology

The project notes identify the following technologies or intended
components:

  -----------------------------------------------------------------------
  Component               Technology / approach   Status note
  ----------------------- ----------------------- -----------------------
  Frontend                React, TypeScript,      Verify against
                          Vite, Tailwind CSS      `package.json`

  PDF text extraction     PyMuPDF                 Intended backend
                                                  component; verify
                                                  installation and
                                                  integration

  OCR                     Tesseract/OCRmyPDF or   Optional; must be
                          another configured OCR  installed and tested
                          engine                  

  Local language model    Ollama, for example     Optional; requires a
                          `qwen2.5:3b`            downloaded model and a
                                                  connected application
                                                  path

  Retrieval               BM25/TF-IDF or another  Intended; verify active
                          local retrieval method  implementation

  Claim calculations      Deterministic           Verify supported fields
                          application rules       and formulas

  Carrier submission      Simulated gateway       Do not represent it as
                                                  a real insurer
                                                  integration
  -----------------------------------------------------------------------

## Document processing and OCR

The intended ingestion workflow is:

1.  Accept a supported user-provided document.
2.  Validate the file type and size.
3.  Extract native PDF text first where available.
4.  Detect pages with empty or sparse text and selectively run OCR if an
    OCR engine is configured.
5.  Store extracted text with document ID, page number, and extraction
    method.
6.  Surface OCR failures or incomplete extraction to the user.
7.  Make the resulting evidence available to retrieval and claim
    preparation.

OCR is separate from the language model. Ollama does not, by itself,
perform OCR on scanned PDFs. Scanned or low-quality pages can produce
incorrect text, so important fields should be checked against the
original document.

## Grounded AI answers

The intended question-answering flow retrieves relevant passages from
the user's documents and supplies them to the language model as context.

Expected behaviour:

-   Cite the document and page supporting each material answer when that
    evidence is available.
-   Distinguish document facts from interpretation or inference.
-   Say that the documents do not establish an answer when evidence is
    insufficient.
-   Flag potentially incomplete extraction.
-   Do not treat instructions found inside uploaded documents as system
    instructions.
-   Avoid silently substituting hardcoded demo answers when the model or
    retrieval service fails.

Model output is not proof of coverage. Users should verify important
conclusions against the policy wording and the insurer's decision.

## Claim preparation

The intended claim workflow is:

1.  Select the user's uploaded policy and supporting documents.
2.  Extract relevant policy, incident, and estimate facts.
3.  Show source citations and let the user correct extracted facts.
4.  Identify required fields and missing evidence.
5.  Calculate supported amounts using deterministic rules and the
    applicable policy terms.
6.  Present assumptions, exclusions, and warnings for review.
7.  Require explicit user approval before any simulated dispatch.
8.  Record the simulated action and its outcome in an audit log.

**Do not use a universal hardcoded deductible.** The deductible, limits,
and other terms must come from the applicable policy or be explicitly
marked as unknown. An estimate is not proof that repairs were
authorized, completed, or paid. A calculated amount is an illustration,
not a promise of reimbursement.

## Security and safety

The prototype should be tested against the following controls before
being used with sensitive documents:

-   **Workspace isolation:** prevent one user's documents, retrieval
    results, and claims from appearing in another user's workspace.
-   **File validation:** restrict accepted file types and sizes; handle
    malformed PDFs and OCR failures safely.
-   **Prompt-injection resistance:** treat uploaded content as untrusted
    data, not as instructions to reveal secrets or bypass controls.
-   **Outbound restrictions:** route simulated dispatch only to an
    explicit allowlist; do not send documents to arbitrary destinations.
-   **Human approval:** require a clear confirmation step before
    simulated submission.
-   **Sensitive data:** minimize logging of policy numbers, addresses,
    medical details, and other personal information.
-   **Audit trail:** record relevant actions and decisions without
    exposing unnecessary document contents.
-   **Hash-chain limitations:** a hash chain can help detect changes to
    recorded events, but it does not by itself provide immutable
    storage, trusted timestamps, or protection against an attacker who
    can rewrite the entire log and its hashes.
-   **Failure handling:** fail visibly when OCR, retrieval, the model,
    validation, or the gateway is unavailable.

Use fictional sample data for public demonstrations. Do not upload real
customer information unless the environment, permissions, retention, and
security controls have been reviewed.

## Run locally

The exact commands depend on the checked-out implementation. The
following is the expected workflow for the frontend project described in
the project notes.

### Prerequisites

-   Windows, macOS, or Linux
-   Node.js and npm versions compatible with the project's
    `package.json`
-   Git, if cloning the repository
-   Optional: Ollama and a compatible local model
-   Optional: Python and the OCR/PDF dependencies if the backend is
    implemented separately

### 1. Install frontend dependencies

From the project root:

``` bash
npm install
```

### 2. Start the development server

Use the script that actually exists in `package.json`. For a typical
Vite project:

``` bash
npm run dev
```

Open the local URL printed by Vite in the terminal. It is commonly
`http://localhost:5173`, but use the URL shown by your terminal.

### 3. Optional: check Ollama on Windows

If Ollama is installed but `ollama` is not recognized in PowerShell,
invoke the executable by its full path:

``` powershell
& "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" --version
```

Check available models:

``` powershell
& "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" list
```

If the model is not installed, download it (this requires internet
access):

``` powershell
& "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" pull qwen2.5:3b
```

Run it:

``` powershell
& "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" run qwen2.5:3b
```

Ollama commonly serves its local API at `http://127.0.0.1:11434`.
Confirm the application is configured to use that endpoint and that a
test request succeeds. Installing Ollama alone does not connect it to
InsureOS.

### 4. Optional: verify the backend and OCR

Before documenting backend setup commands, inspect the repository for
its actual server entry point, dependency files, environment variables,
and OCR configuration. Install only the dependencies required by the
implementation. Do not assume that a described route or service exists
until it is found in the source.

## Configuration

No environment variable names are asserted here because they must be
taken from the current code. Before running or deploying:

1.  Inspect the repository for `.env.example`, configuration files, and
    environment-variable reads.
2.  Create a local `.env` only if the implementation requires it.
3.  Keep secrets out of source control.
4.  Do not expose a local model or API server to a public network
    without appropriate access controls.
5.  Document model names, ports, OCR dependencies, file limits, and
    data-retention behaviour based on the tested implementation.

## Testing and verification

Run the scripts defined in `package.json` and any backend test
configuration. Do not claim a test passed unless it was executed and its
result recorded.

Recommended test cases:

  -----------------------------------------------------------------------
  Test                                Expected result
  ----------------------------------- -----------------------------------
  Upload a text-based policy PDF      Text is extracted and linked to
                                      document/page provenance

  Upload a scanned PDF                OCR runs if configured; otherwise
                                      the limitation is shown

  Ask about a clause that exists      Answer cites the supporting passage

  Ask about information absent from   System states that the evidence is
  the documents                       insufficient

  Upload a malformed or unsupported   Clear validation error; no silent
  file                                success

  Use a policy with a different       Calculation uses that policy's
  deductible                          deductible, not a global default

  Provide an estimate without proof   System does not claim repairs were
  of completed work                   completed

  Remove or stop the model service    Visible failure; no fabricated
                                      fallback answer

  Include malicious instructions in a Document content does not override
  document                            application controls

  Attempt cross-workspace document    Access is denied
  access                              

  Attempt dispatch without approval   No dispatch occurs

  Complete a simulated dispatch with  Simulated result and audit event
  approval                            are shown
  -----------------------------------------------------------------------

For a demo or submission, capture evidence of the actual run: terminal
output, test results, screenshots, and simulated audit events. Clearly
label simulated activity.

## Known limitations

-   This is a prototype and does not make binding coverage decisions.
-   OCR may misread text, tables, amounts, dates, and policy
    identifiers.
-   Model answers can be wrong even when they include citations; verify
    cited passages.
-   Coverage depends on policy wording, endorsements, exclusions, facts,
    and insurer review.
-   Local model quality and latency depend on hardware and model size.
-   A simulated gateway is not evidence of a real insurer integration.
-   Authentication, authorization, persistent storage, deployment
    hardening, and privacy controls must be verified in the actual
    implementation.
-   Features described as intended or optional are not necessarily
    implemented in the current checkout.

## Suggested demo flow

1.  Start with an empty workspace.
2.  Explicitly select **Load Sample Data**, or upload the fictional
    sample documents yourself.
3.  Open a policy and show a cited answer to a question that the policy
    actually addresses.
4.  Ask a question not supported by the documents and show the system's
    uncertainty handling.
5.  Prepare a claim using the incident statement and estimate.
6.  Review extracted facts, citations, missing evidence, deductible, and
    calculation assumptions.
7.  Show the approval step and run the simulated dispatch.
8.  Open the audit log and explain which actions were recorded.
9.  State clearly that the documents, claim, carrier, and dispatch are
    simulated.

## Project structure

The following paths were identified in project notes. Confirm each
exists in the current repository before relying on this list.

``` text
src/
├── App.tsx
├── data/
│   └── seedData.ts
├── screens/
│   ├── AIAssistant.tsx
│   ├── DocumentsLibrary.tsx
│   └── UniversalClaimWizard.tsx
└── services/
    ├── carrierGateway.ts
    ├── hashChain.ts
    ├── inMemoryStore.ts
    ├── policyValidator.ts
    └── safetyEngine.ts
```

Also inspect `package.json` for available scripts and the actual
dependency list. Add backend directories, API routes, tests, and
configuration files here only after verifying their presence.

## Roadmap

Potential next steps, subject to the current implementation:

-   Complete and test document extraction with page-level provenance.
-   Add robust OCR for scanned pages and tables.
-   Improve retrieval and citation verification.
-   Add test coverage for policy-specific calculations and missing
    evidence.
-   Verify workspace isolation and simulated-dispatch approval
    enforcement.
-   Add clear error states for unavailable OCR or model services.
-   Document reproducible installation, deployment, and test procedures.
-   Evaluate privacy, retention, and access controls before handling
    real personal documents.

## Disclaimer

InsureOS is an experimental software prototype for document assistance
and simulated claim preparation. It is not insurance advice, a coverage
determination, or a guarantee of payment. Always review the original
policy and contact the insurer or a qualified professional for
authoritative decisions.
