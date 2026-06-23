#!/usr/bin/env python3
import os, io, copy, time
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

SCRATCH = "/tmp/claude-0/-home-user-ServiceNow-Solutions/2819c956-68f0-54e1-a6b8-74be1d0a3917/scratchpad"
HTML_DIR = os.path.join(SCRATCH, "html_v5")
SHOT_DIR = os.path.join(SCRATCH, "shots_v5")
SOURCE   = os.path.join(SCRATCH, "pkg2/deliverables/Operations-Intelligence-Overview.pptx")
OV_OUT   = os.path.join(SCRATCH, "Operations-Intelligence-Overview-v6.pptx")
PR_OUT   = os.path.join(SCRATCH, "Operations-Intelligence-Prototype-v5.pptx")

os.makedirs(HTML_DIR, exist_ok=True)
os.makedirs(SHOT_DIR, exist_ok=True)

IN = 914400
BLUE  = RGBColor(0x00,0x7C,0xC3)
DBLUE = RGBColor(0x26,0x70,0xC3)
GREY  = RGBColor(0x59,0x59,0x59)
MGREY = RGBColor(0x7F,0x7F,0x7F)
LGREY = RGBColor(0xB8,0xB8,0xB8)
WHITE = RGBColor(0xFF,0xFF,0xFF)
GREEN = RGBColor(0x00,0xBF,0x6F)

# ─────────────────────────────────────────────────────────────
# PART 1 — HTML MOCKUPS
# ─────────────────────────────────────────────────────────────

ICONS = {
    "workspace":  "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
    "gallery":    "M22 16V4c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2zm-11-4l2.03 2.71L16 11l4 5H8l3-4zM2 6v14c0 1.1.9 2 2 2h14v-2H4V6H2z",
    "explore":    "M12 10.9c-.61 0-1.1.49-1.1 1.1s.49 1.1 1.1 1.1c.61 0 1.1-.49 1.1-1.1s-.49-1.1-1.1-1.1zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.19 12.19L6 18l3.81-8.19L18 6l-3.81 8.19z",
    "studio":     "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
    "governance": "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z",
    "inbox":      "M19 3H4.99c-1.11 0-1.98.89-1.98 2L3 19c0 1.1.88 2 1.99 2H19c1.1 0 2-.9 2-2V5c0-1.11-.9-2-2-2zm0 12h-4c0 1.66-1.35 3-3 3s-3-1.34-3-3H4.99V5H19v10z",
    "document":   "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
    "command":    "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
    "send":       "M2.01 21L23 12 2.01 3 2 10l15 2-15 2z",
    "search":     "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
    "plus":       "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
    "play":       "M8 5v14l11-7z",
    "chevron":    "M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z",
    "assistant":  "M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 11H7V9h2v2zm4 0h-2V9h2v2zm4 0h-2V9h2v2z",
    "approve":    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14l-4-4 1.41-1.41L10 13.17l6.59-6.59L18 8l-8 8z",
    "reject":     "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z",
    "folder":     "M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z",
    "launch":     "M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z",
    "database":   "M12 3C7.58 3 4 4.79 4 7v10c0 2.21 3.58 4 8 4s8-1.79 8-4V7c0-2.21-3.58-4-8-4zm6 14c0 .5-2.13 2-6 2s-6-1.5-6-2v-2.23c1.61.78 3.72 1.23 6 1.23s4.39-.45 6-1.23V17zm0-4.55c-1.3.95-3.58 1.55-6 1.55s-4.7-.6-6-1.55V9.64c1.47.83 3.61 1.36 6 1.36s4.53-.53 6-1.36v2.81zM12 9C8.13 9 6 7.5 6 7s2.13-2 6-2 6 1.5 6 2-2.13 2-6 2z",
    "analytics":  "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z",
    "remove":     "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
    "automation": "M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z",
    "refresh":    "M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z",
    "settings":   "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
    "warning":    "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
    "bell":       "M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z",
    "person":     "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
    "key":        "M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z",
    "shield":     "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z",
    "group":      "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
}

NAV = [
    ("workspace",          "Operations Workspace",  "workspace"),
    ("automations",        "Automations Workspace", "gallery"),
    ("agentic-workspace",  "Agentic Workspace",     "explore"),
    ("creator-studio",     "Creator Studio",        "studio"),
    ("governance-control", "Governance Control",    "governance"),
    ("leadership-insights","Leadership Insights",   "inbox"),
    ("developer-hub",      "Developer Hub",         "document"),
    ("admin-hub",          "Administrator Hub",     "command"),
]

def ic(name, sz=18, fill="currentColor"):
    d = ICONS.get(name, ICONS["command"])
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{sz}" height="{sz}" '
            f'viewBox="0 0 24 24" fill="{fill}" style="display:inline-block;vertical-align:middle;flex-shrink:0">'
            f'<path d="{d}"/></svg>')

CSS = """
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Segoe UI",system-ui,sans-serif;font-size:14px;background:#F0F2F5;color:#121212;overflow:hidden;height:100vh}
.shell{display:flex;width:100vw;height:100vh;overflow:hidden}
.sb{width:260px;min-width:260px;height:100%;background:#293E40;display:flex;flex-direction:column;overflow:hidden;flex-shrink:0}
.sb-brand{display:flex;align-items:center;gap:12px;padding:18px 16px;border-bottom:1px solid rgba(255,255,255,0.08)}
.sb-logo{width:32px;height:32px;background:#00BF6F;border-radius:7px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:12px;flex-shrink:0}
.sb-name{color:#fff;font-weight:700;font-size:13px}
.sb-nav{flex:1;overflow-y:auto;padding:8px 0}
.nav-item{display:flex;align-items:center;gap:11px;width:100%;padding:12px 18px;background:transparent;border:none;border-left:3px solid transparent;cursor:pointer;color:rgba(255,255,255,0.65);font-size:13px;text-align:left;white-space:nowrap;font-family:inherit;font-weight:500}
.nav-item.active{background:rgba(0,191,111,0.16);color:#fff;border-left-color:#00BF6F}
.sb-portal-btn{margin:8px 12px;padding:8px 14px;background:rgba(0,191,111,0.14);border:1px solid rgba(0,191,111,0.28);border-radius:6px;color:#00BF6F;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:8px;font-family:inherit;width:calc(100% - 24px);justify-content:center}
.sb-portal-btn:hover{background:rgba(0,191,111,0.22)}
.sb-my-req{display:flex;align-items:center;gap:9px;padding:10px 16px;cursor:pointer;color:rgba(255,255,255,0.75);font-size:12px;font-weight:500;border-top:1px solid rgba(255,255,255,0.07)}
.sb-my-req:hover{background:rgba(255,255,255,0.05)}
.sb-foot{padding:12px 16px;border-top:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;gap:9px;flex-shrink:0}
.avatar{width:32px;height:32px;border-radius:50%;background:#00BF6F;color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0}
.main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
.topbar{height:56px;min-height:56px;background:#fff;border-bottom:1px solid #DCDCDC;display:flex;align-items:center;padding:0 24px;gap:12px;flex-shrink:0}
.bc-root{color:#6E6E6E;font-size:12px}
.bc-sep{color:#DCDCDC;margin:0 5px}
.bc-cur{color:#121212;font-weight:700;font-size:15px}
.tb-right{margin-left:auto;display:flex;align-items:center;gap:14px}
.notif-wrap{position:relative;cursor:pointer;display:flex;align-items:center}
.notif-badge{position:absolute;top:-6px;right:-6px;background:#E57323;color:#fff;border-radius:9px;padding:1px 4px;font-size:9px;font-weight:700;min-width:15px;text-align:center;line-height:14px}
.content{flex:1;overflow:hidden;background:#F0F2F5;padding:18px}
.two-col{display:flex;gap:12px;height:100%;overflow:hidden}
.three-col{display:flex;gap:10px;height:100%;overflow:hidden}
.panel{background:#fff;border:1px solid #DCDCDC;border-radius:8px;overflow:hidden;display:flex;flex-direction:column}
.panel-hdr{display:flex;align-items:center;justify-content:space-between;padding:11px 14px;border-bottom:1px solid #DCDCDC;flex-shrink:0}
.panel-title{font-size:13px;font-weight:600;color:#121212}
.panel-body{flex:1;overflow-y:auto}
.chat{width:300px;min-width:280px;background:#fff;border:1px solid #DCDCDC;border-radius:8px;display:flex;flex-direction:column;overflow:hidden}
.chat-hdr{padding:12px 14px;border-bottom:1px solid #DCDCDC;display:flex;align-items:center;gap:9px;flex-shrink:0}
.chat-icon{width:34px;height:34px;border-radius:50%;background:rgba(0,191,111,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.chat-body{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:9px}
.msg{padding:8px 11px;border-radius:9px;font-size:12px;line-height:1.5}
.msg.a{background:#F0F2F5;color:#121212;border-radius:4px 9px 9px 9px;max-width:92%}
.msg.u{background:#00BF6F;color:#fff;border-radius:9px 4px 9px 9px;align-self:flex-end;max-width:82%}
.chat-input{padding:9px 12px;border-top:1px solid #DCDCDC;display:flex;gap:6px;flex-shrink:0}
.ci{flex:1;padding:7px 11px;border:1px solid #DCDCDC;border-radius:5px;font-size:12px;font-family:inherit}
.tbl{width:100%;border-collapse:collapse;font-size:12px}
.tbl th{text-align:left;padding:7px 12px;font-size:10px;font-weight:600;color:#6E6E6E;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #DCDCDC;background:#F8F9FB;white-space:nowrap}
.tbl td{padding:10px 12px;border-bottom:1px solid #F0F2F5;vertical-align:middle}
.tbl tr:last-child td{border-bottom:none}
.tbl tr:hover{background:#F8F9FB}
.tabs{display:flex;border-bottom:1px solid #DCDCDC;background:#fff;padding:0 6px;flex-shrink:0}
.tab{padding:11px 14px;background:transparent;border:none;border-bottom:2px solid transparent;cursor:pointer;font-size:12px;font-weight:600;color:#6E6E6E;white-space:nowrap;font-family:inherit}
.tab.on{color:#00BF6F;border-bottom-color:#00BF6F}
.tab-cnt{background:#E8E8E8;color:#6E6E6E;padding:1px 5px;border-radius:8px;font-size:10px;font-weight:700;margin-left:4px}
.tab.on .tab-cnt{background:rgba(0,191,111,0.12);color:#00BF6F}
.tab-cnt.w{background:rgba(229,115,35,0.12);color:#E57323}
.badge{display:inline-flex;align-items:center;padding:2px 7px;border-radius:9px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;white-space:nowrap}
.badge.g{background:rgba(0,137,94,0.12);color:#00895E}
.badge.o{background:rgba(229,115,35,0.12);color:#E57323}
.badge.b{background:rgba(0,191,111,0.12);color:#00BF6F}
.badge.n{background:rgba(110,110,110,0.12);color:#6E6E6E}
.badge.r{background:rgba(217,83,79,0.12);color:#D9534F}
.btn{display:inline-flex;align-items:center;gap:4px;padding:6px 13px;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid transparent;white-space:nowrap;font-family:inherit}
.btn.p{background:#00BF6F;color:#fff}
.btn.g{background:transparent;color:#121212;border-color:#DCDCDC}
.btn.xs{padding:4px 9px;font-size:11px}
.cat-row{display:flex;align-items:center;gap:10px;padding:9px 12px;border-bottom:1px solid #F0F2F5}
.cat-icon{width:32px;height:32px;border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.cat-name{font-size:12px;font-weight:600;color:#121212;flex:1}
.cat-desc{font-size:11px;color:#6E6E6E;flex:1}
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px}
.kpi{background:#fff;border:1px solid #DCDCDC;border-radius:8px;padding:14px;text-align:center}
.kpi-val{font-size:26px;font-weight:700;color:#007CC3}
.kpi-lbl{font-size:11px;color:#6E6E6E;margin-top:3px}
.search-wrap{position:relative;flex:1}
.search-ic{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#6E6E6E;pointer-events:none}
.card-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:12px}
.card{background:#fff;border:1px solid #DCDCDC;border-radius:8px;padding:14px}
.card-title{font-size:12px;font-weight:600;color:#121212;margin-bottom:4px}
.card-desc{font-size:11px;color:#6E6E6E;line-height:1.5;margin-bottom:10px}
.card-foot{display:flex;align-items:center;justify-content:space-between}
.ws-card{background:#fff;border:1px solid #DCDCDC;border-radius:9px;padding:18px;cursor:pointer}
.ws-icon{width:48px;height:48px;border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:12px}
.ws-title{font-size:14px;font-weight:700;color:#121212;margin-bottom:5px}
.ws-desc{font-size:12px;color:#6E6E6E;line-height:1.5;margin-bottom:12px}
.ws-link{display:flex;align-items:center;gap:4px;font-size:11px;font-weight:600;color:#00BF6F}
.tree-item{display:flex;align-items:center;gap:8px;padding:8px 10px;cursor:pointer;border-radius:5px}
.tree-item.sel{background:rgba(0,191,111,0.08);color:#00BF6F}
.tree-sub{padding-left:22px}
.tree-sub .tree-item{padding:5px 8px;font-size:11px}
.action-row{padding:12px 14px;border-bottom:1px solid #F0F2F5;display:flex;align-items:flex-start;gap:10px}
.action-type{font-size:10px;font-weight:700;color:#6E6E6E;text-transform:uppercase;margin-bottom:2px}
.action-title{font-size:12px;font-weight:600;color:#121212;margin-bottom:2px}
.action-meta{font-size:11px;color:#6E6E6E}
code{font-family:monospace;font-size:11px;color:#6E6E6E}
.prog-bar{height:6px;background:#E8E8E8;border-radius:3px;overflow:hidden;margin-top:5px}
.prog-fill{height:100%;background:#00BF6F;border-radius:3px}
.toggle-row{display:flex;align-items:center;justify-content:space-between;padding:11px 14px;border-bottom:1px solid #F0F2F5}
.toggle-lbl{font-size:12px;font-weight:600;color:#121212}
.toggle-sub{font-size:11px;color:#6E6E6E;margin-top:1px}
.tog{width:36px;height:20px;border-radius:10px;border:none;cursor:pointer;position:relative;flex-shrink:0}
.tog.on{background:#00BF6F}
.tog.off{background:#DCDCDC}
/* Modals */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.48);display:flex;align-items:center;justify-content:center;z-index:1000}
.modal-box{background:#fff;border-radius:10px;overflow:hidden;display:flex;flex-direction:column;max-height:88vh;box-shadow:0 20px 60px rgba(0,0,0,0.22)}
.modal-hdr{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #DCDCDC;font-size:14px;font-weight:700;color:#121212;flex-shrink:0}
.modal-close{width:28px;height:28px;border:none;background:rgba(0,0,0,0.07);border-radius:50%;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;color:#6E6E6E;font-family:inherit;line-height:1}
.modal-body{overflow-y:auto;flex:1}
.modal-foot{padding:10px 16px;border-top:1px solid #DCDCDC;background:#F8F9FB;display:flex;gap:8px;justify-content:flex-end;flex-shrink:0}
"""

