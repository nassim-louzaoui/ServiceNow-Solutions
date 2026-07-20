# Integration Intelligence Model — purpose + collaboration

## Purpose
The Integration Intelligence Model handles integration with **external infrastructure via API**, so
a web application can **extract and showcase data from external systems** inside the app. Target
platforms (extensible):
- **Flexera** (ITAM / SAM / spend)
- **Microsoft** — M365, Microsoft Graph, Entra ID / Azure AD, Intune
- **SolarWinds** (monitoring / network)
- **Amazon AWS** (accounts, resources, Cost Explorer, CloudWatch, etc.)
- **Microsoft Azure** (ARM resources, Azure Monitor, cost management)

It knows, per platform: the **auth pattern** (OAuth2 client-credentials / service principals /
IAM roles / API keys), the **key endpoints + data models**, pagination, rate limits, and — crucially
— **how to integrate from ServiceNow**: outbound REST, Scripted REST, IntegrationHub spokes,
connection & credential aliases, MID Server for on-prem sources (e.g. SolarWinds), and secure
credential storage.

## Collaboration flow (with Technology Intelligence)
Only when a web app genuinely needs external data:
1. **Technology Intelligence** builds the web-app backend integration point (only if necessary),
   in the app's dedicated bridge scope.
2. It **collaborates with Integration Intelligence** for the external-API specifics (auth, endpoints,
   query, shape of the returned data).
3. The **backend makes the external API calls in system context**, using the organisation's stored
   credentials for that platform, and extracts the data.
4. The extracted data is **showcased within the associated web application** — delivered to the
   embedded-React frontend through the app's bridge, rendered in the house style.

The Enterprise Assistant remains the single voice to the user throughout; Technology + Integration
Intelligence collaborate behind it.

## Corpus (must be trained on, before the GPU run)
- ServiceNow outbound-integration mechanisms (from the crawled ServiceNow docs).
- **Each external platform's API integration knowledge** — gathered from their own API docs
  (AWS, Azure ARM/Monitor/Cost, Microsoft Graph/M365, SolarWinds, Flexera): auth, endpoints, data
  models, pagination, extraction, and the mapping into a ServiceNow outbound integration.
- Worked examples: "show Flexera license position in a web app", "show AWS cost by account",
  "show SolarWinds node health", "show Azure resource inventory", "show M365 / Entra users".

## Runtime security (own-security model, system context)
- External credentials stored securely (ServiceNow credential store / encrypted), used **server-side
  only**, in system context, **scoped to the app's bridge** (least privilege per app).
- The client never sees credentials or raw external endpoints; it receives only the extracted,
  authorised data to render.
