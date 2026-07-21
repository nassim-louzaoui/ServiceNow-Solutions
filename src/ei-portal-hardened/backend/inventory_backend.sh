#!/bin/bash
cat > /tmp/inv_backend.py <<'PYEOF'
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
def q(table,query,fields):
    rows=[]; off=0
    while True:
        p="/api/now/table/%s?sysparm_query=%s&sysparm_fields=%s&sysparm_limit=500&sysparm_offset=%d"%(table,urllib.parse.quote(query),fields,off)
        st,b=raw("GET",p,ck,g)
        if st!=200: return rows,st
        r=json.loads(b).get("result",[])
        rows+=r
        if len(r)<500: break
        off+=500
    return rows,200
r=subprocess.run([PY,HELPER],capture_output=True,text=True,timeout=120)
d=json.loads(r.stdout.strip().splitlines()[-1]); ck,g=d["cookie"],d["gck"]

# Script includes: total + non-model (name not starting EI_)
si,_=q("sys_script_include","sys_scope=%s"%SCOPE,"name,sys_id,api_name")
models=[x for x in si if x["name"].startswith("EI_")]
nonmodel=[x for x in si if not x["name"].startswith("EI_")]
print("SCRIPT_INCLUDES total=%d models(EI_)=%d nonmodel=%d"%(len(si),len(models),len(nonmodel)))
for x in sorted(nonmodel,key=lambda z:z["name"]): print("  SI:",x["name"],x["sys_id"])

# Scripted REST services + operations (the 'rest api stuff' to remove)
for tbl,label in [("sys_ws_definition","REST_SERVICE"),("sys_ws_operation","REST_OP")]:
    rows,st=q(tbl,"sys_scope=%s"%SCOPE,"name,sys_id")
    print("%s count=%d (http=%d)"%(label,len(rows),st))
    for x in rows: print("  %s: %s %s"%(label,x.get("name"),x["sys_id"]))

# Other backend artifact tables that shouldn't linger in a clean production scope
for tbl,label,fields in [
    ("sys_script","BUSINESS_RULE","name,sys_id"),
    ("sys_script_client","CLIENT_SCRIPT","name,sys_id"),
    ("sys_script_fix","FIX_SCRIPT","name,sys_id"),
    ("sysevent_script_action","EVENT_SCRIPT_ACTION","name,sys_id"),
    ("sys_ui_action","UI_ACTION","name,sys_id"),
    ("sys_ui_page","UI_PAGE","name,sys_id"),
    ("sys_processor","PROCESSOR","name,sys_id"),
    ("sysevent_register","EVENT_REG","event_name,sys_id"),
    ("sys_rest_message","REST_MESSAGE","name,sys_id"),
    ("sys_properties","PROPERTY","name,sys_id"),
    ("sys_scheduled_script","SCHEDULED_JOB","name,sys_id"),
    ("sysauto_script","SCHEDULED_SCRIPT_JOB","name,sys_id"),
]:
    rows,st=q(tbl,"sys_scope=%s"%SCOPE,fields)
    if rows or st!=200:
        print("%s count=%d (http=%d)"%(label,len(rows),st))
        for x in rows[:40]: print("  %s: %s %s"%(label,x.get("name") or x.get("event_name"),x["sys_id"]))

# Portal records (KEEP) — just count
for tbl,label in [("sp_widget","WIDGET"),("sp_page","PAGE"),("sp_portal","PORTAL"),("sp_theme","THEME")]:
    rows,st=q(tbl,"sys_scope=%s"%SCOPE,"id,sys_id")
    print("%s count=%d"%(label,len(rows)))
    for x in rows: print("  %s: %s %s"%(label,x.get("id"),x["sys_id"]))
print("DONE")
PYEOF
/home/eiagent/ei/venv/bin/python3 /tmp/inv_backend.py 2>&1 | tail -80
