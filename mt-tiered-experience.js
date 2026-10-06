/* Méthode Tee — Expérience par formule
   120 €  : Essentiel — cadre personnalisé
   240 €  : Suivi — ajustements hebdomadaires visibles
   400 €  : Signature — espace vivant + sélection Maison Yanna + performance légère si besoin
   850 €  : Private — suivi proactif / anticipation
   1500 € : Private Performance+ — pilotage / concierge / cockpit complet

   Aucun nouveau stockage lourd : tout reste dans programme JSONB.
*/
(function(){
  if(window.__MT_TIERED_EXPERIENCE__) return;
  window.__MT_TIERED_EXPERIENCE__=true;

  const PRICE_LEVELS={
    120:{key:"essential",label:"Essentiel",eyebrow:"CADRE PERSONNALISÉ",tone:"#53644A"},
    240:{key:"followup",label:"Suivi",eyebrow:"SUIVI HEBDOMADAIRE",tone:"#53644A"},
    400:{key:"signature",label:"Signature",eyebrow:"SIGNATURE",tone:"#8B6538"},
    850:{key:"private",label:"Private",eyebrow:"SUIVI PROACTIF",tone:"#1F3A2C"},
    1500:{key:"private_performance",label:"Private Performance+",eyebrow:"PILOTAGE PRIVÉ",tone:"#1D241F"}
  };
  const OFFER_TO_PRICE={signature:120,privilege:240,elite:400,performance_plus:850,private_performance:1500};
  const PRICE_TO_OFFER={120:"signature",240:"privilege",400:"elite",850:"performance_plus",1500:"private_performance"};

  const esc=v=>typeof mtEsc==="function"?mtEsc(String(v??"")):String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const attr=v=>esc(v).replace(/\n/g,"&#10;");
  const arr=v=>Array.isArray(v)?v:[];
  const localDate=()=>typeof mtLocalDateKey==="function"?mtLocalDateKey():new Date().toISOString().slice(0,10);

  function formulaPrice(prog){
    const n=Number(prog?.formule_prix_eur);
    if(PRICE_LEVELS[n]) return n;
    return OFFER_TO_PRICE[prog?.offre]||null;
  }
  function level(prog){return PRICE_LEVELS[formulaPrice(prog)]||null;}
  function offerFromPrice(price){return PRICE_TO_OFFER[Number(price)]||"";}
  function dateLabel(v){
    if(!v) return "";
    const d=new Date(v.length<=10?v+"T12:00:00":v);
    if(Number.isNaN(d.getTime())) return v;
    return d.toLocaleDateString("fr-FR",{day:"numeric",month:"short"});
  }
  function latestUpdates(prog,n=3){
    return arr(prog?.tee_updates).slice().sort((a,b)=>String(b?.created_at||"").localeCompare(String(a?.created_at||""))).slice(0,n);
  }
  function countRecentUpdates(prog,days=7){
    const since=Date.now()-days*864e5;
    return arr(prog?.tee_updates).filter(x=>{const t=new Date(x?.created_at||0).getTime();return Number.isFinite(t)&&t>=since;}).length;
  }
  function nextCalendarItem(prog){
    const today=localDate();
    return arr(prog?.athlete?.calendar).filter(x=>x?.date&&x.date>=today).sort((a,b)=>a.date.localeCompare(b.date))[0]||null;
  }

  const baseNormalize=window.mtNormalizeProgramme;
  window.mtNormalizeProgramme=function(prog){
    prog=baseNormalize?baseNormalize(prog):(prog||{});
    prog.tee_updates=arr(prog.tee_updates);
    prog.proactive_plan=Object.assign({headline:"",actions:[],note:"",updated_at:""},prog.proactive_plan||{});
    prog.proactive_plan.actions=arr(prog.proactive_plan.actions);
    if(!prog.formule_prix_eur){
      const inferred=OFFER_TO_PRICE[prog.offre];
      if(inferred) prog.formule_prix_eur=inferred;
    }
    return prog;
  };

  /* ---------- client : identité de formule ---------- */
  function ensureFormulaBadge(prog){
    const lv=level(prog); if(!lv)return;
    let badge=document.getElementById("mt-formula-badge");
    if(!badge){
      badge=document.createElement("div");badge.id="mt-formula-badge";
      badge.style.cssText="font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;padding:5px 8px;border-radius:999px;white-space:nowrap;border:1px solid rgba(83,100,74,.15);background:#fff;color:var(--brand)";
      const avatar=document.getElementById("avatar");avatar?.parentElement?.insertBefore(badge,avatar);
    }
    badge.textContent=lv.label;
    badge.style.background=formulaPrice(prog)>=850?"#1f3328":formulaPrice(prog)>=400?"#f7efe3":"#fff";
    badge.style.color=formulaPrice(prog)>=850?"#fff":formulaPrice(prog)>=400?"#7a5833":"var(--brand)";
    document.body.dataset.formule=String(formulaPrice(prog)||"");
    document.body.dataset.serviceLevel=lv.key;
  }

  function renamePlantsProducts(){
    document.querySelectorAll('.section-switcher button').forEach(b=>{if((b.textContent||"").trim()==="Plantes")b.textContent="Plantes & Produits";});
    const h=document.querySelector('#tab-soins h2'); if(h)h.textContent="Plantes & Produits";
    const p=document.querySelector('#tab-soins > p'); if(p)p.textContent="Tes plantes, infusions et produits Maison Yanna sélectionnés pour ton profil.";
  }

  function gateProductSelection(prog){
    const price=formulaPrice(prog)||0;
    const allow=price>=400;
    document.querySelectorAll('[id^="selbtn-"]').forEach(btn=>btn.style.display=allow?"":"none");
    const panel=document.getElementById("selection-panel");
    if(panel&&!allow)panel.style.display="none";
    let note=document.getElementById("mt-product-selection-note");
    const grid=document.getElementById("products-grid");
    if(grid&&!note){
      note=document.createElement("div");note.id="mt-product-selection-note";
      note.style.cssText="margin:0 0 14px;padding:12px 14px;border-radius:14px;font-size:11px;line-height:1.55";
      grid.parentNode.insertBefore(note,grid);
    }
    if(note){
      if(allow){
        note.style.display="block";note.style.background="#f7f2e9";note.style.color="#6c5439";
        note.innerHTML='<strong>Ta sélection Maison Yanna est incluse dans ta formule.</strong><br>Choisis librement les références et indique le format souhaité. Si une sélection dépasse ce qui est inclus, l’application te demandera simplement de l’ajuster.';
      } else {
        note.style.display="none";
      }
    }
  }

  function updateMaisonYannaBanner(prog){
    const price=formulaPrice(prog)||0,b=document.getElementById("my-banner"),t=document.getElementById("my-banner-text"); if(!b||!t)return;
    const copy={
      120:"Essentiel : tes recommandations Maison Yanna restent ciblées sur ton programme.",
      240:"Suivi : tes recommandations évoluent avec tes retours de semaine.",
      400:"Signature : une sélection Maison Yanna personnalisée est incluse dans ton accompagnement.",
      850:"Private : ta sélection Maison Yanna et tes besoins sont anticipés avec ton suivi.",
      1500:"Private Performance+ : dotation Maison Yanna intégrée au pilotage de ta semaine."
    }[price];
    if(copy){t.textContent=copy;b.style.display="block";}
  }

  function updateCardHtml(u){
    const icon={nutrition:"🥗",sommeil:"🌙",planning:"📅",performance:"⚡",produits:"✦",recuperation:"↗"}[u?.type]||"✓";
    return `<div style="display:flex;gap:10px;padding:10px 0;border-top:1px solid rgba(0,0,0,.07)"><span style="font-size:16px">${icon}</span><div style="flex:1"><div style="display:flex;justify-content:space-between;gap:8px"><strong style="font-size:12px;color:var(--ink)">${esc(u?.title||"Ajustement")}</strong><span style="font-size:9px;color:var(--muted);white-space:nowrap">${esc(dateLabel(u?.created_at||""))}</span></div><p style="font-size:11px;color:var(--muted);line-height:1.55;margin:4px 0 0">${esc(u?.text||"")}</p></div></div>`;
  }

  function renderTierHome(prog){
    const price=formulaPrice(prog)||0,lv=level(prog); if(!lv)return;
    const coach=document.getElementById("coach-msg")?.closest(".card"); if(!coach)return;
    let stack=document.getElementById("mt-tier-home-stack");
    if(!stack){stack=document.createElement("div");stack.id="mt-tier-home-stack";coach.insertAdjacentElement("afterend",stack);}
    let html="";
    const ups=latestUpdates(prog,3),recent=countRecentUpdates(prog,7);

    if(price>=240){
      const strong=price>=400;
      html+=`<div class="card" style="padding:20px;margin-bottom:18px;border:${strong?'1.5px solid rgba(139,101,56,.22)':'1px solid rgba(83,100,74,.12)'};background:${strong?'linear-gradient(145deg,#fffdf9,#f8f1e7)':'#fff'}">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
          <div><p style="font-size:9px;text-transform:uppercase;letter-spacing:.15em;font-weight:900;color:${strong?'#8B6538':'var(--brand)'};margin:0 0 6px">${strong?'TON PLAN ÉVOLUE':'SUIVI ACTIF'}</p><h3 class="serif" style="font-size:20px;color:var(--ink);margin:0">${strong?'Ton plan a été ajusté par Tee':'Ce que Tee ajuste avec toi'}</h3></div>
          ${recent?`<span style="font-size:9px;font-weight:900;padding:5px 8px;border-radius:999px;background:${strong?'#8B6538':'var(--brand)'};color:white">${recent} cette semaine</span>`:""}
        </div>
        ${ups.length?ups.map(updateCardHtml).join(""):`<p style="font-size:11px;color:var(--muted);line-height:1.6;margin:10px 0 0">${price===240?'Tes retours hebdomadaires servent directement aux prochains ajustements de ton programme.':'Ton espace Signature est revu et adapté selon tes retours, ton organisation et tes priorités.'}</p>`}
      </div>`;
    }

    if(price>=850){
      const pp=prog.proactive_plan||{},next=nextCalendarItem(prog),actions=arr(pp.actions).filter(Boolean);
      html+=`<div style="padding:20px;margin-bottom:18px;border-radius:18px;background:linear-gradient(145deg,#173126,#294737);color:white;position:relative;overflow:hidden;box-shadow:0 10px 28px rgba(25,48,37,.14)">
        <div style="position:absolute;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.05);right:-35px;top:-50px"></div>
        <p style="font-size:9px;text-transform:uppercase;letter-spacing:.16em;font-weight:900;opacity:.65;margin:0 0 6px">TEE ANTICIPE POUR TOI</p>
        <h3 class="serif" style="font-size:21px;margin:0 0 7px">${esc(pp.headline||"Ton suivi passe en mode proactif")}</h3>
        ${next?`<p style="font-size:10px;font-weight:800;opacity:.72;margin:0 0 10px">Prochain repère : ${esc(dateLabel(next.date))}${next.session?" · "+esc(next.session):""}</p>`:""}
        ${actions.length?`<div style="display:flex;flex-direction:column;gap:7px;margin-top:10px">${actions.slice(0,4).map(x=>`<div style="display:flex;gap:8px;font-size:11px;line-height:1.5"><span>✓</span><span>${esc(x)}</span></div>`).join("")}</div>`:`<p style="font-size:11px;line-height:1.65;opacity:.82;margin:8px 0 0">Tes journées atypiques, déplacements, changements de charge ou difficultés peuvent être intégrés avant qu’ils ne deviennent un problème.</p>`}
        ${pp.note?`<p style="font-size:10px;line-height:1.55;opacity:.65;margin:12px 0 0">${esc(pp.note)}</p>`:""}
      </div>`;
    }

    if(price>=1500){
      const active=arr(prog?.athlete?.private_actions).filter(x=>!['done','termine','terminé','closed'].includes(String(x?.status||'').toLowerCase()));
      const decisions=arr(prog?.athlete?.rapid_decisions).slice(-2).reverse();
      html+=`<div class="card" style="padding:20px;margin-bottom:18px;background:#171b18;color:white;border:none">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div><p style="font-size:9px;text-transform:uppercase;letter-spacing:.16em;font-weight:900;color:#c8a873;margin:0 0 6px">PRIVATE PERFORMANCE+</p><h3 class="serif" style="font-size:21px;margin:0">Ton centre de pilotage</h3></div><span style="font-size:21px">✦</span></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px"><div style="background:rgba(255,255,255,.06);border-radius:12px;padding:11px"><span style="display:block;font-size:9px;opacity:.55;text-transform:uppercase;letter-spacing:.1em">Actions en cours</span><strong style="font-size:20px">${active.length}</strong></div><div style="background:rgba(255,255,255,.06);border-radius:12px;padding:11px"><span style="display:block;font-size:9px;opacity:.55;text-transform:uppercase;letter-spacing:.1em">Décisions récentes</span><strong style="font-size:20px">${decisions.length}</strong></div></div>
        <p style="font-size:11px;line-height:1.6;opacity:.76;margin:12px 0 0">Tee pilote la stratégie, l’anticipation et l’exécution nutritionnelle autour de ta vraie semaine.</p>
      </div>`;
    }
    stack.innerHTML=html;
  }

  function renderSignaturePerformanceLite(prog){
    const price=formulaPrice(prog)||0;
    if(price!==400||prog?.parcours!=="performance")return;
    const a=prog.athlete||{};
    const sw=document.getElementById("mt-performance-switch");if(sw){sw.style.display="";sw.textContent="Performance";}
    const home=document.getElementById("mt-performance-home");if(home){home.style.display="block";const ht=document.getElementById("mt-performance-home-text");if(ht)ht.textContent=a.weekly?.focus||"Séances, récupération, hydratation et préparation des jours importants.";}
    const box=document.getElementById("mt-performance-client");if(!box)return;
    const row=(label,value)=>value?`<div style="padding:10px 0;border-top:1px solid #eee7df"><div style="font-size:9px;text-transform:uppercase;letter-spacing:.1em;font-weight:800;color:var(--muted)">${esc(label)}</div><div style="font-size:12px;line-height:1.6;color:var(--ink);margin-top:4px;white-space:pre-wrap">${esc(value)}</div></div>`:"";
    box.innerHTML=`
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:18px"><div><p style="font-size:9px;text-transform:uppercase;letter-spacing:.15em;font-weight:900;color:#8B6538;margin:0 0 5px">SIGNATURE PERFORMANCE</p><h2 class="serif" style="font-size:30px;color:var(--ink);margin:0 0 4px">Ta semaine sportive</h2><p style="font-size:12px;color:var(--muted);line-height:1.6;margin:0">Les repères utiles à ta semaine, sans surcharger ton espace.</p></div><span style="font-size:22px">⚽</span></div>
      <div class="card" style="padding:20px;margin-bottom:14px"><h3 class="serif" style="font-size:19px;margin:0 0 8px;color:var(--ink)">Cette semaine</h3>${row("Priorité",a.weekly?.focus)}${row("Séances",a.weekly?.sessions)}${row("Match / échéance",a.weekly?.matches)}</div>
      <div class="card" style="padding:20px;margin-bottom:14px"><h3 class="serif" style="font-size:19px;margin:0 0 8px;color:var(--ink)">Carburant & récupération</h3>${row("Glucides",a.weekly?.carbs)}${row("Protéines",a.weekly?.protein)}${row("Hydratation",a.weekly?.hydration)}${row("Récupération",a.weekly?.recovery)}</div>
      <div class="card" style="padding:20px;margin-bottom:14px"><h3 class="serif" style="font-size:19px;margin:0 0 8px;color:var(--ink)">Jour important</h3>${row("J-1",a.matchday?.jminus1)}${row("Avant",a.matchday?.prematch)}${row("Après",a.matchday?.postmatch)}${row("J+1",a.matchday?.jplus1)}</div>
      <div style="padding:13px 15px;border-radius:14px;background:#f7f1e8;color:#6d5337;font-size:11px;line-height:1.6"><strong>Signature :</strong> Tee adapte tes repères à ta semaine. Les outils de pilotage avancé, coordination et concierge restent réservés aux niveaux Private.</div>`;
  }

  function applyClient(prog){
    prog=window.mtNormalizeProgramme(prog||{});
    ensureFormulaBadge(prog);renamePlantsProducts();gateProductSelection(prog);updateMaisonYannaBanner(prog);renderTierHome(prog);renderSignaturePerformanceLite(prog);
    try{lucide.createIcons();}catch(e){}
  }

  /* ---------- admin : niveau de service + journal d'ajustements ---------- */
  function capabilityHtml(price){
    const rows=[
      [120,"Cadre personnalisé","Plan, objectifs, nutrition, routines et suivi de base"],
      [240,"Suivi hebdomadaire","Les retours client servent à des ajustements visibles"],
      [400,"Signature","Espace vivant, sélection Maison Yanna, personnalisation renforcée"],
      [850,"Private","Anticipation, alertes admin, journées atypiques et suivi proactif"],
      [1500,"Private Performance+","Pilotage, coordination, logistique et concierge sportif"]
    ];
    return rows.map(([p,t,d])=>`<div style="display:flex;gap:9px;padding:8px 0;border-top:1px solid #eee8e1;opacity:${price>=p?1:.35}"><span style="font-size:11px;font-weight:900;color:${price>=p?'var(--brand)':'#aaa'}">${price>=p?'✓':'○'}</span><div><strong style="font-size:11px;color:var(--ink)">${esc(t)}</strong><p style="font-size:10px;color:var(--muted);line-height:1.45;margin:2px 0 0">${esc(d)}</p></div></div>`).join("");
  }

  function adminAlerts(prog){
    const entries=Object.entries(prog?.suivi||{}).sort((a,b)=>b[0].localeCompare(a[0]));
    if(!entries.length)return [];
    const [date,v]=entries[0],alerts=[];
    const num=k=>Number(v?.[k]);
    if(num("energie")&&num("energie")<=2)alerts.push(`Énergie basse (${num("energie")}/5)`);
    if(num("sommeil")&&num("sommeil")<=2)alerts.push(`Sommeil bas (${num("sommeil")}/5)`);
    if(num("digestion")&&num("digestion")<=2)alerts.push(`Digestion à surveiller (${num("digestion")}/5)`);
    if(num("fatigue")&&num("fatigue")>=4)alerts.push(`Fatigue élevée (${num("fatigue")}/5)`);
    if(num("recuperation")&&num("recuperation")<=2)alerts.push(`Récupération basse (${num("recuperation")}/5)`);
    if(String(v?.note||"").trim())alerts.push(`Note client : ${String(v.note).trim().slice(0,120)}`);
    return alerts.map(x=>({date,text:x}));
  }

  function injectAdmin(){
    if(!window.MT_ADMIN_PAGE||document.getElementById("mt-tier-admin"))return;
    const profile=document.getElementById("f-parcours")?.closest(".admin-section");if(!profile)return;
    const block=document.createElement("div");block.className="admin-section";block.id="mt-tier-admin";
    block.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:14px"><div><h3 class="serif" style="font-size:21px;color:var(--ink);margin:0 0 4px">Formule & niveau de service</h3><p style="font-size:11px;color:var(--muted);line-height:1.5;margin:0">Plus la formule monte, plus l’espace devient vivant, anticipatif et piloté.</p></div><span id="mt-tier-admin-badge" style="font-size:9px;font-weight:900;padding:5px 8px;border-radius:999px;background:#f0ece6;color:var(--brand)">—</span></div>
      <div><label class="field-label">Formule tarifaire</label><select id="f-formule-prix" class="admin-input" style="cursor:pointer"><option value="">— À définir —</option><option value="120">120 € · Essentiel</option><option value="240">240 € · Suivi</option><option value="400">400 € · Signature</option><option value="850">850 € · Private</option><option value="1500">1 500 € · Private Performance+</option></select></div>
      <div id="mt-tier-capabilities" style="margin-top:12px"></div>
      <div style="margin-top:16px;padding-top:14px;border-top:1px solid #eee7df"><p style="font-size:10px;text-transform:uppercase;letter-spacing:.13em;font-weight:900;color:var(--brand);margin:0 0 8px">Mises à jour visibles par le client</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><select id="f-tier-update-type" class="admin-input"><option value="nutrition">Nutrition</option><option value="planning">Planning</option><option value="sommeil">Sommeil</option><option value="recuperation">Récupération</option><option value="performance">Performance</option><option value="produits">Produits</option></select><input id="f-tier-update-title" class="admin-input" placeholder="Titre court" /></div><textarea id="f-tier-update-text" class="admin-textarea" placeholder="Ex : J’ai déplacé ta collation après la séance et renforcé les féculents les jours chargés." style="margin-top:8px"></textarea><button type="button" class="chip" onclick="mtAddTeeUpdate()" style="margin-top:8px">+ Ajouter l’ajustement</button><div id="mt-tier-updates-admin" style="display:flex;flex-direction:column;gap:7px;margin-top:10px"></div></div>
      <div id="mt-tier-proactive-admin" style="display:none;margin-top:16px;padding:14px;border-radius:14px;background:#f5f8f5;border:1px solid rgba(83,100,74,.14)"><p style="font-size:10px;text-transform:uppercase;letter-spacing:.13em;font-weight:900;color:var(--brand);margin:0 0 8px">Private · anticipation</p><input id="f-proactive-headline" class="admin-input" placeholder="Ex : Demain : déplacement — journée préparée" /><textarea id="f-proactive-actions" class="admin-textarea" placeholder="Une action par ligne :\nPetit-déjeuner conseillé enregistré\nCollation nomade prévue\nDîner adapté" style="margin-top:8px"></textarea><textarea id="f-proactive-note" class="admin-textarea" placeholder="Note courte facultative" style="margin-top:8px"></textarea><div id="mt-tier-alerts" style="margin-top:10px"></div></div>`;
    const perf=document.getElementById("mt-performance-admin");
    if(perf)profile.parentNode.insertBefore(block,perf);else profile.insertAdjacentElement("afterend",block);

    const oldOffer=document.getElementById("f-offre")?.closest("div");if(oldOffer)oldOffer.style.display="none";
    document.getElementById("f-formule-prix")?.addEventListener("change",()=>{
      const p=Number(document.getElementById("f-formule-prix").value)||0;
      syncOfferFromPrice(p);renderAdminTier(programme||{});
    });
  }

  function syncOfferFromPrice(price){
    const offer=document.getElementById("f-offre"),mapped=offerFromPrice(price);if(!offer||!mapped)return;
    if(!offer.querySelector(`option[value="${mapped}"]`)){
      const o=document.createElement("option");o.value=mapped;o.textContent=mapped;offer.appendChild(o);
    }
    offer.value=mapped;offer.dispatchEvent(new Event("change",{bubbles:true}));
  }

  function renderUpdatesAdmin(prog){
    const box=document.getElementById("mt-tier-updates-admin");if(!box)return;
    const xs=latestUpdates(prog,20);
    box.innerHTML=xs.length?xs.map(u=>`<div style="display:flex;gap:8px;align-items:flex-start;background:#f8f4ee;border-radius:11px;padding:9px 10px"><div style="flex:1"><strong style="font-size:11px;color:var(--ink)">${esc(u.title||"Ajustement")}</strong><p style="font-size:10px;color:var(--muted);line-height:1.5;margin:3px 0 0">${esc(u.text||"")}</p><span style="font-size:8px;color:#aaa">${esc(dateLabel(u.created_at||""))}</span></div><button type="button" onclick="mtRemoveTeeUpdate('${attr(u.id||"")}')" style="border:0;background:transparent;color:#dc2626;font-size:16px;cursor:pointer">×</button></div>`).join(""):'<p style="font-size:10px;color:var(--muted);margin:0">Aucun ajustement enregistré.</p>';
  }

  function renderAdminTier(prog){
    if(!window.MT_ADMIN_PAGE)return;
    injectAdmin();prog=window.mtNormalizeProgramme(prog||{});
    const select=document.getElementById("f-formule-prix");if(!select)return;
    const price=formulaPrice(prog)||Number(select.value)||0;
    if(price)select.value=String(price);
    const lv=PRICE_LEVELS[price],badge=document.getElementById("mt-tier-admin-badge");
    if(badge){badge.textContent=lv?`${lv.label} · ${price} €`:"À définir";badge.style.background=price>=850?"#1f3328":price>=400?"#f7efe3":"#f0ece6";badge.style.color=price>=850?"white":price>=400?"#7a5833":"var(--brand)";}
    const caps=document.getElementById("mt-tier-capabilities");if(caps)caps.innerHTML=capabilityHtml(price);
    const pro=document.getElementById("mt-tier-proactive-admin");if(pro)pro.style.display=price>=850?"block":"none";
    const pp=prog.proactive_plan||{};
    const h=document.getElementById("f-proactive-headline"),a=document.getElementById("f-proactive-actions"),n=document.getElementById("f-proactive-note");if(h)h.value=pp.headline||"";if(a)a.value=arr(pp.actions).join("\n");if(n)n.value=pp.note||"";
    const alerts=document.getElementById("mt-tier-alerts");
    if(alerts&&price>=850){const xs=adminAlerts(prog);alerts.innerHTML=xs.length?`<p style="font-size:9px;text-transform:uppercase;letter-spacing:.11em;font-weight:900;color:#8b6538;margin:0 0 6px">À regarder</p>${xs.map(x=>`<div style="font-size:10px;line-height:1.45;color:#6a5034;padding:5px 0;border-top:1px solid #e9ddcb">⚑ ${esc(x.text)}</div>`).join("")}`:'<p style="font-size:10px;color:var(--muted);margin:0">Aucun signal particulier dans le dernier check-in.</p>';}
    renderUpdatesAdmin(prog);
  }

  window.mtAddTeeUpdate=function(){
    if(!window.MT_ADMIN_PAGE)return;
    programme=window.mtNormalizeProgramme(programme||{});
    const type=document.getElementById("f-tier-update-type")?.value||"nutrition";
    const title=document.getElementById("f-tier-update-title")?.value?.trim()||"Ajustement de ton plan";
    const text=document.getElementById("f-tier-update-text")?.value?.trim()||"";
    if(!text){alert("Écris ce que tu as ajusté.");return;}
    programme.tee_updates.push({id:"u"+Date.now().toString(36)+Math.random().toString(36).slice(2,6),type,title,text,created_at:new Date().toISOString()});
    document.getElementById("f-tier-update-title").value="";document.getElementById("f-tier-update-text").value="";renderUpdatesAdmin(programme);
  };
  window.mtRemoveTeeUpdate=function(id){
    programme=window.mtNormalizeProgramme(programme||{});programme.tee_updates=programme.tee_updates.filter(x=>x.id!==id);renderUpdatesAdmin(programme);
  };

  function collectAdminTier(){
    if(!window.MT_ADMIN_PAGE)return;
    programme=window.mtNormalizeProgramme(programme||{});
    const price=Number(document.getElementById("f-formule-prix")?.value)||formulaPrice(programme)||null;
    if(price){programme.formule_prix_eur=price;programme.offre=offerFromPrice(price)||programme.offre;}
    if(price>=850){
      programme.proactive_plan={
        headline:document.getElementById("f-proactive-headline")?.value?.trim()||"",
        actions:(document.getElementById("f-proactive-actions")?.value||"").split(/\n/).map(x=>x.trim()).filter(Boolean),
        note:document.getElementById("f-proactive-note")?.value?.trim()||"",
        updated_at:new Date().toISOString()
      };
    }
  }

  /* ---------- wrappers ---------- */
  const oldRender=window.renderClientView;
  if(oldRender)window.renderClientView=function(prenom,prog){prog=window.mtNormalizeProgramme(prog);oldRender(prenom,prog);applyClient(prog);};

  const oldFill=window.fillAdmin;
  if(oldFill)window.fillAdmin=function(prenom,prog){prog=window.mtNormalizeProgramme(prog);oldFill(prenom,prog);renderAdminTier(prog);};

  const oldSave=window.saveClient;
  if(oldSave)window.saveClient=async function(){collectAdminTier();return oldSave();};

  function init(){
    renamePlantsProducts();
    if(window.MT_ADMIN_PAGE){injectAdmin();if(typeof programme!=="undefined"&&programme)renderAdminTier(programme);}else if(typeof _currentProg!=="undefined"&&_currentProg)applyClient(_currentProg);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
