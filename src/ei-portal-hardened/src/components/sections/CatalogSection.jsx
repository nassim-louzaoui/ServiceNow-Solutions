// The Workspace content: the Service Catalog, rendered in the live operations-intelligence
// accordion visual (white subtab strip, one expandable category per group, coloured accent bar,
// name + description, item count, chevron, and item rows with a Start action). Selecting an item
// seeds the Enterprise Assistant, exactly as the reference portal does.
import React, { useState } from 'react';
import { useApp } from '../../context.js';
import OIIcon from '../../icons.jsx';
import { CATALOG } from '../../data.js';

export default function CatalogSection() {
  var app = useApp();
  var dispatch = app.dispatch;
  var [open, setOpen] = useState(CATALOG.length ? CATALOG[0].id : null);

  function start(item) {
    dispatch({ type: 'START_FLOW', payload: item.id });
  }

  var total = CATALOG.reduce(function (n, g) { return n + g.items.length; }, 0);

  return (
    <div className="ei-section">
      <div className="ei-card">
        <div className="ei-subtabs">
          <button className="ei-subtab active">
            Service Catalog
            <span className="ei-subtab-count">{total}</span>
          </button>
        </div>
        <div className="ei-subtab-body">
          <div className="ei-accordion">
            {CATALOG.map(function (group) {
              var isOpen = open === group.id;
              return (
                <div key={group.id} className={'ei-acc-cat' + (isOpen ? ' open' : '')}>
                  <button
                    className="ei-acc-hdr"
                    onClick={function () { setOpen(isOpen ? null : group.id); }}
                  >
                    <span className="ei-acc-bar" style={{ background: group.color }} />
                    <span className="ei-acc-titles">
                      <span className="ei-acc-name">{group.label}</span>
                      <span className="ei-acc-desc">{group.desc}</span>
                    </span>
                    <span className="ei-acc-count">{group.items.length}</span>
                    <span className="ei-acc-chevron"><OIIcon name="chevron_down" size={16} fill="#6E6E6E" /></span>
                  </button>
                  {isOpen && (
                    <div className="ei-acc-body">
                      {group.items.map(function (item) {
                        return (
                          <div
                            key={item.id}
                            className="ei-catalog-row"
                            style={{ cursor: 'pointer' }}
                            onClick={function () { start(item); }}
                          >
                            <span className="ei-acc-bar" style={{ background: group.color, opacity: 0.5 }} />
                            <div className="ei-catalog-row-body">
                              <div className="ei-catalog-row-name">{item.name}</div>
                              <div className="ei-catalog-row-desc">{item.desc}</div>
                            </div>
                            <button
                              className="ei-btn primary sm"
                              onClick={function (e) { e.stopPropagation(); start(item); }}
                            >
                              Start
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
/* eslint-enable */