def sidebar(active):
    rows = ""
    for nid, lbl, icon in NAV:
        a = nid == active
        rows += (f'<button class="nav-item{" active" if a else ""}">'
                 f'<span style="width:18px;display:flex">{ic(icon,16,"#00BF6F" if a else "rgba(255,255,255,0.65)")}</span>'
                 f'<span>{lbl}</span></button>\n')
    return (
        f'<div class="sb">'
        f'<div class="sb-brand"><div class="sb-logo">OI</div>'
        f'<div class="sb-name">Operations Intelligence</div></div>'
        f'<div class="sb-nav">{rows}</div>'
        f'<div style="padding:8px 0;border-top:1px solid rgba(255,255,255,0.08)">'
        f'<button class="sb-portal-btn" onclick="openSP()">'
        f'{ic("launch",13,"#00BF6F")} Open Service Portal</button></div>'
        f'<div class="sb-my-req" onclick="openMR()">'
        f'{ic("inbox",15,"rgba(255,255,255,0.65)")}<span>My Requests</span>'
        f'<span style="margin-left:auto;background:rgba(229,115,35,0.18);color:#E57323;border-radius:8px;padding:1px 6px;font-size:10px;font-weight:700">4</span>'
        f'</div>'
        f'<div class="sb-foot"><div class="avatar">NL</div>'
        f'<div><div style="color:#fff;font-size:12px;font-weight:600">Nassim Louzaoui</div>'
        f'<div style="color:rgba(255,255,255,0.5);font-size:10px">Administrator</div></div></div>'
        f'</div>'
    )

def topbar(label, role=""):
    r = (f'<span style="font-size:10px;background:rgba(0,191,111,0.12);color:#00BF6F;'
         f'padding:2px 8px;border-radius:9px;font-weight:700">{role}</span>') if role else ""
    bell = (f'<div class="notif-wrap" title="Notifications">'
            f'{ic("bell",20,"#6E6E6E")}'
            f'<span class="notif-badge">3</span></div>')
    return (f'<div class="topbar">'
            f'<span class="bc-root">Operations Intelligence</span>'
            f'<span class="bc-sep">{ic("chevron",12)}</span>'
            f'<span class="bc-cur">{label}</span>{r}'
            f'<div class="tb-right"><span style="font-size:11px;color:#6E6E6E">Jun 2025</span>'
            f'{bell}</div></div>')

def chat_panel(title, tag, msgs):
    bubbles = ""
    for role, text in msgs:
        bubbles += f'<div class="msg {"a" if role=="a" else "u"}">{text}</div>\n'
    return (f'<div class="chat">'
            f'<div class="chat-hdr"><div class="chat-icon">{ic("assistant",18,"#00BF6F")}</div>'
            f'<div><div style="font-size:12px;font-weight:700;color:#121212">{title}</div>'
            f'<div style="font-size:10px;color:#6E6E6E">{tag}</div></div></div>'
            f'<div class="chat-body">{bubbles}</div>'
            f'<div class="chat-input"><input class="ci" placeholder="Ask anything…">'
            f'<button class="btn p xs">{ic("send",12)}</button></div></div>')

