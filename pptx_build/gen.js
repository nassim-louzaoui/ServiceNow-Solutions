"use strict";

const PptxGenJS = require("/tmp/oi_work/ppt_skill/node_modules/pptxgenjs");
const fs   = require("fs");
const path = require("path");

const ASSETS_DIR = "/tmp/oi_work/ppt_skill";
const b64 = function(f) {
  return "image/png;base64," +
    fs.readFileSync(path.join(ASSETS_DIR, f)).toString("base64");
};

const LOGO_BR   = b64("logo-br.png");
const HDR_IMAGE = b64("cover-header.png");
const NAV_MAP   = b64("cover-nav-map.png");

var B = {
  blue      : "007CC3",
  blueDark  : "2670C3",
  white     : "FFFFFF",
  gray      : "595959",
  grayMid   : "7F7F7F",
  grayLight : "B8B8B8",
  grayLine  : "D9D9D9",
  lightBG   : "EBF4FB",
  veryLight : "F5FAFF",
  red       : "C62828",
  amber     : "E65100",
};
var F = "Arial";

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------
function addLogo(s) {
  s.addImage({ data: LOGO_BR, x: 8.985, y: 5.096, w: 0.9948, h: 0.5088 });
}

function addPageNum(s, n) {
  s.addText(String(n), {
    x: 0.25, y: 5.20, w: 0.51, h: 0.31,
    fontFace: F, fontSize: 10, color: B.grayLight,
  });
}

function addTitle(s, title) {
  s.addText(title, {
    x: 0.22, y: 0.16, w: 9.54, h: 0.50,
    fontFace: F, fontSize: 20, bold: false, color: B.gray,
  });
}

function addBookends(pptx, s) {
  var BW = 0.1140, BH = 0.9464, Y = 2.3228;
  s.addShape(pptx.shapes.RECTANGLE, {
    x: -0.0098, y: Y, w: BW, h: BH,
    fill: { color: B.blue }, line: { type: "none" },
  });
  s.addShape(pptx.shapes.RECTANGLE, {
    x: 9.8958, y: Y, w: BW, h: BH,
    fill: { color: B.blue }, line: { type: "none" },
  });
}

function addCoverBars(pptx, s) {
  var BW = 0.1140, BH = 0.9464, Y = 2.3558;
  var leftXs  = [-0.0098, 0.5596, 1.1289, 1.6982, 2.2675, 2.8368, 3.4061, 3.9754];
  var rightXs = [5.9106, 6.4800, 7.0493, 7.6186, 8.1879, 8.7572, 9.3265, 9.8958];
  leftXs.concat(rightXs).forEach(function(x) {
    s.addShape(pptx.shapes.RECTANGLE, {
      x: x, y: Y, w: BW, h: BH,
      fill: { color: B.blue }, line: { type: "none" },
    });
  });
}

function addThankYouBars(pptx, s) {
  var BW = 0.1140, BH = 0.9464, Y = 2.3228;
  var xs = [
    -0.0098, 0.5729, 1.1556, 1.7383, 2.3210, 2.9036, 3.4863,
     4.0690, 4.6517, 5.2344, 5.8170,
     6.3997, 6.9824, 7.5651, 8.1478, 8.7304,
     9.3131, 9.8958,
  ];
  xs.forEach(function(x) {
    s.addShape(pptx.shapes.RECTANGLE, {
      x: x, y: Y, w: BW, h: BH,
      fill: { color: B.blue }, line: { type: "none" },
    });
  });
}

// ---------------------------------------------------------------------------
// Slide 1 — Cover
// ---------------------------------------------------------------------------
function buildCover(pptx, title, subtitle) {
  var s = pptx.addSlide();
  s.background = { color: B.white };
  s.addImage({ data: HDR_IMAGE, x: 2.3, y: 0.14, w: 5.4, h: 0.61 });
  addCoverBars(pptx, s);
  s.addImage({ data: NAV_MAP, x: 4.5409, y: 0.9369, w: 0.9104, h: 3.7838 });
  s.addText(title, {
    x: 0.4177, y: 3.5642, w: 3.8, h: 1.2,
    fontFace: F, fontSize: 22, bold: true, color: B.blue,
    lineSpacingMultiple: 1.08,
  });
  if (subtitle) {
    s.addText(subtitle, {
      x: 0.4177, y: 4.80, w: 7.8, h: 0.28,
      fontFace: F, fontSize: 9.5, color: B.grayLight,
    });
  }
  addLogo(s);
}

// ---------------------------------------------------------------------------
// Slide 2 — Agenda (8 items, 4+4 symmetric)
// ---------------------------------------------------------------------------
function buildAgenda(pptx, items, pageNum) {
  var s = pptx.addSlide();
  s.background = { color: B.white };
  addBookends(pptx, s);
  addTitle(s, "Presentation Agenda");
  s.addShape(pptx.shapes.RECTANGLE, {
    x: 0.22, y: 0.70, w: 9.54, h: 0.012,
    fill: { color: B.grayLine }, line: { type: "none" },
  });

  var COL_W  = 4.68;
  var COL_L  = 0.22;
  var COL_R  = 5.10;
  var STEP   = 1.08;   // 4 rows each side, step 1.08 keeps last separator at 5.02" ✓

  items.forEach(function(it, i) {
    var col = i < 4 ? 0 : 1;
    var row = i < 4 ? i : i - 4;
    var x   = col === 0 ? COL_L : COL_R;
    var y   = 0.84 + row * STEP;

    s.addText(it[0], {
      x: x, y: y, w: 0.78, h: 0.88,
      fontFace: F, fontSize: 26, color: B.blue, bold: false,
      align: "center", valign: "middle",
    });
    s.addText(it[1], {
      x: x + 0.82, y: y + 0.18, w: COL_W - 0.82, h: 0.52,
      fontFace: F, fontSize: 11, color: B.gray, valign: "middle",
    });
    s.addShape(pptx.shapes.RECTANGLE, {
      x: x, y: y + 0.92, w: COL_W, h: 0.012,
      fill: { color: B.grayLine }, line: { type: "none" },
    });
  });

  addLogo(s);
  addPageNum(s, pageNum);
}

