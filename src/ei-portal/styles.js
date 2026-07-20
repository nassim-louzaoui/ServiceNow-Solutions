// Enterprise Intelligence portal — house style (hardened). Injected into <head> at mount.
// Strict global reset (no browser defaults), palette, vh/vw only, perfect symmetry,
// no page/horizontal scroll, custom content-area scrollbars only.
export var CSS = [
  // ---- reset: zero every UA default ----
  '*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;outline:0;border:0;',
  'font:inherit;color:inherit;background:transparent;-webkit-tap-highlight-color:transparent;',
  'list-style:none;text-decoration:none;-webkit-font-smoothing:antialiased}',
  'html,body,#ei-root{height:100vh;width:100vw;overflow:hidden}',
  'body{font-family:"Source Sans Pro","Segoe UI",sans-serif;color:#121212;background:#F0F2F5}',
  // hide any native scrollbar globally
  '::-webkit-scrollbar{width:0;height:0}',
  '*{scrollbar-width:none;-ms-overflow-style:none}',
  // ---- shell: three columns, full viewport, symmetric ----
  '.ei-shell{display:grid;grid-template-columns:22vw 1fr;height:100vh;width:100vw;background:#F0F2F5}',
  '.ei-side{background:#00895E;display:flex;flex-direction:column;height:100vh;padding:2.2vh 1.2vw;gap:1.6vh}',
  '.ei-brand{display:flex;align-items:center;gap:0.7vw;color:#fff;font-weight:700;font-size:2.1vh;padding:1vh 0.4vw 2vh}',
  '.ei-brand-mark{width:2.4vh;height:2.4vh;border-radius:0.5vh;background:#00BF6F;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800}',
  '.ei-nav{display:flex;flex-direction:column;gap:0.6vh}',
  '.ei-nav-item{display:flex;align-items:center;gap:0.7vw;color:#DFF5EC;font-size:1.85vh;padding:1.3vh 0.9vw;border-radius:0.8vh;cursor:pointer}',
  '.ei-nav-item .ei-ico{width:1.85vh;height:1.85vh;flex:0 0 auto}',
  '.ei-nav-item:hover{background:rgba(255,255,255,0.10)}',
  '.ei-nav-item.on{background:#00BF6F;color:#fff;font-weight:600}',
  '.ei-side-foot{margin-top:auto;display:flex;align-items:center;gap:0.7vw;color:#DFF5EC;font-size:1.6vh;padding:1.2vh 0.9vw;border-top:1px solid rgba(255,255,255,0.15)}',
  '.ei-avatar{width:3vh;height:3vh;border-radius:50%;background:#00BF6F;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.4vh}',
  // main
  '.ei-main{display:flex;flex-direction:column;height:100vh;min-width:0}',
  '.ei-head{height:8vh;background:#fff;border-bottom:1px solid #DCDCDC;display:flex;align-items:center;justify-content:space-between;padding:0 2vw}',
  '.ei-crumb{font-size:2vh;font-weight:600;color:#121212}',
  '.ei-head-right{display:flex;align-items:center;gap:1.2vw}',
  '.ei-body{flex:1;min-height:0;padding:2.4vh 2vw;overflow:hidden}',
  // Assistant tab: catalog (left) + chat (right), balanced
  '.ei-assist{display:grid;grid-template-columns:1fr 1fr;gap:2vw;height:100%}',
  '.ei-panel{background:#fff;border:1px solid #DCDCDC;border-radius:1.2vh;display:flex;flex-direction:column;min-height:0;overflow:hidden}',
  '.ei-panel-h{padding:2vh 1.6vw;border-bottom:1px solid #DCDCDC;font-size:2vh;font-weight:700;color:#121212;display:flex;align-items:center;gap:0.6vw}',
  '.ei-panel-sub{font-size:1.5vh;font-weight:400;color:#6E6E6E}',
  // catalog
  '.ei-cat{flex:1;min-height:0;overflow-y:auto;padding:1.8vh 1.6vw;display:flex;flex-direction:column;gap:1.4vh}',
  '.ei-cat-group{font-size:1.5vh;font-weight:700;color:#6E6E6E;letter-spacing:0.05vw;text-transform:uppercase}',
  '.ei-card{border:1px solid #DCDCDC;border-radius:1vh;padding:1.8vh 1.4vw;cursor:pointer;display:flex;gap:1vw;align-items:flex-start;transition:border-color .12s,box-shadow .12s}',
  '.ei-card:hover{border-color:#00BF6F;box-shadow:0 0.4vh 1.6vh rgba(0,137,94,0.12)}',
  '.ei-card-ico{width:4vh;height:4vh;border-radius:0.9vh;background:#EAF7F1;color:#00895E;display:flex;align-items:center;justify-content:center;flex:0 0 auto}',
  '.ei-card-t{font-size:1.9vh;font-weight:600;color:#121212;margin-bottom:0.4vh}',
  '.ei-card-d{font-size:1.55vh;color:#6E6E6E;line-height:1.5}',
  // chat
  '.ei-chat{flex:1;min-height:0;display:flex;flex-direction:column}',
  '.ei-chat-scroll{flex:1;min-height:0;overflow-y:auto;padding:2vh 1.6vw;display:flex;flex-direction:column;gap:1.4vh}',
  // custom vertical scrollbar only where content overflows
  '.ei-cat::-webkit-scrollbar,.ei-chat-scroll::-webkit-scrollbar{width:0.7vw;height:0}',
  '.ei-cat,.ei-chat-scroll{scrollbar-width:thin;-ms-overflow-style:auto}',
  '.ei-cat::-webkit-scrollbar-thumb,.ei-chat-scroll::-webkit-scrollbar-thumb{background:#CFE8DE;border-radius:1vh}',
  '.ei-msg{max-width:82%;padding:1.3vh 1.2vw;border-radius:1.2vh;font-size:1.65vh;line-height:1.55;white-space:pre-wrap;word-break:break-word}',
  '.ei-msg.user{align-self:flex-end;background:#00BF6F;color:#fff;border-bottom-right-radius:0.3vh}',
  '.ei-msg.asst{align-self:flex-start;background:#F0F2F5;color:#121212;border-bottom-left-radius:0.3vh}',
  '.ei-welcome{margin:auto;text-align:center;color:#6E6E6E;display:flex;flex-direction:column;align-items:center;gap:1.2vh;padding:2vh}',
  '.ei-welcome-mark{width:6vh;height:6vh;border-radius:50%;background:#EAF7F1;color:#00895E;display:flex;align-items:center;justify-content:center}',
  '.ei-welcome-t{font-size:2.2vh;font-weight:700;color:#121212}',
  '.ei-chat-in{border-top:1px solid #DCDCDC;padding:1.4vh 1.2vw;display:flex;gap:0.8vw;align-items:center}',
  '.ei-chat-field{flex:1;background:#F0F2F5;border-radius:1.2vh;padding:1.3vh 1.1vw;font-size:1.65vh;color:#121212}',
  '.ei-chat-field::placeholder{color:#9AA0A6}',
  '.ei-send{width:4.4vh;height:4.4vh;border-radius:1.1vh;background:#00BF6F;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;flex:0 0 auto}',
  '.ei-send:hover{background:#00895E}',
  '.ei-typing{display:flex;gap:0.4vw;align-self:flex-start;padding:1.4vh 1.2vw}',
  '.ei-typing span{width:0.8vh;height:0.8vh;border-radius:50%;background:#00BF6F;opacity:.4;animation:eidot 1s infinite}',
  '.ei-typing span:nth-child(2){animation-delay:.2s}.ei-typing span:nth-child(3){animation-delay:.4s}',
  '@keyframes eidot{0%,60%,100%{opacity:.3}30%{opacity:1}}',
  // placeholder tabs
  '.ei-stub{margin:auto;text-align:center;color:#6E6E6E;font-size:2vh}'
].join('');
