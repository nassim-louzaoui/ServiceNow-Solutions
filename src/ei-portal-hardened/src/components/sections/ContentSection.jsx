import React from 'react';
import OIIcon from '../../icons.jsx';
import CatalogSection from './CatalogSection.jsx';

// Renders a module's content area by its chosen content type, in the hardened house style. This is
// what makes a built application reflect the modules the user defined in the wizard, rather than the
// factory's own shell. Each content type is a real, presentational house-style panel.

function Panel(props) {
  return (
    <div className="ei-section">
      <div className="ei-cs">
        <div className="ei-cs-head">
          <div className="ei-cs-title">{props.title}</div>
          {props.sub ? <div className="ei-cs-sub">{props.sub}</div> : null}
        </div>
        {props.children}
      </div>
    </div>
  );
}

function Dashboard(props) {
  var cards = ['Open items', 'In progress', 'Resolved today', 'Awaiting input', 'Overdue', 'Reopened'];
  return (
    <Panel title={props.label} sub="A live view of the numbers that matter to this team.">
      <div className="ei-cs-grid">
        {cards.map(function (c, i) {
          return (
            <div key={i} className="ei-cs-card">
              <div className="ei-cs-metric">{['24', '11', '38', '6', '3', '2'][i]}</div>
              <div className="ei-cs-metric-label">{c}</div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function Insights(props) {
  return (
    <Panel title={props.label} sub="Trends and analysis over time.">
      <div className="ei-cs-charts">
        <div className="ei-cs-chart"><div className="ei-cs-bars"><i style={{ height: '40%' }} /><i style={{ height: '65%' }} /><i style={{ height: '52%' }} /><i style={{ height: '80%' }} /><i style={{ height: '70%' }} /><i style={{ height: '90%' }} /></div><div className="ei-cs-chart-label">Volume by week</div></div>
        <div className="ei-cs-chart"><div className="ei-cs-bars"><i style={{ height: '70%' }} /><i style={{ height: '55%' }} /><i style={{ height: '60%' }} /><i style={{ height: '45%' }} /><i style={{ height: '50%' }} /><i style={{ height: '35%' }} /></div><div className="ei-cs-chart-label">Time to resolve</div></div>
      </div>
    </Panel>
  );
}

function Records(props) {
  var rows = ['Review the incoming queue', 'Assign the priority requests', 'Confirm the change window', 'Close the resolved items', 'Follow up on blocked work'];
  return (
    <Panel title={props.label} sub="A worklist of records to act on.">
      <div className="ei-cs-table">
        <div className="ei-cs-tr ei-cs-th"><span>Item</span><span>State</span><span>Owner</span></div>
        {rows.map(function (r, i) {
          return (
            <div key={i} className="ei-cs-tr">
              <span>{r}</span>
              <span><em className={'ei-cs-pill ' + (i % 3 === 0 ? 'green' : i % 3 === 1 ? 'amber' : 'grey')}>{i % 3 === 0 ? 'Open' : i % 3 === 1 ? 'In progress' : 'Done'}</em></span>
              <span>{['A. Rivera', 'K. Osei', 'M. Lind', 'T. Cho', 'S. Patel'][i]}</span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function Knowledge(props) {
  var arts = ['Getting started in this workspace', 'How to raise a request', 'Escalation and on call', 'Service levels explained', 'Frequently asked questions'];
  return (
    <Panel title={props.label} sub="Searchable articles and guidance.">
      <div className="ei-cs-search"><OIIcon name="search" size={16} fill="#6E6E6E" /><span>Search the knowledge base</span></div>
      <div className="ei-cs-cards">
        {arts.map(function (a, i) {
          return (
            <div key={i} className="ei-cs-kb">
              <div className="ei-cs-kb-ic"><OIIcon name="document" size={16} fill="#00895E" /></div>
              <div className="ei-cs-kb-tt">{a}</div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function AssistantNote(props) {
  return (
    <Panel title={props.label} sub="A focused Assistant conversation.">
      <div className="ei-cs-note">Ask the Enterprise Assistant on the right for anything in this workspace.
      {'\n'}It answers with one voice and consults the specialist models behind the scenes.</div>
    </Panel>
  );
}

export default function ContentSection(props) {
  var content = props.content || '';
  var label = props.label || 'Workspace';
  switch (content) {
    case 'Service Catalog': return <CatalogSection data={props.data || {}} />;
    case 'Dashboard': return <Dashboard label={label} />;
    case 'Insights report': return <Insights label={label} />;
    case 'Record workspace': return <Records label={label} />;
    case 'Knowledge base': return <Knowledge label={label} />;
    case 'Assistant panel': return <AssistantNote label={label} />;
    default: return <CatalogSection data={props.data || {}} />;
  }
}
