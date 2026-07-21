# Patch the ei-portal-app widget's client_script with the latest bundle from object storage.
# (Server script / bridge left untouched.) Auth via login_helper; scope switch to x_intelligence.
import json,subprocess,urllib.request
BASE="https://dev283926.service-now.com"; SCOPE="6fda1f2583460710f36fec80ceaad3e1"
PY="/home/eiagent/ei/venv/bin/python3"; HELPER="/home/eiagent/login_helper.py"
PAR="https://objectstorage.eu-frankfurt-1.oraclecloud.com/p/-fvZyjo7sfHJLLt6pvb_7QxVPQldq-zvZlxgL0Jg56ivCXiLknA3mSeKBz8uw3Wq/n/fryrxfdwttez/b/ei-control/o/"
bundle=urllib.request.urlopen(PAR+"src/ei_react_bundle.js",timeout=90).read().decode()
def raw(m,p,ck,g,b=None,t=120):
    h={"Cookie":ck,"X-UserToken":g,"Accept":"application/json"}
    d=json.dumps(b).encode() if b is not None else None
    if d is not None: h["Content-Type"]="application/json"
    try:
        with urllib.request.urlopen(urllib.request.Request(BASE+p,data=d,headers=h,method=m),timeout=t) as r: return r.status,r.read()
    except Exception as e:
        try: return e.code,e.read()
        except Exception: return 0,str(e).encode()
r=subprocess.run([PY,HELPER],capture_output=True,text=True,timeout=120)
d=json.loads(r.stdout.strip().splitlines()[-1]); ck,g=d["cookie"],d["gck"]
raw("PUT","/api/now/ui/concoursepicker/application",ck,g,{"app_id":SCOPE},40)
CTRL=("api.controller=function($scope,$timeout){\n"+bundle+"\n"
 "var bridge={call:function(p){return $scope.server.get(p).then(function(r){return r.data;});}};\n"
 "$timeout(function(){try{var el=document.getElementById('ei-root');"
 "if(el){document.dispatchEvent(new CustomEvent('ei:mount',{detail:{el:el,bridge:bridge,init:$scope.data||{}}}));}"
 "}catch(e){}},80);\n};")
st,b=raw("GET","/api/now/table/sp_widget?sysparm_query=id=ei-portal-app&sysparm_fields=sys_id",ck,g)
wid=json.loads(b)["result"][0]["sys_id"]
st,b=raw("PATCH","/api/now/table/sp_widget/"+wid,ck,g,{"client_script":CTRL})
print("PATCH widget http=%d bundle=%d"%(st,len(bundle)))
