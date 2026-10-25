# AZ Labs — Full Technology Stack & Infrastructure Architecture

> **Authoritative master reference** for all services, platforms, cloud resources, hardware nodes, database systems, AI model providers, API integrations, and developer tooling across AZ Labs, Vibe Code, Buy and Save, and personal operations.
> 
> *Maintained in Obsidian Second Brain (`Area 51/00 Dashboard/`) and synced to Apple Notes (`AZ Labs` folder).*

---

## 1. Fleet & Hardware Nodes

| Node | Operating System | Hostname / IP | Primary Purpose & Services | Telemetry Agent |
|---|---|---|---|---|
| **Katara** | macOS (Apple Silicon) | `192.168.1.20` (`AZs-MacBook.local`) | Primary control-plane workstation & AI orchestrator (Antigravity, Codex, Claude Code, Aside, Hermes, Wispr Flow). | Grafana Alloy (`sh.brew.alloy`) |
| **Pal VPS** | Ubuntu 24.04 LTS | `129.121.92.191:55555` (`pal`) | Production cloud server in London UK. Hosts Caddy reverse proxy, active websites, MariaDB, PostgreSQL, WordPress, and automated systemd watchdog (`pal-process-guard.timer`). | Grafana Alloy (`alloy.service`) |
| **AJ Workstation** | Ubuntu (Dual-boot) | `192.168.1.22` (`aj`) | Master storage node hosting `/mnt/data/AZ Labs` repository tree, Docker containers, media archive, and Cloudflare Ingress Tunnel (`azlabs-groceries`). | Grafana Alloy (`alloy.service`) |
| **Muse VPS** | Ubuntu | `muse` (`htch-runtime`) | Take-over execution host for migrated cron and background agent tooling (`/home/hatch`). | SSH bridge via Pal |
| **Ava PC** | Windows | `ava-pc` | Family workstation. | Remote CLI |

---

## 2. Active Web Domain Portfolio & Ingress

Authoritative commercial portfolio managed via Cloudflare DNS and auto-renewed on TrueHost (`~/.agents/domains.md`):

| Domain | Ingress / Hosting | Primary Purpose | Status Page / Probe ID |
|---|---|---|---|
| **`azlabs.ai`** | Cloudflare DNS -> Vercel / Next.js | Flagship AI agency platform, technical guides, editorial news. | Synthetic Check `13780` (`status.azlabs.ai`) |
| **`azlabs.co.za`** | Cloudflare DNS | Commercial South African corporate entity & customer portal. | Synthetic Check `13781` (`status.azlabs.ai`) |
| **`buyandsave.co.za`** | Cloudflare DNS (WAF probe skip) -> Pal VPS | WooCommerce online retail store & deal engine. | Synthetic Check `13782` (`status.azlabs.ai`) |
| **`englishunlocked.co.za`** | Cloudoon DNS | Educational English training property. | Active |
| **`vibecode.co.za`** | Cloudflare DNS | Vibe Code AI agency portal. | Active |

### Dedicated Subdomains & Tunnels:
- **`grafana.azlabs.ai`**: Branded Grafana Cloud instance (Cloudflare CNAME to `azlabs.grafana.net`).
- **`status.azlabs.ai`**: Branded public status page (Cloudflare CNAME to `statuspage.betteruptime.com`).
- **Cloudflare Ingress Tunnel (`azlabs-groceries` on AJ)**:
  - `groceries-connector.azlabs.ai` (`:4100`)
  - `smb.azlabs.ai` (`:3006`)
  - `clips.azlabs.ai` (`:3210`)

*Decommissioned / lapsed domains (do NOT renew)*: `schoolsearch.co.za`, `nosuch.co.za`, `ustream.co.za`.

---

## 3. Observability, Telemetry & Site Reliability