def build_modals():
    cat_items = [
        ("Knowledge Management","12 articles","rgba(0,124,195,0.1)",ic("document",18,"#007CC3")),
        ("ITSM Operations","8 services","rgba(0,191,111,0.1)",ic("settings",18,"#00BF6F")),
        ("ITAM Operations","6 services","rgba(229,115,35,0.1)",ic("database",18,"#E57323")),
        ("HR Services","9 services","rgba(31,123,182,0.1)",ic("group",18,"#1F7BB6")),
        ("Finance & Procurement","5 services","rgba(0,137,94,0.1)",ic("analytics",18,"#00895E")),
    ]
    cats_html = ""
    for name, count, bg, ico in cat_items:
        cats_html += (
            f'<div style="background:#fff;border:1px solid #DCDCDC;border-radius:8px;'
            f'padding:16px 12px;text-align:center;cursor:pointer">'
            f'<div style="width:40px;height:40px;border-radius:9px;background:{bg};display:flex;'
            f'align-items:center;justify-content:center;margin:0 auto 8px">{ico}</div>'
            f'<div style="font-size:11px;font-weight:700;color:#121212">{name}</div>'
            f'<div style="font-size:10px;color:#6E6E6E;margin-top:2px">{count}</div></div>'
        )

    popular_items = [
        ("Password Reset","ITSM Operations","rgba(0,191,111,0.1)",ic("settings",14,"#00BF6F")),
        ("New Laptop Request","ITAM Operations","rgba(229,115,35,0.1)",ic("database",14,"#E57323")),
        ("Software License Request","ITAM Operations","rgba(229,115,35,0.1)",ic("document",14,"#E57323")),
        ("Create Knowledge Article","Knowledge Management","rgba(0,124,195,0.1)",ic("document",14,"#007CC3")),
        ("Access Request","ITSM Operations","rgba(0,191,111,0.1)",ic("key",14,"#00BF6F")),
        ("New Employee Onboarding","HR Services","rgba(31,123,182,0.1)",ic("group",14,"#1F7BB6")),
    ]
    pop_html = ""
    for name, cat, bg, ico in popular_items:
        pop_html += (
            f'<div style="background:#fff;border:1px solid #DCDCDC;border-radius:7px;'
            f'padding:12px 14px;cursor:pointer;display:flex;align-items:center;gap:10px">'
            f'<div style="width:34px;height:34px;border-radius:7px;background:{bg};display:flex;'
            f'align-items:center;justify-content:center;flex-shrink:0">{ico}</div>'
            f'<div><div style="font-size:12px;font-weight:600;color:#121212">{name}</div>'
            f'<div style="font-size:10px;color:#6E6E6E">{cat}</div></div></div>'
        )

    mr_rows = [
        ("Software License — Adobe Acrobat","ITAM Operations","Jun 19, 2025","o","In Progress"),
        ("New Laptop Request","ITAM Operations","Jun 17, 2025","o","Pending Approval"),
        ("Access Request — SharePoint Finance","ITSM Operations","Jun 15, 2025","b","Approved"),
        ("VPN Setup Assistance","ITSM Operations","Jun 12, 2025","g","Complete"),
        ("Knowledge Article — Patch Policy","Knowledge Management","Jun 8, 2025","g","Complete"),
        ("Password Reset","ITSM Operations","Jun 3, 2025","g","Complete"),
    ]
    mr_tbody = ""
    for name, cat, date, bc, status in mr_rows:
        op = ' style="opacity:0.65"' if bc == "g" else ""
        mr_tbody += (
            f'<tr{op}><td style="font-weight:600">{name}</td>'
            f'<td style="color:#6E6E6E">{cat}</td>'
            f'<td style="color:#6E6E6E;font-size:11px">{date}</td>'
            f'<td><span class="badge {bc}">{status}</span></td>'
            f'<td><button class="btn g xs">View</button></td></tr>'
        )

    mr_modal = (
        f'<div id="mr-modal" class="modal-overlay" style="display:none" '
        f'onclick="if(event.target===this)closeMR()">'
        f'<div class="modal-box" style="width:720px">'
        f'<div class="modal-hdr">'
        f'<span style="display:flex;align-items:center;gap:8px">{ic("inbox",16,"#007CC3")} My Requests</span>'
        f'<button class="modal-close" onclick="closeMR()">&#215;</button></div>'
        f'<div style="padding:10px 16px;border-bottom:1px solid #DCDCDC;background:#F8F9FB;'
        f'display:flex;gap:10px;align-items:center;flex-shrink:0">'
        f'<span class="badge o">4 Open</span><span class="badge g">2 Complete</span>'
        f'<span style="font-size:11px;color:#6E6E6E;margin-left:auto">Showing all requests from the Service Portal</span></div>'
        f'<div class="modal-body"><table class="tbl">'
        f'<thead><tr><th>Request</th><th>Category</th><th>Submitted</th><th>Status</th><th></th></tr></thead>'
        f'<tbody>{mr_tbody}</tbody></table></div>'
        f'<div class="modal-foot">'
        f'<button class="btn p xs" onclick="openSP()">{ic("launch",11)} Open Service Portal</button>'
        f'<button class="btn g xs" onclick="closeMR()">Close</button></div>'
        f'</div></div>'
    )

    sp_modal = (
        f'<div id="sp-modal" class="modal-overlay" style="display:none" '
        f'onclick="if(event.target===this)closeSP()">'
        f'<div class="modal-box" style="width:96vw;height:94vh;border-radius:8px">'
        f'<div class="modal-hdr" style="background:#293E40;color:#fff;border-bottom:1px solid rgba(255,255,255,0.1)">'
        f'<div style="display:flex;align-items:center;gap:10px">'
        f'<div style="width:28px;height:28px;background:#00BF6F;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff">OI</div>'
        f'<span>Service Portal — Operations Intelligence</span></div>'
        f'<button class="modal-close" onclick="closeSP()" '
        f'style="background:rgba(255,255,255,0.12);color:#fff">&#215;</button></div>'
        f'<div class="modal-body" style="background:#F0F2F5;padding:0">'
        f'<div style="background:linear-gradient(135deg,#1F7BB6 0%,#007CC3 100%);padding:36px 40px;text-align:center;color:#fff">'
        f'<div style="font-size:20px;font-weight:700;margin-bottom:6px">How can we help you today?</div>'
        f'<div style="font-size:12px;opacity:0.8;margin-bottom:18px">Browse categories or search for services and knowledge articles</div>'
        f'<div style="display:flex;align-items:center;max-width:520px;margin:0 auto;box-shadow:0 4px 16px rgba(0,0,0,0.2);border-radius:7px;overflow:hidden">'
        f'<input style="flex:1;padding:12px 16px;border:none;font-size:13px;font-family:inherit;outline:none" placeholder="Search for services, knowledge articles...">'
        f'<button class="btn p" style="border-radius:0;padding:12px 18px;font-size:13px">{ic("search",14)} Search</button></div></div>'
        f'<div style="padding:24px 32px">'
        f'<div style="font-size:13px;font-weight:700;color:#121212;margin-bottom:12px">Browse by Category</div>'
        f'<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:24px">{cats_html}</div>'
        f'<div style="font-size:13px;font-weight:700;color:#121212;margin-bottom:12px">Popular Services</div>'
        f'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">{pop_html}</div>'
        f'</div></div></div></div>'
    )

    js = ("<script>"
          "function openMR(){document.getElementById('mr-modal').style.display='flex'}"
          "function closeMR(){document.getElementById('mr-modal').style.display='none'}"
          "function openSP(){document.getElementById('sp-modal').style.display='flex';closeMR()}"
          "function closeSP(){document.getElementById('sp-modal').style.display='none'}"
          "</script>")

    return mr_modal + sp_modal + js

def page(active, label, content, role=""):
    return (f'<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">'
            f'<title>Operations Intelligence — {label}</title>'
            f'<style>{CSS}</style></head><body><div class="shell">'
            f'{sidebar(active)}<div class="main">{topbar(label, role)}'
            f'<div class="content" style="height:calc(100vh - 56px)">{content}</div>'
            f'</div></div>{build_modals()}</body></html>')

# ── Module 1: Operations Workspace — Service Catalog ──────────────────────────
def m1():
    def cat_section(color_hex, icon_name, label, count, items):
        rows = ""
        for nm, desc, status, bc in items:
            btn = (f'<button class="btn p xs">{ic("document",11)} Request</button>'
                   if bc == "g" else f'<button class="btn g xs">View</button>')
            rows += (
                f'<div class="cat-row">'
                f'<div class="cat-icon" style="background:rgba({color_hex},0.1)">'
                f'{ic(icon_name,15,f"rgb({color_hex})")}</div>'
                f'<div style="flex:1"><div class="cat-name">{nm}</div>'
                f'<div class="cat-desc">{desc}</div></div>'
                f'<div style="display:flex;align-items:center;gap:7px">'
                f'<span class="badge {bc}">{status}</span>{btn}</div></div>'
            )
        return (
            f'<div style="padding:8px 12px;background:#F8F9FB;border-bottom:1px solid #DCDCDC;'
            f'border-top:1px solid #DCDCDC;font-size:10px;font-weight:700;color:#6E6E6E;'
            f'text-transform:uppercase;letter-spacing:0.05em;display:flex;align-items:center;gap:8px">'
            f'{ic("folder",13,f"rgb({color_hex})")}'
            f'<span style="color:rgb({color_hex})">{label}</span>'
            f'<span style="margin-left:auto" class="badge b">{count}</span></div>'
            + rows
        )

    catalog = (
        f'<div class="panel" style="flex:1;min-width:0">'
        f'<div class="panel-hdr">'
        f'<span class="panel-title">Service Catalog</span>'
        f'<div style="display:flex;gap:7px">'
        f'<span class="badge b">24 Available</span>'
        f'<button class="btn g xs">{ic("search",11)} Browse All</button>'
        f'</div></div>'
        f'<div class="panel-body">'
        + cat_section("0,124,195","document","Knowledge Management","3",[
            ("Knowledge Base Search","Search the full knowledge base for solutions to common issues and requests","g","g"),
            ("Submit Knowledge Article","Contribute a new article or update existing documentation for your team","g","g"),
            ("Request Article Review","Flag a knowledge article for accuracy review or request content updates","g","g"),
        ])
        + cat_section("0,191,111","settings","ITSM Operations","6",[
            ("Incident Report","Raise a new incident for IT or operational issues affecting your work","g","g"),
            ("Service Request — Application Access","Request access to a specific application or system resource","g","g"),
            ("Password Reset","Self-service credential reset across all connected identity systems","g","g"),
            ("Change Request Submission","Submit a change for review and scheduling through the change workflow","g","g"),
            ("Problem Management Entry","Escalate a recurring incident pattern for root cause investigation","g","g"),
            ("VPN and Remote Access Setup","Request configuration support for secure remote access","g","g"),
        ])
        + cat_section("229,115,35","database","ITAM Operations","5",[
            ("New Hardware Request","Request a new laptop, monitor, peripheral or mobile device","g","g"),
            ("Software License Request","Request a commercial software licence or tool subscription","g","g"),
            ("Asset Transfer or Reassignment","Transfer ownership of an IT asset to another user or department","g","g"),
            ("Asset Decommission Request","Retire and securely wipe an end-of-life hardware asset","g","g"),
            ("Licence Compliance Review","Request a review of licence allocation and usage for a specific product","g","g"),
        ])
        + cat_section("31,123,182","group","HR Services","5",[
            ("New Employee Onboarding","Trigger the full onboarding workflow for a new starter","g","g"),
            ("Employee Offboarding","Initiate account deactivation and asset return for departing employees","g","g"),
            ("Role Change Request","Update system access and group membership following a role change","g","g"),
            ("Training Enrolment","Enrol in mandatory or optional training programmes","g","g"),
            ("Return to Office Setup","Request workspace and equipment setup for returning employees","g","g"),
        ])
        + cat_section("0,137,94","analytics","Finance & Procurement","5",[
            ("Purchase Order Request","Submit a new purchase request for review and supplier engagement","o","o"),
            ("Vendor Registration","Register a new vendor or supplier in the procurement system","g","g"),
            ("Budget Transfer Request","Request a budget reallocation between cost centres","g","g"),
            ("Expense Report Submission","Submit business expenses for manager approval and reimbursement","g","g"),
            ("Contract Renewal Request","Initiate the review and renewal process for an expiring contract","g","g"),
        ])
        + f'<div style="padding:10px 12px;border-top:1px solid #DCDCDC;background:#F8F9FB;flex-shrink:0">'
        f'<div style="font-size:10px;font-weight:700;color:#6E6E6E;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">My Recent Requests</div>'
        f'<div style="display:flex;gap:8px">'
        f'<div style="background:#fff;border:1px solid #DCDCDC;border-radius:6px;padding:6px 10px;font-size:11px;flex:1"><div style="font-weight:600">New Laptop Request</div><div style="color:#6E6E6E;font-size:10px">Jun 17</div><span class="badge o" style="margin-top:3px;display:inline-flex">Pending</span></div>'
        f'<div style="background:#fff;border:1px solid #DCDCDC;border-radius:6px;padding:6px 10px;font-size:11px;flex:1"><div style="font-weight:600">Password Reset</div><div style="color:#6E6E6E;font-size:10px">Jun 12</div><span class="badge g" style="margin-top:3px;display:inline-flex">Complete</span></div>'
        f'<div style="background:#fff;border:1px solid #DCDCDC;border-radius:6px;padding:6px 10px;font-size:11px;flex:1"><div style="font-weight:600">Adobe Acrobat Licence</div><div style="color:#6E6E6E;font-size:10px">Jun 19</div><span class="badge o" style="margin-top:3px;display:inline-flex">In Progress</span></div>'
        f'</div></div>'
        f'</div>'
    )

    ch = chat_panel("Operations Assistant","Your intelligent service catalog guide",[
        ("a","Hello! I can help you find the right service request. What do you need today?"),
        ("u","I need to request a new laptop and get access to the Finance SharePoint"),
        ("a","I can help with both.\n\nFor the laptop: New Hardware Request — ITAM Operations. I will pre-fill your department and manager details.\n\nFor SharePoint access: Service Request — Application Access — ITSM Operations. You will need to specify the SharePoint site and access level.\n\nShall I open both request forms now?"),
    ])
    return f'<div class="two-col">{catalog}{ch}</div>'

