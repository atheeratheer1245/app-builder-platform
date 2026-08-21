# Cloud Build Provider Decision

## Selected Candidate: Codemagic

Codemagic is the selected candidate for the professional cloud-build path because its official REST API can start a configured build with an application ID, workflow ID, and branch; it returns a build ID for status tracking. The service supports native Android and iOS workflows, and its artifact endpoint can issue an expiring download URL after a build completes. The App Builder backend will retain the provider token server-side, record only the build ID and safe artifact metadata, and expose downloads only to the project owner.

| Requirement | Codemagic capability | App Builder implementation |
|---|---|---|
| Trigger Android build | `POST /builds` with app, workflow, and branch | Protected export procedure queues and triggers the configured Android workflow |
| Trigger iOS build | Same workflow mechanism on a macOS build machine | Protected IPA route is enabled only after Apple signing is configured in the provider |
| Track work | Provider build ID | Persisted in export-job metadata and mapped to safe UI statuses |
| Receive artifacts | Authenticated artifact URL, with optional expiring public URL | Server downloads/verifies artifact then stores it in project-owned storage |
| Protect credentials | `x-auth-token` header | Server environment variable only; never exposed to browser code |

## Required owner setup before live activation

The owner must create a Codemagic team/project connected to the App Builder source repository, create release workflows for Android and iOS, configure Android signing and Apple Developer code-signing assets in the provider, and provide the API token plus the app/workflow identifiers through secure project settings. The production IPA workflow cannot create a distributable iOS file without Apple Developer credentials and signing assets.

## References

1. [Codemagic Builds API](https://docs.codemagic.io/rest-api/builds/)
2. [Codemagic REST API overview](https://docs.codemagic.io/rest-api/codemagic-rest-api/)
3. [Codemagic Applications API](https://docs.codemagic.io/rest-api/applications/)
4. [Codemagic Artifacts API](https://docs.codemagic.io/rest-api/artifacts/)
