export const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:host{display:block;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.5;color:#e2e8f0;background:#0a0f1e;height:100vh;overflow:hidden}

/* Layout */
.shell{display:flex;height:100vh;overflow:hidden;background:#0a0f1e}

/* Sidebar */
.sidebar{width:220px;flex-shrink:0;background:#070c18;border-right:1px solid #1e2942;display:flex;flex-direction:column;transition:width .2s ease}
.sidebar.collapsed{width:56px}
.sidebar-header{display:flex;align-items:center;gap:10px;padding:16px 14px;border-bottom:1px solid #1e2942;min-height:56px}
.sidebar-logo{width:28px;height:28px;background:linear-gradient(135deg,#3b82f6,#06b6d4);border-radius:7px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;letter-spacing:.5px}
.sidebar-title{font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1.2px;white-space:nowrap;overflow:hidden}
.sidebar-toggle{margin-left:auto;background:none;border:none;color:#475569;cursor:pointer;display:flex;padding:4px;border-radius:4px;flex-shrink:0}
.sidebar-toggle:hover{color:#94a3b8;background:#1e2942}
.sidebar-toggle svg{width:16px;height:16px;transition:transform .2s}
.sidebar.collapsed .sidebar-toggle svg{transform:rotate(180deg)}
.sidebar-nav{flex:1;overflow-y:auto;padding:8px 0}
.sidebar-nav::-webkit-scrollbar{width:4px}
.sidebar-nav::-webkit-scrollbar-track{background:transparent}
.sidebar-nav::-webkit-scrollbar-thumb{background:#1e2942;border-radius:2px}
.nav-item{display:flex;align-items:center;gap:10px;padding:9px 14px;cursor:pointer;border-radius:6px;margin:1px 6px;transition:background .15s,color .15s;color:#64748b;white-space:nowrap;overflow:hidden;border:none;background:none;width:calc(100% - 12px);text-align:left;font-size:13px}
.nav-item:hover{background:#1e2942;color:#94a3b8}
.nav-item.active{background:#1e2942;color:#e2e8f0}
.nav-item svg{width:18px;height:18px;flex-shrink:0;transition:color .15s}
.nav-item.active svg{color:var(--mod-color,#3b82f6)}
.nav-label{overflow:hidden;text-overflow:ellipsis;font-weight:500}

/* Main */
.main{flex:1;display:flex;flex-direction:column;overflow:hidden}

/* Header */
.header{display:flex;align-items:center;gap:12px;padding:0 20px;height:56px;border-bottom:1px solid #1e2942;background:#070c18;flex-shrink:0}
.header-title{font-size:15px;font-weight:600;color:#e2e8f0}
.header-sub{font-size:12px;color:#475569;margin-left:4px}
.header-accent{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--mod-color,#3b82f6);margin-right:6px;box-shadow:0 0 6px var(--mod-color,#3b82f6)}
.header-spacer{flex:1}
.header-badge{display:flex;align-items:center;gap:6px;background:#1e2942;padding:4px 10px;border-radius:20px;font-size:11px;color:#94a3b8;font-weight:500}
.header-badge svg{width:13px;height:13px;color:#10b981}

/* Content area */
.content-wrap{display:flex;flex:1;overflow:hidden}
.content{flex:1;overflow-y:auto;padding:20px;background:#0a0f1e}
.content::-webkit-scrollbar{width:6px}
.content::-webkit-scrollbar-track{background:transparent}
.content::-webkit-scrollbar-thumb{background:#1e2942;border-radius:3px}

/* Chat panel */
.chat-panel{width:320px;flex-shrink:0;background:#070c18;border-left:1px solid #1e2942;display:flex;flex-direction:column;transition:width .2s}
.chat-panel.collapsed{width:0;overflow:hidden}
.chat-header{padding:14px 16px;border-bottom:1px solid #1e2942;display:flex;align-items:center;gap:10px}
.chat-avatar{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:var(--chat-color,#3b82f6)}
.chat-avatar svg{width:16px;height:16px;color:#fff}
.chat-name{font-size:13px;font-weight:600;color:#e2e8f0}
.chat-sub{font-size:11px;color:#475569}
.chat-body{flex:1;overflow-y:auto;padding:12px 14px;display:flex;flex-direction:column;gap:10px}
.chat-body::-webkit-scrollbar{width:4px}
.chat-body::-webkit-scrollbar-thumb{background:#1e2942;border-radius:2px}
.bubble{padding:10px 12px;border-radius:10px;font-size:12.5px;line-height:1.55;max-width:100%}
.bubble.assistant{background:#1e2942;color:#e2e8f0;border-bottom-left-radius:3px}
.bubble.user{background:var(--chat-color,#3b82f6);color:#fff;border-bottom-right-radius:3px;align-self:flex-end}
.chat-quick{padding:0 14px 10px}
.chat-quick-btn{width:100%;background:#1e2942;border:none;color:#94a3b8;font-size:12px;padding:8px 10px;border-radius:8px;cursor:pointer;text-align:left;line-height:1.4}
.chat-quick-btn:hover{background:#263555;color:#e2e8f0}
.chat-input-wrap{padding:10px 14px;border-top:1px solid #1e2942;display:flex;gap:8px;align-items:center}
.chat-input{flex:1;background:#1e2942;border:none;border-radius:8px;padding:8px 10px;color:#e2e8f0;font-size:12.5px;outline:none;resize:none}
.chat-input::placeholder{color:#475569}
.chat-send{background:var(--chat-color,#3b82f6);border:none;border-radius:8px;padding:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .15s}
.chat-send:hover{opacity:.85}
.chat-send svg{width:15px;height:15px;color:#fff}
.chat-toggle{margin-left:auto;background:#1e2942;border:none;color:#64748b;cursor:pointer;display:flex;padding:5px;border-radius:5px;flex-shrink:0}
.chat-toggle:hover{color:#94a3b8}
.chat-toggle svg{width:14px;height:14px}

/* Sections */
.section-title{font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;margin-top:4px}
.card{background:#0d1529;border:1px solid #1e2942;border-radius:10px;padding:16px;margin-bottom:12px;transition:border-color .15s}
.card:hover{border-color:#2d3f6e}
.card-title{font-size:13.5px;font-weight:600;color:#e2e8f0;margin-bottom:4px}
.card-desc{font-size:12.5px;color:#64748b;line-height:1.5}

/* Chips / badges */
.chip{display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;letter-spacing:.3px}
.chip.live{background:#0d2a1a;color:#10b981;border:1px solid #10b98130}
.chip.review{background:#2a1f0d;color:#f59e0b;border:1px solid #f59e0b30}
.chip.draft{background:#1e2942;color:#64748b;border:1px solid #2d3f6e}
.chip.pending{background:#2a1f0d;color:#f59e0b;border:1px solid #f59e0b30}
.chip.elevated{background:#2a0d0d;color:#ef4444;border:1px solid #ef444430}
.chip.standard{background:#1e2942;color:#64748b;border:1px solid #2d3f6e}
.chip.approved{background:#0d2a1a;color:#10b981;border:1px solid #10b98130}

/* Search */
.search-wrap{position:relative;margin-bottom:16px}
.search-wrap svg{position:absolute;left:10px;top:50%;transform:translateY(-50%);width:14px;height:14px;color:#475569;pointer-events:none}
.search-input{width:100%;background:#0d1529;border:1px solid #1e2942;border-radius:8px;padding:8px 12px 8px 32px;color:#e2e8f0;font-size:13px;outline:none}
.search-input:focus{border-color:#3b82f6}
.search-input::placeholder{color:#475569}

/* Grid */
.grid2{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}

/* Stats */
.stat-card{background:#0d1529;border:1px solid #1e2942;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:6px}
.stat-num{font-size:28px;font-weight:700;color:#e2e8f0;line-height:1}
.stat-label{font-size:11px;color:#64748b;font-weight:500;text-transform:uppercase;letter-spacing:.6px}
.stat-delta{font-size:11px;color:#10b981;font-weight:600}

/* Table */
.tbl{width:100%;border-collapse:collapse;font-size:12.5px}
.tbl th{color:#475569;font-weight:600;text-transform:uppercase;font-size:10.5px;letter-spacing:.8px;padding:0 12px 10px;text-align:left;border-bottom:1px solid #1e2942}
.tbl td{padding:10px 12px;color:#e2e8f0;border-bottom:1px solid #0d1529}
.tbl tr:last-child td{border-bottom:none}
.tbl tr:hover td{background:#0d152980}
.tbl-wrap{background:#0d1529;border:1px solid #1e2942;border-radius:10px;overflow:hidden}

/* Tabs */
.tabs{display:flex;gap:4px;margin-bottom:16px;background:#0d1529;border:1px solid #1e2942;border-radius:8px;padding:4px}
.tab-btn{flex:1;background:none;border:none;color:#64748b;padding:7px 12px;border-radius:6px;cursor:pointer;font-size:12.5px;font-weight:500;transition:background .15s,color .15s;text-align:center}
.tab-btn.active{background:#1e2942;color:#e2e8f0}
.tab-btn:hover:not(.active){color:#94a3b8}

/* Creator tree */
.tree-item{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:7px;cursor:pointer;color:#64748b;font-size:13px;font-weight:500;transition:background .15s,color .15s}
.tree-item:hover{background:#1e2942;color:#94a3b8}
.tree-item.active{background:#1e2942;color:#e2e8f0}
.tree-item .dot{width:8px;height:8px;border-radius:50%;background:#1e2942;flex-shrink:0}
.tree-item.active .dot{background:var(--mod-color,#f97316)}

/* Row */
.row{display:flex;gap:12px}
.col{flex:1;min-width:0}

/* Automation item */
.auto-item{background:#0d1529;border:1px solid #1e2942;border-radius:10px;padding:14px 16px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:8px}
.auto-item:hover{border-color:#2d3f6e}
.auto-meta{font-size:11px;color:#475569;margin-top:4px;display:flex;gap:10px;flex-wrap:wrap}
.auto-tag{background:#1e2942;color:#64748b;border-radius:4px;padding:1px 6px;font-size:10.5px;font-weight:600}

/* Gov item */
.gov-item{display:flex;gap:14px;padding:14px 0;border-bottom:1px solid #1e2942;align-items:flex-start}
.gov-item:last-child{border-bottom:none}
.gov-who{font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.6px;white-space:nowrap;padding-top:2px}
.gov-title{font-size:13px;font-weight:600;color:#e2e8f0;margin-bottom:3px}
.gov-sub{font-size:12px;color:#64748b}
.gov-time{font-size:11px;color:#334155;margin-left:auto;white-space:nowrap;padding-top:2px}
.gov-actions{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;border:none;transition:opacity .15s}
.btn:hover{opacity:.85}
.btn-approve{background:#10b981;color:#fff}
.btn-deny{background:#1e2942;color:#94a3b8}
.btn-review{background:#3b82f6;color:#fff}
.btn-escalate{background:#1e2942;color:#f59e0b}

/* Dev hub */
.dev-meta{font-size:11px;color:#475569}

/* Admin item */
.admin-item{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #1e2942}
.admin-item:last-child{border-bottom:none}
.admin-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.admin-name{font-size:13px;font-weight:600;color:#e2e8f0}
.admin-desc{font-size:12px;color:#64748b}
.admin-type{font-size:10.5px;color:#475569;background:#1e2942;border-radius:4px;padding:1px 6px;margin-left:auto;white-space:nowrap}

/* Transition indicator */
.loading-bar{height:2px;background:linear-gradient(90deg,#3b82f6,#06b6d4);position:fixed;top:0;left:0;right:0;z-index:9999;animation:loadbar 1s ease-in-out infinite alternate}
@keyframes loadbar{from{opacity:.4}to{opacity:1}}

/* Scrollbar global */
*{scrollbar-width:thin;scrollbar-color:#1e2942 transparent}
`;