# ── Module 2: Automations Workspace ───────────────────────────────────────────
def m2():
    filters = (
        f'<div style="display:flex;gap:8px;padding:10px 12px;border-bottom:1px solid #DCDCDC;'
        f'flex-shrink:0;background:#fff;flex-wrap:wrap">'
        f'<div class="search-wrap" style="min-width:220px">'
        f'<span class="search-ic">{ic("search",13,"#6E6E6E")}</span>'
        f'<input style="width:100%;padding:6px 10px 6px 32px;border:1px solid #DCDCDC;border-radius:16px;font-size:12px;background:#F0F2F5;font-family:inherit" placeholder="Search automations, categories, keywords…"></div>'
        f'<select style="padding:5px 10px;border:1px solid #DCDCDC;border-radius:5px;font-size:12px;font-family:inherit;background:#fff"><option>All Categories</option><option>ITSM Operations</option><option>ITAM Operations</option><option>Knowledge Management</option><option>HR Services</option><option>Finance &amp; Procurement</option></select>'
        f'<select style="padding:5px 10px;border:1px solid #DCDCDC;border-radius:5px;font-size:12px;font-family:inherit;background:#fff"><option>All Types</option><option>Flow</option><option>Script</option><option>Scheduled</option></select>'
        f'<select style="padding:5px 10px;border:1px solid #DCDCDC;border-radius:5px;font-size:12px;font-family:inherit;background:#fff"><option>All Statuses</option><option>Live</option><option>Pending</option><option>Scheduled</option></select>'
        f'<span class="badge b" style="align-self:center">14 results</span></div>'
    )
    items = [
        ("Employee Onboarding Automation","HR Services","Trigger full onboarding workflow including AD, access provisioning and welcome email","flow","g","Live","247 runs"),
        ("Employee Offboarding Automation","HR Services","Deactivate accounts, revoke access and archive user data on departure","flow","g","Live","189 runs"),
        ("Password Reset Flow","ITSM Operations","Self-service reset across AD, SAP and Workday simultaneously","flow","g","Live","512 runs"),
        ("Application Access Provisioning","ITSM Operations","Role-based access provisioning with automatic manager approval routing","flow","o","Pending","98 runs"),
        ("Server Health Check","ITSM Operations","Run diagnostic sweep across all infrastructure nodes and generate report","script","g","Live","334 runs"),
        ("SSL Certificate Renewal","ITSM Operations","Auto-renew and deploy SSL certificates before expiry across all endpoints","script","g","Live","67 runs"),
        ("OS Patch Management","ITSM Operations","Automated OS patching with pre-flight checks and rollback capability","script","o","Scheduled","23 runs"),
        ("Monthly SAM Reconciliation","Finance & Procurement","Consolidate ServiceNow and Flexera data into standardised reconciliation report","scheduled","g","Live","24 runs"),
        ("Purchase Order Auto-Routing","Finance & Procurement","Auto-route purchase orders based on amount and category thresholds","flow","g","Live","156 runs"),
        ("Asset Lifecycle Tracker","ITAM Operations","Track hardware assets from procurement through decommission automatically","flow","g","Live","88 runs"),
        ("Licence Compliance Alert","ITAM Operations","Alert and report on licence overage or under-utilisation monthly","scheduled","g","Live","12 runs"),
        ("Knowledge Article Publisher","Knowledge Management","Validate and publish approved knowledge articles to the knowledge base","flow","g","Live","44 runs"),
    ]
    cards = ""
    for name, cat, desc, typ, bc, status, runs in items:
        cards += (
            f'<div class="card"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">'
            f'<div class="card-title">{name}</div><span class="badge {bc}">{status}</span></div>'
            f'<div style="font-size:10px;color:#6E6E6E;margin-bottom:5px">{cat} · <code>{typ}</code></div>'
            f'<div class="card-desc">{desc}</div>'
            f'<div class="card-foot"><span style="font-size:10px;color:#6E6E6E">{runs}</span>'
            f'<button class="btn p xs">{ic("play",10)} Run</button></div></div>'
        )
    return (f'<div class="panel" style="height:100%">'
            f'{filters}'
            f'<div style="flex:1;overflow-y:auto"><div class="card-grid">{cards}</div></div></div>')

# ── Module 3: Agentic Workspace ───────────────────────────────────────────────
def m3():
    ws_cards = (
        f'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">'
        f'<div class="ws-card" style="border:1.5px solid #DCDCDC">'
        f'<div class="ws-icon" style="background:rgba(31,123,182,0.1)">{ic("database",26,"#1F7BB6")}</div>'
        f'<div class="ws-title">CMDB Workspace</div>'
        f'<div class="ws-desc">Configuration Management Database — explore CIs, impact relationships and availability metrics across the full infrastructure inventory.</div>'
        f'<div style="display:flex;align-items:center;justify-content:space-between">'
        f'<div style="display:flex;gap:8px"><span class="badge g">Online</span><span style="font-size:10px;color:#6E6E6E;align-self:center">14,832 CIs</span></div>'
        f'<div class="ws-link">{ic("launch",12,"#00BF6F")} Open Workspace</div></div></div>'
        f'<div class="ws-card" style="border:1.5px solid rgba(0,191,111,0.35);background:rgba(0,191,111,0.03)">'
        f'<div class="ws-icon" style="background:rgba(0,191,111,0.1)">{ic("workspace",26,"#00BF6F")}</div>'
        f'<div class="ws-title">Service Operations Workspace</div>'
        f'<div class="ws-desc">Monitor service health, manage incidents and coordinate operational response — real-time alerting with contextual assignment guidance.</div>'
        f'<div style="display:flex;align-items:center;justify-content:space-between">'
        f'<div style="display:flex;gap:8px"><span class="badge g">Online</span><span style="font-size:10px;color:#E57323;font-weight:600;align-self:center">3 open P1s</span></div>'
        f'<div class="ws-link">{ic("launch",12,"#00BF6F")} Open Workspace</div></div></div></div>'
        f'<div class="panel">'
        f'<div class="panel-hdr"><span class="panel-title">Recent Workspace Activity</span></div>'
        f'<table class="tbl"><thead><tr><th>Workspace</th><th>Event</th><th>Impact</th><th>Status</th><th>Time</th></tr></thead>'
        f'<tbody>'
        f'<tr><td style="font-weight:600">Service Operations</td><td style="color:#6E6E6E">INC0012847 — P1 resolved</td><td style="color:#6E6E6E">SAP Production</td><td><span class="badge g">Resolved</span></td><td style="color:#6E6E6E;font-size:11px">4 min ago</td></tr>'
        f'<tr><td style="font-weight:600">CMDB Workspace</td><td style="color:#6E6E6E">CI relationship mapped — 12 nodes</td><td style="color:#6E6E6E">Network tier</td><td><span class="badge b">Complete</span></td><td style="color:#6E6E6E;font-size:11px">22 min ago</td></tr>'
        f'<tr><td style="font-weight:600">Service Operations</td><td style="color:#6E6E6E">Alert triggered — disk threshold</td><td style="color:#6E6E6E">DB Cluster A</td><td><span class="badge o">Warning</span></td><td style="color:#6E6E6E;font-size:11px">1h 10m ago</td></tr>'
        f'</tbody></table></div>'
    )
    left = f'<div style="flex:1;min-width:0;overflow-y:auto">{ws_cards}</div>'
    ch = chat_panel("Agentic Assistant","Intelligent reasoning across all platform capabilities",[
        ("a","I have access to both CMDB and Service Operations contexts. What would you like to explore?"),
        ("u","Show me all P1 incidents related to the SAP Production CI"),
        ("a","Searching CMDB for SAP Production configuration item…\n\nFound 3 active P1 incidents linked to CI: SAP-PROD-APP01.\n\n· INC0012847 — Memory threshold exceeded (assigned: David Chen)\n· INC0012849 — Response time degradation (in progress)\n· INC0012851 — Batch job failure (pending assignment)\n\nWould you like me to pull the full incident details or check upstream CI dependencies?"),
    ])
    return f'<div class="two-col">{left}{ch}</div>'

