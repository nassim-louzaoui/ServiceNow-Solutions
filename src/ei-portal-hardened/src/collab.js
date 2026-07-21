// Four model collaboration, single voice.
//
// The Enterprise Assistant is the only model that ever speaks to the user. Behind the scenes it
// consults the three specialists through its own system channel, so their domain grounding shapes
// the answer while none of them ever addresses the user directly.
//
//   Flagship Enterprise Intelligence   strategy, whole solution architecture, trade offs
//   Integration Intelligence           cross system connections, bridges, data flow, entitlements
//   Technology Intelligence            the platform itself, scoped apps, catalog, access control
//
// A lightweight router scores the query against each specialist lexicon, selects the ones that are
// relevant, and folds their grounding into one system primer. The Assistant then answers as itself.
// The system primer is intentionally short so on device generation stays responsive.

var SPECIALISTS = [
  {
    id: 'flagship',
    name: 'Flagship Enterprise Intelligence',
    lex: ['strategy', 'architecture', 'design', 'plan', 'roadmap', 'trade', 'scale', 'model', 'approach', 'overall', 'whole', 'decision', 'why', 'recommend', 'best'],
    grounding: 'Ground the answer in sound whole solution architecture and clear trade offs.'
  },
  {
    id: 'integration',
    name: 'Integration Intelligence',
    lex: ['integrate', 'integration', 'connect', 'connection', 'bridge', 'flow', 'data', 'sync', 'api', 'entitlement', 'least privilege', 'external', 'system', 'transform', 'field', 'map'],
    grounding: 'Ground the answer in safe cross system connections under least privilege.'
  },
  {
    id: 'technology',
    name: 'Technology Intelligence',
    lex: ['acl', 'access', 'role', 'scoped', 'scope', 'catalog', 'record', 'table', 'script', 'widget', 'portal', 'flow', 'business rule', 'ui', 'form', 'field', 'glide', 'platform', 'create', 'build'],
    grounding: 'Ground the answer in correct platform practice for scoped applications and access control.'
  }
];

// Per section framing for the Assistant. Keeps the voice consistent across the portal.
var SECTION_FRAME = {
  workspace:  'The user is in the Workspace and its Service Catalog.',
  solutions:  'The user is reviewing deployed solutions.',
  models:     'The user is asking about the models behind the answers.',
  governance: 'The user is asking about authorization and the audit of actions.'
};

function score(query, lex) {
  var t = (' ' + query.toLowerCase() + ' '), n = 0, i;
  for (i = 0; i < lex.length; i++) { if (t.indexOf(lex[i]) > -1) n++; }
  return n;
}

// Decide which specialists to consult for this query. Always keep at least one so the Assistant is
// never ungrounded; the Flagship is the default consultant when nothing else matches.
export function route(query) {
  var scored = SPECIALISTS.map(function (s) { return { s: s, n: score(query, s.lex) }; });
  var hit = scored.filter(function (x) { return x.n > 0; });
  if (hit.length === 0) hit = [{ s: SPECIALISTS[0], n: 1 }];
  hit.sort(function (a, b) { return b.n - a.n; });
  return hit.slice(0, 2).map(function (x) { return x.s; });
}

// Build the system primer the Assistant conditions on. Names of the consulted specialists appear
// only inside this hidden channel, never in the reply. Each line is a sentence and uses no hyphen.
export function buildSystem(query, sectionId) {
  var consultants = route(query);
  var frame = SECTION_FRAME[sectionId] || SECTION_FRAME.workspace;
  var names = consultants.map(function (c) { return c.name; });
  var lines = [
    'You are the Enterprise Assistant.',
    'You answer with one clear voice.',
    frame,
    'You quietly consult ' + names.join(' and ') + ' before you answer.'
  ];
  consultants.forEach(function (c) { lines.push(c.grounding); });
  lines.push('Answer the user in a few short sentences.');
  return { system: lines.join('\n'), consulted: names };
}

export var COLLAB_SPECIALISTS = SPECIALISTS;
