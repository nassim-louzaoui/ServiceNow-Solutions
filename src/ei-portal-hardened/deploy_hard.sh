#!/bin/bash
set -e
cat > /tmp/deploy_hard.py <<'PYEOF'
import os,json,subprocess,urllib.request,urllib.parse
os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH","/home/eiagent/.cache/ms-playwright")
BASE="https://dev283926.service-now.com"; SCOPE="6fda1f2583460710f36fec80ceaad3e1"
PY="/home/eiagent/ei/venv/bin/python3"; HELPER="/home/eiagent/login_helper.py"
PAR="https://objectstorage.eu-frankfurt-1.oraclecloud.com/p/-fvZyjo7sfHJLLt6pvb_7QxVPQldq-zvZlxgL0Jg56ivCXiLknA3mSeKBz8uw3Wq/n/fryrxfdwttez/b/ei-control/o/"
bundle=urllib.request.urlopen(PAR+"src/ei_react_bundle.js",timeout=90).read().decode()
def raw(method,path,ck,g,body=None,timeout=120):
    h={"Cookie":ck,"X-UserToken":g,"Accept":"application/json"}
    data=json.dumps(body).encode() if body is not None else None
    if data is not None: h["Content-Type"]="application/json"
    try:
        with urllib.request.urlopen(urllib.request.Request(BASE+path,data=data,headers=h,method=method),timeout=timeout) as r: return r.status,r.read()
    except Exception as e:
        try: return e.code,e.read()
        except Exception: return 0,str(e).encode()
r=subprocess.run([PY,HELPER],capture_output=True,text=True,timeout=120)
d=json.loads(r.stdout.strip().splitlines()[-1]); ck,g=d["cookie"],d["gck"]
raw("PUT","/api/now/ui/concoursepicker/application",ck,g,{"app_id":SCOPE},40)

# Thin AngularJS bootstrap: inline the IIFE bundle (registers a self-removing ei:mount listener,
# nothing on window), build the closure-scoped data bridge, then dispatch ei:mount once. React
# owns everything after that; no $scope watchers, no Angular templating on our subtree.
CONTROLLER=("api.controller=function($scope,$timeout){\n"+bundle+"\n"
 "var bridge={call:function(p){return $scope.server.get(p).then(function(r){return r.data;});}};\n"
 "$timeout(function(){try{var el=document.getElementById('ei-root');"
 "if(el){document.dispatchEvent(new CustomEvent('ei:mount',{detail:{el:el,bridge:bridge,init:$scope.data||{}}}));}"
 "}catch(e){}},80);\n};")

# Server script: identity for the sidebar + a grounded Assistant reply. Full model inference is
# wired in the next phase; this routes the three catalog intents and answers plainly meanwhile.
SERVER=("(function(){\n"
 "data.userName=gs.getUserDisplayName()||gs.getUserName()||'User';\n"
 "var p=(''+data.userName).trim().split(/\\s+/);\n"
 "data.initials=((p.length>=2?(p[0].charAt(0)+p[p.length-1].charAt(0)):(''+data.userName).charAt(0))||'U').toUpperCase();\n"
 "if(input&&input.action==='assistant_query'){\n"
 "  var t=(''+(input.text||'')).toLowerCase(); var reply;\n"
 "  if(t.indexOf('bridge')>-1){reply='Module Bridge Maintenance keeps a solution connected to the intelligence core.\\nTell me which solution and which capability you want the bridge to expose, and I will check its entitlements before any change.';}\n"
 "  else if(t.indexOf('maintain')>-1||t.indexOf('fix')>-1||t.indexOf('existing')>-1){reply='Existing Solution Maintenance changes a solution already in production.\\nName the solution and describe the change.\\nI will run an impact analysis and show you the plan before anything is applied.';}\n"
 "  else if(t.indexOf('build')>-1||t.indexOf('new')>-1||t.indexOf('develop')>-1||t.indexOf('create')>-1){reply='New Solution Development builds a fresh scoped solution.\\nDescribe what it should do and who will use it.\\nI will propose a layout, a data model, and an access model for you to confirm.';}\n"
 "  else {reply='I can help you develop a new solution, maintain an existing one, or tune a module bridge.\\nDescribe what you have in mind, or select a catalog item to begin a guided flow.';}\n"
 "  data.reply=reply;\n"
 "}\n"
 "})();")

