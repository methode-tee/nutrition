/* Méthode Tee — V851 · Check-in Nutri & suivi Tee
   Objectifs :
   - check-in quotidien court (30–60 s)
   - champs sportifs uniquement pour les profils performance
   - planning sportif hebdomadaire renseigné par le Nutri
   - poids limité à 1 saisie / 7 jours
   - compatibilité avec l'ancien suivi (énergie/sommeil/digestion /5)
   - aucune nouvelle table Supabase : programme.suivi + programme.client_sport_plans
*/
(function(){
  if(window.__MT_CHECKIN_V851__) return;
  window.__MT_CHECKIN_V851__=true;

  const arr=v=>Array.isArray(v)?v:[];
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const todayKey=()=>typeof mtLocalDateKey==="function"?mtLocalDateKey():new Date().toISOString().slice(0,10);
  const dateKey=d=>typeof mtLocalDateKey==="function"?mtLocalDateKey(d):[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
  const weekStartKey=(base=new Date())=>{const d=new Date(base);d.setHours(12,0,0,0);const delta=(d.getDay()+6)%7;d.setDate(d.getDate()-delta);return dateKey(d);};
  const isSportProfile=prog=>prog?.parcours==="performance" || !!prog?.athlete;
  const gv=id=>document.getElementById(id);
  const val=id=>gv(id)?.value??"";
  const checked=id=>!!gv(id)?.checked;
  const setValue=(id,v)=>{const e=gv(id);if(e&&v!==undefined&&v!==null)e.value=String(v);};
  const setText=(id,v)=>{const e=gv(id);if(e)e.textContent=String(v??"");};
  const n10to5=n=>{const x=Number(n);return x?Math.max(1,Math.min(5,Math.round(x/2))):"";};
  const digestionTo5=s=>({comfortable:5,bloating:3,heavy:2,transit:2}[s]||"");
  const recoveryTo5=s=>({fresh:5,light:4,sore:2,very_sore:1,tired:2}[s]||"");
  const legsToSoreness=s=>({light:1,normal:2,heavy:4,very_heavy:5}[s]||"");

  function followupEntries(prog){
    return Object.entries(prog?.suivi||{}).filter(([d,v])=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&v&&typeof v==="object").sort((a,b)=>b[0].localeCompare(a[0]));
  }
  function lastWeight(prog){
    return followupEntries(prog).find(([,v])=>String(v?.poids||"").trim());
  }
  function daysBetween(a,b){return Math.floor((new Date(b+"T12:00:00")-new Date(a+"T12:00:00"))/864e5);}
  function showWeightField(prog){
    const lw=lastWeight(prog);if(!lw)return true;
    return daysBetween(lw[0],todayKey())>=7;
  }

  function fieldLabel(label,help=""){
    return `<div style="margin-bottom:7px"><label style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.10em;color:var(--muted)">${esc(label)}</label>${help?`<p style="font-size:10px;color:#a29a91;margin:3px 0 0;line-height:1.4">${esc(help)}</p>`:""}</div>`;
  }
  function selectField(id,label,options,help=""){
    return `<div class="mt851-field">${fieldLabel(label,help)}<select id="${id}" class="mt851-input" onchange="mt851QueueSave()"><option value="">— Choisir —</option>${options.map(([v,l])=>`<option value="${esc(v)}">${esc(l)}</option>`).join("")}</select></div>`;
  }
  function numberField(id,label,attrs="",placeholder="",help=""){
    return `<div class="mt851-field">${fieldLabel(label,help)}<input id="${id}" class="mt851-input" type="number" ${attrs} placeholder="${esc(placeholder)}" oninput="mt851QueueSave()"></div>`;
  }
  function range10(id,label){
    return `<div class="mt851-field">${fieldLabel(label)}<div style="display:flex;align-items:center;gap:12px"><input id="${id}" type="range" min="1" max="10" value="5" oninput="document.getElementById('${id}-v').textContent=this.value+'/10';mt851QueueSave()" style="width:100%;accent-color:var(--brand)"><strong id="${id}-v" style="font-size:12px;color:var(--brand);min-width:34px">5/10</strong></div></div>`;
  }

  function installStyle(){
    if(document.getElementById("mt851-style"))return;
    const s=document.createElement("style");s.id="mt851-style";s.textContent=`
      .mt851-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.mt851-field{padding:12px;border:1px solid #eee7df;border-radius:14px;background:#fff}.mt851-input{width:100%;border:1px solid #e7e0d8;border-radius:12px;padding:10px 11px;font:inherit;font-size:12px;color:var(--ink);background:#fff;outline:none}.mt851-card{padding:18px;border-radius:18px;background:white;border:1px solid #eee7df;margin-bottom:14px}.mt851-kicker{font-size:9px;text-transform:uppercase;letter-spacing:.15em;font-weight:900;color:var(--brand);margin:0 0 5px}.mt851-title{font-size:20px;color:var(--ink);margin:0}.mt851-note{font-size:11px;color:var(--muted);line-height:1.55;margin:5px 0 0}.mt851-session{display:none;margin-top:12px;padding-top:12px;border-top:1px solid #eee7df}.mt851-week-row{display:grid;grid-template-columns:1.15fr .8fr 1.1fr .75fr;gap:6px;padding:8px 0;border-top:1px solid #eee7df}.mt851-week-row .mt851-input{font-size:11px;padding:8px}.mt851-hist{padding:9px 0;border-top:1px solid #eee7df}.mt851-pill{display:inline-flex;padding:4px 7px;border-radius:999px;background:#f3efe9;font-size:9px;color:var(--ink);font-weight:700;margin:2px 3px 2px 0}@media(max-width:620px){.mt851-grid{grid-template-columns:1fr}.mt851-week-row{grid-template-columns:1fr 1fr}.mt851-week-row .wide{grid-column:1/-1}}
    `;document.head.appendChild(s);
  }

  function buildClientCheckin(prog){
    const section=gv("tab-suivi");if(!section||window.MT_ADMIN_PAGE)return;
    installStyle();
    const sport=isSportProfile(prog), showWeight=showWeightField(prog);
    section.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:18px"><div><p class="mt851-kicker">MON CHECK-IN</p><h2 class="serif" style="font-size:30px;color:var(--ink);margin:0">Aujourd’hui</h2><p id="mt851-date" class="mt851-note"></p></div><span id="mt851-save-state" style="font-size:10px;font-weight:800;color:var(--brand)">Prêt</span></div>
      <div class="mt851-card"><p class="mt851-kicker">30–60 secondes</p><h3 class="serif mt851-title">Comment va ta journée ?</h3><p class="mt851-note">Tu renseignes les faits et ton ressenti. Tee interprète et ajuste ensuite si nécessaire.</p>
        <div class="mt851-grid" style="margin-top:14px">
          ${numberField("mt851-sleep-hours","Sommeil · durée",'min="0" max="16" step="0.25"',"ex : 7.5","Heures réellement dormies")}
          ${range10("mt851-sleep-quality","Sommeil · qualité")}
          ${range10("mt851-energy","Énergie générale")}
          ${selectField("mt851-hunger","Faim",[["low","Faible"],["normal","Normale"],["high","Élevée"]])}
          ${selectField("mt851-digestion","Digestion",[["comfortable","Confortable"],["bloating","Ballonnements"],["heavy","Lourdeur"],["transit","Transit perturbé"]])}
          ${numberField("mt851-water","Hydratation",'min="0" max="10" step="0.1"',"ex : 1.8 L")}
          ${selectField("mt851-recovery","Récupération",[["fresh","Frais / en forme"],["light","Légères courbatures"],["sore","Courbatures fortes"],["tired","Fatigue importante"]])}
          ${selectField("mt851-adherence","Journée alimentaire",[["yes","Globalement suivie"],["partial","Partiellement"],["no","Non"]],"Pas de culpabilité : c’est une donnée de suivi.")}
          ${sport?selectField("mt851-legs","Jambes aujourd’hui",[["light","Légères"],["normal","Normales"],["heavy","Lourdes"],["very_heavy","Très lourdes"]]):""}
          ${showWeight?numberField("mt851-weight","Poids · 1× / semaine",'min="20" max="300" step="0.1"',"kg","Facultatif et seulement si utile à ton objectif."):""}
        </div>
        <div style="margin-top:10px">${fieldLabel("Quelque chose à signaler ?","Facultatif")}<textarea id="mt851-note" class="mt851-input" style="min-height:72px;resize:vertical" placeholder="Ex : petite faim avant l’entraînement, ventre lourd…" oninput="mt851QueueSave()"></textarea></div>
      </div>
      ${sport?`<div class="mt851-card"><p class="mt851-kicker">SÉANCE DU JOUR</p><h3 class="serif mt851-title">Tu t’es entraîné aujourd’hui ?</h3><div style="display:flex;gap:8px;margin-top:12px"><button type="button" id="mt851-session-no" class="chip" onclick="mt851SetSession(false)">Non</button><button type="button" id="mt851-session-yes" class="chip" onclick="mt851SetSession(true)">Oui</button></div><div id="mt851-session-fields" class="mt851-session"><div class="mt851-grid">
        ${selectField("mt851-session-type","Type",[["football","Football / terrain"],["gym","Musculation"],["cardio","Cardio"],["recovery","Récupération / mobilité"],["match","Match / compétition"],["other","Autre"]])}
        ${numberField("mt851-session-duration","Durée",'min="1" max="360" step="5"',"minutes")}
        ${range10("mt851-session-intensity","Intensité ressentie")}
        ${range10("mt851-session-energy","Énergie pendant la séance")}
        ${selectField("mt851-session-recovery","Récupération juste après",[["good","Bonne"],["average","Moyenne"],["hard","Difficile"]])}
        ${selectField("mt851-pain","Douleur ou gêne ?",[["no","Non"],["yes","Oui"]])}
        <div class="mt851-field" id="mt851-pain-zone-wrap" style="display:none">${fieldLabel("Zone")}<input id="mt851-pain-zone" class="mt851-input" placeholder="ex : ischio droit" oninput="mt851QueueSave()"></div>
      </div></div></div>`:""}
      ${sport?`<div class="mt851-card" id="mt851-week-card"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div><p class="mt851-kicker">UNE FOIS PAR SEMAINE</p><h3 class="serif mt851-title">Mon planning sportif</h3><p class="mt851-note">Ajoute les séances prévues. Tee peut ainsi contextualiser tes journées et anticiper.</p></div><button type="button" class="chip" onclick="mt851AddPlanRow()">+ Séance</button></div><div id="mt851-plan-list" style="margin-top:12px"></div><div class="mt851-grid" style="margin-top:10px">${selectField("mt851-week-match","Match / compétition cette semaine ?",[["no","Non"],["yes","Oui"]])}${selectField("mt851-week-travel","Déplacement cette semaine ?",[["no","Non"],["yes","Oui"]])}</div><textarea id="mt851-week-note" class="mt851-input" style="min-height:60px;margin-top:10px" placeholder="Note facultative : horaires variables, double séance possible…"></textarea><button type="button" class="btn btn-brand" style="width:100%;margin-top:10px" onclick="mt851SaveWeeklyPlan()">Enregistrer mon planning</button><p id="mt851-plan-state" class="mt851-note" style="text-align:center"></p></div>`:""}
      <div class="mt851-card"><p class="mt851-kicker">MES 7 DERNIERS JOURS</p><div id="mt851-history"></div></div>`;
    setText("mt851-date",new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"}));
    if(sport){gv("mt851-pain")?.addEventListener("change",()=>{gv("mt851-pain-zone-wrap").style.display=val("mt851-pain")==="yes"?"block":"none";window.mt851QueueSave();});}
    restoreDaily(prog);
    renderHistory(prog);
    if(sport)restoreWeeklyPlan(prog);
  }

  function buildDailyData(){
    const sport=typeof _currentProg!=="undefined"&&isSportProfile(_currentProg);
    const sleepQ=Number(val("mt851-sleep-quality"))||0, energy10=Number(val("mt851-energy"))||0;
    const dig=val("mt851-digestion"), rec=val("mt851-recovery"), adherence=val("mt851-adherence"), legs=val("mt851-legs");
    const sessionDone=sport?gv("mt851-session-fields")?.dataset?.active==="1":false;
    const data={
      filled:true,date:todayKey(),submitted_at:new Date().toISOString(),schema:"v851",
      sommeil_heures:val("mt851-sleep-hours"),sommeil_qualite_10:sleepQ||"",energie_10:energy10||"",
      faim:val("mt851-hunger"),digestion_status:dig,hydratation_litres:val("mt851-water"),
      recuperation_status:rec,adherence, note:val("mt851-note"),
      sommeil:n10to5(sleepQ),energie:n10to5(energy10),digestion:digestionTo5(dig),recuperation:recoveryTo5(rec),
      eau:String(val("mt851-water")).trim()!=="",repas:adherence==="yes",infusion:false,sport:sessionDone
    };
    if(gv("mt851-weight"))data.poids=val("mt851-weight");
    if(sport){
      data.jambes=legs;data.courbatures=legsToSoreness(legs);
      data.session_done=sessionDone;
      if(sessionDone)data.session={type:val("mt851-session-type"),duration_min:val("mt851-session-duration"),intensity_10:val("mt851-session-intensity"),energy_10:val("mt851-session-energy"),recovery:val("mt851-session-recovery"),pain:val("mt851-pain")==="yes",pain_zone:val("mt851-pain-zone")};
    }
    return data;
  }

  function restoreDaily(prog){
    const s=prog?.suivi?.[todayKey()]||(()=>{try{return JSON.parse(localStorage.getItem("mt_suivi_"+(currentSlug||"admin")+"_"+todayKey())||"{}")}catch(e){return {}}})();
    setValue("mt851-sleep-hours",s.sommeil_heures||"");
    const sq=s.sommeil_qualite_10||((Number(s.sommeil)||0)*2)||5;setValue("mt851-sleep-quality",sq);setText("mt851-sleep-quality-v",sq+"/10");
    const en=s.energie_10||((Number(s.energie)||0)*2)||5;setValue("mt851-energy",en);setText("mt851-energy-v",en+"/10");
    setValue("mt851-hunger",s.faim||"");setValue("mt851-digestion",s.digestion_status||"");setValue("mt851-water",s.hydratation_litres||s.hydratation_litres_estimee||"");setValue("mt851-recovery",s.recuperation_status||"");setValue("mt851-adherence",s.adherence||"");setValue("mt851-legs",s.jambes||"");setValue("mt851-weight",s.poids||"");setValue("mt851-note",s.note||"");
    if(isSportProfile(prog)){
      window.mt851SetSession(!!(s.session_done||s.session));
      const se=s.session||{};setValue("mt851-session-type",se.type||"");setValue("mt851-session-duration",se.duration_min||"");
      const si=se.intensity_10||5;setValue("mt851-session-intensity",si);setText("mt851-session-intensity-v",si+"/10");
      const ee=se.energy_10||5;setValue("mt851-session-energy",ee);setText("mt851-session-energy-v",ee+"/10");
      setValue("mt851-session-recovery",se.recovery||"");setValue("mt851-pain",se.pain?"yes":"no");setValue("mt851-pain-zone",se.pain_zone||"");if(gv("mt851-pain-zone-wrap"))gv("mt851-pain-zone-wrap").style.display=se.pain?"block":"none";
    }
  }

  window.mt851SetSession=function(active){
    const box=gv("mt851-session-fields");if(!box)return;box.dataset.active=active?"1":"0";box.style.display=active?"block":"none";
    const y=gv("mt851-session-yes"),n=gv("mt851-session-no");if(y)y.style.background=active?"var(--brand)":"";if(y)y.style.color=active?"white":"";if(n)n.style.background=!active?"var(--brand)":"";if(n)n.style.color=!active?"white":"";window.mt851QueueSave();
  };

  async function syncProgrammeKey(key,value){
    if(!sb||!currentSlug||window.MT_ADMIN_PAGE)return false;
    try{
      const r=await sb.from(SB_TABLE).select("programme").eq("slug",currentSlug).single();if(r.error||!r.data)throw(r.error||new Error("Programme introuvable"));
      const p=Object.assign({},r.data.programme||{});p[key]=value;const up=await sb.from(SB_TABLE).update({programme:p}).eq("slug",currentSlug);if(up.error)throw up.error;if(typeof _currentProg!=="undefined"&&_currentProg)_currentProg[key]=value;return true;
    }catch(e){console.warn("[V851] sync",key,e);return false;}
  }
  let saveTimer=null;
  window.mt851QueueSave=function(){
    if(window.MT_ADMIN_PAGE)return;
    setText("mt851-save-state","…");clearTimeout(saveTimer);saveTimer=setTimeout(window.mt851SaveDaily,650);
  };
  window.mt851SaveDaily=async function(){
    if(window.MT_ADMIN_PAGE||!currentSlug)return;
    const data=buildDailyData(),slug=currentSlug,today=todayKey();
    try{localStorage.setItem("mt_suivi_"+slug+"_"+today,JSON.stringify(data));}catch(e){}
    if(typeof _currentProg!=="undefined"&&_currentProg){_currentProg.suivi=_currentProg.suivi||{};_currentProg.suivi[today]=data;}
    const all=Object.assign({},(_currentProg?.suivi||{}),{[today]:data});const ok=await syncProgrammeKey("suivi",all);setText("mt851-save-state",ok?"Enregistré ✓":"À resynchroniser");if(_currentProg)renderHistory(_currentProg);
  };

  function renderHistory(prog){
    const box=gv("mt851-history");if(!box)return;const xs=followupEntries(prog).filter(([,v])=>v?.filled).slice(0,7);
    if(!xs.length){box.innerHTML='<p class="mt851-note">Aucun check-in enregistré pour le moment.</p>';return;}
    box.innerHTML=xs.map(([d,v])=>{const pills=[];if(v.sommeil_heures)pills.push(`🌙 ${esc(v.sommeil_heures)} h`);if(v.energie_10)pills.push(`⚡ ${esc(v.energie_10)}/10`);if(v.hydratation_litres)pills.push(`💧 ${esc(v.hydratation_litres)} L`);if(v.jambes)pills.push(`🦵 ${esc(({light:"légères",normal:"normales",heavy:"lourdes",very_heavy:"très lourdes"}[v.jambes]||v.jambes))}`);if(v.session_done)pills.push(`🏃 séance${v.session?.duration_min?` · ${esc(v.session.duration_min)} min`:""}`);return `<div class="mt851-hist"><div style="display:flex;justify-content:space-between;gap:8px"><strong style="font-size:11px;color:var(--ink)">${new Date(d+"T12:00:00").toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"})}</strong>${v.adherence?`<span style="font-size:9px;color:var(--muted)">${esc(({yes:"journée suivie",partial:"partielle",no:"non suivie"}[v.adherence]||v.adherence))}</span>`:""}</div><div style="margin-top:5px">${pills.map(x=>`<span class="mt851-pill">${x}</span>`).join("")}</div>${v.note?`<p class="mt851-note" style="margin-top:5px">${esc(v.note)}</p>`:""}</div>`;}).join("");
  }

  let planRows=[];
  window.mt851AddPlanRow=function(seed={}){
    planRows.push({id:seed.id||("p"+Date.now()+Math.random().toString(36).slice(2,5)),date:seed.date||todayKey(),time:seed.time||"",type:seed.type||"training",duration_min:seed.duration_min||"",intensity:seed.intensity||"moderate"});renderPlanRows();
  };
  window.mt851RemovePlanRow=function(id){planRows=planRows.filter(x=>x.id!==id);renderPlanRows();};
  function renderPlanRows(){const box=gv("mt851-plan-list");if(!box)return;box.innerHTML=planRows.length?planRows.map((r,i)=>`<div class="mt851-week-row" data-plan-id="${esc(r.id)}"><input class="mt851-input" type="date" data-k="date" value="${esc(r.date)}"><input class="mt851-input" type="time" data-k="time" value="${esc(r.time)}"><select class="mt851-input wide" data-k="type"><option value="training" ${r.type==="training"?"selected":""}>Entraînement</option><option value="gym" ${r.type==="gym"?"selected":""}>Musculation</option><option value="recovery" ${r.type==="recovery"?"selected":""}>Récupération</option><option value="match" ${r.type==="match"?"selected":""}>Match / compétition</option><option value="other" ${r.type==="other"?"selected":""}>Autre</option></select><div style="display:flex;gap:5px"><input class="mt851-input" type="number" min="1" max="360" step="5" data-k="duration_min" placeholder="min" value="${esc(r.duration_min)}"><button type="button" onclick="mt851RemovePlanRow('${esc(r.id)}')" style="border:0;background:transparent;color:#b91c1c;font-size:16px">×</button></div><select class="mt851-input wide" data-k="intensity" style="grid-column:1/-1"><option value="light" ${r.intensity==="light"?"selected":""}>Intensité légère</option><option value="moderate" ${r.intensity==="moderate"?"selected":""}>Intensité modérée</option><option value="hard" ${r.intensity==="hard"?"selected":""}>Intensité intense</option></select></div>`).join(""):'<p class="mt851-note">Aucune séance ajoutée. Ajoute uniquement ce qui est déjà prévu.</p>';}
  function collectPlanRows(){return Array.from(document.querySelectorAll("[data-plan-id]")).map(row=>{const get=k=>row.querySelector(`[data-k="${k}"]`)?.value||"";return {id:row.dataset.planId,date:get("date"),time:get("time"),type:get("type"),duration_min:get("duration_min"),intensity:get("intensity")};}).filter(x=>x.date);}
  function restoreWeeklyPlan(prog){
    const wk=weekStartKey(),plan=prog?.client_sport_plans?.[wk]||{};planRows=arr(plan.sessions).map(x=>Object.assign({},x));if(!planRows.length)window.mt851AddPlanRow({date:todayKey()});else renderPlanRows();setValue("mt851-week-match",plan.match?"yes":"no");setValue("mt851-week-travel",plan.travel?"yes":"no");setValue("mt851-week-note",plan.note||"");
  }
  window.mt851SaveWeeklyPlan=async function(){
    if(!currentSlug)return;const wk=weekStartKey(),plans=Object.assign({},_currentProg?.client_sport_plans||{}),sessions=collectPlanRows();plans[wk]={week_start:wk,updated_at:new Date().toISOString(),sessions,session_count:sessions.length,match:val("mt851-week-match")==="yes",travel:val("mt851-week-travel")==="yes",note:val("mt851-week-note")};setText("mt851-plan-state","Enregistrement…");if(_currentProg)_currentProg.client_sport_plans=plans;const ok=await syncProgrammeKey("client_sport_plans",plans);setText("mt851-plan-state",ok?"Planning enregistré ✓":"Impossible de synchroniser pour le moment");
  };

  function adminStat(label,value){return `<div style="background:white;border-radius:12px;padding:10px 12px"><p style="font-size:9px;text-transform:uppercase;letter-spacing:.08em;font-weight:900;color:var(--muted);margin:0 0 4px">${esc(label)}</p><p style="font-size:13px;font-weight:800;color:var(--ink);margin:0">${esc(value||"—")}</p></div>`;}
  function renderAdminCheckin(prog){
    const suivi=prog?.suivi||{},dates=Object.keys(suivi).sort().reverse(),de=gv("suivi-admin-derniere"),re=gv("suivi-admin-resume"),da=gv("suivi-admin-derniere-data"),hi=gv("suivi-admin-historique");
    if(!dates.length){if(de)de.textContent="Aucune donnée";if(re)re.style.display="none";if(hi)hi.innerHTML='<p style="font-size:12px;color:var(--muted);font-style:italic">Aucun check-in enregistré.</p>';return;}
    const d=suivi[dates[0]]||{};if(de)de.textContent="Dernier check-in : "+new Date(dates[0]+"T12:00:00").toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});if(re)re.style.display="block";
    if(da)da.innerHTML=adminStat("Sommeil",d.sommeil_heures?`${d.sommeil_heures} h · ${d.sommeil_qualite_10||"—"}/10`:(d.sommeil?`${d.sommeil}/5`:"—"))+adminStat("Énergie",d.energie_10?`${d.energie_10}/10`:(d.energie?`${d.energie}/5`:"—"))+adminStat("Hydratation",d.hydratation_litres?`${d.hydratation_litres} L`:"—")+adminStat("Digestion",({comfortable:"Confortable",bloating:"Ballonnements",heavy:"Lourdeur",transit:"Transit perturbé"}[d.digestion_status]||(d.digestion?`${d.digestion}/5`:"—")))+adminStat("Faim",({low:"Faible",normal:"Normale",high:"Élevée"}[d.faim]||"—"))+adminStat("Adhérence",({yes:"Oui",partial:"Partielle",no:"Non"}[d.adherence]||"—"))+(d.jambes?adminStat("Jambes",({light:"Légères",normal:"Normales",heavy:"Lourdes",very_heavy:"Très lourdes"}[d.jambes]||d.jambes)):"")+(d.session_done?adminStat("Séance",`${d.session?.type||"Oui"}${d.session?.duration_min?` · ${d.session.duration_min} min`:""}${d.session?.intensity_10?` · ${d.session.intensity_10}/10`:""}`):"");
    if(hi)hi.innerHTML=dates.slice(0,7).map(date=>{const x=suivi[date]||{};return `<div style="border:1px solid #eee7df;border-radius:13px;padding:10px 12px"><div style="display:flex;justify-content:space-between;gap:8px"><strong style="font-size:11px;color:var(--ink)">${new Date(date+"T12:00:00").toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"})}</strong><span style="font-size:9px;color:var(--muted)">${x.energie_10?`Énergie ${esc(x.energie_10)}/10`:x.energie?`Énergie ${esc(x.energie)}/5`:""}</span></div>${x.note?`<p style="font-size:10px;color:var(--muted);margin:5px 0 0">${esc(x.note)}</p>`:""}</div>`;}).join("");
  }

  function renderAdminGlobalV851(){
    if(!window.MT_ADMIN_PAGE||!sb)return;const box=gv("suivi-global-list");if(!box)return;box.innerHTML='<p style="font-size:12px;color:var(--muted)">Chargement…</p>';
    sb.from(SB_TABLE).select("slug,prenom,programme").then(({data,error})=>{if(error||!data){box.innerHTML='<p style="font-size:12px;color:var(--muted)">Erreur.</p>';return;}const today=todayKey();const filled=[],waiting=[];data.forEach(c=>{const s=c.programme?.suivi?.[today];(s?.filled?filled:waiting).push({c,s});});box.innerHTML=`<div style="display:flex;gap:8px;margin-bottom:12px"><div style="flex:1;background:#dcfce7;border-radius:12px;padding:10px;text-align:center"><strong style="font-size:20px;color:#16a34a">${filled.length}</strong><p style="font-size:9px;text-transform:uppercase;font-weight:900;color:#16a34a;margin:2px 0 0">Check-in aujourd’hui</p></div><div style="flex:1;background:#f0ece6;border-radius:12px;padding:10px;text-align:center"><strong style="font-size:20px;color:var(--muted)">${waiting.length}</strong><p style="font-size:9px;text-transform:uppercase;font-weight:900;color:var(--muted);margin:2px 0 0">Sans check-in aujourd’hui</p></div></div>${filled.map(({c,s})=>`<div style="padding:10px 12px;border-radius:12px;background:#f8f4ee;margin-bottom:6px;cursor:pointer" onclick="selectClient('${esc(c.slug)}')"><div style="display:flex;justify-content:space-between"><strong style="font-size:11px">${esc(c.prenom||c.slug)}</strong><span style="font-size:9px;color:var(--muted)">${s.energie_10?`⚡ ${esc(s.energie_10)}/10`:""}${s.hydratation_litres?` · 💧 ${esc(s.hydratation_litres)} L`:""}</span></div>${s.note?`<p style="font-size:10px;color:var(--muted);margin:4px 0 0">${esc(s.note)}</p>`:""}</div>`).join("")}<p style="font-size:9px;color:#aaa;line-height:1.5;margin:10px 0 0">L’absence de check-in aujourd’hui n’est pas automatiquement une alerte : la page Aujourd’hui applique la cadence de la formule.</p>`;}).catch(()=>{});
  }

  const oldRenderClient=window.renderClientView;
  if(oldRenderClient)window.renderClientView=function(prenom,prog){oldRenderClient(prenom,prog);if(!window.MT_ADMIN_PAGE){setTimeout(()=>buildClientCheckin(prog),0);}else setTimeout(()=>renderAdminCheckin(prog),0);};
  const oldFill=window.fillAdmin;
  if(oldFill)window.fillAdmin=function(prenom,prog){oldFill(prenom,prog);setTimeout(()=>renderAdminCheckin(prog),0);};
  const oldGlobal=window.renderSuiviGlobal;
  if(oldGlobal)window.renderSuiviGlobal=function(){return renderAdminGlobalV851();};
  window.renderSuiviAdmin=renderAdminCheckin;

  function init(){installStyle();if(!window.MT_ADMIN_PAGE&&typeof _currentProg!=="undefined"&&_currentProg)buildClientCheckin(_currentProg);}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
