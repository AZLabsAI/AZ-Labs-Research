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

## Rollback

Set `NEXT_PUBLIC_AZLABS_AUTH_MODE=legacy` and redeploy. Existing Supabase email/password and configured social providers remain available until the central flow has passed its real test-account and rollback checks.

## Cutover log (2026-09-27)

Central mode is live in production (`NEXT_PUBLIC_AZLABS_AUTH_MODE=central`):

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
