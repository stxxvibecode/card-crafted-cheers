# Card Crafted Cheers Audit Plan

## Objective

Determine whether the app is safe, reliable, understandable, accessible, and ready for real users. The audit will follow the full e-card lifecycle: discover the product, create an art or coded card, authenticate, save and share it, open it as a recipient, respond, and review responses as the sender.

## Current Baseline

- Stack: TanStack Start, React 19, Vite 8, Supabase, Tailwind CSS, and Lava-backed AI generation.
- Product surfaces: landing page, card creator, authentication, public card view, authenticated card dashboard, AI model and image endpoints, and Supabase tables/views.
- `bun install --frozen-lockfile` succeeds.
- `npm ci` fails because `package-lock.json` does not match `package.json`.
- Production build succeeds, with deprecated TanStack server-function APIs and a client chunk over 500 kB.
- Lint fails with 574 findings: 560 errors and 14 warnings, mostly formatting plus hook and fast-refresh warnings.
- No automated test command or test suite is present.
- Dependency audit did not complete and must be rerun with a bounded, CI-friendly scanner.

## Audit Method

For every finding, capture:

1. Reproduction steps or the exact command/query.
2. Expected behavior and actual behavior.
3. User or business impact.
4. Evidence: screenshot, console/network trace, SQL result, or file and line reference.
5. Severity, owner, recommended fix, and verification test.

Severity definitions:

- **P0 Critical:** active data exposure, account takeover, arbitrary code execution, or uncontrolled paid-API abuse.
- **P1 High:** core workflow failure, material privacy/security weakness, or likely data loss.
- **P2 Medium:** degraded UX, accessibility barrier, performance regression, or maintainability risk.
- **P3 Low:** polish, consistency, or low-impact cleanup.

## Phase 1: Product Contract and Environment

- Write a one-page product contract covering target user, core job, activation event, and success metrics.
- Document required environment variables, Supabase project setup, migrations, local startup, build, and deployment.
- Choose one package manager and lockfile; prove a clean install from an empty environment.
- Inventory all routes, server functions, third-party services, public assets, and external data flows.
- Create a disposable audit Supabase project and seed fixtures; never test destructive cases against production.
- Record supported browsers, viewport sizes, and mobile devices.

**Exit:** A new contributor can install, configure, seed, build, and run the app from documented steps.

## Phase 2: Core User Journeys

Test each journey on desktop and mobile, signed out and signed in where relevant:

- Landing prompt to creator, including blank, long, and special-character prompts.
- Art card generation, regeneration, editing, preview, save, copy link, QR code, and download/share behavior.
- Coded card generation for every template and AI mode, including edit and regeneration.
- Email/password sign-up, sign-in, sign-out, failed login, confirmation, and Google OAuth callback.
- Anonymous versus authenticated card creation and ownership association.
- Public card load for valid, invalid, deleted, and malformed IDs.
- Recipient reaction, reply, RSVP, and guestbook submission, including repeat and abusive submissions.
- Sender dashboard list, response counts/details, sharing, empty state, and account isolation.
- Network interruption, upstream AI refusal, timeout, rate limit, malformed response, and Supabase failure.

**Exit:** Every core journey has a pass/fail result, screenshots, and a regression test candidate.

## Phase 3: Security, Privacy, and Abuse

### Authentication and authorization

- Verify every server function derives identity from a validated session and never trusts client ownership fields.
- Test horizontal access between two accounts for cards, recipient email, prompts, and responses.
- Review OAuth redirect allowlists, session storage, logout invalidation, and token handling.
- Confirm anonymous users cannot mutate, enumerate, or read protected sender data.

### Supabase and data exposure

- Rebuild migrations in order on a blank database and inspect final grants, views, constraints, and RLS policies.
- Query as `anon`, authenticated account A, authenticated account B, and service role.
- Confirm `public_cards` exposes only intentional fields and cannot reveal `recipient_email`, `prompt`, or `user_id`.
- Validate response content, author names, card IDs, allowed kinds, and ownership visibility at both API and database layers.
- Decide retention and deletion behavior for cards, recipient information, generated images, and responses.

### Generated content and API abuse