// ---------------------------------------------------------------------------
// Slide 3 — Environmental Context: Before / After
// ---------------------------------------------------------------------------
function buildBeforeAfterSlide(pptx, pageNum) {
  var s = pptx.addSlide();
  s.background = { color: B.white };
  addBookends(pptx, s);
  addTitle(s, "Environmental Context");

  var PANEL_Y    = 0.76;
  var HDR_H      = 0.34;
  var BODY_Y     = PANEL_Y + HDR_H;
  var BODY_H     = 3.54;
  var PANEL_W    = 4.40;
  var L_X        = 0.22;
  var R_X        = 5.38;
  var ARROW_X    = 4.64;
  var ARROW_W    = 0.72;
  var ITEM_START = BODY_Y + 0.18;
  var ITEM_STEP  = 0.82;
  var ITEM_H     = 0.62;
  var DOT_SIZE   = 0.10;

  // Left — TODAY
  s.addShape(pptx.shapes.RECTANGLE, {
    x: L_X, y: PANEL_Y, w: PANEL_W, h: HDR_H,
    fill: { color: B.gray }, line: { type: "none" },
  });
  s.addText("TODAY", {
    x: L_X + 0.14, y: PANEL_Y, w: PANEL_W - 0.14, h: HDR_H,
    fontFace: F, fontSize: 10, bold: true, color: B.white,
    valign: "middle", charSpacing: 1.0,
  });
  s.addShape(pptx.shapes.RECTANGLE, {
    x: L_X, y: BODY_Y, w: PANEL_W, h: BODY_H,
    fill: { color: B.veryLight }, line: { type: "none" },
  });

  // Right — WITH OPERATIONS INTELLIGENCE
  s.addShape(pptx.shapes.RECTANGLE, {
    x: R_X, y: PANEL_Y, w: PANEL_W, h: HDR_H,
    fill: { color: B.blue }, line: { type: "none" },
  });
  s.addText("WITH OPERATIONS INTELLIGENCE", {
    x: R_X + 0.14, y: PANEL_Y, w: PANEL_W - 0.14, h: HDR_H,
    fontFace: F, fontSize: 10, bold: true, color: B.white,
    valign: "middle", charSpacing: 0.6,
  });
  s.addShape(pptx.shapes.RECTANGLE, {
    x: R_X, y: BODY_Y, w: PANEL_W, h: BODY_H,
    fill: { color: B.lightBG }, line: { type: "none" },
  });

  // Arrow
  s.addText("→", {
    x: ARROW_X, y: BODY_Y + BODY_H / 2 - 0.24,
    w: ARROW_W, h: 0.48,
    fontFace: F, fontSize: 24, bold: true, color: B.blue,
    align: "center", valign: "middle",
  });

  var leftItems = [
    "Operations tasks rebuilt manually every cycle — no automation path exists",
    "Virtual Agent and platform automation capabilities entirely unused",
    "Data reconciliation between ServiceNow and external sources is manual",
    "Platform expertise held by a small number of individuals across all teams",
  ];
  var rightItems = [
    "Any recurring task automated once executes permanently on schedule",
    "A dedicated Virtual Agent provides natural-language access to all capabilities",
    "An automated layer maps and merges data sources without manual intervention",
    "Automation capability is embedded in the system and accessible to all teams",
  ];

  leftItems.forEach(function(text, i) {
    var iy = ITEM_START + i * ITEM_STEP;
    s.addShape(pptx.shapes.RECTANGLE, {
      x: L_X + 0.18, y: iy + 0.12, w: DOT_SIZE, h: DOT_SIZE,
      fill: { color: B.gray }, line: { type: "none" },
    });
    s.addText(text, {
      x: L_X + 0.36, y: iy, w: PANEL_W - 0.46, h: ITEM_H,
      fontFace: F, fontSize: 9.5, color: B.gray,
      valign: "middle", lineSpacingMultiple: 1.20,
    });
  });

  rightItems.forEach(function(text, i) {
    var iy = ITEM_START + i * ITEM_STEP;
    s.addShape(pptx.shapes.OVAL, {
      x: R_X + 0.18, y: iy + 0.12, w: DOT_SIZE, h: DOT_SIZE,
      fill: { color: B.blue }, line: { type: "none" },
    });
    s.addText(text, {
      x: R_X + 0.36, y: iy, w: PANEL_W - 0.46, h: ITEM_H,
      fontFace: F, fontSize: 9.5, color: B.gray,
      valign: "middle", lineSpacingMultiple: 1.20,
    });
  });

  addLogo(s);
  addPageNum(s, pageNum);
}