# ── Module 4: Creator Studio ───────────────────────────────────────────────────
def m4():
    tree = (
        f'<div class="panel" style="width:240px;min-width:220px;flex-shrink:0">'
        f'<div class="panel-hdr"><span class="panel-title">Projects</span>'
        f'<button class="btn p xs">{ic("plus",10)} New</button></div>'
        f'<div class="panel-body">'
        f'<div class="tree-item sel" style="margin:4px">{ic("folder",13,"#00BF6F")}'
        f'<span style="font-size:12px;font-weight:600;flex:1">Employee Onboarding</span>'
        f'<span class="badge b" style="font-size:9px">Draft</span></div>'
        f'<div class="tree-sub">'
        f'<div class="tree-item sel" style="background:rgba(0,191,111,0.1)">{ic("assistant",12,"#00BF6F")}'
        f'<span style="font-size:11px;flex:1;color:#121212">Requirements Gathering</span></div>'
        f'<div class="tree-item" style="color:#6E6E6E">{ic("assistant",12,"#6E6E6E")}'
        f'<span style="font-size:11px;flex:1">Technical Specification</span></div>'
        f'<div class="tree-item" style="color:#6E6E6E">{ic("assistant",12,"#6E6E6E")}'
        f'<span style="font-size:11px;flex:1">NLU Training Phrases</span></div></div>'
        f'<div class="tree-item" style="margin:4px;opacity:0.7">{ic("folder",13,"#00BF6F")}'
        f'<span style="font-size:12px;font-weight:600;flex:1">IT Asset Lifecycle</span>'
        f'<span class="badge o" style="font-size:9px">Review</span></div>'
        f'<div class="tree-item" style="margin:4px;opacity:0.7">{ic("folder",13,"#00BF6F")}'
        f'<span style="font-size:12px;font-weight:600;flex:1">Change Accelerator</span>'
        f'<span class="badge g" style="font-size:9px">Published</span></div>'
        f'<div class="tree-item" style="margin:4px;opacity:0.7">{ic("folder",13,"#00BF6F")}'
        f'<span style="font-size:12px;font-weight:600;flex:1">Patch Compliance</span>'
        f'<span class="badge n" style="font-size:9px">Draft</span></div>'
        f'<button style="margin:8px;width:calc(100% - 16px);padding:7px;font-size:11px;color:#00BF6F;'
        f'border:1px dashed #00BF6F;background:transparent;border-radius:5px;cursor:pointer">'
        f'{ic("plus",10,"#00BF6F")} New Project</button>'
        f'</div></div>'
    )
    session = (
        f'<div class="panel" style="flex:1;min-width:0">'
        f'<div class="tabs"><button class="tab on">Requirements Gathering</button>'
        f'<button class="tab">Technical Specification</button>'
        f'<button class="tab">NLU Phrases</button></div>'
        f'<div style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px">'
        f'<div class="msg a" style="max-width:90%">Welcome to Creator Studio. I will help you design the Employee Onboarding Automation. Let us start with requirements — please describe what the automation should accomplish in plain English.</div>'
        f'<div class="msg u" style="align-self:flex-end;max-width:80%">When a new employee starts, I need the system to automatically create their AD account, provision access to the standard applications, assign them to the correct group, and send a welcome email with login instructions.</div>'
        f'<div class="msg a" style="max-width:90%">Understood. I have captured the following requirements:<br><br><strong>Trigger:</strong> New hire record created in ServiceNow HR module<br><strong>Actions:</strong><br>1. Create Active Directory user account with standard naming convention<br>2. Provision role-based access to 6 standard applications<br>3. Assign to department group (inferred from HR record)<br>4. Send personalised welcome email with credentials<br><br><strong>Assumptions:</strong> Manager approval is not required for standard new-hire provisioning. Role mapping is based on department code.<br><br>Are there any exceptions or conditional logic I should account for?</div>'
        f'<div class="msg u" style="align-self:flex-end;max-width:80%">Yes — for senior hires (grade 7+), manager must approve before account creation</div>'
        f'<div class="msg a" style="max-width:90%">Adding conditional approval gate for employees at grade 7 and above. This will pause the flow at the AD creation step, notify the line manager, and resume on approval. The specification now has 2 execution paths: standard and senior-hire. Ready to generate the technical specification?</div>'
        f'</div>'
        f'<div style="padding:10px 12px;border-top:1px solid #DCDCDC;display:flex;gap:8px;flex-shrink:0">'
        f'<input class="ci" placeholder="Continue refining requirements…">'
        f'<button class="btn p xs">{ic("send",11)}</button>'
        f'<button class="btn g xs">Generate Spec</button>'
        f'<button class="btn g xs">Submit for Review</button></div></div>'
    )
    return f'<div class="three-col">{tree}{session}</div>'

# ── Module 5: Governance Control ──────────────────────────────────────────────
def m5():
    # Access tab content
    access_rows = [
        ("Nassim Louzaoui","NL","Administrator","All Modules","Active","Full"),
        ("David Chen","DC","Governance","Governance Control · Leadership Insights","Active","Governance"),
        ("Priya Nair","PN","Creator","Creator Studio · Operations Workspace","Active","Creator"),
        ("Sarah Mitchell","SM","Operations Team","Operations Workspace · Agentic Workspace","Active","Operations"),
        ("James Hartley","JH","Developer","Developer Hub · Creator Studio","Active","Developer"),
        ("Marcus Webb","MW","Leadership","Leadership Insights","Active","Leadership"),
        ("Anna Torres","AT","Operations Team","Operations Workspace","Pending","Operations"),
    ]
    access_tbody = ""
    for name, initials, role, modules, status, level in access_rows:
        bc = "g" if status == "Active" else "o"
        access_tbody += (
            f'<tr><td><div style="display:flex;align-items:center;gap:8px">'
            f'<div class="avatar" style="width:26px;height:26px;font-size:9px">{initials}</div>'
            f'<span style="font-weight:600">{name}</span></div></td>'
            f'<td style="color:#6E6E6E;font-size:11px">{role}</td>'
            f'<td style="color:#6E6E6E;font-size:11px">{modules}</td>'
            f'<td><span class="badge {bc}">{status}</span></td>'
            f'<td><div style="display:flex;gap:5px">'
            f'<button class="btn g xs">{ic("settings",10)} Manage</button>'
            f'<button class="btn g xs" style="color:#D9534F;border-color:#D9534F">{ic("remove",10,"#D9534F")}</button>'
            f'</div></td></tr>'
        )

    pending = (
        f'<div style="flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden">'
        f'<div class="tabs">'
        f'<button class="tab on">Pending Actions<span class="tab-cnt w">3</span></button>'
        f'<button class="tab">Group Management<span class="tab-cnt">7</span></button>'
        f'<button class="tab">Access<span class="tab-cnt">7</span></button>'
        f'</div>'
        # Pending Actions tab content
        f'<div style="flex:1;overflow-y:auto;background:#fff;border:1px solid #DCDCDC;border-top:none;border-radius:0 0 8px 8px">'
        f'<div class="action-row" style="background:rgba(0,191,111,0.03)">'
        f'<div style="width:40px;height:40px;border-radius:8px;background:rgba(0,124,195,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0">{ic("automation",16,"#007CC3")}</div>'
        f'<div style="flex:1"><div class="action-type">Automation Initiative</div>'
        f'<div class="action-title">Employee Onboarding Automation</div>'
        f'<div class="action-meta">Submitted by Nassim Louzaoui · Creator Studio · 2h ago · Requires governance approval before implementation</div>'
        f'<div style="margin-top:6px;display:flex;gap:8px"><span class="badge b">Draft ready</span>'
        f'<span style="font-size:10px;color:#6E6E6E;align-self:center">2 execution paths · Grade 7+ conditional logic</span></div></div>'
        f'<div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">'
        f'<button class="btn p xs">{ic("approve",11)} Approve</button>'
        f'<button class="btn g xs">{ic("reject",11)} Reject</button></div></div>'
        f'<div class="action-row">'
        f'<div style="width:40px;height:40px;border-radius:8px;background:rgba(229,115,35,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0">{ic("key",16,"#E57323")}</div>'
        f'<div style="flex:1"><div class="action-type">Access Request</div>'
        f'<div class="action-title">Developer Hub access — Sarah Mitchell</div>'
        f'<div class="action-meta">Submitted by IT Admin · 5h ago · Requesting developer-level artifact visibility</div>'
        f'<div style="margin-top:6px"><span class="badge o">Access elevation</span></div></div>'
        f'<div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">'
        f'<button class="btn p xs">{ic("approve",11)} Approve</button>'
        f'<button class="btn g xs">{ic("reject",11)} Reject</button></div></div>'
        f'<div class="action-row">'
        f'<div style="width:40px;height:40px;border-radius:8px;background:rgba(0,191,111,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0">{ic("group",16,"#00BF6F")}</div>'
        f'<div style="flex:1"><div class="action-type">Group Membership</div>'
        f'<div class="action-title">Add 3 users to Operations Intelligence Creator group</div>'
        f'<div class="action-meta">Requested by HR Manager · 1d ago · James Hartley, Priya Nair, Marcus Webb</div>'
        f'<div style="margin-top:6px"><span class="badge n">Bulk membership update</span></div></div>'
        f'<div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">'
        f'<button class="btn p xs">{ic("approve",11)} Approve</button>'
        f'<button class="btn g xs">{ic("reject",11)} Reject</button></div></div>'
        # Access tab summary (shown as info strip since tabs aren't interactive in static HTML)
        f'<div style="margin:12px;background:#F0F8FF;border:1px solid #C0DDEF;border-radius:7px;padding:10px 14px">'
        f'<div style="font-size:11px;font-weight:700;color:#007CC3;margin-bottom:6px">'
        f'{ic("shield",12,"#007CC3")} Access Management — 7 Active Users</div>'
        f'<table class="tbl"><thead><tr><th>User</th><th>Role</th><th>Module Access</th><th>Status</th><th></th></tr></thead>'
        f'<tbody>{access_tbody}</tbody></table>'
        f'<div style="margin-top:8px;display:flex;gap:8px">'
        f'<button class="btn p xs">{ic("plus",10)} Grant Access</button>'
        f'<button class="btn g xs">{ic("group",10)} Review All Roles</button></div></div>'
        f'<div style="padding:10px 14px;border-top:1px solid #DCDCDC;background:#F8F9FB">'
        f'<div style="font-size:10px;color:#6E6E6E">Showing 3 of 3 pending items · Last refreshed 30s ago</div></div>'
        f'</div></div>'
    )
    ch = chat_panel("Governance Assistant","Manage approvals and group governance",[
        ("a","3 items are awaiting your decision. The Employee Onboarding initiative has been through Creator Studio review and is ready for governance approval."),
        ("u","What is the risk level of the Employee Onboarding Automation?"),
        ("a","Risk assessment: LOW–MEDIUM.\n\n· Scope: Internal provisioning only — no external system writes\n· Reversibility: Full rollback available at each step\n· Access impact: Standard role group only (no elevated privileges)\n· Senior-hire gate: Manager approval adds a control point for grade 7+\n\nNo compliance flags identified. Safe to approve."),
    ])
    return f'<div class="two-col">{pending}{ch}</div>'