- Threat-model the AI-generated JavaScript iframe and exported standalone HTML.
- Attempt sandbox escape, navigation, data exfiltration, denial-of-service loops, oversized DOM/canvas work, obfuscated forbidden APIs, and unsafe URL/CSS payloads.
- Verify message events validate source, origin, type, and bounds instead of accepting arbitrary frames.
- Add request size limits, per-user/IP rate limits, timeouts, concurrency limits, and spend controls to AI endpoints and server functions.
- Test prompt injection, harmful content, secrets in logs/errors, CORS/CSRF/origin handling, and security headers.
- Run secret scanning and dependency vulnerability/license checks in CI.

**Exit:** No open P0/P1 issue; public data exposure and paid-AI abuse are bounded and tested.

## Phase 4: Data Integrity and Reliability

- Validate migration idempotency, rollback/recovery procedure, indexes, foreign keys, and database constraints.
- Test partial failures between generation, save, share, and response submission.
- Check duplicate submissions, rapid retries, stale sessions, simultaneous edits, and double-click behavior.
- Confirm errors are actionable for users while server logs retain traceable context without personal data.
- Define timeouts, retries with backoff, idempotency keys where needed, and upstream service fallbacks.
- Verify backups and perform a restore drill with representative cards and responses.

**Exit:** Critical operations have explicit failure behavior, observability, and a tested recovery path.

## Phase 5: Accessibility and UX Quality

- Run keyboard-only navigation through every workflow and modal.
- Test screen-reader labels, heading order, landmarks, form errors, focus management, live regions, and generated-card alternatives.
- Check contrast, zoom to 200%, reduced motion, touch targets, responsive layout, long names/messages, and localization-length stress.
- Verify loading, empty, success, error, disabled, offline, and retry states.
- Test recipient comprehension: who sent the card, what interaction is expected, and whether a response was submitted.
- Run automated WCAG checks, then manually verify issues automation cannot detect.

**Exit:** No critical WCAG 2.2 AA barrier in a core journey and all serious issues have regression coverage.

## Phase 6: Performance, SEO, and Compatibility

- Measure Lighthouse and Web Vitals on landing, creator, public card, and dashboard pages under mobile throttling.
- Profile the 607 kB client entry chunk, creator bundle, image payloads/data URLs, hydration, rerenders, and animation cost.
- Verify lazy loading, caching, compression, font behavior, image dimensions, and generated-card cleanup.
- Validate metadata, canonical URLs, Open Graph cards, favicon, robots/sitemap intent, and share previews.
- Test current Chrome, Safari, Firefox, Edge, iOS Safari, and Android Chrome.

**Targets:** LCP under 2.5 s, INP under 200 ms, CLS under 0.1 at the 75th percentile, with explicit exceptions documented.

## Phase 7: Code Quality and Automated Coverage

- Separate formatting from semantic lint findings and bring both checks to a clean baseline.
- Add TypeScript type-checking as an explicit script.
- Add unit tests for validation, occasion logic, generated-code sanitization, and export behavior.
- Add integration tests for server functions and final Supabase RLS/grants.
- Add browser tests for create/save/share/respond and cross-account authorization.
- Test AI boundaries with deterministic fixtures rather than calling paid models in the default suite.
- Remove deprecated TanStack APIs and identify dead or duplicated UI components.
- Add CI gates for frozen install, format check, lint, typecheck, unit/integration tests, production build, dependency audit, and a small browser smoke suite.

**Exit:** The main branch is reproducible and CI blocks regressions in the core workflow and security boundaries.

## Deliverables

- `AUDIT_REPORT.md`: executive summary, tested scope, findings ordered by severity, and evidence.
- `AUDIT_FINDINGS.csv`: ID, severity, area, title, reproduction, impact, recommendation, owner, status, and verification.
- Automated regression tests for every fixed P0/P1 issue and the primary create/share/respond flow.
- A remediation backlog grouped into **before launch**, **next release**, and **later**.
- A go/no-go recommendation with remaining risk accepted explicitly.

## Recommended Order

1. Fix reproducible installs and establish a clean audit environment.
2. Audit Supabase authorization, public views, generated-code execution, and AI cost-abuse controls.
3. Validate the end-to-end product journeys and failure states.
4. Audit accessibility, performance, SEO, and browser compatibility.
5. Add regression coverage and CI gates before remediation begins.

## Completion Criteria

The audit is complete when all planned surfaces have evidence-backed results, no P0/P1 finding is unresolved, core workflows pass on supported devices, the final Supabase permissions are proven with role-based tests, and CI can reproduce the approved release from a clean checkout.