// ---------------------------------------------------------------------------
// Slide 4 — Problem Statement (4 rows)
// ---------------------------------------------------------------------------
function buildChallengesSlide(pptx, title, challenges, pageNum) {
  var s = pptx.addSlide();
  s.background = { color: B.white };
  addTitle(s, title);
  addBookends(pptx, s);

  var ROW_STEP = 1.0;
  var ROW_H    = 0.86;

  challenges.forEach(function(c, i) {
    var y  = 0.78 + i * ROW_STEP;
    var bg = i % 2 === 0 ? B.veryLight : B.lightBG;

    s.addShape(pptx.shapes.RECTANGLE, {
      x: 0.22, y: y, w: 9.56, h: ROW_H,
      fill: { color: bg }, line: { type: "none" },
    });
    s.addShape(pptx.shapes.RECTANGLE, {
      x: 0.22, y: y + 0.22, w: 0.72, h: 0.32,
      fill: { color: c.col || B.red }, line: { type: "none" },
    });
    s.addText(c.risk, {
      x: 0.22, y: y + 0.22, w: 0.72, h: 0.32,
      fontFace: F, fontSize: 9, bold: true, color: B.white,
      align: "center", valign: "middle", margin: 0,
    });
    s.addText(c.title, {
      x: 1.10, y: y + 0.04, w: 3.90, h: 0.26,
      fontFace: F, fontSize: 10.5, bold: true, color: B.blueDark,
    });
    s.addText(c.desc, {
      x: 1.10, y: y + 0.30, w: 4.0, h: 0.50,
      fontFace: F, fontSize: 9, color: B.gray, lineSpacingMultiple: 1.20,
    });
    s.addShape(pptx.shapes.RECTANGLE, {
      x: 5.34, y: y + 0.24, w: 0.34, h: 0.32,
      fill: { color: B.blue }, line: { type: "none" },
    });
    s.addText("›", {
      x: 5.34, y: y + 0.20, w: 0.34, h: 0.36,
      fontFace: F, fontSize: 18, bold: true, color: B.white,
      align: "center", valign: "middle", margin: 0,
    });
    s.addText("SOLUTION", {
      x: 5.82, y: y + 0.04, w: 1.2, h: 0.26,
      fontFace: F, fontSize: 9, bold: true, color: B.blue,
    });
    s.addText(c.sol, {
      x: 5.82, y: y + 0.28, w: 3.88, h: 0.52,
      fontFace: F, fontSize: 9, color: B.gray, lineSpacingMultiple: 1.20,
    });
  });

  addLogo(s);
  if (pageNum) addPageNum(s, pageNum);
}

// ---------------------------------------------------------------------------
// Slide 5 — Business Value (5 horizontal bands)
// ---------------------------------------------------------------------------
function buildValueSlide(pptx, title, values, pageNum) {
  var s = pptx.addSlide();
  s.background = { color: B.white };
  addTitle(s, title);
  addBookends(pptx, s);

  var ROW_H   = 0.80;
  var GAP     = 0.06;
  var START_Y = 0.76;
  var ACC_W   = 0.06;
  var X       = 0.22;
  var W       = 9.56;

  values.forEach(function(v, i) {
    var y  = START_Y + i * (ROW_H + GAP);
    var bg = i % 2 === 0 ? B.veryLight : B.lightBG;

    s.addShape(pptx.shapes.RECTANGLE, {
      x: X, y: y, w: W, h: ROW_H,
      fill: { color: bg }, line: { type: "none" },
    });
    s.addShape(pptx.shapes.RECTANGLE, {
      x: X, y: y + 0.10, w: ACC_W, h: ROW_H - 0.20,
      fill: { color: B.blue }, line: { type: "none" },
    });
    s.addText(v.title, {
      x: X + ACC_W + 0.14, y: y + 0.07, w: W - ACC_W - 0.26, h: 0.26,
      fontFace: F, fontSize: 10.5, bold: true, color: B.blueDark,
    });
    s.addText(v.desc, {
      x: X + ACC_W + 0.14, y: y + 0.36, w: W - ACC_W - 0.26, h: 0.38,
      fontFace: F, fontSize: 9.5, color: B.gray, lineSpacingMultiple: 1.20,
    });
  });

  addLogo(s);
  if (pageNum) addPageNum(s, pageNum);
}

