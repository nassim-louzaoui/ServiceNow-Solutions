# Operations Intelligence house style (the visual + build standard every portal must match)
Palette: brand green #00BF6F, dark green #00895E, page bg #F0F2F5, surface #FFFFFF, ink #121212,
muted #6E6E6E, line #DCDCDC, danger #D9534F. Fonts Source Sans Pro / Segoe UI.
Shell: 3 columns — left dark-green Sidebar (brand + role-filtered nav + Open Service Portal + user card),
top Header (breadcrumb + notifications + avatar), center Content (the active section), right per-section
Assistant chat ("Ask anything..."). Underlying Service Portal navbar+footer HIDDEN (theme navbar/footer
height 0). Widget template is a single <div id="root"></div>; ALL UI is an embedded React bundle mounted
into it; AngularJS controller is a thin bootstrap that hands a data-bridge to React and does nothing else.
Rules: embedded-React package; AngularJS strictly minimal/locked-down; DOM cleanup so only our app head/body
render; VH/VW units only; ES5 for all server Script Includes; code-as-data in big Script Includes, system
properties near-zero; Title Case full-word labels; no AI-vendor references anywhere; application-package delivery.
Closed loop: catalog category -> item -> sub-interaction; selecting one drives the Assistant into a grounded
guided conversation (knowledge search returns real KB cards, record explain, user-attributed actions).
