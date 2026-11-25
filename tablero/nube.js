/* Puente para usar el tablero fuera de Claude.
   NUBE_URL: dirección de la aplicación web de Google Apps Script (planilla compartida).
   Mientras esté vacía, todo se guarda solo en esta computadora. */
window.NUBE_URL = 'https://script.google.com/macros/s/AKfycbx1HEinuhvR9OKe94Y2DrTGL3aBhRP90ehS4moYhg-DsaKZSC0uZMU0RqD0pyNq3g/exec';
window.NUBE_CLAVE = 'munoz-tablero-2026';
(function(){
  const URL_ = () => window.NUBE_URL;
  let cache = null, subs = [], timer = null;
  async function bajar(){
    const r = await fetch(URL_() + '?k=' + encodeURIComponent(window.NUBE_CLAVE) + '&t=' + Date.now());
    const j = await r.json(); if (j.error) throw new Error(j.error);
    cache = {}; (j.docs||[]).forEach(d => cache[d.path] = d.data);
    subs.forEach(s => s());
  }
  async function subir(path, data, del){
    const r = await fetch(URL_(), {method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body: JSON.stringify({k:window.NUBE_CLAVE, path, data, del:!!del})});
    const j = await r.json(); if (j.error) throw new Error(j.error);
    if (cache) { if (del) delete cache[path]; else cache[path] = data; subs.forEach(s => s()); }
  }
  function arrancar(){ if (!timer) { bajar().catch(()=>{}); timer = setInterval(() => bajar().catch(()=>{}), 20000); } }
  const snapDoc = (path) => ({ id: path.split('/').pop(), data: () => cache && cache[path] });
  function doc(path){
    return {
      set: (v) => subir(path, v),
      update: (v) => subir(path, Object.assign({}, cache && cache[path], v)),
      delete: () => subir(path, null, true),
      onSnapshot: (cb, err) => { arrancar(); const f = () => cb(snapDoc(path)); subs.push(f); if (cache) f(); return () => subs = subs.filter(x => x !== f); }
    };
  }
  function collection(col){
    return {
      doc: (id) => doc(col + '/' + id),
      onSnapshot: (cb, err) => { arrancar(); const f = () => { const docs = Object.keys(cache||{}).filter(p => p.startsWith(col + '/') && p.split('/').length === col.split('/').length + 1).map(snapDoc); cb({docs}); }; subs.push(f); if (cache) f(); return () => subs = subs.filter(x => x !== f); }
    };
  }
  const db = { doc, collection };
  async function guardarArchivo({filename, data}){
    const u = URL.createObjectURL(data instanceof Blob ? data : new Blob([data]));
    const a = document.createElement('a'); a.href = u; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 2000);
  }
  /* Sin planilla conectada: guarda en esta computadora con la misma forma */
  function dbLocal(){
    const K='mz-local-db'; const leer=()=>{try{return JSON.parse(localStorage.getItem(K))||{}}catch(_){return {}}};
    const grabar=(o)=>{try{localStorage.setItem(K,JSON.stringify(o))}catch(_){}};
    const ls=[]; const avisar=()=>ls.forEach(f=>f());
    const d=(path)=>({set:async v=>{const o=leer();o[path]=v;grabar(o);avisar()},delete:async()=>{const o=leer();delete o[path];grabar(o);avisar()},
      onSnapshot:(cb)=>{const f=()=>cb({id:path.split('/').pop(),data:()=>leer()[path]});ls.push(f);setTimeout(f,0);return()=>{}}});
    return {doc:d,collection:(col)=>({doc:id=>d(col+'/'+id),onSnapshot:(cb)=>{const f=()=>{const o=leer();cb({docs:Object.keys(o).filter(p=>p.startsWith(col+'/')).map(p=>({id:p.split('/').pop(),data:()=>o[p]}))})};ls.push(f);setTimeout(f,0);return()=>{}}})};
  }
  window.claude = { use: async (n) => n === 'db' ? (URL_() ? db : (window.NUBE_LOCAL ? dbLocal() : null)) : n === 'downloads' ? { save: guardarArchivo } : null };
})();