// ---------------------------------------------------------------------------
// 2x2 Category Grid — 2 bullets per cell, generous spacing
// CELL_H=1.98, ROW_STEP=2.06  → row 1 bottom = 0.74+2.06+1.98 = 4.78" ✓
// ---------------------------------------------------------------------------
function buildCategoryGrid(pptx, title, cats, pageNum) {
  var s = pptx.addSlide();
  s.background = { color: B.white };
  addTitle(s, title);
  addBookends(pptx, s);

  var HEADER_H  = 0.38;
  var BODY_H    = 1.60;
  var ROW_STEP  = 2.06;
  var COL_L     = 0.22;
  var COL_R     = 5.10;
  var COL_W     = 4.68;
  var ITEM_H    = 0.56;
  var ITEM_STEP = 0.74;

  cats.forEach(function(cat, i) {
    var col = i % 2;
    var row = Math.floor(i / 2);
    var x   = col === 0 ? COL_L : COL_R;
    var y   = 0.74 + row * ROW_STEP;

    s.addShape(pptx.shapes.RECTANGLE, {
      x: x, y: y, w: COL_W, h: HEADER_H,
      fill: { color: cat.col }, line: { type: "none" },
    });
    s.addText(cat.cat.toUpperCase(), {
      x: x + 0.14, y: y, w: COL_W - 0.14, h: HEADER_H,
      fontFace: F, fontSize: 9.5, bold: true, color: B.white,
      valign: "middle", charSpacing: 0.5,
    });

    s.addShape(pptx.shapes.RECTANGLE, {
      x: x, y: y + HEADER_H, w: COL_W, h: BODY_H,
      fill: { color: B.veryLight }, line: { type: "none" },
    });

    var items = cat.tools.slice(0, 2);
    items.forEach(function(tool, j) {
      var iy = y + HEADER_H + 0.14 + j * ITEM_STEP;
      s.addShape(pptx.shapes.OVAL, {
        x: x + 0.20, y: iy + 0.20, w: 0.09, h: 0.09,
        fill: { color: cat.col }, line: { type: "none" },
      });
      s.addText(tool, {
        x: x + 0.38, y: iy, w: COL_W - 0.52, h: ITEM_H,
        fontFace: F, fontSize: 10, color: B.gray, valign: "middle",
        lineSpacingMultiple: 1.18,
      });
    });
  });

  addLogo(s);
  if (pageNum) addPageNum(s, pageNum);
}

// ---------------------------------------------------------------------------
// Slide 8 — Prototype: Current Progress (honest, toned down)
// ---------------------------------------------------------------------------
function buildPrototypeSlide(pptx, pageNum) {
  var s = pptx.addSlide();
  s.background = { color: B.white };
  addBookends(pptx, s);
  addTitle(s, "Prototype — Current Progress");

  s.addText("Early-stage prototype under active development — foundational capabilities in place", {
    x: 0.22, y: 0.68, w: 9.56, h: 0.28,
    fontFace: F, fontSize: 10.5, color: B.blue,
  });

  var CARD_X    = 0.22;
  var CARD_W    = 9.56;
  var CARD_H    = 0.86;
  var CARD_STEP = 0.94;
  var Y_START   = 1.04;
  var ACC_W     = 0.07;
  var NUM_W     = 0.86;
  var SEP1_X    = ACC_W + NUM_W + 0.08;
  var TXT_X     = SEP1_X + 0.04;
  var NAME_W    = 2.50;
  var SEP2_X    = TXT_X + NAME_W + 0.08;
  var BULL_X    = CARD_X + SEP2_X + 0.04;
  var BULL_W    = CARD_W - SEP2_X - 0.10;

  var cards = [
    {
      num: "01",
      name: "Operations Portal",
      b1: "Core portal deployed on the development instance; role-filtered sections accessible",
      b2: "UI refinements and end-to-end workflow validation are ongoing",
    },
    {
      num: "02",
      name: "Governance Module",
      b1: "Access, Users, Groups, and Pending Actions tabs accessible with initial support",
      b2: "Approval routing and escalation logic initialised; stress-testing in progress",
    },
    {
      num: "03",
      name: "Studio Module",
      b1: "Automations and Deliverables tabs accessible; create-and-publish flow initialised",
      b2: "Creator role scoping and group-level workflows being validated iteratively",
    },
    {
      num: "04",
      name: "Operations Assistant",
      b1: "Three-layer NLU active across 50+ ServiceNow domains; advisor mode available",
      b2: "Response accuracy and edge case coverage being refined continuously",
    },
  ];

  cards.forEach(function(card, i) {
    var cy = Y_START + i * CARD_STEP;
    var bg = i % 2 === 0 ? B.veryLight : B.lightBG;

    s.addShape(pptx.shapes.RECTANGLE, {
      x: CARD_X, y: cy, w: CARD_W, h: CARD_H,
      fill: { color: bg }, line: { type: "none" },
    });
    s.addShape(pptx.shapes.RECTANGLE, {
      x: CARD_X, y: cy, w: ACC_W, h: CARD_H,
      fill: { color: B.blue }, line: { type: "none" },
    });
    s.addText(card.num, {
      x: CARD_X + ACC_W + 0.04, y: cy, w: NUM_W, h: CARD_H,
      fontFace: F, fontSize: 24, bold: true, color: B.blue,
      align: "center", valign: "middle",
    });
    s.addShape(pptx.shapes.RECTANGLE, {
      x: CARD_X + SEP1_X, y: cy + 0.12, w: 0.012, h: CARD_H - 0.24,
      fill: { color: B.grayLine }, line: { type: "none" },
    });
    s.addText(card.name, {
      x: CARD_X + TXT_X, y: cy + 0.12, w: NAME_W, h: 0.28,
      fontFace: F, fontSize: 11, bold: true, color: B.blueDark,
      valign: "middle",
    });
    s.addShape(pptx.shapes.RECTANGLE, {
      x: CARD_X + SEP2_X, y: cy + 0.12, w: 0.012, h: CARD_H - 0.24,
      fill: { color: B.grayLine }, line: { type: "none" },
    });
    s.addShape(pptx.shapes.OVAL, {
      x: BULL_X, y: cy + 0.16, w: 0.08, h: 0.08,
      fill: { color: B.blue }, line: { type: "none" },
    });
    s.addText(card.b1, {
      x: BULL_X + 0.14, y: cy + 0.10, w: BULL_W - 0.18, h: 0.28,
      fontFace: F, fontSize: 9.5, color: B.gray, valign: "middle",
    });
    s.addShape(pptx.shapes.OVAL, {
      x: BULL_X, y: cy + 0.52, w: 0.08, h: 0.08,
      fill: { color: B.grayLight }, line: { type: "none" },
    });
    s.addText(card.b2, {
      x: BULL_X + 0.14, y: cy + 0.46, w: BULL_W - 0.18, h: 0.28,
      fontFace: F, fontSize: 9.5, color: B.grayMid, valign: "middle",
    });
  });

  addLogo(s);
  addPageNum(s, pageNum);
}

