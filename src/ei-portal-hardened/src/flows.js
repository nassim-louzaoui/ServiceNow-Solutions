// Closed-loop interactions for the Service Catalog items. Each flow is a tree of nodes; a node
// shows a block of guidance text and a set of route options. Choosing an option replaces the
// current text + options with the next node's. A Back route steps toward the item's main menu.
// Deterministic and self-contained (the guided scaffold); real build/apply actions are wired to
// the bridge on the terminal nodes. Every user-facing line is its own sentence and uses no hyphen.

export var FLOWS = {

  // ── New Solution Development ────────────────────────────────────────────────
  new_solution_development: {
    title: 'New Solution Development',
    root: 'start',
    nodes: {
      start: {
        text: 'New Solution Development builds a new web application into Enterprise Solutions.\nWhere would you like to begin?',
        options: [
          { label: 'Set the purpose', next: 'purpose' },
          { label: 'Choose a layout', next: 'layout' },
          { label: 'Set access control', next: 'access' },
          { label: 'Review and build', next: 'review' }
        ]
      },
      purpose: {
        text: 'Describe what the application does and who uses it.\nChoose the closest match to begin.',
        options: [
          { label: 'Operations and requests', next: 'purpose_ops' },
          { label: 'Insights and reporting', next: 'purpose_insight' },
          { label: 'A custom purpose', next: 'purpose_custom' }
        ]
      },
      purpose_ops: { text: 'An operations and requests application.\nIt centers on a service catalog and workspaces.', options: [{ label: 'Use this purpose', next: 'layout' }] },
      purpose_insight: { text: 'An insights and reporting application.\nIt centers on dashboards and metrics.', options: [{ label: 'Use this purpose', next: 'layout' }] },
      purpose_custom: { text: 'A custom purpose.\nThe Assistant gathers the details with you in conversation.', options: [{ label: 'Continue', next: 'layout' }] },
      layout: {
        text: 'Select a shell layout for the application.\nEach one is the real hardened house style.',
        options: [
          { label: 'Operations shell', next: 'layout_ops' },
          { label: 'Focus shell', next: 'layout_focus' },
          { label: 'Dashboard grid shell', next: 'layout_dash' },
          { label: 'Split shell', next: 'layout_split' }
        ]
      },
      layout_ops: { text: 'Operations shell.\nSidebar navigation, a header, a content area, and a per section Assistant rail.\nThis is the operations intelligence layout.', options: [{ label: 'Choose this shell', next: 'modules' }] },
      layout_focus: { text: 'Focus shell.\nSidebar, header, and a single large content area.', options: [{ label: 'Choose this shell', next: 'modules' }] },
      layout_dash: { text: 'Dashboard grid shell.\nSidebar, header, and a symmetric grid of metrics and content.', options: [{ label: 'Choose this shell', next: 'modules' }] },
      layout_split: { text: 'Split shell.\nSidebar, header, and two balanced content panes.', options: [{ label: 'Choose this shell', next: 'modules' }] },
      modules: {
        text: 'Define the navigation modules.\nEach module has a name and a content area.',
        options: [
          { label: 'Use a standard set', next: 'modules_std' },
          { label: 'Define a module', next: 'modules_add' },
          { label: 'Continue', next: 'access' }
        ]
      },
      modules_std: { text: 'A standard set was proposed.\nWorkspace, Insights, and Administration.', options: [{ label: 'Use this set', next: 'access' }] },
      modules_add: { text: 'Name the module and describe its content area.\nThe Assistant designs it with the models.', options: [{ label: 'Done adding modules', next: 'access' }] },
      access: {
        text: 'Does the application need access control?',
        options: [
          { label: 'Yes, add access management', next: 'access_yes' },
          { label: 'No, open to all users', next: 'review' }
        ]
      },
      access_yes: { text: 'An Access Management Module will be generated.\nIt is visible to Administrator, Developer, Management, and Owner.', options: [{ label: 'Continue', next: 'review' }] },
      review: {
        text: 'Review the plan and build the application into Enterprise Solutions.',
        options: [
          { label: 'Review the summary', next: 'review_sum' },
          { label: 'Build now', next: 'build', action: 'build' }
        ]
      },
      review_sum: { text: 'The application will be built with the chosen layout, its modules, its access model, and its own bridge.', options: [{ label: 'Build now', next: 'build', action: 'build' }] },
      build: { text: 'The Assistant is building the application into Enterprise Solutions now.\nThe result appears here when it is ready.', terminal: true, options: [{ label: 'Back to the menu', next: 'start' }] }
    }
  },

  // ── Existing Solution Maintenance ───────────────────────────────────────────
  existing_solution_maintenance: {
    title: 'Existing Solution Maintenance',
    root: 'start',
    nodes: {
      start: {
        text: 'Existing Solution Maintenance changes an application already in production.\nChoose an application to work on.',
        options: [
          { label: 'Pick an application', next: 'pick' },
          { label: 'Learn how it works', next: 'about' }
        ]
      },
      about: { text: 'You choose an application, it is pinned as context, then you define changes to its modules, content, data, or layout.\nEach change is shown as a skeleton diff and applied on approval.', options: [{ label: 'Pick an application', next: 'pick' }] },
      pick: { text: 'Select an application from Enterprise Solutions.', load: 'list_solutions', pickNext: 'pick_app', emptyNext: 'pick_none' },
      pick_none: { text: 'No applications are deployed yet.\nBuild one first with New Solution Development.', options: [{ label: 'Back to the menu', next: 'start' }] },
      pick_app: {
        text: '{app} is pinned as context.\nWhat change would you like to make?',
        options: [
          { label: 'Add a module', next: 'change_add' },
          { label: 'Edit a content area', next: 'change_edit' },
          { label: 'Change the layout', next: 'change_layout' }
        ]
      },
      change_add: { text: 'Name the new module and describe its content area.\nThe Assistant shows a skeleton diff.', options: [{ label: 'Apply the change', next: 'applied', action: 'apply' }] },
      change_edit: { text: 'Choose the content area and describe the edit.\nThe Assistant shows a skeleton diff.', options: [{ label: 'Apply the change', next: 'applied', action: 'apply' }] },
      change_layout: { text: 'Choose the new layout within the house style.\nThe Assistant shows the shell change.', options: [{ label: 'Apply the change', next: 'applied', action: 'apply' }] },
      applied: { text: 'The change has been applied and the application repackaged.', terminal: true, options: [{ label: 'Make another change', next: 'pick_app' }, { label: 'Back to the menu', next: 'start' }] }
    }
  },

  // ── Module Bridge Maintenance ───────────────────────────────────────────────
  module_bridge_maintenance: {
    title: 'Module Bridge Maintenance',
    root: 'start',
    nodes: {
      start: {
        text: 'Module Bridge Maintenance inspects and tunes an application bridge.\nChoose an application.',
        options: [
          { label: 'Pick an application', next: 'pick' },
          { label: 'Learn about bridges', next: 'about' }
        ]
      },
      about: { text: 'Every application has a dedicated bridge.\nIt exposes only the capabilities in scope for that application, under least privilege.', options: [{ label: 'Pick an application', next: 'pick' }] },
      pick: { text: 'Select an application.', load: 'list_solutions', pickNext: 'bridge', emptyNext: 'pick_none' },
      pick_none: { text: 'No applications are deployed yet.\nBuild one first with New Solution Development.', options: [{ label: 'Back to the menu', next: 'start' }] },
      bridge: {
        text: 'This is the {app} bridge.\nWhat would you like to do?',
        load: 'describe_bridge',
        options: [
          { label: 'Review capabilities', next: 'brg_review' },
          { label: 'Grant a capability', next: 'brg_grant' },
          { label: 'Revoke a capability', next: 'brg_revoke' }
        ]
      },
      brg_review: { text: 'The bridge exposes read, query, and describe on its own tables, its data bridge methods, and its reach to the Enterprise Assistant Model.\nEvery call is authorized and audited.', options: [{ label: 'Back to the bridge', next: 'bridge' }] },
      brg_grant: { text: 'Choose the capability to grant.\nLeast privilege is enforced by the own security engine.', options: [{ label: 'Apply the change', next: 'brg_applied', action: 'apply' }] },
      brg_revoke: { text: 'Choose the capability to revoke.\nThe change is audited before it takes effect.', options: [{ label: 'Apply the change', next: 'brg_applied', action: 'apply' }] },
      brg_applied: { text: 'The bridge has been updated and repackaged.', terminal: true, options: [{ label: 'Back to the bridge', next: 'bridge' }, { label: 'Back to the menu', next: 'start' }] }
    }
  }
};