# ── Module 6: Leadership Insights ─────────────────────────────────────────────
def m6():
    kpis = (
        f'<div class="kpi-grid">'
        f'<div class="kpi"><div class="kpi-val">14</div><div class="kpi-lbl">Automations Live</div></div>'
        f'<div class="kpi"><div class="kpi-val" style="color:#E57323">3</div><div class="kpi-lbl">Pending Review</div></div>'
        f'<div class="kpi"><div class="kpi-val">8</div><div class="kpi-lbl">In Development</div></div>'
        f'<div class="kpi"><div class="kpi-val" style="color:#00895E">94%</div><div class="kpi-lbl">Automation Success Rate</div></div>'
        f'</div>'
    )
    pipeline = (
        f'<div class="panel" style="margin-bottom:12px">'
        f'<div class="panel-hdr"><span class="panel-title">Initiative Pipeline</span>'
        f'<span class="badge n">Jun 2025</span></div>'
        f'<table class="tbl"><thead><tr><th>Initiative</th><th>Creator</th><th>Stage</th><th>Progress</th><th>Status</th></tr></thead>'
        f'<tbody>'
        f'<tr><td style="font-weight:600">Employee Onboarding Automation</td><td style="color:#6E6E6E">N. Louzaoui</td><td><span class="badge b">Governance Review</span></td><td><div class="prog-bar" style="width:100px"><div class="prog-fill" style="width:60%"></div></div></td><td><span class="badge o">Pending</span></td></tr>'
        f'<tr><td style="font-weight:600">IT Asset Lifecycle Management</td><td style="color:#6E6E6E">D. Chen</td><td><span class="badge n">Leadership Review</span></td><td><div class="prog-bar" style="width:100px"><div class="prog-fill" style="width:80%"></div></div></td><td><span class="badge o">Pending</span></td></tr>'
        f'<tr><td style="font-weight:600">Change Request Accelerator</td><td style="color:#6E6E6E">P. Nair</td><td><span class="badge g">Approved</span></td><td><div class="prog-bar" style="width:100px"><div class="prog-fill" style="width:100%"></div></div></td><td><span class="badge g">Live</span></td></tr>'
        f'<tr><td style="font-weight:600">Patch Compliance Reporter</td><td style="color:#6E6E6E">M. Webb</td><td><span class="badge n">Creator Studio</span></td><td><div class="prog-bar" style="width:100px"><div class="prog-fill" style="width:30%"></div></div></td><td><span class="badge n">Draft</span></td></tr>'
        f'</tbody></table></div>'
    )
    review = (
        f'<div class="panel" style="margin-bottom:12px">'
        f'<div class="panel-hdr"><span class="panel-title">Pending Leadership Decision — IT Asset Lifecycle Management</span></div>'
        f'<div style="padding:12px 14px;border-bottom:1px solid #F0F2F5">'
        f'<div style="font-size:10px;font-weight:700;color:#6E6E6E;text-transform:uppercase;margin-bottom:5px">Initiative Summary</div>'
        f'<div style="font-size:12px;color:#121212;line-height:1.5">Tracks hardware assets from procurement through decommission, consolidating data from ServiceNow, Flexera, and the procurement system into a unified lifecycle view with automated compliance alerts.</div></div>'
        f'<div style="padding:12px 14px;display:flex;gap:7px">'
        f'<textarea style="flex:1;padding:7px 10px;border:1px solid #DCDCDC;border-radius:5px;font-size:12px;resize:none;height:52px;font-family:inherit" placeholder="Add approval notes or feedback…"></textarea>'
        f'<div style="display:flex;flex-direction:column;gap:6px">'
        f'<button class="btn p xs">{ic("approve",11)} Approve</button>'
        f'<button class="btn g xs">{ic("reject",11)} Reject</button></div></div></div>'
    )
    left = f'<div style="flex:1;min-width:0;overflow-y:auto">{kpis}{pipeline}{review}</div>'
    ch = chat_panel("Leadership Assistant","Strategic oversight and initiative intelligence",[
        ("a","Good morning. You have 2 initiatives awaiting your decision and 14 automations running at 94% success rate."),
        ("u","What is the current pipeline status?"),
        ("a","Pipeline summary as of today:\n\n· 14 automations live and operational\n· 3 initiatives in governance or leadership review\n· 8 in active development in Creator Studio\n· Estimated 4 new automations ready for approval this quarter\n\nIT Asset Lifecycle is the highest-priority pending decision — 5-day SLA expires in 2 days."),
    ])
    return f'<div class="two-col">{left}{ch}</div>'

# ── Module 7: Developer Hub ────────────────────────────────────────────────────
def m7():
    left = (
        f'<div style="flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden">'
        f'<div class="tabs">'
        f'<button class="tab on">Application Inventory</button>'
        f'<button class="tab">Execution Journal<span class="tab-cnt">1,247</span></button>'
        f'</div>'
        f'<div class="tabs" style="border-top:1px solid #E8E8E8;padding:0 4px">'
        f'<button class="tab on" style="font-size:11px;padding:8px 12px">Tables<span class="tab-cnt">8</span></button>'
        f'<button class="tab" style="font-size:11px;padding:8px 12px">Script Includes<span class="tab-cnt">12</span></button>'
        f'<button class="tab" style="font-size:11px;padding:8px 12px">Business Rules<span class="tab-cnt">6</span></button>'
        f'<button class="tab" style="font-size:11px;padding:8px 12px">Scheduled Jobs<span class="tab-cnt">4</span></button>'
        f'<button class="tab" style="font-size:11px;padding:8px 12px">Properties<span class="tab-cnt">15</span></button>'
        f'<button class="tab" style="font-size:11px;padding:8px 12px">Roles<span class="tab-cnt">5</span></button>'
        f'</div>'
        f'<div style="flex:1;overflow:hidden;display:flex;gap:0">'
        f'<div style="flex:1;overflow-y:auto;border-right:1px solid #DCDCDC;background:#fff">'
        f'<table class="tbl"><thead><tr><th>Table Name</th><th>API Name</th><th>Records</th><th>Updated</th></tr></thead>'
        f'<tbody>'
        f'<tr style="background:rgba(0,191,111,0.04);border-left:3px solid #00BF6F"><td style="font-weight:600;color:#007CC3;cursor:pointer">Service Catalog Items</td><td><code>x_infte_ops_int_catalog_item</code></td><td>24</td><td style="color:#6E6E6E;font-size:11px">1d ago</td></tr>'
        f'<tr><td style="font-weight:600;cursor:pointer">Service Catalog Categories</td><td><code>x_infte_ops_int_catalog_category</code></td><td>5</td><td style="color:#6E6E6E;font-size:11px">1d ago</td></tr>'
        f'<tr><td style="font-weight:600;cursor:pointer">Creator Projects</td><td><code>x_infte_ops_int_creator_project</code></td><td>4</td><td style="color:#6E6E6E;font-size:11px">5d ago</td></tr>'
        f'<tr><td style="font-weight:600;cursor:pointer">Creator Sessions</td><td><code>x_infte_ops_int_creator_session</code></td><td>11</td><td style="color:#6E6E6E;font-size:11px">2d ago</td></tr>'
        f'<tr><td style="font-weight:600;cursor:pointer">Persons</td><td><code>x_infte_ops_int_person</code></td><td>18</td><td style="color:#6E6E6E;font-size:11px">1d ago</td></tr>'
        f'<tr><td style="font-weight:600;cursor:pointer">Audit Events</td><td><code>x_infte_ops_int_audit</code></td><td>3,841</td><td style="color:#6E6E6E;font-size:11px">1h ago</td></tr>'
        f'<tr><td style="font-weight:600;cursor:pointer">Governance Actions</td><td><code>x_infte_ops_int_gov_action</code></td><td>9</td><td style="color:#6E6E6E;font-size:11px">5h ago</td></tr>'
        f'<tr><td style="font-weight:600;cursor:pointer">Notification Queue</td><td><code>x_infte_ops_int_notification</code></td><td>142</td><td style="color:#6E6E6E;font-size:11px">1d ago</td></tr>'
        f'</tbody></table></div>'
        f'<div style="width:300px;background:#F8F9FB;overflow-y:auto;padding:12px">'
        f'<div style="font-size:11px;font-weight:700;color:#6E6E6E;text-transform:uppercase;margin-bottom:8px">Table Detail — Service Catalog Items</div>'
        f'<div style="background:#fff;border:1px solid #DCDCDC;border-radius:7px;padding:10px;margin-bottom:8px">'
        f'<div style="font-size:11px;font-weight:600;color:#121212;margin-bottom:6px">Schema</div>'
        f'<div style="font-size:11px;color:#6E6E6E;line-height:1.8"><code>name</code> — String(128)<br><code>category</code> — Reference(catalog_category)<br><code>action_type</code> — Choice(flow, script)<br><code>is_active</code> — Boolean<br><code>run_count</code> — Integer</div></div>'
        f'<div style="background:#fff;border:1px solid #DCDCDC;border-radius:7px;padding:10px">'
        f'<div style="font-size:11px;font-weight:600;color:#121212;margin-bottom:6px">Recent Records (24)</div>'
        f'<div style="font-size:11px;color:#007CC3;margin-bottom:3px;cursor:pointer">Employee Onboarding Automation</div>'
        f'<div style="font-size:11px;color:#007CC3;margin-bottom:3px;cursor:pointer">Password Reset Flow</div>'
        f'<div style="font-size:11px;color:#007CC3;margin-bottom:3px;cursor:pointer">New Hardware Request</div>'
        f'<div style="font-size:11px;color:#6E6E6E">+ 21 more…</div></div>'
        f'</div></div></div>'
    )
    ch = chat_panel("Developer Assistant","Inspect artifacts and debug the solution",[
        ("a","Developer Hub is loaded. 117 operations documented across 8 tables, 12 Script Includes, and 6 Business Rules in scope x_infte_ops_int."),
        ("u","Show me the CreatorAssistBridge Script Include"),
        ("a","CreatorAssistBridge — Script Include\nScope: x_infte_ops_int\nUpdated: 2 days ago\n\nPublic methods:\n· generateSpec(artifactType, requirements, partialSpec, personSysId)\n· generatePhrases(structuredSpecJson, personSysId)\n· hasActiveToken(personSysId)\n\nCalls x_infte_ops_int.assist_api_endpoint via REST. Requires active token in Persons table."),
    ])
    return f'<div class="two-col">{left}{ch}</div>'