// ---------------------------------------------------------------------------
// Slide 9 — Development Roadmap (4-phase horizontal timeline)
// ---------------------------------------------------------------------------
function buildRoadmapSlide(pptx, pageNum) {
  var s = pptx.addSlide();
  s.background = { color: B.white };
  addBookends(pptx, s);
  addTitle(s, "Development Roadmap");

  s.addText("Phased enhancement approach following initial prototype deployment", {
    x: 0.22, y: 0.68, w: 9.56, h: 0.28,
    fontFace: F, fontSize: 10.5, color: B.blue,
  });

  var COL_W     = 2.26;
  var COL_GAP   = 0.12;
  var COL_STEP  = COL_W + COL_GAP;
  var X_START   = 0.22;
  var HDR_Y     = 1.02;
  var HDR_H     = 0.50;
  var BODY_Y    = HDR_Y + HDR_H;
  var BODY_H    = 2.60;
  var ITEM_H    = 0.56;
  var ITEM_STEP = 0.76;

  var phases = [
    {
      num: "01",
      name: "FOUNDATION",
      col: B.blue,
      active: true,
      items: [
        "Portal, governance, studio, and assistant deployed on development instance",
        "Role-based access control and audit logging active",
        "Three-layer NLU and 50+ domain knowledge base in place",
      ],
    },
    {
      num: "02",
      name: "STABILITY",
      col: B.blueDark,
      active: false,
      items: [
        "End-to-end workflow validation and defect resolution",
        "UI consistency, accessibility, and performance improvements",
        "Governance approval flow and escalation stress-tested",
      ],
    },
    {
      num: "03",
      name: "ENHANCEMENT",
      col: B.blue,
      active: false,
      items: [
        "Expanded NLU coverage and additional deliverable builder types",
        "Creator tooling and use case guidance refinements",
        "Improved contextual accuracy and response quality",
      ],
    },
    {
      num: "04",
      name: "SCALE",
      col: B.gray,
      active: false,
      items: [
        "Multi-group automation sharing and cross-team governance",
        "Analytics dashboard for operations and governance insights",
        "Broader onboarding programmes and adoption tracking",
      ],
    },
  ];

  phases.forEach(function(phase, i) {
    var cx = X_START + i * COL_STEP;

    // Connecting arrow between phases
    if (i > 0) {
      s.addText("›", {
        x: cx - COL_GAP - 0.02, y: HDR_Y + 0.10,
        w: COL_GAP + 0.04, h: HDR_H - 0.20,
        fontFace: F, fontSize: 16, color: B.grayLight,
        align: "center", valign: "middle",
      });
    }

    // Phase header
    s.addShape(pptx.shapes.RECTANGLE, {
      x: cx, y: HDR_Y, w: COL_W, h: HDR_H,
      fill: { color: phase.col }, line: { type: "none" },
    });

    // Phase number (left half)
    s.addText(phase.num, {
      x: cx + 0.10, y: HDR_Y, w: 0.54, h: HDR_H,
      fontFace: F, fontSize: 20, bold: true, color: B.white,
      valign: "middle", align: "center",
    });

    // Vertical divider inside header
    s.addShape(pptx.shapes.RECTANGLE, {
      x: cx + 0.68, y: HDR_Y + 0.08, w: 0.012, h: HDR_H - 0.16,
      fill: { color: "FFFFFF" }, line: { type: "none" },
    });

    // Phase name
    s.addText(phase.name, {
      x: cx + 0.74, y: HDR_Y + 0.02, w: COL_W - 0.82, h: HDR_H - 0.04,
      fontFace: F, fontSize: 9, bold: true, color: B.white,
      valign: "middle",
    });

    // ACTIVE badge
    if (phase.active) {
      s.addShape(pptx.shapes.RECTANGLE, {
        x: cx + 0.74, y: HDR_Y + 0.30, w: 0.62, h: 0.16,
        fill: { color: B.white }, line: { type: "none" },
      });
      s.addText("ACTIVE", {
        x: cx + 0.74, y: HDR_Y + 0.30, w: 0.62, h: 0.16,
        fontFace: F, fontSize: 7, bold: true, color: phase.col,
        align: "center", valign: "middle",
      });
    }

    // Body
    s.addShape(pptx.shapes.RECTANGLE, {
      x: cx, y: BODY_Y, w: COL_W, h: BODY_H,
      fill: { color: B.veryLight }, line: { type: "none" },
    });

    // Items
    phase.items.forEach(function(item, j) {
      var iy = BODY_Y + 0.16 + j * ITEM_STEP;
      s.addShape(pptx.shapes.OVAL, {
        x: cx + 0.14, y: iy + 0.20, w: 0.08, h: 0.08,
        fill: { color: phase.col }, line: { type: "none" },
      });
      s.addText(item, {
        x: cx + 0.28, y: iy, w: COL_W - 0.36, h: ITEM_H,
        fontFace: F, fontSize: 8.5, color: B.gray,
        valign: "middle", lineSpacingMultiple: 1.18,
      });
    });
  });

  addLogo(s);
  addPageNum(s, pageNum);
}

