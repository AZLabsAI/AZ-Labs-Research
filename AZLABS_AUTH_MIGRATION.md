# AZ Labs central authentication

Research keeps Supabase as its data and local session layer while the login authority moves to AZ Labs Better Auth.

## Configuration

1. In the Research Supabase project, add a Custom OAuth/OIDC provider.
2. Use identifier `custom:azlabs`.
3. Use issuer `https://azlabs.ai/api/auth`.
4. Create a first-party OAuth client in the AZ Labs identity service with the exact Supabase callback URL shown in the Supabase provider setup.
5. Add the production and preview callback URLs to Supabase's redirect allow-list.
6. Set `NEXT_PUBLIC_AZLABS_AUTH_MODE=central` only after the central schema, provider flag and client registration have been verified.

The central provider is an identity handoff. Supabase still issues the Research-local session used by the existing RLS policies. A central login does not automatically merge an existing Supabase user or grant Research access.

## Account migration rule

Do not merge an existing Supabase account with a central AZ Labs account by email alone. For existing users, require a verified login to both accounts and an explicit linking flow before moving profile or saved research data.

## Historical baseline rollback before binding RLS

The earlier unbound adapter could return to `NEXT_PUBLIC_AZLABS_AUTH_MODE=legacy`. This does not restore profile access after the new binding RLS migration. Use the reviewed rollback instructions below for this branch.

## Historical production baseline (2026-09-27)

The earlier adapter was recorded as live in production (`NEXT_PUBLIC_AZLABS_AUTH_MODE=central`):

- Main-site `oauthClient` row `azlabs-research`: redirect URI fixed to the Supabase
  callback (`https://kcjnppkionswkcgitdpm.supabase.co/auth/v1/callback`), confidential
  client secret issued (SHA-256 base64url stored), `client_secret_basic`, PKCE required,
  consent skipped (first-party).
- Research Supabase project: `custom_oauth_enabled` on; custom OIDC provider
  `custom:azlabs` created (issuer `https://azlabs.ai/api/auth`, scopes
  `openid profile email`), verified via the authorize redirect chain.
- Research login page is central-only in the production bundle (legacy UI compiled out).

To rotate the bridge secret: generate a new secret, update the `oauthClient` row hash,
then PUT the Supabase provider (`/auth/v1/admin/custom-providers/custom:azlabs`)
with the new `client_secret`. No code deploy needed for rotation.

## Reviewed adoption in this branch

This branch is local and has not changed production, Supabase, provider registrations or account data. Public browsing remains open. Search and narration require a verified AZ Labs delegated access token, an approved identity mapping, current Research grant, positive configured daily cap, and durable active local session binding. Each search or narration consumes one idempotent `research` allowance before a provider is called; a replayed request never calls another provider.

The parent authority is `POST https://azlabs.ai/api/platform/access/check`, authenticated with the real Supabase OAuth `provider_token`. Research rejects ID tokens, Supabase local JWTs, wrong clients and the former userinfo audience. Authorization must carry `resource=https://azlabs.ai/api/platform`, and the custom provider must demonstrably forward/bind it during authorization and token exchange. The callback scrubs the provider token from Supabase's browser-readable session cookie and preserves delegation only in an encrypted HttpOnly host-only cookie. Supabase does not refresh provider tokens, so expiry requires another central handoff that reuses the AZ Labs browser session.

The delegated token must also carry the signed `https://azlabs.ai/identity_gate=pre_issuance_v1` claim, and access/check must confirm `identityGate: pre_issuance_v1`. Legacy tokens and unmarked issuers are rejected even if configuration flags were set. The parent adds this marker only after its reviewed mapping and current grant/cap checks pass before issuance or refresh.

### Blocking configuration and policy prerequisites

