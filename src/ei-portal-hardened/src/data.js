// Navigation and per-section Assistant configuration. The Assistant rail is present in every
// section; only its tagline changes. The first section is the Workspace, whose content is the
// Service Catalog of Enterprise Solutions.
export const NAV_ITEMS = [
  { id: 'workspace',  label: 'Workspace',  icon: 'ops_workspace'   },
  { id: 'solutions',  label: 'Solutions',  icon: 'insights'        },
  { id: 'models',     label: 'Models',     icon: 'agentic'         },
  { id: 'governance', label: 'Governance', icon: 'governance_icon' },
];

export const ASSISTANT_CONFIGS = {
  workspace:  { name: 'Enterprise Assistant', tagline: 'Intelligent routing across every capability' },
  solutions:  { name: 'Enterprise Assistant', tagline: 'Your deployed solutions' },
  models:     { name: 'Enterprise Assistant', tagline: 'The models behind every answer' },
  governance: { name: 'Enterprise Assistant', tagline: 'Authorization and the audit of every action' },
};

// The Service Catalog. One category, three closed loop items. Rendered in the live accordion
// visual: coloured category bar, name, description, per item count, expand to the item rows.
export const CATALOG = [
  {
    id: 'enterprise_solutions',
    label: 'Enterprise Solutions',
    color: '#00BF6F',
    desc: 'Develop and maintain scoped web applications.',
    items: [
      { id: 'new_solution_development', name: 'New Solution Development',
        desc: 'Design and build a new web application.' },
      { id: 'existing_solution_maintenance', name: 'Existing Solution Maintenance',
        desc: 'Adjust an application already in production.' },
      { id: 'module_bridge_maintenance', name: 'Module Bridge Maintenance',
        desc: 'Inspect and tune an application bridge under least privilege.' },
    ],
  },
];

// Spec-driven helpers: map a module content type to a house-style icon, and slugify a module name.
export function iconForContent(content) {
  switch (content) {
    case 'Service Catalog': return 'ops_workspace';
    case 'Dashboard': return 'insights';
    case 'Insights report': return 'insights';
    case 'Record workspace': return 'inbox';
    case 'Knowledge base': return 'document';
    case 'Assistant panel': return 'assistant';
    default: return 'studio_icon';
  }
}
export function slugifyName(s) { return ('' + (s || '')).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
export function brandInitials(title) {
  var p = ('' + (title || 'App')).trim().split(/\s+/);
  return ((p.length >= 2 ? (p[0].charAt(0) + p[1].charAt(0)) : (p[0] || 'A').slice(0, 2)) || 'A').toUpperCase();
}