# ── Module 8: Administrator Hub ───────────────────────────────────────────────
def m8():
    left = (
        f'<div style="flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden">'
        f'<div class="tabs">'
        f'<button class="tab on">Service Catalog</button>'
        f'<button class="tab">Maintenance Controls</button>'
        f'<button class="tab">System Overview</button>'
        f'</div>'
        f'<div style="flex:1;overflow-y:auto;background:#fff;border:1px solid #DCDCDC;border-top:none;border-radius:0 0 8px 8px">'
        f'<div style="padding:10px 12px;border-bottom:1px solid #DCDCDC;display:flex;justify-content:space-between;align-items:center">'
        f'<span style="font-size:12px;font-weight:600;color:#121212">Manage service catalog categories and items</span>'
        f'<button class="btn p xs">{ic("plus",10)} New Category</button></div>'
        # Category 1: Knowledge Management
        f'<div style="border-bottom:1px solid #DCDCDC">'
        f'<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:#F8F9FB;border-bottom:1px solid #DCDCDC">'
        f'{ic("folder",13,"#007CC3")}<span style="font-size:12px;font-weight:600;color:#007CC3;flex:1">Knowledge Management</span>'
        f'<button class="btn g xs">{ic("plus",10)} Item</button>'
        f'<button style="padding:3px 6px;border:none;background:transparent;color:#D9534F;cursor:pointer">{ic("remove",11,"#D9534F")}</button></div>'
        f'<table class="tbl"><thead><tr><th>Name</th><th>Description</th><th>Type</th><th>Status</th><th></th></tr></thead>'
        f'<tbody>'
        f'<tr><td style="font-weight:600">Knowledge Base Search</td><td style="color:#6E6E6E;font-size:11px">Search the full knowledge base for solutions</td><td><code>flow</code></td><td><span class="badge g">Live</span></td><td><button style="padding:3px 6px;border:none;background:transparent;color:#D9534F;cursor:pointer">{ic("remove",11,"#D9534F")}</button></td></tr>'
        f'<tr><td style="font-weight:600">Submit Knowledge Article</td><td style="color:#6E6E6E;font-size:11px">Contribute a new knowledge article for review</td><td><code>flow</code></td><td><span class="badge g">Live</span></td><td><button style="padding:3px 6px;border:none;background:transparent;color:#D9534F;cursor:pointer">{ic("remove",11,"#D9534F")}</button></td></tr>'
        f'</tbody></table></div>'
        # Category 2: ITSM Operations (with inline add form)
        f'<div style="border-bottom:1px solid #DCDCDC">'
        f'<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:#F8F9FB;border-bottom:1px solid #DCDCDC">'
        f'{ic("folder",13,"#00BF6F")}<span style="font-size:12px;font-weight:600;color:#00BF6F;flex:1">ITSM Operations</span>'
        f'<button class="btn g xs">{ic("plus",10)} Item</button>'
        f'<button style="padding:3px 6px;border:none;background:transparent;color:#D9534F;cursor:pointer">{ic("remove",11,"#D9534F")}</button></div>'
        f'<div style="padding:10px 14px;display:flex;gap:8px;flex-shrink:0;border-bottom:1px solid #DCDCDC;background:#FAFCFE">'
        f'<div style="flex:1"><input style="width:100%;padding:6px 10px;border:1px solid #00BF6F;border-radius:5px;font-size:12px;font-family:inherit" placeholder="New item name…"></div>'
        f'<input style="width:200px;padding:6px 10px;border:1px solid #DCDCDC;border-radius:5px;font-size:12px;font-family:inherit" placeholder="Description…">'
        f'<select style="padding:6px 10px;border:1px solid #DCDCDC;border-radius:5px;font-size:12px;font-family:inherit"><option>flow</option><option>script</option><option>scheduled</option></select>'
        f'<button class="btn p xs">Add</button></div>'
        f'<table class="tbl"><thead><tr><th>Name</th><th>Description</th><th>Type</th><th>Status</th><th></th></tr></thead>'
        f'<tbody>'
        f'<tr><td style="font-weight:600">Incident Report</td><td style="color:#6E6E6E;font-size:11px">Raise a new incident through the platform</td><td><code>flow</code></td><td><span class="badge g">Live</span></td><td><button style="padding:3px 6px;border:none;background:transparent;color:#D9534F;cursor:pointer">{ic("remove",11,"#D9534F")}</button></td></tr>'
        f'<tr><td style="font-weight:600">Password Reset</td><td style="color:#6E6E6E;font-size:11px">Self-service reset across identity systems</td><td><code>flow</code></td><td><span class="badge g">Live</span></td><td><button style="padding:3px 6px;border:none;background:transparent;color:#D9534F;cursor:pointer">{ic("remove",11,"#D9534F")}</button></td></tr>'
        f'<tr><td style="font-weight:600">Application Access Request</td><td style="color:#6E6E6E;font-size:11px">Request access to an application or system</td><td><code>flow</code></td><td><span class="badge g">Live</span></td><td><button style="padding:3px 6px;border:none;background:transparent;color:#D9534F;cursor:pointer">{ic("remove",11,"#D9534F")}</button></td></tr>'
        f'</tbody></table></div>'
        # Category 3: ITAM Operations
        f'<div>'
        f'<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:#F8F9FB;border-bottom:1px solid #DCDCDC">'
        f'{ic("folder",13,"#E57323")}<span style="font-size:12px;font-weight:600;color:#E57323;flex:1">ITAM Operations</span>'
        f'<button class="btn g xs">{ic("plus",10)} Item</button>'
        f'<button style="padding:3px 6px;border:none;background:transparent;color:#D9534F;cursor:pointer">{ic("remove",11,"#D9534F")}</button></div>'
        f'<table class="tbl"><thead><tr><th>Name</th><th>Description</th><th>Type</th><th>Status</th><th></th></tr></thead>'
        f'<tbody>'
        f'<tr><td style="font-weight:600">New Hardware Request</td><td style="color:#6E6E6E;font-size:11px">Request a laptop, monitor or peripheral device</td><td><code>flow</code></td><td><span class="badge g">Live</span></td><td><button style="padding:3px 6px;border:none;background:transparent;color:#D9534F;cursor:pointer">{ic("remove",11,"#D9534F")}</button></td></tr>'
        f'<tr><td style="font-weight:600">Software License Request</td><td style="color:#6E6E6E;font-size:11px">Request a commercial software licence</td><td><code>flow</code></td><td><span class="badge g">Live</span></td><td><button style="padding:3px 6px;border:none;background:transparent;color:#D9534F;cursor:pointer">{ic("remove",11,"#D9534F")}</button></td></tr>'
        f'<tr><td style="font-weight:600">Asset Decommission</td><td style="color:#6E6E6E;font-size:11px">Retire and securely wipe end-of-life assets</td><td><code>flow</code></td><td><span class="badge o">Pending</span></td><td><button style="padding:3px 6px;border:none;background:transparent;color:#D9534F;cursor:pointer">{ic("remove",11,"#D9534F")}</button></td></tr>'
        f'</tbody></table></div>'
        f'</div></div>'
    )
    ch = chat_panel("Administrator Assistant","Configure and maintain the solution",[
        ("a","Administrator Hub is active. 5 service catalog categories across 24 items. 3 system properties require your attention."),
        ("u","What needs attention today?"),
        ("a","3 items flagged:\n\n1. assist_api_endpoint property is empty — Creator Assistant will not function until this is set\n2. 2 service items in Pending status — awaiting governance approval before activation\n3. Notification queue has 142 items — 4 failed in the last 24h\n\nWould you like me to guide you through resolving any of these?"),
    ])
    return f'<div class="two-col">{left}{ch}</div>'

MODULES = [
    ("workspace",           "Operations Workspace",   m1, "Operations Team"),
    ("automations",         "Automations Workspace",  m2, ""),
    ("agentic-workspace",   "Agentic Workspace",      m3, ""),
    ("creator-studio",      "Creator Studio",         m4, "Creator"),
    ("governance-control",  "Governance Control",     m5, "Governance"),
    ("leadership-insights", "Leadership Insights",    m6, "Leadership"),
    ("developer-hub",       "Developer Hub",          m7, "Developer"),
    ("admin-hub",           "Administrator Hub",      m8, "Administrator"),
]

print("Writing HTML files…")
for mid, label, fn, role in MODULES:
    html = page(mid, label, fn(), role)
    p = os.path.join(HTML_DIR, f"{mid}.html")
    with open(p, "w") as f:
        f.write(html)
    print(f"  {mid}.html")

# ─────────────────────────────────────────────────────────────
# PART 2 — SCREENSHOTS
# ─────────────────────────────────────────────────────────────
print("\nScreenshots…")
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    br = pw.chromium.launch()
    ctx = br.new_context(viewport={"width":1600,"height":900}, ignore_https_errors=True)
    pg = ctx.new_page()
    for mid, label, fn, role in MODULES:
        pg.goto(f"file://{HTML_DIR}/{mid}.html", wait_until="domcontentloaded")
        time.sleep(0.5)
        pg.screenshot(path=f"{SHOT_DIR}/{mid}.png", full_page=False)
        print(f"  {mid}.png")
    ctx.close()
    br.close()
print("Screenshots done.")

# ─────────────────────────────────────────────────────────────
# PART 3 — PROTOTYPE PRESENTATION v5
# ─────────────────────────────────────────────────────────────
print("\nBuilding prototype PPTX v5…")

src_prs = Presentation(SOURCE)
W = src_prs.slide_width
H = src_prs.slide_height

logo_bytes = None
for shape in src_prs.slides[0].shapes:
    if shape.shape_type == 13 and shape.left and shape.left / IN > 8.5:
        logo_bytes = shape.image.blob
        break

def blank(prs):
    sl = prs.slides.add_slide(prs.slide_layouts[0])
    for ph in list(sl.placeholders):
        ph._element.getparent().remove(ph._element)
    return sl

def txb(sl, l, t, w, h, text, sz, bold=False, color=None, align=PP_ALIGN.LEFT, italic=False):
    box = sl.shapes.add_textbox(int(l*IN), int(t*IN), int(w*IN), int(h*IN))
    tf = box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.alignment = align
    r = p.add_run()
    r.text = text
    r.font.size = Pt(sz)
    r.font.bold = bold
    r.font.italic = italic
    r.font.name = "Arial"
    if color:
        r.font.color.rgb = color
    return box

