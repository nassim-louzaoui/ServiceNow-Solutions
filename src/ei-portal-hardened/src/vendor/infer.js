// Enterprise Intelligence client forward pass (int8 code-as-data GPT). Ported verbatim from the
// box-validated EI_client_infer.js (parity vs reference, logit diff 7e-7); UMD wrapper replaced
// with an ES module export. Same math as export_int8.py.
var EIClientInfer = (function () {

  var SQRT2 = Math.sqrt(2);
  function erf(x){var s=x<0?-1:1;x=Math.abs(x);var t=1/(1+0.3275911*x);
    var y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x);return s*y;}
  function gelu(x){return 0.5*x*(1+erf(x/SQRT2));}

  function b64ToBytes(b64){
    if (typeof Buffer!=="undefined"){var bb=Buffer.from(b64,"base64");return new Uint8Array(bb.buffer,bb.byteOffset,bb.length);}
    var bin=atob(b64),n=bin.length,out=new Uint8Array(n);
    for(var i=0;i<n;i++)out[i]=bin.charCodeAt(i);return out;
  }

  // Build model from a parsed manifest + an array of weight chunk payloads
  // (base64 strings, any order -> sorted by part). Returns { cfg, T } where
  // T[name] = {dtype, shape, q(Int8Array)|f(Float32Array), scale(Float32Array)}.
  function buildModel(manifest, weightChunks){
    var sorted=weightChunks.slice().sort(function(a,b){return a.part-b.part;});
    // total bytes
    var total=0,i;
    for(i=0;i<sorted.length;i++) sorted[i]._bytes=b64ToBytes(sorted[i].payload);
    for(i=0;i<sorted.length;i++) total+=sorted[i]._bytes.length;
    var U=new Uint8Array(total),off=0;
    for(i=0;i<sorted.length;i++){U.set(sorted[i]._bytes,off);off+=sorted[i]._bytes.length;sorted[i]._bytes=null;}
    var dv=new DataView(U.buffer,U.byteOffset,U.byteLength);
    var tensors=manifest.tensors,T={};
    for(i=0;i<tensors.length;i++){
      var sp=tensors[i],name=sp.name,rec={dtype:sp.dtype,shape:sp.shape};
      if(sp.dtype==="float32"){
        var nf=sp.weight_len/4,f=new Float32Array(nf),k;
        for(k=0;k<nf;k++) f[k]=dv.getFloat32(sp.weight_offset+k*4,true);
        rec.f=f;
      } else {
        rec.q=new Int8Array(U.buffer,U.byteOffset+sp.weight_offset,sp.weight_len);
        var ns=sp.scale_len/4,sc=new Float32Array(ns),j;
        for(j=0;j<ns;j++) sc[j]=dv.getFloat32(sp.scale_offset+j*4,true);
        rec.scale=sc;
      }
      T[name]=rec;
    }
    return {cfg:manifest.meta.config,T:T,_U:U};
  }

  // y[o] = scale[o] * sum_i x[i]*q[o*inDim+i]   (int8 lazy dequant)
  function linearQ(x,rec,inDim,outDim){
    var q=rec.q,sc=rec.scale,y=new Float32Array(outDim),o,i,s,base;
    for(o=0;o<outDim;o++){s=0;base=o*inDim;for(i=0;i<inDim;i++)s+=x[i]*q[base+i];y[o]=s*sc[o];}
    return y;
  }
  function layernorm(x,gain,n){
    var m=0,i,d,v=0;for(i=0;i<n;i++)m+=x[i];m/=n;
    for(i=0;i<n;i++){d=x[i]-m;v+=d*d;}v/=n;
    var inv=1/Math.sqrt(v+1e-5),out=new Float32Array(n);
    for(i=0;i<n;i++)out[i]=(x[i]-m)*inv*gain[i];return out;
  }
  // one dequantized row of an int8 [rows,cols] tensor
  function rowQ(rec,r,cols){var q=rec.q,sc=rec.scale[r],out=new Float32Array(cols),base=r*cols,i;
    for(i=0;i<cols;i++)out[i]=q[base+i]*sc;return out;}

  // forward over token ids -> logits [vocab] for LAST position (tied wte),
  // matching ei_infer_es5.forward exactly.
  function forward(M,ids){
    var cfg=M.cfg,T=M.T,C=cfg.n_embd,H=cfg.n_head,L=cfg.n_layer,hd=C/H,
        Tn=ids.length,V=cfg.vocab_size,t,l,i,j,hh;
    var wte=T["transformer.wte.weight"],wpe=T["transformer.wpe.weight"];
    var h=[];
    for(t=0;t<Tn;t++){var row=new Float32Array(C),er=rowQ(wte,ids[t],C),pr=rowQ(wpe,t,C);
      for(i=0;i<C;i++)row[i]=er[i]+pr[i];h.push(row);}
    for(l=0;l<L;l++){
      var p="transformer.h."+l+".";
      var ln1=T[p+"ln_1.weight"].f,ln2=T[p+"ln_2.weight"].f,
          cattn=T[p+"attn.c_attn.weight"],cproj=T[p+"attn.c_proj.weight"],
          cfc=T[p+"mlp.c_fc.weight"],cpj2=T[p+"mlp.c_proj.weight"];
      var q=[],k=[],v=[];
      for(t=0;t<Tn;t++){var a=layernorm(h[t],ln1,C);var qkv=linearQ(a,cattn,C,3*C);
        q.push(qkv.subarray(0,C));k.push(qkv.subarray(C,2*C));v.push(qkv.subarray(2*C,3*C));}
      var attnOut=[];
      for(t=0;t<Tn;t++){var out=new Float32Array(C);
        for(hh=0;hh<H;hh++){var offh=hh*hd,scores=new Float32Array(t+1),mx=-1e30,s;
          for(j=0;j<=t;j++){s=0;for(i=0;i<hd;i++)s+=q[t][offh+i]*k[j][offh+i];s/=Math.sqrt(hd);scores[j]=s;if(s>mx)mx=s;}
          var den=0;for(j=0;j<=t;j++){scores[j]=Math.exp(scores[j]-mx);den+=scores[j];}
          for(i=0;i<hd;i++){var acc=0;for(j=0;j<=t;j++)acc+=(scores[j]/den)*v[j][offh+i];out[offh+i]=acc;}}
        attnOut.push(linearQ(out,cproj,C,C));}
      for(t=0;t<Tn;t++)for(i=0;i<C;i++)h[t][i]+=attnOut[t][i];
      for(t=0;t<Tn;t++){var m2=layernorm(h[t],ln2,C);var f=linearQ(m2,cfc,C,4*C);
        for(i=0;i<4*C;i++)f[i]=gelu(f[i]);var pr2=linearQ(f,cpj2,4*C,C);
        for(i=0;i<C;i++)h[t][i]+=pr2[i];}
    }
    var lnf=T["transformer.ln_f.weight"].f;var hl=layernorm(h[Tn-1],lnf,C);
    // logits = hl @ wte^T (tied), lazy dequant per output row
    var qw=wte.q,sw=wte.scale,logits=new Float32Array(V),o,ss,base2;
    for(o=0;o<V;o++){ss=0;base2=o*C;for(i=0;i<C;i++)ss+=hl[i]*qw[base2+i];logits[o]=ss*sw[o];}
    return logits;
  }
  function argmax(a){var bi=0,bv=a[0];for(var i=1;i<a.length;i++)if(a[i]>bv){bv=a[i];bi=i;}return bi;}
  function sample(logits,temp,topk){
    if(!temp||temp<=0)return argmax(logits);
    var i,V=logits.length,idx=[];for(i=0;i<V;i++)idx.push(i);
    idx.sort(function(a,b){return logits[b]-logits[a];});
    var K=topk&&topk<V?topk:V,mx=logits[idx[0]],den=0,pr=new Float32Array(K);
    for(i=0;i<K;i++){pr[i]=Math.exp((logits[idx[i]]-mx)/temp);den+=pr[i];}
    // deterministic-ish: caller may pass rng; default argmax-of-softmax top
    var r=(typeof EIClientInfer_rng==="function"?EIClientInfer_rng():0)*den,c=0;
    for(i=0;i<K;i++){c+=pr[i];if(r<=c)return idx[i];}
    return idx[0];
  }
  // greedy generate nNew tokens; returns full id list
  function generate(M,ids,nNew){
    var out=ids.slice(),block=M.cfg.block_size;
    for(var n=0;n<nNew;n++){
      var ctx=out.length>block?out.slice(out.length-block):out;
      var lg=forward(M,ctx);out.push(argmax(lg));
    }
    return out;
  }
  return {buildModel:buildModel,forward:forward,generate:generate,argmax:argmax,sample:sample};

})();
export default EIClientInfer;
