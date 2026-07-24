# Browser E2E of /ei WITH WebGPU. Launches Chrome-for-Testing directly (proven WebGPU flags) and
# drives it over CDP so navigator.gpu binds; verifies WebGPU, the closed-loop flows, and the
# always-on on-device chat generating on the GPU path.
import os,json,time,subprocess,urllib.request,signal
os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH","/home/eiagent/.cache/ms-playwright")
BASE="https://dev283926.service-now.com"
PAR="https://objectstorage.eu-frankfurt-1.oraclecloud.com/p/-fvZyjo7sfHJLLt6pvb_7QxVPQldq-zvZlxgL0Jg56ivCXiLknA3mSeKBz8uw3Wq/n/fryrxfdwttez/b/ei-control/o/"
CHROME=os.environ["CHROME_PATH"]
FLAGS=os.environ.get("CHROME_FLAGS","--no-sandbox --disable-dev-shm-usage --enable-unsafe-webgpu").split()
def put(name,path,ctype="image/png"):
    try: urllib.request.urlopen(urllib.request.Request(PAR+name,data=open(path,"rb").read(),method="PUT",headers={"Content-Type":ctype}),timeout=90)
    except Exception as e: print("upload fail",name,e)
res={"webgpu_adapter":False,"adapter_info":None,"checks":[],"chat":{},"errors":[]}
def chk(n,c,info=""): res["checks"].append({"name":n,"pass":bool(c),"info":str(info)[:90]})
# launch Chrome directly with the proven WebGPU flags + remote debugging, drive over CDP
prof="/tmp/cdp_ei_profile"
os.system("rm -rf "+prof)
chrome=subprocess.Popen([CHROME]+FLAGS+["--headless=new","--remote-debugging-port=9333","--user-data-dir="+prof,"about:blank"],
                        stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(5)
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    br=pw.chromium.connect_over_cdp("http://127.0.0.1:9333")
    ctx=br.contexts[0] if br.contexts else br.new_context()
    ctx.set_default_timeout(30000)
    pg=ctx.new_page()
    pg.on("pageerror",lambda e:res["errors"].append(str(e)[:140]))
    # 1) WebGPU probe on a blank secure-context page
    pg.goto("https://dev283926.service-now.com/robots.txt",wait_until="domcontentloaded")
    info=pg.evaluate("""async()=>{ if(!navigator.gpu) return {gpu:false};
      try{ var a=await navigator.gpu.requestAdapter(); if(!a) return {gpu:true,adapter:false};
        var d=await a.requestDevice(); var i=a.info||{}; return {gpu:true,adapter:true,vendor:i.vendor,desc:i.description,arch:i.architecture}; }
      catch(e){ return {gpu:true,error:''+e}; } }""")
    res["adapter_info"]=info; res["webgpu_adapter"]=bool(info.get("adapter"))
    chk("webgpu_in_browser", res["webgpu_adapter"], info)
    # 2) login + /ei
    pg.goto(BASE+"/login.do",wait_until="domcontentloaded")
    pg.fill("#user_name","admin"); pg.fill("#user_password","mItR4%Se3E/w"); pg.click("#sysverb_login")
    try: pg.wait_for_load_state("networkidle",timeout=40000)
    except Exception: pass
    pg.goto(BASE+"/ei",wait_until="domcontentloaded")
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
    # EXIT flow mode so the free-chat (status + input) is visible again
    for _ in range(6):
        if n(".ei-flow")==0: break
        try: pg.locator(".ei-flow-back").click(); pg.wait_for_timeout(300)
        except Exception: break
    chk("exited_flow", n(".ei-flow")==0 and n(".ei-asst-input")==1)
    # 4) on-device chat (LAZY: sending the first message loads the model batched, then generates).
    chk("model_idle_label", txt(".ei-asst-status") in ("On device","Loading model 0%","Preparing"), txt(".ei-asst-status"))
    prog=[]
    try:
        pg.fill(".ei-asst-input","How do I create an ACL"); pg.locator(".ei-asst-send").click()
    except Exception as e:
        res["chat"]["send_err"]=str(e)[:80]
    g0=time.time(); last=""
    while time.time()-g0 < 1500:  # up to 25 min: batched 339MB load + generation
        s2=txt(".ei-asst-status")
        if s2 and (not prog or prog[-1]!=s2): prog.append(s2)
        b=txt(".ei-chat-msg.assistant .ei-chat-bubble")
        if b and b not in ("","…") and not b.startswith("Loading") and not b.startswith("Preparing"):
            last=b
            if len(b)>20: break
        pg.wait_for_timeout(6000)
    res["chat"]["status_progression"]=prog[-14:]; res["chat"]["backend_tag"]=txt(".ei-asst-status")
    res["chat"]["generated"]=last; res["chat"]["gen_seconds"]=round(time.time()-g0,1)
    chk("model_loaded", any("On device" in x for x in prog) or len(last)>0, res["chat"]["backend_tag"])
    chk("model_on_gpu", txt(".ei-asst-status")=="On device, GPU", "must be GPU not JS")
    chk("chat_generated", len(last)>0, last[:70])
    try:
        pg.screenshot(path="/home/eiagent/ei/out/browsertest/e2e_chat.png",timeout=15000); put("meta/e2e_chat.png","/home/eiagent/ei/out/browsertest/e2e_chat.png")
    except Exception as e: res.setdefault("errors",[]).append("screenshot:"+str(e)[:80])
    br.close()
try: chrome.send_signal(signal.SIGTERM)
except Exception: pass
res["pass_count"]=sum(1 for x in res["checks"] if x["pass"]); res["total"]=len(res["checks"]); res["all_pass"]=res["pass_count"]==res["total"]
open("/home/eiagent/ei/out/browsertest/result.json","w").write(json.dumps(res,indent=1))
put("src/browsertest/result.json","/home/eiagent/ei/out/browsertest/result.json","application/json")
print("E2E_RESULT:",json.dumps(res))
