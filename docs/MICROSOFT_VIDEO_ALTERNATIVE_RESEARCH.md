# Microsoft video-generation alternative research

## Findings

Microsoft Copilot provides a **user-interface workflow** for creating short videos in the Microsoft Copilot app. Microsoft documents prerequisites such as enabling Clipchamp for the organization, but this documentation does not describe a public image-to-video API for third-party application backends.

Microsoft 365 Copilot APIs focus on enterprise retrieval, search, interaction export, meeting insights, and chat. The official overview states that the Chat API returns textual responses and does not identify an image-to-video generation endpoint.

For a Microsoft-hosted API alternative, Azure AI Foundry documents **Sora 2** as available through an API and supporting generation from text, images, and video. This is an Azure integration distinct from Microsoft Copilot and requires Azure account, deployment, credentials, and usage billing.

## Sources

- Microsoft Support, [Create a video with the Microsoft Copilot app](https://support.microsoft.com/en-us/microsoft-365-copilot/create-a-video-with-the-microsoft-365-copilot-app)
- Microsoft Learn, [Microsoft 365 Copilot APIs overview](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/copilot-apis-overview)
- Microsoft Azure Blog, [Sora 2 now available in Azure AI Foundry](https://azure.microsoft.com/en-us/blog/sora-2-now-available-in-azure-ai-foundry/)

## Azure Sora 2 integration notes

Sora 2 supports image-to-video generation through the Azure OpenAI v1 video-generation API. The image flow creates a multipart job, polls until completion, then downloads generated video content. Azure documents that a Sora 2 deployment requires an Azure subscription, an Azure OpenAI resource in a supported region, and a deployed Sora 2 model. The current Foundry project has no deployments, so the existing project name cannot be used as a Sora 2 deployment name.

The official region-availability table lists `sora-2` under Global Standard for `eastus2`; however, availability still depends on subscription eligibility and capacity. Foundry Models sold by Azure are billed through the user's Azure subscription. Creating a replacement resource or enabling a video deployment can therefore create usage charges.

Additional sources:

- Microsoft Learn, [Video generation with Sora 2](https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/video-generation)
- Microsoft Learn, [Region availability for Foundry Models sold by Azure](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure-region-availability)

## OpenAI Sora API alternative

OpenAI exposes an official `POST /v1/videos` API for `sora-2` and `sora-2-pro`. The service accepts a prompt plus an optional image reference, returns an asynchronous job, exposes job polling at `GET /v1/videos/{id}`, and returns MP4 bytes at `GET /v1/videos/{id}/content`. Image references must be JPEG, PNG, or WebP and match the requested output orientation and resolution. The API documentation also notes that real-person faces and other restricted image inputs can be rejected. The integration should therefore keep image validation and use server-side polling before persisting a completed asset.

Additional sources:

- OpenAI, [Video generation with Sora](https://developers.openai.com/api/docs/guides/video-generation)
- OpenAI, [Create video API reference](https://developers.openai.com/api/reference/resources/videos/methods/create/)

## PhotoGPT API alternative

PhotoGPT publishes a developer API at `https://developer.photogptai.com/api` authenticated with a bearer API key and `API-Version: 1`. Its documented image-to-video flow submits `POST /videos/generation` with a public `modelID`, prompt, and `referenceImages` URL entries such as `first_frame`. The server receives a job ID, polls `GET /jobs/{id}` until the status becomes `success` or `failed`, then reads the generated video record. PhotoGPT also documents a two-step video download preparation flow. A server integration can use the selected project's already-owned image URL as the first frame, persist the final MP4 in project storage, and classify provider errors without exposing the API key.

Additional sources:

- PhotoGPT Developers, [Getting started](https://platform.photogptai.com/docs/getting-started)
- PhotoGPT Developers, [Video generation](https://platform.photogptai.com/docs/video-generation)
- PhotoGPT Developers, [Generation jobs](https://platform.photogptai.com/docs/jobs)

## PixVerse API alternative

PixVerse publishes an image-to-video API at `https://app-api.pixverse.ai/openapi/v2`. A server integration first uploads an owned JPEG, PNG, or WebP image to `/image/upload` with a unique `Ai-trace-id`, receives an `img_id`, creates an image-to-video task at `/video/img/generate`, then polls `/video/result/{video_id}`. PixVerse reports status `1` for completion, `5` while generating, `7` for moderation failure, and `8` for generation failure. Every request requires an `API-KEY` and a new UUID-like trace identifier.

The documented flow accepts v4.5/v6 image-to-video requests and returns a video URL after completion. The server can download that output into project storage, preserving the selected image's existing project-ownership checks. An API key and available PixVerse credits are required for a live verification.

Additional sources:

- PixVerse Platform Docs, [Quick start](https://docs.platform.pixverse.ai/quick-start-796052m0)
- PixVerse Platform Docs, [Image-to-video](https://docs.platform.pixverse.ai/image-to-video-882971m0)
- PixVerse Platform Docs, [How the API works](https://docs.platform.pixverse.ai/how-does-the-api-work-882967m0)
