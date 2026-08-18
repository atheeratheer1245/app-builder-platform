# Cloud Build Integration Contract

## Current state

The platform already records an export request, calculates its price, creates a Tap hosted payment, verifies the provider result through a signed webhook, and moves a paid export request to **`queued`**. No cloud build provider is connected yet, so no external build is created and no paid subscription or charge is initiated by this code.

> The build connector is intentionally deferred until the owner chooses a provider and supplies the related credentials and signing assets.

## Required lifecycle

| Stage | Platform action | Cloud provider action |
|---|---|---|
| Export request | Creates an `exportJobs` record in `pending_payment` | None |
| Payment completion | Tap webhook verifies the charge and changes the job to `queued` | None |
| Build submission | An adapter serializes the project into a source archive and calls `CloudBuildProvider.createBuild` | Returns a provider build ID |
| Build progress | Callback updates the job to `queued` or `building` | Sends signed callbacks |
| Completion | Callback stores the artifact URL/key and sets `ready`, or stores a reason and sets `failed` | Produces APK, AAB, or IPA |

## Provider-neutral request

The implementation contract is defined in [`shared/cloudBuild.ts`](../shared/cloudBuild.ts). Every connector receives:

| Field | Purpose |
|---|---|
| `exportJobId` and `projectId` | Idempotent linkage between platform and provider build |
| `format` | One of `apk`, `aab`, or `ipa` |
| `appName`, `packageName`, `versionName`, `language` | App metadata |
| `sourceArchiveUrl` | Time-limited URL to the generated app source bundle |
| `callbackUrl` | TLS endpoint for signed build-status callbacks |

The source archive and final artifact must reside in object storage. The database retains only metadata, URLs/keys, status, and failure reasons.

## Activation checklist

1. Select a cloud build provider that supports **Flutter/Android APK and AAB** and a **macOS/Xcode iOS IPA** worker.
2. Create a provider account and add its API key through the project secret manager; never expose it to the browser.
3. Create Android signing material: upload a protected keystore and retain its alias/password only as secrets.
4. Create or connect an Apple Developer account, App ID, distribution certificate, provisioning profile, and signing key for IPA generation.
5. Register a public HTTPS callback URL in the provider dashboard, restrict callbacks with a provider signature, and test a failed and a successful callback.
6. Implement the chosen `CloudBuildProvider` adapter, source archive generator, and signed provider callback route using the contract above.
7. Store returned build artifacts in object storage, update `exportJobs`, and expose download links only to the export owner.
8. Run a real low-cost test build for each selected platform before enabling customer-facing exports.

## Security requirements

- Verify every provider callback before changing `exportJobs`.
- Match the provider build ID, export job ID, requested format, and owner before accepting an artifact.
- Do not transfer Apple certificates, keystores, API keys, or provider tokens to the frontend.
- Use expiring storage URLs for source bundles and download artifacts.
- Treat duplicate callbacks as idempotent.
- Do not mark an export ready until the provider reports success and the artifact reference is stored.

## Platform constraints

IPA generation requires macOS/Xcode and an Apple Developer signing identity. A Linux-only build worker can support APK/AAB but cannot replace the Apple signing environment for IPA. The selected cloud provider should therefore provide both Android and macOS builders if the same product must export all three formats.

## External references

- [Tap Charges API](https://developers.tap.company/reference/charges): hosted charge fields, redirect URL, and final charge statuses.
- [Tap Webhook guide](https://developers.tap.company/docs/webhooks): POST URL behavior, retries, and `hashstring` validation inputs.
- [Google OAuth web-server flow](https://developers.google.com/identity/protocols/oauth2/web-server): state protection, authorization-code exchange, and exact redirect URI requirements.