1. Deploy and verify the parent's **pre-issuance** identity gate for OAuth client `azlabs-research`. It must block missing/unapproved mappings before Supabase receives an identity. App-page checks alone cannot contain Supabase same-email linking or direct Data API access.
2. Existing accounts require fresh verified ownership of both the AZ Labs account and original Supabase account, an explicit linking decision and an audit reference. New empty accounts require documented collision absence and controlled provisioning. Never infer ownership from email. Prepare a local review with `scripts/prepare-identity-link.mjs`; a trusted AZ Labs administrator records its `central` object through `/api/admin/identity-links`. The parent returns the approved `localSubject`, which must exactly match the UUID returned by Supabase after callback. No local tool sends or grants anything automatically.
3. Review and apply `supabase/migrations/20261001201626_central_research_session_bindings.sql` in a controlled environment before production. It adds durable local JWT `session_id` to central `sid` bindings, protected profile RLS, persistent signed-logout replay records and service-only binding/revocation RPCs. The migration aborts on unexpected existing profile policies. Existing unbound sessions lose profile access; no rows or accounts are merged or rewritten.
4. Configure server-only `SUPABASE_SERVICE_ROLE_KEY` and a canonical base64 32-byte `RESEARCH_SESSION_ENCRYPTION_KEY`. Record reviewed pre-issuance/provider-linking evidence before setting `RESEARCH_CENTRAL_ISSUANCE_GATE_VERIFIED=1`, and reviewed local migration/RLS proof before setting `RESEARCH_SESSION_BINDINGS_READY=1`. Missing flags, secrets, mapping, cap, policy or authority return a controlled denial. `scripts/check-auth-readiness.mjs` lists blockers without secrets; `--check-schema` performs only a read-only policy diagnostic and does not replace issuance evidence.
5. Register the exact Research backchannel `https://research.azlabs.ai/api/auth/azlabs/backchannel` and post-logout redirect `https://research.azlabs.ai/`. Signed `logout+jwt` must have the correct issuer, `azlabs-research` audience, event, fresh `iat`, unique `jti`, and a validated `sub` or a `sid` that resolves to a known binding. Durable revocation makes old Supabase access JWTs fail profile RLS before expiry; session creation and logout serialize by subject to prevent re-binding a revoked session.

   A valid signed subject-bearing logout always records a tombstone, including before any callback binding exists. SID-only events use a known binding only to derive their subject. A callback whose central check succeeded before logout still cannot bind afterward: the serialized binding function checks the tombstone before writing an active local session.
6. The existing provider redirect stays Supabase's exact `/auth/v1/callback`; Supabase's app redirect stays Research `/auth/callback`. Preserve PKCE, exact preview registration and the local-only `next` destination. Set `AZLABS_RESEARCH_ORIGIN` explicitly for controlled preview origins; `AZLABS_PLATFORM_ORIGIN` defaults to `https://azlabs.ai`.

### Customer behaviour and rollback

Protected entry automatically opens the existing AZ Labs login; Research has no independent password/social sign-in choices. Account data and page memory are isolated by a server-verified central subject. Browser threads stay on that browser; they are not advertised as cloud synced. Earlier anonymous history is copied only after an explicit opt-in, and its original browser data is preserved.

Research sign-out revokes the durable local binding, clears the local delegation cookie and local Supabase session, then navigates to the advertised parent end-session endpoint with its registered client and redirect. Supabase does not expose the provider ID token, so the parent displays its protocol-required logout confirmation. An access token is never sent as `id_token_hint`.

Rollback starts by disabling new Research access and switching to the recorded known-good deployment. Do **not** simply select legacy login after installing binding RLS: that cannot restore legacy profile access. Any database policy rollback requires a separately reviewed restoration of the prior policies and grants, only after central issuance, session revocation and exposure have been contained. The session/identity audit tables and original accounts are retained. A live previous deployment ID, controlled SQL/RLS checks, reused-session journey and signed backchannel delivery remain required release evidence; this local build does not prove them.

## Local SQL regression suite

`pnpm test:sql` uses an in-memory PGlite PostgreSQL engine. Set `AZLABS_TEST_PGLITE_MODULE` to the installed package entry when sharing the parent workspace's PGlite dependency; the suite fails when its engine is unavailable rather than skipping SQL coverage. It applies both complete repository migrations to a fresh fixture for each scenario, with synthetic Supabase auth roles/users/sessions and the original profile trigger/policies. It verifies owner reads/inserts/updates, unbound and cross-owner denial, service-only writes, expiry, signed logout before adoption, late callback denial, subject-only/SID-only handling, and durable replay against actual SQL and RLS. It does not connect to Supabase, use private data or verify a live provider configuration.