// ---------------------------------------------------------------------------
// Slide 10 — Source Repository (folder tree visual, no screenshot)
// ---------------------------------------------------------------------------
function buildRepositorySlide(pptx, pageNum) {
  var s = pptx.addSlide();
  s.background = { color: B.white };
  addTitle(s, "Source Repository");
  addBookends(pptx, s);

  var REPO_URL = "github.com/Infosys-GithubCopilot-backup/Operations-Intelligence-Source";

  s.addText("Single source of truth — all platform documentation, source code, and Copilot AI instructions", {
    x: 0.22, y: 0.70, w: 9.56, h: 0.28,
    fontFace: F, fontSize: 10.5, color: B.blue,
  });

  // Repository URL bar
  s.addShape(pptx.shapes.RECTANGLE, {
    x: 0.22, y: 1.04, w: 9.56, h: 0.38,
    fill: { color: B.blue }, line: { type: "none" },
  });
  s.addText(REPO_URL, {
    x: 0.36, y: 1.04, w: 9.42, h: 0.38,
    fontFace: F, fontSize: 10, bold: false, color: B.white,
    valign: "middle",
  });

  // ---------------------------------------------------------------------------
  // Left area — Folder tree visual (replaces screenshot)
  // ---------------------------------------------------------------------------
  var TREE_X = 0.22, TREE_Y = 1.48, TREE_W = 6.72, TREE_H = 3.48;

  s.addShape(pptx.shapes.RECTANGLE, {
    x: TREE_X, y: TREE_Y, w: TREE_W, h: TREE_H,
    fill: { color: B.veryLight }, line: { color: B.grayLine, width: 0.5 },
  });

  // Tree header
  s.addShape(pptx.shapes.RECTANGLE, {
    x: TREE_X, y: TREE_Y, w: TREE_W, h: 0.38,
    fill: { color: B.lightBG }, line: { type: "none" },
  });
  s.addText("REPOSITORY CONTENTS", {
    x: TREE_X + 0.16, y: TREE_Y, w: TREE_W - 0.16, h: 0.38,
    fontFace: F, fontSize: 9.5, bold: true, color: B.blue,
    valign: "middle",
  });
  s.addText("Operations-Intelligence-Source", {
    x: TREE_X + 3.20, y: TREE_Y, w: TREE_W - 3.30, h: 0.38,
    fontFace: F, fontSize: 9, color: B.grayMid,
    valign: "middle", align: "right",
  });

  // Folder entries
  var entries = [
    { indent: 0, icon: B.blue,     bold: true,  label: ".github /",                    note: "GitHub Copilot instructions — auto-loaded on repository open" },
    { indent: 0, icon: B.blue,     bold: true,  label: "architecture /",               note: "Solution architecture, data model, and role definitions" },
    { indent: 0, icon: B.blue,     bold: true,  label: "context /  ·  01–05", note: "Business context, problem statement, and value canon" },
    { indent: 0, icon: B.blue,     bold: true,  label: "implementation /",             note: "Engine source (117 operations), portal widget, background scripts" },
    { indent: 1, icon: B.grayMid,  bold: false, label: "source /",                    note: "Engine, portal widget JS/CSS, deployment scripts" },
    { indent: 1, icon: B.grayMid,  bold: false, label: "documentation /",             note: "API reference, coding patterns, schema definitions" },
    { indent: 0, icon: B.blue,     bold: true,  label: "reference /",                 note: "Canonical glossary for all identifiers and terms" },
  ];

  var ROW_Y = TREE_Y + 0.46;
  var ROW_STEP_T = 0.42;

  entries.forEach(function(entry) {
    var indent_x = entry.indent * 0.24;
    var icon_x = TREE_X + 0.20 + indent_x;
    var label_x = icon_x + 0.16;
    var note_x = label_x + 1.48;
    var note_w = TREE_X + TREE_W - note_x - 0.16;

    // Folder/file icon square
    s.addShape(pptx.shapes.RECTANGLE, {
      x: icon_x, y: ROW_Y + 0.13, w: 0.10, h: 0.10,
      fill: { color: entry.icon }, line: { type: "none" },
    });

    // Label
    s.addText(entry.label, {
      x: label_x, y: ROW_Y, w: 1.44, h: 0.36,
      fontFace: F, fontSize: 9.5, bold: entry.bold,
      color: entry.bold ? B.blueDark : B.gray,
      valign: "middle",
    });

    // Separator dot
    s.addShape(pptx.shapes.OVAL, {
      x: note_x - 0.16, y: ROW_Y + 0.15, w: 0.06, h: 0.06,
      fill: { color: B.grayLine }, line: { type: "none" },
    });

    // Note
    s.addText(entry.note, {
      x: note_x, y: ROW_Y, w: note_w, h: 0.36,
      fontFace: F, fontSize: 9, color: B.grayMid, valign: "middle",
    });

    ROW_Y += ROW_STEP_T;
  });

  // Bottom note inside tree box
  s.addText("Any developer opening this repository with GitHub Copilot receives full platform context with no additional setup required.", {
    x: TREE_X + 0.16, y: TREE_Y + TREE_H - 0.36, w: TREE_W - 0.32, h: 0.28,
    fontFace: F, fontSize: 8.5, color: B.grayMid, italic: true,
  });

  // ---------------------------------------------------------------------------
  // Right panel — two info boxes
  // ---------------------------------------------------------------------------
  var RP_X = 7.12, RP_W = 2.66;

  s.addShape(pptx.shapes.RECTANGLE, {
    x: RP_X, y: 1.48, w: RP_W, h: 1.66,
    fill: { color: B.lightBG }, line: { type: "none" },
  });
  s.addShape(pptx.shapes.RECTANGLE, {
    x: RP_X, y: 1.48, w: RP_W, h: 0.32,
    fill: { color: B.blue }, line: { type: "none" },
  });
  s.addText("WHAT COPILOT KNOWS", {
    x: RP_X + 0.14, y: 1.48, w: RP_W - 0.14, h: 0.32,
    fontFace: F, fontSize: 8.5, bold: true, color: B.white,
    valign: "middle",
  });
  var knows = [
    "117 documented engine operations",
    "50+ ServiceNow domain topics",
    "Full architecture and data model",
    "Canonical glossary and identifiers",
  ];
  knows.forEach(function(item, i) {
    s.addShape(pptx.shapes.OVAL, {
      x: RP_X + 0.18, y: 1.92 + i * 0.26 + 0.06, w: 0.07, h: 0.07,
      fill: { color: B.blue }, line: { type: "none" },
    });
    s.addText(item, {
      x: RP_X + 0.32, y: 1.92 + i * 0.26, w: RP_W - 0.44, h: 0.26,
      fontFace: F, fontSize: 9, color: B.gray, valign: "middle",
    });
  });

  var BOX2_Y = 3.22;
  s.addShape(pptx.shapes.RECTANGLE, {
    x: RP_X, y: BOX2_Y, w: RP_W, h: 1.74,
    fill: { color: B.veryLight }, line: { type: "none" },
  });
  s.addShape(pptx.shapes.RECTANGLE, {
    x: RP_X, y: BOX2_Y, w: RP_W, h: 0.32,
    fill: { color: B.blueDark }, line: { type: "none" },
  });
  s.addText("HOW TO USE", {
    x: RP_X + 0.14, y: BOX2_Y, w: RP_W - 0.14, h: 0.32,
    fontFace: F, fontSize: 8.5, bold: true, color: B.white,
    valign: "middle",
  });
  var usage = [
    "Open repository in VS Code or GitHub",
    "Ensure GitHub Copilot is active",
    "Ask any question in plain English",
    "Copilot answers from the source",
  ];
  usage.forEach(function(item, i) {
    s.addShape(pptx.shapes.RECTANGLE, {
      x: RP_X + 0.18, y: BOX2_Y + 0.44 + i * 0.26 + 0.06, w: 0.07, h: 0.07,
      fill: { color: B.blueDark }, line: { type: "none" },
    });
    s.addText(item, {
      x: RP_X + 0.32, y: BOX2_Y + 0.44 + i * 0.26, w: RP_W - 0.44, h: 0.26,
      fontFace: F, fontSize: 9, color: B.gray, valign: "middle",
    });
  });

  addLogo(s);
  addPageNum(s, pageNum);
}

