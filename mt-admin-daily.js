/* Méthode Tee — Aujourd'hui / file d'actions Tee
   Admin uniquement.
   Architecture légère :
   - aucun cron
   - aucune Edge Function
   - aucune nouvelle table
   - calcul local depuis la liste mt_clients déjà chargée
   - 1 lecture + 1 écriture uniquement quand Tee clique « Fait »
   - historique compact dans programme.tee_presence.log
*/
(function(){
  if(!window.MT_ADMIN_PAGE || window.__MT_ADMIN_DAILY__) return;
  window.__MT_ADMIN_DAILY__=true;

  const OFFER_TO_PRICE={signature:120,privilege:240,elite:400,performance_plus:900,private_performance:1500};
  const TIERS={
    120:{label:"Essentiel",weekTarget:1,monthTarget:4,planned:[1],color:"#d8a900",bg:"#fff8d8"},
    240:{label:"Suivi",weekTarget:2,monthTarget:8,planned:[1,4],color:"#d8a900",bg:"#fff8d8"},
    400:{label:"Signature",weekTarget:4,monthTarget:14,planned:[1,2,4,6],color:"#d97706",bg:"#fff2df"},
    900:{label:"Private",weekTarget:6,monthTarget:22,planned:[1,2,3,4,5,6],color:"#b91c1c",bg:"#feecec"},
    1500:{label:"Private Performance+",weekTarget:7,monthTarget:null,planned:[0,1,2,3,4,5,6],color:"#b91c1c",bg:"#feecec"}
  };

  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const localDate=(d=new Date())=>typeof mtLocalDateKey==="function"?mtLocalDateKey(d):[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
  const plusDays=(dateStr,n)=>{const d=new Date(dateStr+"T12:00:00");d.setDate(d.getDate()+n);return localDate(d);};
  const daysBetween=(a,b)=>Math.round((new Date(b+"T12:00:00")-new Date(a+"T12:00:00"))/864e5);
  const arr=v=>Array.isArray(v)?v:[];
  const formulaPrice=p=>{const n=Number(p?.formule_prix_eur);return TIERS[n]?n:(OFFER_TO_PRICE[p?.offre]||null);};
  const isActive=c=>!["pause","termine"].includes(c?.programme?.statut||"");

  function presenceLog(prog){return arr(prog?.tee_presence?.log);}
  function uniquePresenceDates(prog,from,to){
    const set=new Set();
    presenceLog(prog).forEach(x=>{const d=x?.date||String(x?.at||"").slice(0,10);if(d&&d>=from&&d<=to)set.add(d);});
    return set;
  }
  function weekBounds(today){
    const d=new Date(today+"T12:00:00"), dow=d.getDay(), delta=(dow+6)%7;
    const mon=new Date(d);mon.setDate(d.getDate()-delta);
    const sun=new Date(mon);sun.setDate(mon.getDate()+6);
    return {from:localDate(mon),to:localDate(sun)};
  }
  function monthBounds(today){return {from:today.slice(0,7)+"-01",to:today.slice(0,7)+"-31"};}

  function sortedSuivi(prog){
    return Object.entries(prog?.suivi||{}).filter(([d,v])=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&v&&typeof v==="object").sort((a,b)=>b[0].localeCompare(a[0]));
  }
  function latestFilled(prog){return sortedSuivi(prog).find(([,v])=>v.filled)||null;}
  function lastFilled(prog,n=2){return sortedSuivi(prog).filter(([,v])=>v.filled).slice(0,n);}
  function calendarItems(prog){
    const xs=[...arr(prog?.athlete?.calendar)];
    const plans=prog?.client_sport_plans||{};
    Object.values(plans).forEach(plan=>arr(plan?.sessions).forEach(s=>{
      if(!s?.date)return;
      xs.push({date:s.date,day_type:s.kind||s.type||"training",session:s.type||"",notes:[s.time,s.duration_min?`${s.duration_min} min`:"",s.intensity||""].filter(Boolean).join(" · ")});
    }));
    return xs;
  }
  function eventKind(e){
    const hay=[e?.day_type,e?.session,e?.notes].filter(Boolean).join(" ").toLowerCase();
    if(/match/.test(hay)) return "match";
    if(/voyage|travel|déplacement|deplacement/.test(hay)) return "travel";
    if(/double/.test(hay)) return "double";
    if(/recovery|récup|recup/.test(hay)) return "recovery";
    if(/training|entraî|entrain/.test(hay)) return "training";
    return e?.day_type||"event";
  }

  function signalsFor(client,today){
    const prog=client.programme||{}, price=formulaPrice(prog)||0, sig=[];
    const add=(key,text,severity,check)=>sig.push({key,text,severity,check});

    const unread=arr(prog.messages).filter(m=>m?.auteur==="client"&&!m?.lu).length;
    if(unread) add("message",`${unread} message${unread>1?"s":""} client non lu${unread>1?"s":""}`,3,"Lire et répondre au message");
    if(prog.selection?.statut==="en_attente") add("selection","Sélection Maison Yanna en attente",2,"Traiter la sélection Maison Yanna");
    if(prog.phyto_demande?.statut&&prog.phyto_demande.statut!=="traite") add("phyto","Demande plantes / phyto en attente",3,"Vérifier la demande plantes");

    const latest=latestFilled(prog);
    const recent=lastFilled(prog,2);
    const freshnessDays=price>=1500?1:price>=900?2:price>=400?3:price>=240?4:7;
    if(latest){
      const [d,v]=latest, age=daysBetween(d,today);
      const energy=Number(v.energie), sleep=Number(v.sommeil), digestion=Number(v.digestion), recup=Number(v.recuperation), dispo=Number(v.disponibilite), courb=Number(v.courbatures);
      if(age>=freshnessDays) add("stale",`Aucun point de suivi récent renseigné · dernier il y a ${age} jours`,price>=400?2:1,"Lire le dernier check-in et faire le point Tee si nécessaire");
      if(energy>0&&energy<=2) add("energy",`Énergie basse : ${energy}/5 au dernier suivi`,price>=900?3:2,"Énergie + carburant de la journée");
      if(sleep>0&&sleep<=2) add("sleep",`Sommeil bas : ${sleep}/5 au dernier suivi`,price>=900?3:2,"Sommeil + récupération");
      if(digestion>0&&digestion<=2) add("digestion",`Digestion inconfortable : ${digestion}/5`,2,"Digestion + repas précédents");
      if(recup>0&&recup<=2) add("recovery",`Récupération basse : ${recup}/5`,price>=900?3:2,"Récupération + charge du jour");
      if(dispo>0&&dispo<=2) add("availability",`Disponibilité physique basse : ${dispo}/5`,price>=900?3:2,"Disponibilité + charge du jour");
      if(courb>=4) add("soreness",`Courbatures élevées : ${courb}/5`,price>=900?3:2,"Courbatures + récupération");
      if(v.note&&String(v.note).trim()) add("note","Note récente du Nutri à lire",1,"Lire le ressenti avant d’écrire");
    } else if((prog.statut||"")==="actif") {
      add("no_checkin","Aucun point de suivi récent renseigné",price>=400?2:1,"Vérifier l’adhérence au suivi et faire le point Tee si nécessaire");
    }
    if(recent.length>=2 && recent.every(([,v])=>v.eau===false)) add("water","Hydratation non validée sur les 2 derniers suivis",price>=900?3:2,"Hydratation + contexte de la journée");
    if(recent.length>=2 && recent.every(([,v])=>v.repas===false)) add("meals","Repas non validés sur les 2 derniers suivis",price>=400?2:1,"Repas + organisation");

    const tomorrow=plusDays(today,1);
    calendarItems(prog).forEach(e=>{
      if(!e?.date) return;
      const kind=eventKind(e);
      if(e.date===today){
        if(kind==="match") add("match_today","Match aujourd’hui",3,"Stratégie match + hydratation + récupération");
        else if(kind==="travel") add("travel_today","Déplacement / voyage aujourd’hui",price>=900?3:2,"Repas nomades + hydratation + timing");
        else if(kind==="double") add("double_today","Double séance aujourd’hui",price>=900?3:2,"Carburant entre séances + récupération");
        else if(kind==="training") add("training_today","Séance prévue aujourd’hui",price>=900?3:2,"Repas pré/post séance + récupération");
        else if(kind==="recovery") add("recovery_day","Journée récupération aujourd’hui",2,"Récupération + sommeil + apports");
      }
      if(e.date===tomorrow && kind==="match") add("match_tomorrow","Match demain — préparer J-1",3,"Stratégie J-1 + digestion + réserves");
      if(e.date===tomorrow && kind==="travel" && price>=900) add("travel_tomorrow","Déplacement demain — anticiper",3,"Préparer repas / collation / hydratation");
    });

    const rdv=prog.rdv;
    if(rdv===today) add("rdv","Rendez-vous prévu aujourd’hui",2,"Préparer les points à revoir ensemble");
    if((prog.statut||"")==="nouveau") add("new","Nouveau Nutri — onboarding à finaliser",1,"Questionnaire + objectifs + contraintes + programme");
    return sig;
  }

  function cadenceDue(client,today){
    const prog=client.programme||{}, price=formulaPrice(prog), tier=TIERS[price];
    if(!tier||price===1500) return false;
    const wb=weekBounds(today), done=uniquePresenceDates(prog,wb.from,wb.to).size;
    if(done>=tier.weekTarget) return false;
    const dow=new Date(today+"T12:00:00").getDay();
    const expected=tier.planned.filter(d=>d<=dow).length;
    return done<expected;
  }

  function makeAction(client,today){
    const prog=client.programme||{}, price=formulaPrice(prog), tier=TIERS[price];
    if(!tier||!isActive(client)) return null;
    let sig=signalsFor(client,today), due=cadenceDue(client,today);
    // Essentiel / Suivi : pas de sollicitation quotidienne pour des signaux légers.
    // Hors jour de contrôle, seules les vraies alertes remontent.
    if(price<=240 && !due){
      sig=sig.filter(s=>(s.severity||0)>=3);
    }
    let sev=sig.reduce((m,s)=>Math.max(m,s.severity||1),0);

    if(!sig.length&&!due) return null;
    if(!sig.length&&due){
      sev=price>=900?3:price>=400?2:1;
      sig.push({key:"cadence",text:price===120?"Point hebdomadaire prévu":price===240?"Contrôle de suivi prévu":price===400?"Suivi rapproché prévu":"Suivi proactif prévu",severity:sev,check:price<=240?"Régularité + difficultés + objectif de la semaine":price===400?"Planning + alimentation + récupération":"Sommeil + récupération + journée à venir"});
    }
    if(price===1500 && !sig.length) return null;
    if(price>=900 && sig.length) sev=Math.max(sev,3);
    else if(price===400 && sig.length) sev=Math.max(sev,2);

    const reasons=sig.slice().sort((a,b)=>(b.severity||0)-(a.severity||0)).slice(0,4);
    const checks=[...new Set(reasons.map(s=>s.check).filter(Boolean))].slice(0,3);
    const id=`${client.slug}:${today}:${reasons.map(x=>x.key).join("+")||"cadence"}`;
    if(presenceLog(prog).some(x=>x?.action_id===id)) return null;
    return {client,price,tier,severity:sev,reasons,checks,id};
  }

  function actionCard(a){
    const c=a.client, color=a.severity>=3?"#dc2626":a.severity===2?"#d97706":"#d8a900", bg=a.severity>=3?"#fff1f1":a.severity===2?"#fff6e8":"#fffbea";
    const label=a.severity>=3?"Priorité":a.severity===2?"À suivre":"Point prévu";
    const lastPoint=presenceLog(c.programme||{}).slice().sort((x,y)=>String(y?.at||y?.date||"").localeCompare(String(x?.at||x?.date||"")))[0];
    const lastPointText=lastPoint?(lastPoint.date||String(lastPoint.at||"").slice(0,10)):"";
    return `<div style="border:1px solid ${color}22;background:${bg};border-radius:16px;padding:14px;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
        <div style="min-width:0"><div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap"><strong style="font-size:14px;color:var(--ink)">${esc(c.prenom||c.slug)}</strong><span style="font-size:9px;font-weight:900;padding:3px 7px;border-radius:999px;background:white;color:${color}">${a.price.toLocaleString("fr-FR")} € · ${esc(a.tier.label)}</span></div><p style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;color:${color};margin:6px 0 0">${label}</p>${lastPointText?`<p style="font-size:9px;color:var(--muted);margin:4px 0 0">Dernier point Tee : ${esc(lastPointText)}</p>`:""}</div>
        <button type="button" onclick="mtDailyDone('${esc(c.slug)}','${esc(a.id)}',this)" style="border:0;background:#fff;border-radius:999px;padding:7px 10px;font-size:10px;font-weight:900;color:var(--brand);cursor:pointer;white-space:nowrap">Point Tee ✓</button>
      </div>
      <div style="margin-top:10px">${a.reasons.map(r=>`<div style="font-size:11px;line-height:1.5;color:var(--ink);padding:3px 0">• ${esc(r.text)}</div>`).join("")}</div>
      <div style="margin-top:9px;padding-top:9px;border-top:1px solid ${color}22"><p style="font-size:9px;text-transform:uppercase;letter-spacing:.1em;font-weight:900;color:var(--muted);margin:0 0 5px">À vérifier</p><p style="font-size:11px;line-height:1.55;color:var(--ink);margin:0">${esc(a.checks.join(" · ")||"Faire un point contextualisé")}</p></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px"><button type="button" class="chip" onclick="mtDailyOpen('${esc(c.slug)}','profile')">Voir le profil</button><button type="button" class="chip" onclick="mtDailyOpen('${esc(c.slug)}','write')">Écrire</button><button type="button" class="chip" onclick="mtDailyOpen('${esc(c.slug)}','adjust')">Ajuster le programme</button></div>
    </div>`;
  }

  function presenceHtml(clients,today){
    const mb=monthBounds(today);
    const xs=clients.filter(c=>isActive(c)&&TIERS[formulaPrice(c.programme||{})]).sort((a,b)=>(formulaPrice(a.programme||{})||0)-(formulaPrice(b.programme||{})||0));
    if(!xs.length) return '<p style="font-size:11px;color:var(--muted);margin:0">Aucun client actif avec une formule définie.</p>';
    return xs.map(c=>{
      const p=formulaPrice(c.programme||{}), t=TIERS[p], n=uniquePresenceDates(c.programme||{},mb.from,mb.to).size;
      const target=t.monthTarget;
      const status=target?`${n} / cible ${target}`:`${n} jour${n>1?"s":""} actif${n>1?"s":""} · accompagnement continu`;
      const pct=target?Math.min(100,Math.round(n/target*100)):Math.min(100,n/24*100);
      return `<div style="padding:9px 0;border-top:1px solid #eee7df"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><div><strong style="font-size:11px;color:var(--ink)">${esc(c.prenom||c.slug)}</strong><span style="font-size:9px;color:var(--muted);margin-left:6px">${p.toLocaleString("fr-FR")} €</span></div><span style="font-size:9px;font-weight:800;color:var(--brand)">${esc(status)}</span></div><div style="height:4px;border-radius:999px;background:#eeeae4;margin-top:6px;overflow:hidden"><div style="height:100%;width:${pct}%;background:var(--brand);border-radius:999px"></div></div></div>`;
    }).join("");
  }

  function ensurePanel(){
    if(document.getElementById("mt-daily-admin")) return document.getElementById("mt-daily-admin");
    const suivi=document.getElementById("suivi-global-list")?.closest(".admin-section");
    if(!suivi) return null;
    const s=document.createElement("div");s.className="admin-section";s.id="mt-daily-admin";
    s.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:14px"><div><p style="font-size:9px;text-transform:uppercase;letter-spacing:.16em;font-weight:900;color:var(--brand);margin:0 0 4px">FILE D’ACTIONS TEE</p><h3 class="serif" style="font-size:24px;color:var(--ink);margin:0">Aujourd’hui</h3><p id="mt-daily-date" style="font-size:11px;color:var(--muted);margin:4px 0 0"></p></div><button type="button" class="chip" onclick="loadAllClients()">↻ Actualiser</button></div><div id="mt-daily-summary" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px"></div><div id="mt-daily-actions"><p style="font-size:12px;color:var(--muted)">Charge les clients pour générer la file du jour.</p></div><details style="margin-top:14px;padding-top:12px;border-top:1px solid #eee7df"><summary style="font-size:11px;font-weight:900;color:var(--ink);cursor:pointer">Présence Tee ce mois-ci <span style="font-weight:500;color:var(--muted)">· visible uniquement par toi</span></summary><div id="mt-presence-month" style="margin-top:10px"></div></details><p style="font-size:9px;color:#aaa;line-height:1.5;margin:12px 0 0">Calculé localement depuis les données déjà chargées. Supabase n’est sollicité à nouveau que lorsque tu marques une intervention comme faite.</p>`;
    suivi.parentNode.insertBefore(s,suivi);
    return s;
  }

  function render(clients){
    ensurePanel();
    const today=localDate(), dateEl=document.getElementById("mt-daily-date");
    if(dateEl) dateEl.textContent=new Date(today+"T12:00:00").toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});
    const actions=(clients||[]).map(c=>makeAction(c,today)).filter(Boolean).sort((a,b)=>b.severity-a.severity||b.price-a.price||String(a.client.prenom||"").localeCompare(String(b.client.prenom||"")));
    const summary=document.getElementById("mt-daily-summary");
    const counts=[3,2,1].map(s=>actions.filter(a=>a.severity===s).length);
    if(summary) summary.innerHTML=`<span style="font-size:9px;font-weight:900;padding:5px 8px;border-radius:999px;background:#feecec;color:#b91c1c">🔴 ${counts[0]} priorité${counts[0]>1?"s":""}</span><span style="font-size:9px;font-weight:900;padding:5px 8px;border-radius:999px;background:#fff2df;color:#b45309">🟠 ${counts[1]} à suivre</span><span style="font-size:9px;font-weight:900;padding:5px 8px;border-radius:999px;background:#fff8d8;color:#8a7100">🟡 ${counts[2]} point${counts[2]>1?"s":""} prévu${counts[2]>1?"s":""}</span>`;
    const box=document.getElementById("mt-daily-actions");
    if(box){
      if(!actions.length) box.innerHTML='<div style="padding:16px;border-radius:14px;background:#f5f8f5"><strong style="font-size:12px;color:var(--brand)">✓ Rien d’urgent aujourd’hui.</strong><p style="font-size:11px;color:var(--muted);line-height:1.55;margin:4px 0 0">Tu peux laisser les Nutris avancer dans leur espace sans créer de message artificiel.</p></div>';
      else {
        const groups=[{s:3,title:"🔴 Priorité aujourd’hui"},{s:2,title:"🟠 À suivre"},{s:1,title:"🟡 Point prévu"}];
        box.innerHTML=groups.map(g=>{const xs=actions.filter(a=>a.severity===g.s);return xs.length?`<div style="margin-top:12px"><p style="font-size:10px;text-transform:uppercase;letter-spacing:.12em;font-weight:900;color:var(--ink);margin:0 0 8px">${g.title}</p>${xs.map(actionCard).join("")}</div>`:"";}).join("");
      }
    }
    const p=document.getElementById("mt-presence-month");if(p)p.innerHTML=presenceHtml(clients||[],today);
    try{lucide?.createIcons?.();}catch(e){}
  }

  window.mtDailyOpen=async function(slug,mode){
    try{
      await selectClient(slug);
      setTimeout(()=>{
        let target=null;
        if(mode==="write") target=document.getElementById("messages-admin-block");
        else if(mode==="adjust") target=document.getElementById("mt-tier-admin")||document.getElementById("f-objectif")?.closest(".admin-section");
        else target=document.getElementById("f-prenom")?.closest(".admin-section");
        target?.scrollIntoView({behavior:"smooth",block:"start"});
        if(mode==="write") document.getElementById("messages-admin-input")?.focus();
      },80);
    }catch(e){console.warn(e);}
  };

  window.mtDailyDone=async function(slug,actionId,btn){
    if(!sb||!slug) return;if(btn){btn.disabled=true;btn.textContent="…";}
    try{
      const res=await sb.from(SB_TABLE).select("programme").eq("slug",slug).single();
      if(res.error||!res.data) throw new Error(res.error?.message||"Client introuvable");
      const prog=Object.assign({},res.data.programme||{}), today=localDate(), price=formulaPrice(prog);
      const tp=Object.assign({log:[]},prog.tee_presence||{});tp.log=arr(tp.log);
      if(!tp.log.some(x=>x?.action_id===actionId)) tp.log.push({action_id:actionId,date:today,at:new Date().toISOString(),formula:price,kind:"tee_point"});
      const cutoff=plusDays(today,-120);tp.log=tp.log.filter(x=>(x?.date||String(x?.at||"").slice(0,10))>=cutoff).slice(-240);tp.last_at=new Date().toISOString();prog.tee_presence=tp;
      const up=await sb.from(SB_TABLE).update({programme:prog}).eq("slug",slug);if(up.error) throw new Error(up.error.message);
      const c=_allClients.find(x=>x.slug===slug);if(c)c.programme=prog;
      if(currentSlug===slug) programme=prog;
      render(_allClients);
      log(`✅ Intervention Tee enregistrée pour ${c?.prenom||slug}.`);
    }catch(e){alert("Impossible d’enregistrer : "+e.message);if(btn){btn.disabled=false;btn.textContent="Point Tee ✓";}}
  };

  const oldRenderClients=window.renderClientsList;
  if(oldRenderClients){
    window.renderClientsList=function(list){oldRenderClients(list);render(list||[]);};
  }
  const oldFill=window.fillAdmin;
  if(oldFill){
    window.fillAdmin=function(prenom,prog){oldFill(prenom,prog);setTimeout(()=>render(_allClients||[]),0);};
  }

  function init(){ensurePanel();if(Array.isArray(_allClients)&&_allClients.length)render(_allClients);}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
