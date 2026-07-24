# Requirements: operations-intelligence (new), built our own way into Enterprise Solutions

Plain English requirements for the new operations-intelligence web application. The reference is
the existing operations-intelligence Service Portal that lives inside the Operations Workspace on
the everestdev instance. We replicate its purpose, its layout, and its visual feel, and then we
improve it with our own house style, our own backend, and our own model driven Assistant.

Source of truth for the visuals: the live operations-intelligence stylesheet was captured directly
from that portal and is the file `src/ei-portal-hardened/src/base.css` in this repository (it is the
real portal stylesheet, rebranded from the `oi-` prefix to `ei-`). Where a detail needs a fresh look
at the live portal, it is called out as "confirm on everestdev".

The new application is built INTO the Enterprise Solutions scoped application (scope `x_solutions`).
It is built by a real user going through the Service Catalog of the Enterprise Intelligence portal,
using the New Solution Development catalog item and its guided interaction. It is never hand built.

## 1. Purpose

Operations intelligence gives an operations team one place to see their work, start requests through
a service catalog, and get guided help from an Assistant that understands the instance. The new
version keeps that purpose and adds a real on device Assistant model, a hardened front end, an own
authorization wall, and a dedicated bridge to the Enterprise Assistant Model.

## 2. Visual appearance (our way, matching the reference)

The look must match the reference portal and our house style at the same time, because our house
style was taken from that portal.

- Palette: brand green `#00BF6F`, dark green `#00895E`, page background `#F0F2F5`, surface white
  `#FFFFFF`, ink `#121212`, muted `#6E6E6E`, hairline `#DCDCDC`.
- Header: a dark slate full width bar (`#293E40`), with the application name on the left and a small
  help question mark on the right. No notification bell, no user initials in the header.
- Sidebar: a dark slate vertical rail on the left, with the brand mark, the navigation items, and a
  user card pinned at the bottom. No "Open Service Portal" link and no "My Requests" link.
- Content: a white card area that holds the active section.
- Assistant: a full height chat rail on the right, about thirty percent of the width, with a dark
  header, a welcome, green and grey chat bubbles, and an "Ask anything" input.
- Everything sizes in viewport units so the whole application fits one screen with no page scroll,
  and the underlying ServiceNow navbar and footer are hidden.

## 3. Layout

The reference is the operations three column shell: sidebar navigation on the left, a header across
the top, the active content in the center, and a per section Assistant chat on the right. The new
application uses this same Operations shell, chosen in the catalog during the build.

## 4. Navigation and sections

The reference portal groups the operations team's work into a small set of sections reachable from
the sidebar. Our replication uses these sections (confirm the exact set and labels on everestdev):

- Workspace: the operations landing area, whose content is the Service Catalog of this application.
- Solutions: the operations solutions or services this team runs.
- Models: a plain view of the models that answer behind the Assistant.
- Governance: authorization and the audit of every action taken in the application.

Each section keeps the Assistant rail on the right, and only the Assistant tagline changes per
section. Labels are Title Case, full words, and never use a dash.

## 5. Service Catalog

The Workspace section shows a Service Catalog rendered as the live accordion: a coloured category
bar, the category name, a short one line description, a count, and a chevron that expands to the
item rows. Each item row has a name, a one line description that fits on a single line, and a Start
button.

For the new operations-intelligence application, the catalog and its items are defined during the
build by the user and the Assistant together, and are wired to this application's own bridge.

## 6. The Assistant and the closed loop

The Assistant is the only voice the user talks to. Selecting a catalog item opens a closed loop
guided interaction inside the Assistant rail: a block of guidance text and a set of route options.
Choosing an option replaces the current text and options with the next set. A Back route steps
toward the item's main menu, and at the top it leaves the interaction and returns to the catalog.

Free chat generates on device by default, using the Enterprise Assistant Model, which reasons
privately and shows only its reply. Behind the scenes the Assistant consults the other three models
as needed, and none of them ever addresses the user.

## 7. Backend, under system context

The application's backend is a set of code as data Script Includes, and every privileged action runs
server side under system context, gated by the own authorization wall. There is no separate REST
API. The front end talks to the backend only through the Service Portal server bridge of this
application. System properties are kept near zero.

## 8. The Model Bridge

The application has one dedicated bridge to the Enterprise Assistant Model that lives in the
Enterprise Intelligence scoped application. The bridge exposes only the capabilities in scope for
this application, under least privilege. Through the bridge, anything the application's own catalog
should do, and any ServiceNow instance subject the user raises, is delegated to the Enterprise
Assistant Model, which collaborates with the other three models as necessary and answers in one
voice. The own authorization wall authenticates, authorizes, validates inputs, mediates privileged
writes in system context, and audits every bridge call.

## 9. Security and delivery

- Hardened house style front end: DOM takeover so only our application renders, anti tamper that
  reverts edits to our root and style, no window globals, storage neutered, console silenced,
  eval trapped, bundle obfuscated. This raises the bar in the browser; the real guarantee is the
  server side authorization wall.
- Application package delivery, never update sets.
- No AI vendor or model product names anywhere in the artifacts.

## 10. How it gets built (the proof)

A real user opens the Enterprise Intelligence portal, opens the Service Catalog, and runs New
Solution Development. Through the guided interaction the user sets the purpose, picks the Operations
shell from live layout previews, defines the sections and their content, sets access control, and
then builds. The build creates this application into Enterprise Solutions with its house style front
end, its Script Include backend, and its dedicated Model Bridge. If any step of the interaction is
not capable enough to do this, the interaction is enhanced until it is. The same catalog then
maintains the application (Existing Solution Maintenance) and its bridge (Module Bridge Maintenance).

When the new application matches and exceeds the old operations-intelligence portal, the old portal
is retired.
