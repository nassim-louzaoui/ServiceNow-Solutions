# Browser E2E of the deployed /ei portal WITH WebGPU. Requires env CHROME_PATH (a WebGPU-capable
# Chrome, e.g. Chrome-for-Testing) and the lavapipe Vulkan env already exported. Optional
# CHROME_FLAGS (space separated) overrides the default flag set. Verifies WebGPU binds, the
# closed-loop catalog flows, and the always-on on-device chat generating via WebGPU.
import os,json,time,urllib.request
os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH","/home/eiagent/.cache/ms-playwright")
BASE="https://dev283926.service-now.com"
PAR="https://objectstorage.eu-frankfurt-1.oraclecloud.com/p/-fvZyjo7sfHJLLt6pvb_7QxVPQldq-zvZlxgL0Jg56ivCXiLknA3mSeKBz8uw3Wq/n/fryrxfdwttez/b/ei-control/o/"
CHROME=os.environ["CHROME_PATH"]
DEFAULT_FLAGS="--headless=new --no-sandbox --disable-dev-shm-usage --enable-unsafe-webgpu --enable-features=Vulkan --use-angle=vulkan --disable-vulkan-surface --ignore-gpu-blocklist"
FLAGS=os.environ.get("CHROME_FLAGS",DEFAULT_FLAGS).split()
PW=int(os.environ.get("PWD_",""" 0 """.strip()) or 0)
def put(name,path,ctype="image/png"):
    try: urllib.request.urlopen(urllib.request.Request(PAR+name,data=open(path,"rb").read(),method="PUT",headers={"Content-Type":ctype}),timeout=90)
    except Exception as e: print("upload fail",name,e)
from playwright.sync_api import sync_playwright
res={"webgpu_adapter":False,"adapter_info":None,"checks":[],"chat":{}}
def chk(n,c,info=""): res["checks"].append({"name":n,"pass":bool(c),"info":str(info)[:80]})
with sync_playwright() as pw:
    br=pw.chromium.launch(headless=True,executable_path=CHROME,args=FLAGS)
    c=br.new_context(ignore_https_errors=True,viewport={"width":1600,"height":900}); pg=c.new_page()
    errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)[:140]))
    # 1) confirm WebGPU in THIS browser on a blank page (portal blocks eval, so probe here first)
    pg.set_content("<html><body>x</body></html>")
    info=pg.evaluate("""async()=>{ if(!navigator.gpu) return {gpu:false};
      try{ var a=await navigator.gpu.requestAdapter(); if(!a) return {gpu:true,adapter:false};
        var d=await a.requestDevice(); var i=a.info||{}; return {gpu:true,adapter:true,vendor:i.vendor,desc:i.description,arch:i.architecture}; }
      catch(e){ return {gpu:true,error:''+e}; } }""")
    res["adapter_info"]=info; res["webgpu_adapter"]=bool(info.get("adapter"))
    chk("webgpu_in_browser", res["webgpu_adapter"], info)
    # 2) login + open /ei
    pg.goto(BASE+"/login.do",wait_until="domcontentloaded",timeout=60000)
    pg.fill("#user_name","admin"); pg.fill("#user_password","mItR4%Se3E/w"); pg.click("#sysverb_login")
    try: pg.wait_for_load_state("networkidle",timeout=40000)
    except Exception: pass
    pg.goto(BASE+"/ei",wait_until="domcontentloaded",timeout=60000)
    try: pg.wait_for_selector(".ei-shell",timeout=25000)
    except Exception: pass
    pg.wait_for_timeout(2500)
    def n(s):
        try: return pg.locator(s).count()
        except Exception: return -1
    def txt(s):
        try: return pg.locator(s).first.inner_text(timeout=3000)
        except Exception: return ""
    chk("shell",n(".ei-shell")==1); chk("nav4",n(".ei-nav-item")==4)
    chk("catalog3",n(".ei-catalog-row")==3); chk("no_toggle",n(".ei-asst-mode")==0)
    # 3) closed-loop flows
    ITEMS=[("New Solution Development",4),("Existing Solution Maintenance",2),("Module Bridge Maintenance",2)]
    starts=pg.locator(".ei-catalog-row .ei-btn.primary")
    for i,(nm,mo) in enumerate(ITEMS):
        starts.nth(i).click(); pg.wait_for_timeout(500)
        root=txt(".ei-flow-text"); opts=n(".ei-flow-opt")
        chk("flow_open_%d"%i, n(".ei-flow")==1 and opts>=mo and n(".ei-flow-back")==1, nm+" opts=%d"%opts)
        if opts>0:
            pg.locator(".ei-flow-opt").first.click(); pg.wait_for_timeout(400)
            nt=txt(".ei-flow-text"); chk("flow_branch_%d"%i, nt and nt!=root)
            pg.locator(".ei-flow-back").click(); pg.wait_for_timeout(400)
            chk("flow_back_%d"%i, txt(".ei-flow-text")==root)
        pg.screenshot(path="/home/eiagent/ei/out/browsertest/e2e_flow_%d.png"%i); put("meta/e2e_flow_%d.png"%i,"/home/eiagent/ei/out/browsertest/e2e_flow_%d.png"%i)
    # 4) on-device WebGPU chat: the model loads on mount (always-on). Wait for it, then generate.
    status_seen=[]
    t0=time.time(); ready=False
    while time.time()-t0 < 900:  # up to 15 min for the 339MB load
        s=txt(".ei-asst-status"); 
        if s and s not in status_seen: status_seen.append(s)
        if s in ("On device, GPU","On device"): ready=True; break
        pg.wait_for_timeout(5000)
    res["chat"]["status_progression"]=status_seen[-8:]; res["chat"]["backend_tag"]=txt(".ei-asst-status")
    chk("model_ready", ready, res["chat"]["backend_tag"])
    chk("model_on_gpu", txt(".ei-asst-status")=="On device, GPU", "must be GPU not JS")
    if ready:
        pg.fill(".ei-asst-input","How do I create an ACL"); 
        g0=time.time(); pg.locator(".ei-asst-send").click()
        last=""
        while time.time()-g0 < 300:
            b=txt(".ei-chat-msg.assistant .ei-chat-bubble")
            if b and b not in ("","…") and not b.startswith("Loading") and not b.startswith("Preparing"):
                last=b
                if len(b)>25: break
            pg.wait_for_timeout(4000)
        res["chat"]["generated"]=last; res["chat"]["gen_seconds"]=round(time.time()-g0,1)
        chk("chat_generated", len(last)>0, last[:60])
    pg.screenshot(path="/home/eiagent/ei/out/browsertest/e2e_chat.png"); put("meta/e2e_chat.png","/home/eiagent/ei/out/browsertest/e2e_chat.png")
    res["errors"]=errs[:8]
    br.close()
res["pass_count"]=sum(1 for x in res["checks"] if x["pass"]); res["total"]=len(res["checks"])
res["all_pass"]=res["pass_count"]==res["total"]
open("/home/eiagent/ei/out/browsertest/result.json","w").write(json.dumps(res,indent=1))
put("src/browsertest/result.json","/home/eiagent/ei/out/browsertest/result.json","application/json")
print("E2E_WEBGPU_RESULT:",json.dumps(res))
