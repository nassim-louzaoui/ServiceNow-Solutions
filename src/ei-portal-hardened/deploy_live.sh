#!/bin/bash
cat > /tmp/deploy_live.py <<'PYEOF'
import os,json,subprocess,urllib.request
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

CONTROLLER=("api.controller=function($scope,$timeout){\n"+bundle+"\n"
 "var bridge={call:function(p){return $scope.server.get(p).then(function(r){return r.data;});}};\n"
 "$timeout(function(){try{var el=document.getElementById('ei-root');"
 "if(el){document.dispatchEvent(new CustomEvent('ei:mount',{detail:{el:el,bridge:bridge,init:$scope.data||{}}}));}"
 "}catch(e){}},80);\n};")

# Server: the bridge contract. init -> identity; load_section -> ok; check_auth -> ok;
# assistant_query -> grounded reply routed by the three catalog intents. Each sentence on its
# own line, no hyphen character in user facing text.
SERVER=("(function(){\n"
 "var a=input&&input.action;\n"
 "var name=gs.getUserDisplayName()||gs.getUserName()||'User';\n"
 "var p=(''+name).trim().split(/\\s+/);\n"
 "var inits=((p.length>=2?(p[0].charAt(0)+p[p.length-1].charAt(0)):(''+name).charAt(0))||'U').toUpperCase();\n"
 "if(a==='init'){\n"
 "  data.userName=name; data.userInitials=inits; data.userRole='administrator';\n"
 "  data.requestCount=0; data.notificationCount=0; data.instanceUrl='/sp';\n"
 "} else if(a==='load_section'){ data.ok=true; }\n"
 "else if(a==='check_auth'){ data.auth_denied=false; }\n"
 "else if(a==='assistant_query'){\n"
 "  var t=(''+(input.query||input.text||'')).toLowerCase(); var reply;\n"
 "  if(t.indexOf('bridge')>-1){reply='Module Bridge Maintenance keeps a solution connected to the intelligence core.\\nTell me which solution and which capability the bridge should expose.\\nI will check its entitlements before any change.';}\n"
 "  else if(t.indexOf('existing')>-1||t.indexOf('maintain')>-1||t.indexOf('fix')>-1){reply='Existing Solution Maintenance changes a solution already in production.\\nName the solution and describe the change.\\nI will run an impact analysis and show you the plan before anything is applied.';}\n"
 "  else if(t.indexOf('new')>-1||t.indexOf('build')>-1||t.indexOf('develop')>-1||t.indexOf('begin')>-1){reply='New Solution Development builds a fresh scoped web application.\\nDescribe what it should do and who will use it.\\nI will propose a layout, a data model, and an access model for you to confirm.';}\n"
 "  else {reply='I can help you develop a new solution, maintain an existing one, or tune a module bridge.\\nDescribe what you have in mind, or select a catalog item to begin a guided flow.';}\n"
 "  data.reply=reply;\n"
 "}\n"
 "})();")

st,b=raw("GET","/api/now/table/sp_widget?sysparm_query=id=ei-portal-app&sysparm_fields=sys_id",ck,g)
wid=json.loads(b)["result"][0]["sys_id"]
st,b=raw("PATCH","/api/now/table/sp_widget/"+wid,ck,g,{"template":'<div id="ei-root"></div>',"css":"","client_script":CONTROLLER,"script":SERVER})
print("widget patched http=%d bundle=%d bytes"%(st,len(bundle)))

from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    br=pw.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage"])
    c=br.new_context(ignore_https_errors=True,viewport={"width":1600,"height":900}); pg=c.new_page()
    errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(BASE+"/login.do",wait_until="domcontentloaded",timeout=60000)
    pg.fill("#user_name","admin"); pg.fill("#user_password","mItR4%Se3E/w"); pg.click("#sysverb_login")
    try: pg.wait_for_load_state("networkidle",timeout=40000)
    except Exception: pass
    pg.goto(BASE+"/ei",wait_until="domcontentloaded",timeout=60000)
    try: pg.wait_for_selector(".ei-shell",timeout=25000)
    except Exception: pass
    pg.wait_for_timeout(3000)
    pg.screenshot(path="/home/eiagent/ei/status/ei_live.png",full_page=False)
    urllib.request.urlopen(urllib.request.Request(PAR+"meta/ei_live.png",data=open("/home/eiagent/ei/status/ei_live.png","rb").read(),method="PUT",headers={"Content-Type":"image/png"}),timeout=60)
    def n(sel):
        try: return pg.locator(sel).count()
        except Exception: return -1
    rep={"shell":n(".ei-shell"),"sidebar":n(".ei-sidebar"),"nav":n(".ei-nav-item"),"topbar":n(".ei-topbar"),
         "subtab":n(".ei-subtab"),"accCat":n(".ei-acc-cat"),"rows":n(".ei-catalog-row"),
         "assistant":n(".ei-assistant-panel"),"asstInput":n(".ei-asst-input"),"welcome":n(".ei-asst-welcome")}
    try:
        pg.locator(".ei-catalog-row .ei-btn.primary").first.click(); pg.wait_for_timeout(1800)
        rep["chatMsgs"]=pg.locator(".ei-chat-msg").count()
    except Exception as e: rep["clickErr"]=str(e)[:80]
    pg.screenshot(path="/home/eiagent/ei/status/ei_live_after.png",full_page=False)
    urllib.request.urlopen(urllib.request.Request(PAR+"meta/ei_live_after.png",data=open("/home/eiagent/ei/status/ei_live_after.png","rb").read(),method="PUT",headers={"Content-Type":"image/png"}),timeout=60)
    br.close()
print("STRUCT:",json.dumps(rep))
print("ERRORS:",json.dumps(errs[:6]))
PYEOF
/home/eiagent/ei/venv/bin/python3 /tmp/deploy_live.py 2>&1 | tail -8