// ---------------------------------------------------------------------------
// Slide 11 — Thank You
// ---------------------------------------------------------------------------
function buildThankYou(pptx, copyright) {
  var s = pptx.addSlide();
  s.background = { color: B.white };
  s.addText("THANK YOU", {
    x: 1.15, y: 1.41, w: 3.47, h: 0.74,
    fontFace: F, fontSize: 28, bold: false, color: B.blue,
  });
  addThankYouBars(pptx, s);
  s.addText(copyright, {
    x: 0.43, y: 5.04, w: 6.59, h: 0.42,
    fontFace: F, fontSize: 7, color: B.gray,
    wrap: true, lineSpacingMultiple: 1.15,
  });
  addLogo(s);
}

// ---------------------------------------------------------------------------
// Main — 11 slides, 8 agenda items (4+4 symmetric)
// ---------------------------------------------------------------------------
async function buildPresentation() {
  var pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";

  // Slide 1 — Cover
  buildCover(
    pptx,
    "Operations Intelligence",
    "A ServiceNow Intelligent Automation Initiative — Infosys Operations"
  );

  // Slide 2 — Agenda (8 items, 4 left + 4 right)
  buildAgenda(pptx, [
    ["01", "Environmental Context"],
    ["02", "Problem Statement"],
    ["03", "Business Value of Automation"],
    ["04", "Future Desired State"],
    ["05", "Proposed Solution"],
    ["06", "Prototype — Current Progress"],
    ["07", "Development Roadmap"],
    ["08", "Source Repository"],
  ], 2);

  // Slide 3 — Environmental Context
  buildBeforeAfterSlide(pptx, 3);

  // Slide 4 — Problem Statement
  buildChallengesSlide(pptx, "Problem Statement", [
    {
      risk: "HIGH",
      col: B.red,
      title: "No Automated Consolidation Layer Between Data Sources",
      desc:  "SAM teams export ServiceNow and Flexera data independently. No common field headers exist, requiring manual data cleansing and reconciliation each cycle.",
      sol:   "An automated layer maps field headers across both sources and merges outputs automatically, eliminating manual reconciliation and ensuring consistent reporting.",
    },
    {
      risk: "HIGH",
      col: B.red,
      title: "Virtual Agent Capability Active but Not Implemented",
      desc:  "The Virtual Agent SKU is enabled on all instances but no implementation exists, leaving operations teams without a conversational interface to automation capabilities.",
      sol:   "Operations Intelligence deploys the Virtual Agent as the primary interface, enabling every team member to create and manage automations through natural language.",
    },
    {
      risk: "MED",
      col: B.amber,
      title: "Recurring Manual Tasks Displacing Project Delivery Capacity",
      desc:  "Reports, dashboards, and data extracts are rebuilt manually every cycle. The cumulative overhead displaces capacity that would otherwise reach project deliverables.",
      sol:   "Any recurring task requested once is automated on a permanent basis. A single request eliminates the associated manual effort across all subsequent cycles.",
    },
    {
      risk: "MED",
      col: B.amber,
      title: "Operational Blockers Lack a Structured Resolution Path",
      desc:  "Staff can identify blockers in business terms but not translate them into technical specifications. Issues remain unresolved before reaching an approver.",
      sol:   "The Operations Assistant converts a plain-English description into a specification and routes it automatically to the appropriate approver for action.",
    },
  ], 4);

  // Slide 5 — Business Value
  buildValueSlide(pptx, "Business Value of Automation", [
    {
      title: "Recurring manual tasks become permanent, single-request automations",
      desc:  "Any report, dashboard, or extract rebuilt manually each cycle is requested once and automated on a permanent basis. The cost of the work moves from recurring to one-time.",
    },
    {
      title: "Operational blockers are resolved without technical mediation",
      desc:  "A requirement stated in plain English is converted into a specification and routed to the appropriate approver. The articulation barrier that strands issues today is removed.",
    },
    {
      title: "Dependence on the availability of scarce specialists is eliminated",
      desc:  "Automation capability is available at all times through the Operations Assistant. Expertise that currently resides in specific individuals is accessible to all teams equally.",
    },
    {
      title: "The existing ServiceNow investment is realised as an automation platform",
      desc:  "Operations teams access automation through a natural-language interface requiring no prior technical knowledge. Platform adoption increases through use, not training programmes.",
    },
    {
      title: "Governance operates as an accelerator of delivery, not a constraint",
      desc:  "Leadership retains real-time visibility and immediate override authority. Approval routing, deadline management, and escalation are handled automatically at all times.",
    },
  ], 5);

  // Slide 6 — Future Desired State
  buildCategoryGrid(pptx, "Future Desired State", [
    {
      cat: "For Operations Team Members",
      col: B.blue,
      tools: [
        "Any plain-English requirement is fulfilled as a permanent automation",
        "All group automations accessible from a single personalised workspace",
      ],
    },
    {
      cat: "For Designated Creators",
      col: B.blueDark,
      tools: [
        "Automations designed through a structured guided conversation",
        "The full automation lifecycle managed from a single studio interface",
      ],
    },
    {
      cat: "For Leadership",
      col: B.blue,
      tools: [
        "All group automations visible in real time from a single governance view",
        "Impactful changes route automatically for approval before defined deadlines",
      ],
    },
    {
      cat: "For the Organisation",
      col: B.blueDark,
      tools: [
        "Recovered capacity directed to project delivery rather than overhead",
        "ServiceNow realised as the complete automation platform it was designed to be",
      ],
    },
  ], 6);

  // Slide 7 — Proposed Solution
  buildCategoryGrid(pptx, "Proposed Solution", [
    {
      cat: "Single Unified Platform",
      col: B.blue,
      tools: [
        "All operations teams access a dedicated portal at a single URL",
        "Role-appropriate sections displayed without page navigation",
      ],
    },
    {
      cat: "Natural Language Interface",
      col: B.blueDark,
      tools: [
        "All platform interactions conducted through natural language",
        "A guided conversation produces the complete technical specification",
      ],
    },
    {
      cat: "Proportional Governance Model",
      col: B.blue,
      tools: [
        "Approval requirements scale proportionally with the impact of the change",
        "Deadlines and escalation paths automated for every pending action",
      ],
    },
    {
      cat: "AI-Augmented Creation",
      col: B.blueDark,
      tools: [
        "GitHub Copilot generates technical specifications on request",
        "All Copilot output is confirmed by the creator before being applied",
      ],
    },
  ], 7);

  // Slide 8 — Prototype: Current Progress
  buildPrototypeSlide(pptx, 8);

  // Slide 9 — Development Roadmap
  buildRoadmapSlide(pptx, 9);

  // Slide 10 — Source Repository
  buildRepositorySlide(pptx, 10);

  // Slide 11 — Thank You
  buildThankYou(
    pptx,
    "© 2026 Infosys Limited. All rights reserved. Operations Intelligence is a proprietary initiative of Infosys Limited."
  );

  var OUTPUT = "/home/user/ServiceNow-Solutions/pptx_build/Operations-Intelligence-Overview.pptx";
  await pptx.writeFile({ fileName: OUTPUT });
  console.log("Written: " + OUTPUT);
}

buildPresentation().catch(function(err) {
  console.error("Error:", err);
  process.exit(1);
});