st,b=raw("GET","/api/now/table/sp_widget?sysparm_query=id=ei-portal-app&sysparm_fields=sys_id",ck,g)
rows=json.loads(b).get("result",[])
if not rows:
    print("WIDGET NOT FOUND"); raise SystemExit(1)
wid=rows[0]["sys_id"]
st,b=raw("PATCH","/api/now/table/sp_widget/"+wid,ck,g,{
    "template":'<div id="ei-root"></div>',"css":"","client_script":CONTROLLER,"script":SERVER})
print("widget patched http=%d sys_id=%s bundle=%d bytes"%(st,wid,len(bundle)))

# Browser verification: real login, open /ei, capture the visual, then probe the hardening.
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    br=pw.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage"])
    c=br.new_context(ignore_https_errors=True,viewport={"width":1600,"height":900}); pg=c.new_page()
    errs=[]; pg.on("pageerror",lambda e:errs.append("pageerror: "+str(e)))
    pg.goto(BASE+"/login.do",wait_until="domcontentloaded",timeout=60000)
    pg.fill("#user_name","admin"); pg.fill("#user_password","mItR4%Se3E/w"); pg.click("#sysverb_login")
    try: pg.wait_for_load_state("networkidle",timeout=40000)
    except Exception: pass
    pg.goto(BASE+"/ei",wait_until="domcontentloaded",timeout=60000)
    try: pg.wait_for_selector(".ei-shell",timeout=25000)
    except Exception: pass
    pg.wait_for_timeout(2500)
    pg.screenshot(path="/home/eiagent/ei/status/ei_hard.png",full_page=False)
    probe1=pg.evaluate("""()=>{
      var d=document;var root=d.getElementById('ei-root');
      var rr=root?root.getBoundingClientRect():null;
      var evalBlocked=false;try{window.eval('1');}catch(e){evalBlocked=true;}
      var storeBlocked=false;try{window.localStorage.setItem('__t','1');storeBlocked=(window.localStorage.getItem('__t')===null);}catch(e){storeBlocked=true;}
      var leaks=['App','CSS','__EI_REACT__','freezeIntrinsics','antiTamper'].filter(function(k){return typeof window[k]!=='undefined';});
      var sideBg=root?getComputedStyle(root.querySelector('.ei-side')).backgroundColor:null;
      var bodyVis=Array.prototype.filter.call(d.body.children,function(el){return el!==root && getComputedStyle(el).display!=='none';}).length;
      return {shell:!!d.querySelector('.ei-shell'),cards:d.querySelectorAll('.ei-card').length,
        nav:d.querySelectorAll('.ei-nav-item').length,rootRect:rr?[Math.round(rr.x),Math.round(rr.y),Math.round(rr.width),Math.round(rr.height)]:null,
        rootChildOfBody:root?root.parentNode===d.body:false,sideBg:sideBg,
        evalBlocked:evalBlocked,storeBlocked:storeBlocked,leaks:leaks,visibleForeign:bodyVis};
    }""")
    # tamper: inject a foreign node and force-hide our root, then see the reaction
    pg.evaluate("""()=>{var d=document;var e=d.createElement('div');e.id='__ei_evil';e.textContent='x';d.body.appendChild(e);
      var r=d.getElementById('ei-root');r.setAttribute('style','display:none');}""")
    pg.wait_for_timeout(500)
    probe2=pg.evaluate("""()=>{var d=document;var evil=d.getElementById('__ei_evil');var r=d.getElementById('ei-root');
      return {evilHidden:evil?getComputedStyle(evil).display==='none':true,
        rootReverted:r?r.getAttribute('style')!=='display:none':false,
        rootVisible:r?getComputedStyle(r).display!=='none':false};}""")
    urllib.request.urlopen(urllib.request.Request(PAR+"meta/ei_hard.png",data=open("/home/eiagent/ei/status/ei_hard.png","rb").read(),method="PUT",headers={"Content-Type":"image/png"}),timeout=60)
    br.close()
print("VISUAL:",json.dumps(probe1))
print("TAMPER:",json.dumps(probe2))
print("ERRORS:",json.dumps(errs[:6]))
PYEOF
/home/eiagent/ei/venv/bin/python3 /tmp/deploy_hard.py 2>&1 | tail -12