def rect(sl, l, t, w, h, fill=None, line=None):
    sh = sl.shapes.add_shape(1, int(l*IN), int(t*IN), int(w*IN), int(h*IN))
    if fill:
        sh.fill.solid()
        sh.fill.fore_color.rgb = fill
    else:
        sh.fill.background()
    if line:
        sh.line.color.rgb = line
        sh.line.width = Pt(0.5)
    else:
        sh.line.fill.background()
    return sh

def add_logo_and_page(sl, page_num):
    if logo_bytes:
        sl.shapes.add_picture(io.BytesIO(logo_bytes),
                              int(8.98*IN), int(5.10*IN),
                              int(0.99*IN), int(0.51*IN))
    txb(sl, 0.25, 5.20, 0.51, 0.31, str(page_num), 10, color=LGREY)

def add_accent_bars(sl):
    rect(sl, -0.01, 2.32, 0.11, 0.95, fill=BLUE)
    rect(sl, 9.90, 2.32, 0.11, 0.95, fill=BLUE)

def copy_slide(src_prs, idx, tgt_prs):
    src_sl = src_prs.slides[idx]
    tgt_sl = blank(tgt_prs)
    for shape in src_sl.shapes:
        if shape.shape_type == 13:
            img_data = shape.image.blob
            tgt_sl.shapes.add_picture(io.BytesIO(img_data),
                                       shape.left, shape.top,
                                       shape.width, shape.height)
        else:
            el = copy.deepcopy(shape._element)
            tgt_sl.shapes._spTree.append(el)
    return tgt_sl

proto = Presentation()
proto.slide_width = W
proto.slide_height = H

copy_slide(src_prs, 0, proto)
print("  Slide 1: Cover")

sl2 = blank(proto)
sl2.background.fill.solid()
sl2.background.fill.fore_color.rgb = WHITE
add_accent_bars(sl2)
txb(sl2, 0.22, 0.16, 9.54, 0.50, "Prototype — Portal Showcase", 20, color=GREY)
rect(sl2, 0.22, 0.72, 9.56, 0.01, fill=RGBColor(0xD9,0xD9,0xD9))

sections = [
    ("What you are about to see",
     "The following slides present the Operations Intelligence portal prototype running on the development ServiceNow instance. Each slide captures one of the eight navigation modules, demonstrating the unified role-based interface as built."),
    ("Portal access and roles",
     "All authenticated ServiceNow users reach the portal at a single URL. Navigation adapts to role: Operations Team members see the service catalog; Creators access Creator Studio; Governance, Leadership, Developer, and Administrator roles each see their designated module."),
    ("Eight modules in scope",
     "Operations Workspace  ·  Automations Workspace  ·  Agentic Workspace  ·  Creator Studio  ·  Governance Control  ·  Leadership Insights  ·  Developer Hub  ·  Administrator Hub"),
    ("Development status",
     "Early-stage prototype under active development. Core portal, governance, creator studio, and the operations assistant are deployed. UI refinements and end-to-end workflow validation are in progress."),
]
y = 0.88
for heading, body in sections:
    rect(sl2, 0.22, y, 0.06, 0.20, fill=BLUE)
    txb(sl2, 0.36, y, 9.40, 0.22, heading, 10, bold=True, color=DBLUE)
    y += 0.24
    txb(sl2, 0.36, y, 9.40, 0.44, body, 9, color=MGREY)
    y += 0.52
add_logo_and_page(sl2, 2)
print("  Slide 2: Explanation")

CAPTIONS = [
    "Operations Workspace — the unified service catalog where operations team members browse and submit service requests across Knowledge Management, ITSM, ITAM, HR Services, and Finance categories, with an intelligent assistant providing guidance.",
    "Automations Workspace — a searchable, filterable catalog of all platform automations across service categories, giving every authorised user complete visibility of available automated capabilities.",
    "Agentic Workspace — a launch pad for embedded platform workspaces (CMDB and Service Operations) paired with an intelligent agentic assistant capable of cross-platform reasoning and real-time incident correlation.",
    "Creator Studio — a structured three-pane environment where designated creators design automation initiatives through AI-guided conversations, producing technical specifications and NLU training phrases ready for governance review.",
    "Governance Control — the approval and access management hub where governance administrators review pending initiatives, manage user access to platform roles, and control group membership.",
    "Leadership Insights — an executive dashboard presenting real-time KPIs, the full initiative pipeline, and a review interface for leadership to approve or provide feedback on pending automation proposals.",
    "Developer Hub — a technical artifact browser providing developers with full visibility of all tables, Script Includes, Business Rules, Scheduled Jobs, and system properties within the scoped application.",
    "Administrator Hub — the administration console for managing the service catalog structure, configuring system maintenance controls, and monitoring overall platform health and notification status.",
]

FOOTER_H = 0.515

for i, (mid, label, fn, role) in enumerate(MODULES):
    shot = f"{SHOT_DIR}/{mid}.png"
    sl = blank(proto)
    img_h = int((H/IN - FOOTER_H) * IN)
    sl.shapes.add_picture(shot, 0, 0, W, img_h)
    rect(sl, 0, H/IN - FOOTER_H, W/IN, FOOTER_H, fill=BLUE)
    txb(sl, 0.18, H/IN - FOOTER_H + 0.07, 8.50, FOOTER_H - 0.10,
        CAPTIONS[i], 9, color=WHITE)
    txb(sl, 9.50, H/IN - FOOTER_H + 0.10, 0.40, 0.30,
        str(i+3), 9, color=RGBColor(0xCC,0xE4,0xF5), align=PP_ALIGN.RIGHT)
    if logo_bytes:
        sl.shapes.add_picture(io.BytesIO(logo_bytes),
                              int(8.60*IN), int((H/IN - FOOTER_H + 0.02)*IN),
                              int(0.90*IN), int(0.47*IN))
    print(f"  Slide {i+3}: {label}")

copy_slide(src_prs, 10, proto)
print("  Slide 11: Closing")

proto.save(PR_OUT)
print(f"\nPrototype saved: {PR_OUT}")

# ─────────────────────────────────────────────────────────────
# PART 4 — OVERVIEW PRESENTATION v6
# ─────────────────────────────────────────────────────────────
print("\nFixing overview PPTX…")

ov = Presentation(SOURCE)

def fix_font(slide, old_pt, new_pt):
    for shape in slide.shapes:
        if shape.has_text_frame:
            for para in shape.text_frame.paragraphs:
                for run in para.runs:
                    if run.font.size and abs(run.font.size/12700 - old_pt) < 0.2:
                        run.font.size = Pt(new_pt)

def reflow_tiles(slide, first_top, orig_step, num_tiles, orig_h, target_bottom=5.00, gap=None):
    if gap is None:
        gap = orig_step - orig_h
    total = target_bottom - first_top
    new_h = (total - (num_tiles - 1) * gap) / num_tiles
    new_step = new_h + gap
    for shape in slide.shapes:
        t = shape.top / IN
        l = shape.left / IN
        if l < 0.06 or l > 9.80:
            continue
        for idx in range(num_tiles):
            old_tile_top = first_top + idx * orig_step
            if old_tile_top - 0.06 <= t < old_tile_top + orig_h + 0.06:
                new_tile_top = first_top + idx * new_step
                shift = new_tile_top - old_tile_top
                shape.top = int(shape.top + shift * IN)
                w = shape.width / IN
                h = shape.height / IN
                if w > 9.0 and not (shape.has_text_frame and shape.text_frame.text.strip()):
                    shape.height = int(new_h * IN)
                elif shape.has_text_frame and h >= orig_h - 0.05:
                    shape.height = int(new_h * IN)
                break

slide3 = ov.slides[2]
for shape in slide3.shapes:
    t = shape.top / IN
    h = shape.height / IN
    l = shape.left / IN
    if 1.05 <= t <= 1.15 and h >= 3.40 and l > 0.10:
        shape.height = int(3.90 * IN)

slide4 = ov.slides[3]
reflow_tiles(slide4, first_top=0.78, orig_step=1.00, num_tiles=4, orig_h=0.86, gap=0.14)
fix_font(slide4, 10.5, 9.0)

slide5 = ov.slides[4]
reflow_tiles(slide5, first_top=0.76, orig_step=0.86, num_tiles=5, orig_h=0.80, gap=0.06)
fix_font(slide5, 10.5, 9.5)

for sidx in [5, 6]:
    sl = ov.slides[sidx]
    for shape in sl.shapes:
        t = shape.top / IN
        h = shape.height / IN
        w = shape.width / IN
        if 3.14 <= t <= 3.22 and h >= 1.50 and w >= 4.0:
            shape.height = int((5.00 - t) * IN)

slide8 = ov.slides[7]
reflow_tiles(slide8, first_top=1.04, orig_step=0.94, num_tiles=4, orig_h=0.86, target_bottom=5.00, gap=0.08)

slide9 = ov.slides[8]
for shape in slide9.shapes:
    t = shape.top / IN
    h = shape.height / IN
    l = shape.left / IN
    if 1.48 <= t <= 1.56 and h >= 2.50 and l >= 0.18:
        shape.height = int(3.48 * IN)

# Fix slide 10 (idx 9): Source Repository — clip any overlapping elements at bottom
slide10 = ov.slides[9]
MAX_BOTTOM = 4.92
for shape in slide10.shapes:
    if not hasattr(shape, 'top') or not hasattr(shape, 'height'):
        continue
    t = shape.top / IN
    h = shape.height / IN
    bottom = t + h
    if bottom > MAX_BOTTOM and t < MAX_BOTTOM:
        new_h = MAX_BOTTOM - t
        if new_h > 0.08:
            shape.height = int(new_h * IN)
        else:
            shape.top = int(MAX_BOTTOM * IN)
            shape.height = int(0.08 * IN)

# Reduce all-caps headers that may wrap
for sidx in range(len(ov.slides)):
    sl = ov.slides[sidx]
    for shape in sl.shapes:
        if not shape.has_text_frame:
            continue
        for para in shape.text_frame.paragraphs:
            for run in para.runs:
                if run.text and run.text.isupper() and len(run.text) > 22:
                    if run.font.size and run.font.size/12700 > 9.0:
                        run.font.size = Pt(8.5)

ov.save(OV_OUT)
print(f"Overview saved: {OV_OUT}")
print("\nAll done.")
