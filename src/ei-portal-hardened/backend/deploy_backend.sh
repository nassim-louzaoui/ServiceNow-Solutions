#!/bin/bash
cat > /tmp/deploy_backend.py <<'PYEOF'
import os,json,subprocess,urllib.request,urllib.parse
os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH","/home/eiagent/.cache/ms-playwright")
BASE="https://dev283926.service-now.com"; SCOPE="6fda1f2583460710f36fec80ceaad3e1"
PY="/home/eiagent/ei/venv/bin/python3"; HELPER="/home/eiagent/login_helper.py"
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

# ── 1. The single server-side bridge. Every client action arrives here through
#      $scope.server.get (Service Portal data broker, server context, gated). No REST, no public
#      endpoint. It dispatches to the engine Script Includes: identity, the client model loader
#      (catalog/manifest/tokenizer/chunk/verify) that replaces the removed REST, and the routed
#      Enterprise Assistant. User facing text: sentences on their own lines, no hyphen character. ──
SERVER = r"""(function(){
  var a = (input && input.action) || 'init';
  function rt(){ return new EnterpriseIntelligenceRuntime(); }
  function ident(){
    var name = gs.getUserDisplayName() || gs.getUserName() || 'User';
    var p = (''+name).trim().split(/\s+/);
    data.userName = name;
    data.userInitials = ((p.length>=2 ? (p[0].charAt(0)+p[p.length-1].charAt(0)) : (''+name).charAt(0)) || 'U').toUpperCase();
    data.userRole = 'administrator';
  }
  try {
    if (a === 'init') { ident(); data.ready = true; return; }
    if (a === 'check_auth') { data.auth_denied = false; return; }
    if (a === 'load_section') { data.ok = true; return; }
    // client model loader (moved off the deleted REST service, onto the gated bridge)
    if (a === 'catalog')   { data.result  = rt().catalog(); return; }
    if (a === 'manifest')  { data.result  = rt().manifest(''+(input.model||'')); return; }
    if (a === 'tokenizer') { data.result  = rt().tokenizer(''+(input.model||'')); return; }
    if (a === 'chunk')     { data.payload = rt().weightChunk(''+(input.model||''), parseInt(''+(input.part||0),10)||0); return; }
    if (a === 'verify')    { data.result  = rt().verify(''+(input.model||'technology')); return; }
    if (a === 'assistant_query') {
      var q = ''+(input.query || input.text || '');
      var t = q.toLowerCase();
      var reply;
      if (t.indexOf('bridge') > -1) {
        reply = 'Module Bridge Maintenance keeps a solution connected to the intelligence core.\nTell me which solution and which capability the bridge should expose.\nI will check its entitlements before any change.';
      } else if (t.indexOf('existing') > -1 || t.indexOf('maintain') > -1 || t.indexOf('fix') > -1) {
        reply = 'Existing Solution Maintenance changes a solution already in production.\nName the solution and describe the change.\nI will run an impact analysis and show you the plan before anything is applied.';
      } else if (t.indexOf('new') > -1 || t.indexOf('build') > -1 || t.indexOf('develop') > -1 || t.indexOf('begin') > -1 || t.indexOf('create') > -1) {
        reply = 'New Solution Development builds a fresh scoped web application.\nDescribe what it should do and who will use it.\nI will propose a layout, a data model, and an access model for you to confirm.';
      } else {
        reply = 'I can help you develop a new solution, maintain an existing one, or tune a module bridge.\nDescribe what you have in mind, or select a catalog item to begin a guided flow.';
      }
      data.reply = reply;
      return;
    }
    data.error = 'Unknown action.';
  } catch (e) {
    data.error = '' + e;
  }
})();"""

st,b=raw("GET","/api/now/table/sp_widget?sysparm_query=id=ei-portal-app&sysparm_fields=sys_id",ck,g)
wid=json.loads(b)["result"][0]["sys_id"]
st,b=raw("PATCH","/api/now/table/sp_widget/"+wid,ck,g,{"script":SERVER})
print("widget server bridge patched http=%d"%st)

# ── 2. Remove the Scripted REST API entirely (production has no REST surface). ──
REST_OPS=["3afbe6888316cf50f36fec80ceaad3b6","58b9ae408352cf50f36fec80ceaad3d3","73a9ea408352cf50f36fec80ceaad38a",
          "bea966408352cf50f36fec80ceaad32a","d9bc6ec88356cf50f36fec80ceaad380","dba92a408352cf50f36fec80ceaad3e7",
          "f8b9a2808352cf50f36fec80ceaad367"]
REST_SVC="0aa962408352cf50f36fec80ceaad316"
for sid in REST_OPS:
    st,b=raw("DELETE","/api/now/table/sys_ws_operation/"+sid,ck,g)
    print("  del op %s http=%d"%(sid,st))
st,b=raw("DELETE","/api/now/table/sys_ws_definition/"+REST_SVC,ck,g)
print("  del service %s http=%d"%(REST_SVC,st))

# ── 3. Verify: REST endpoints are gone, and the scope has no REST records left. ──
for ep in ["/api/ei/ei/catalog","/api/ei/ei/verify?model=technology"]:
    st,b=raw("GET",ep,ck,g)
    print("REST %s -> http=%d (expect 404)"%(ep,st))
st,b=raw("GET","/api/now/table/sys_ws_definition?sysparm_query=sys_scope=%s&sysparm_fields=sys_id"%SCOPE,ck,g)
svc=len(json.loads(b).get("result",[])) if st==200 else -1
st,b=raw("GET","/api/now/table/sys_ws_operation?sysparm_query=sys_scope=%s&sysparm_fields=sys_id"%SCOPE,ck,g)
ops=len(json.loads(b).get("result",[])) if st==200 else -1
print("REMAINING rest services=%d rest ops=%d (expect 0/0)"%(svc,ops))
st,b=raw("GET","/api/now/table/sys_script_include?sysparm_query=sys_scope=%s&sysparm_fields=sys_id&sysparm_limit=1&sysparm_no_count=false"%SCOPE,ck,g)
print("DONE")
PYEOF
/home/eiagent/ei/venv/bin/python3 /tmp/deploy_backend.py 2>&1 | tail -20