- **Grafana Cloud Free Stack (`AZ Labs` / `azlabsai`)**:
  - **Custom Branded URL**: [https://grafana.azlabs.ai](https://grafana.azlabs.ai) (Stack Slug: `azlabs.grafana.net`, Org ID: `1960752`, Stack ID: `1891045`).
  - **Unified Dashboard**: `AZ Labs Infrastructure & Web Overview` (22 panels across Synthetics, CPU, RAM, Disk, Load, Network, and Live Logs).
  - **Prometheus (Metrics Remote Write)**: `https://prometheus-prod-55-prod-gb-south-1.grafana.net/api/prom/push` (User: `3706313`).
  - **Loki (Logs Ingestion)**: `https://logs-prod-035.grafana.net/loki/api/v1/push` (User: `1848821`).
  - **Tempo (Traces)**: `https://tempo-prod-25-prod-gb-south-1.grafana.net/tempo` (User: `1843122`).
  - **Alert Notification Contact Points (`azlabs-alerts`)**:
    - **Telegram**: `@AZLabs_Agent_bot` (Chat ID `7104596722`).
    - **Discord**: `#┌🛸┊area-51` (`AZ Labs Grafana Alerts` webhook).
  - **Active Production Alert Rules**:
    1. `azlabs-website-down`: Website Down (`probe_success == 0` for 3m).
    2. `azlabs-ssl-expiring`: SSL Certificate Expiring Soon (`< 14d` for 5m).
    3. `azlabs-disk-critical`: Server Disk Space Critical (`> 92%` for 5m).
    4. `azlabs-mem-cpu-pressure`: High Memory / CPU Pressure (`> 90%` for 5m).
  - **Local CLI Tooling**:
    - `az-grafana` (symlinked as `grafanactl`): Fast stack management, Alloy deployments (`deploy pal|aj|local`), direct Loki push (`push-log`), and `/morning` brief snapshot (`brief [--json]`).
    - `gcx` (v1.7.1): Grafana Labs official AI-agent CLI (`context: azlabs`, pre-configured datasources).
    - `24 gcx Agent Skills`: Installed in `~/.agents/skills/` for zero-MCP agentic debugging.
- **Better Stack Uptime**:
  - Public status page: [https://status.azlabs.ai](https://status.azlabs.ai) (`azlabs.betteruptime.com`, Team ID `t622266`, Page ID `268878`).
- **PostHog**: Product analytics and telemetry instrumentation (`POSTHOG_PERSONAL_API_KEY`).

---

## 4. Identity, Authentication & Security Guardrails

- **WorkOS**:
  - `WORKOS_API_KEY`: AuthKit user management and enterprise identity bridge.
  - **MANDATORY $0 FREE TIER GUARDRAIL**: AuthKit free tier up to 1,000,000 MAUs. Never provision billable add-ons: no $99/mo custom domains (use free `.authkit.app` or reverse proxy routes), no $125/mo SSO connections, no $125/mo Directory Sync, max 1,000 free Radar checks.
- **Clerk**: `CLERK_SECRET_KEY` (Alternative modern auth provider).
- **Sweet Cookie**: Local CLI tool extracting scoped authentication cookies from Aside Browser profile (`~/Library/Application Support/Aside/Default`) for zero-password CLI operations.
- **Bitwarden & macOS Keychain**: Master secrets and credential storage.

---

## 5. Databases, State & Storage Systems

- **Supabase**: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD` (Managed PostgreSQL cloud cluster).
- **Neon Postgres**: `NEON_API_KEY`, `NEON_DATABASE_URL` (Serverless Postgres with instant branching).
- **Self-Hosted MariaDB & PostgreSQL**: Running locally on Pal VPS for WooCommerce and internal applications.
- **Canonical SQLite Databases**:
  - `aubrey-budget`: Backed by SQLite and managed via `budgetctl`.
  - `wispr-flow`: Personal dictionary, learned phrases, and snippets (`~/Library/Application Support/Wispr Flow/`).
  - `twscrape`: X/Twitter account pool and cookie state.
- **Media & Backup Storage Tiering**:
  1. **Put.io** (`PUTIO_TOKEN`, `PUTIO_CLIENT_SECRET`): Priority 1 default target.
  2. **AJ Workstation**: Priority 2 target for permanent large media storage.
  3. **Seedr**: Priority 3 emergency fallback (strict 6.5 GB limit).

---

## 6. AI Model Providers & Inference APIs

- **Google Gemini**: `GEMINI_API_KEY` (Gemini 2.5 Pro, Flash, Live API, native Antigravity model).
- **OpenAI**: `OPENAI_API_KEY` (GPT-4o, GPT-5 / o-series reasoning models, Audio API).
- **Anthropic Claude**: Claude 3.5 Sonnet / Haiku / Opus (via Claude Code and desktop app).
- **OpenRouter**: `OPENROUTER_API_KEY`, `AIMI_OPENROUTER_API_KEY` (Universal routing proxy).
- **OpenCode Go / Zen**: `OPENCODE_API_KEY`, `OPENCODE_GO_API_KEY` (Low-latency coding endpoints).
- **Mistral AI**: `MISTRAL_API_KEY` (Codestral, Mistral Large).
- **DeepSeek**: `DEEPSEEK_API_KEY` (DeepSeek V3, R1 reasoning).
- **NVIDIA NIM**: `NVIDIA_API_KEY` (Cloud-hosted open weights).
- **Black Forest Labs (BFL)**: `BFL_API_KEY` (FLUX.1 Schnell, FLUX.2 Dev).
- **Hugging Face**: `HF_TOKEN`.

---

## 7. Voice, Audio & Speech Processing

- **Fish Audio / Fish TTS**: `FISHTTS_API_KEY` (Default primary engine for speech generation, voiceovers, and news reading; free tier).
- **ElevenLabs**: `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` (Voice cloning, sound effects, voice isolation, and Scribe STT).
- **Wispr Flow**: Primary voice dictation and snippet expansion tool on Katara (reopened immediately with `open "/Applications/Wispr Flow.app"` after edits).

---

## 8. Web Scraping, Search & Discovery APIs

- **Firecrawl**: `FIRECRAWL_API_KEY` (Autonomous web navigation, page scraping, and markdown parsing).
- **Exa**: `EXA_API_KEY` (Neural semantic search).
- **Tavily**: `TAVILY_API_KEY` (Agent-optimized search).
- **Brave Search**: `BRAVE_API_KEY` (Real-time web and Reddit search).
- **News API**: `NEWS_API_KEY` (Global and South African news feeds).
- **Aside Browser**: Headed browser environment for interactive consent, cookies, and LinkedIn.

---

## 9. Communication, Messaging & Email

- **Telegram**: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (`@AZLabs_Agent_bot` alerts, status notifications, and command relay).
- **Discord**: `DISCORD_BOT_TOKEN` (AZ Labs community server, product channels, `#area-51` observability feeds).
- **WhatsApp**: Multi-account routing via `wacli` (personal `wa-personal` and agent/business `wa-agent`).
- **Sendblue**: Shared US iMessage and SMS delivery.
- **Twilio**: `TWILIO_API_KEY_SID`, `TWILIO_AUTH_TOKEN` (Programmable SMS and voice fallback).
- **Resend**: `RESEND_API_KEY` (Transactional application emails).
- **AgentMail**: `AGENTMAIL_API_KEY` (Autonomous AI agent email inboxes).
- **Google Workspace (`gws`)**: Multi-account entrypoint (`aubrey@azlabs.ai`, Vibe Code, GPT Code Shop, HashTag3D, personal).

---

## 10. Geography, Logistics & Industry APIs

- **Location & Mapping**: Google Maps (`GOOGLE_MAPS_API_KEY`), Geoapify (`GEOAPIFY_API_KEY`), LocationIQ (`LOCATIONIQ_API_KEY`), TomTom (`TOMTOM_API_KEY`), Overture Maps.
- **Job Aggregators**: Adzuna (`ADZUNA_API_KEY`), Careerjet (`CAREERJET_API_KEY`), Jooble (`JOOBLE_API_KEY`).
- **Logistics & Retail**: AfterShip (`AFTERSHIP_API_KEY`), RapidAPI (South African grocery pricing scrapers: Pick n Pay, Checkers, Woolworths, Makro).

---

## 11. Developer Platform & Design Tooling

- **GitHub Multi-Account Setup**:
  - `AZLabsAI` (`github-azlabs` / `~/.ssh/id_ed25519`): Org repositories.
  - `TH33ORACL3` (`github-th33oracl3` / `~/.ssh/id_ed25519_th33oracl3`): Personal repositories.
  - `VibeC0de` (`github-vibecode` / `~/.ssh/id_ed25519_vibecode`): Vibe Code repositories.
  - Switch active account via `gh auth switch --hostname github.com --user <account>`.
- **Figma**: `FIGMA_ACCESS_TOKEN` (UI/UX design files).
- **Linear**: `FEEDBACK_LINEAR_KEY` (Issue and project tracking).
- **Daytona & Factory AI**: `DAYTONA_API_KEY`, `FACTORY_API_KEY` (Cloud developer environments & agents).

---

## 12. Permanent Safety Guards & Policies

- **Pal VPS Rogue Process Watchdog**: `/usr/local/bin/pal-process-guard.sh` + `pal-process-guard.timer` terminates full-disk recursive searches running > 90s or > 40% CPU.
- **Pal VPS Search Guard**: `/etc/profile.d/safe-search-guard.sh` throttles recursive root searches to `nice -n 15` and hard `timeout 45s`.
- **Strict No MCP Policy (`mcp-off`)**: Aubrey uses skills and one-shot CLIs exclusively (`~/bin/mcp-off` guard enforces zero running MCP daemon processes).
- **Zero-Spend WorkOS & Cloud Limits**: Free tiers strictly locked to $0.00 with zero billable add-ons.