/* Méthode Tee — Performance Pro V2
   Private (900€) & Private Performance+ (1500€)
   V2 : cockpit sportif structuré + calendrier + dossiers match + hydratation +
   analyses de repas + biomarqueurs + composition corporelle + antidopage +
   coordination staff + tendances. Private ajoute le concierge opérationnel :
   voyages, cuisine culturelle, chef/traiteur, meal-prep et file d'actions.
   Les données restent dans programme.athlete : aucune nouvelle table requise.
*/
(function(){
  const PERF_PLUS="performance_plus";
  const PRIVATE="private_performance";
  const OFFER_LABELS={
    signature:"Signature — 120€/mois",
    privilege:"Privilege — 240€/mois",
    elite:"Elite — 400€/mois",
    [PERF_PLUS]:"Private — 900€/mois",
    [PRIVATE]:"Private Performance+ — 1 500€/mois"
  };
  const OFFER_BANNERS={
    [PERF_PLUS]:"Private : stratégie nutritionnelle proactive, matchs, récupération, déplacements et suivi rapproché",
    [PRIVATE]:"Private Performance+ : nutrition personnelle de sportif pro + pilotage, concierge alimentaire et logistique à distance"
  };

  const esc=v=>typeof mtEsc==="function"?mtEsc(v):String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const attr=v=>esc(v).replace(/\n/g,"&#10;");
  const txt=id=>document.getElementById(id)?.value?.trim()||"";
  const setv=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v??"";};
  const formulaPrice=p=>{const n=Number((p||{}).formule_prix_eur);if(n)return n;return ({signature:120,privilege:240,elite:400,[PERF_PLUS]:900,[PRIVATE]:1500})[(p||{}).offre]||0;};
  const isPro=p=>(p||{}).parcours==="performance"&&(formulaPrice(p)>=900||[PERF_PLUS,PRIVATE].includes((p||{}).offre));
  const isPrivate=p=>formulaPrice(p)>=1500||(p||{}).offre===PRIVATE;
  const uid=()=>"p"+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  const deepArr=v=>Array.isArray(v)?v:[];
  const styleBox="border:1.5px solid #ede9e3;border-radius:14px;padding:12px 14px";
  const labelStyle="font-size:9px;text-transform:uppercase;letter-spacing:.1em;font-weight:800;color:var(--muted);display:block;margin-bottom:5px";

  function perfCard(title,body,eyebrow="",icon=""){
    return `<div class="card mt-perf-card" style="padding:20px;margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px">
        <div>${eyebrow?`<p style="font-size:9px;text-transform:uppercase;letter-spacing:.14em;font-weight:800;color:var(--brand);margin:0 0 5px">${esc(eyebrow)}</p>`:""}<h3 class="serif" style="font-size:20px;color:var(--ink);margin:0">${esc(title)}</h3></div>
        ${icon?`<div style="font-size:22px">${icon}</div>`:""}
      </div>${body}</div>`;
  }
  function perfRows(items){
    const valid=(items||[]).filter(x=>x&&String(x.value??"").trim());
    if(!valid.length)return `<p style="font-size:12px;color:var(--muted);margin:0">À personnaliser avec Tee.</p>`;
    return valid.map(x=>`<div style="padding:11px 0;border-top:1px solid #eee7df"><div style="${labelStyle}">${esc(x.label)}</div><div style="font-size:13px;line-height:1.65;color:var(--ink);white-space:pre-wrap">${esc(x.value)}</div></div>`).join("");
  }
  function emptyMsg(text="Aucune entrée pour le moment."){return `<p style="font-size:12px;color:var(--muted);margin:0">${esc(text)}</p>`;}

  /* ---------- modèle ---------- */
  const baseNormalize=window.mtNormalizeProgramme;
  window.mtNormalizeProgramme=function(prog){
    prog=baseNormalize?baseNormalize(prog):(prog||{});
    prog.athlete=prog.athlete||{};
    const a=prog.athlete;
    a.schema_version=2;
    a.identity=Object.assign({sport:"Football",position:"",club:"",base_city:"",country:""},a.identity||{});
    a.weekly=Object.assign({focus:"",training_load:"",sessions:"",matches:"",carbs:"",protein:"",hydration:"",recovery:"",notes:""},a.weekly||{});
    a.matchday=Object.assign({jminus1:"",prematch:"",intra:"",postmatch:"",jplus1:""},a.matchday||{});
    a.travel=Object.assign({hotel:"",delivery:"",cultural_foods:"",restaurant:"",airport:"",food_safety:""},a.travel||{});
    a.micronutrition=Object.assign({labs:"",priorities:"",medical_notes:"",last_review:""},a.micronutrition||{});
    a.supplements=Object.assign({current:"",antidoping:"not_checked",validated_by:"",notes:""},a.supplements||{});
    a.body=Object.assign({weight_target:"",composition_goal:"",weighin:"",notes:""},a.body||{});
    a.staff=Object.assign({coach:"",medical:"",physio:"",coordination:""},a.staff||{});
    a.maison_yanna=Object.assign({monthly_selection:"",usage:"",stock:"",notes:""},a.maison_yanna||{});
    a.review=Object.assign({wins:"",issues:"",next:""},a.review||{});
    a.private=Object.assign({provider:"",provider_status:"",meal_prep:"",meal_delivery:"",travel_prep:"",onsite:"",priority_notes:""},a.private||{});
    ["calendar","meal_analyses","match_dossiers","hydration_tests","biomarkers","body_history","supplement_log","staff_log","review_history","travel_dossiers","cultural_food_library","meal_prep_batches","private_actions","rapid_decisions"].forEach(k=>a[k]=deepArr(a[k]));
    return prog;
  };

  /* ---------- offres ---------- */
  function injectOfferOptions(){
    const select=document.getElementById("f-offre"); if(!select)return;
    [[PERF_PLUS,OFFER_LABELS[PERF_PLUS]],[PRIVATE,OFFER_LABELS[PRIVATE]]].forEach(([value,label])=>{
      if(!select.querySelector(`option[value="${value}"]`)){const o=document.createElement("option");o.value=value;o.textContent=label;select.appendChild(o);}
    });
  }

  /* ---------- champs classiques ---------- */
  function field(id,label,placeholder="",type="textarea"){
    if(type==="select-antidoping")return `<div><label class="field-label">${label}</label><select id="${id}" class="admin-input"><option value="not_checked">À vérifier</option><option value="food_only">Food-first / pas de supplément</option><option value="batch_tested">Lot testé indépendamment</option><option value="staff_validated">Validé avec staff médical</option><option value="mixed">Mixte — voir notes</option></select></div>`;
    if(type==="input")return `<div><label class="field-label">${label}</label><input id="${id}" class="admin-input" placeholder="${attr(placeholder)}" /></div>`;
    if(type==="date")return `<div><label class="field-label">${label}</label><input id="${id}" type="date" class="admin-input" /></div>`;
    return `<div><label class="field-label">${label}</label><textarea id="${id}" class="admin-textarea" placeholder="${attr(placeholder)}"></textarea></div>`;
  }

  const LIST_SCHEMAS={
    calendar:{title:"Calendrier performance jour par jour",add:"Ajouter une journée",private:false,fields:[
      ["date","Date","date"],["day_type","Type de journée","select",[["training","Entraînement"],["match","Match"],["recovery","Récupération"],["rest","Repos"],["travel","Voyage"],["double","Double séance"]]],
      ["session_time","Horaire","time"],["session","Séance / objectif","text"],["fueling","Repas & timing autour de la séance","textarea"],["hydration","Hydratation / électrolytes","textarea"],["recovery","Récupération prévue","textarea"],["notes","Ajustements / contexte","textarea"]
    ]},
    meal_analyses:{title:"Analyses de repas & décisions",add:"Ajouter une analyse",private:false,fields:[
      ["date","Date","date"],["context","Contexte","text"],["meal","Repas envoyé / décrit","textarea"],["analysis","Analyse nutritionnelle","textarea"],["decision","Correction / action décidée","textarea"],["follow_up","À vérifier ensuite","textarea"],["status","Statut","select",[["new","Nouveau"],["adjusted","Ajusté"],["validated","Validé"],["followup","À revoir"]]]
    ]},
    match_dossiers:{title:"Dossiers match complets",add:"Ajouter un match",private:false,fields:[
      ["date","Date","date"],["opponent","Adversaire / compétition","text"],["kickoff","Coup d'envoi","time"],["wake_time","Réveil","time"],["venue","Lieu / contexte","text"],["travel","Transport / arrivée","textarea"],["h6","H-6 / premier repas stratégique","textarea"],["h4","H-4","textarea"],["h2","H-2 / collation si prévue","textarea"],["prewarmup","Avant échauffement","textarea"],["halftime","Mi-temps / intra-match","textarea"],["post60","0–60 min post-match","textarea"],["evening","Repas post-match","textarea"],["jplus1","J+1 récupération","textarea"],["notes","Tolérance / ajustements","textarea"]
    ]},
    hydration_tests:{title:"Hydratation & taux de sudation",add:"Ajouter un test",private:false,fields:[
      ["date","Date","date"],["session","Séance / conditions","text"],["duration_min","Durée (min)","number"],["pre_kg","Poids pré (kg)","number"],["post_kg","Poids post (kg)","number"],["fluids_ml","Liquides bus (ml)","number"],["urine_ml","Urines pendant (ml)","number"],["conditions","Chaleur / humidité / tenue","text"],["electrolytes","Électrolytes / sodium — consigne","textarea"],["notes","Notes","textarea"]
    ]},
    biomarkers:{title:"Biomarqueurs / micronutrition dans le temps",add:"Ajouter un marqueur",private:false,fields:[
      ["date","Date du bilan","date"],["marker","Marqueur","text"],["value","Valeur","text"],["unit","Unité","text"],["lab_range","Référence laboratoire","text"],["status","Statut","select",[["info","Information"],["in_range","Dans la plage"],["low","Bas — suivi médical"],["high","Haut — suivi médical"],["medical","À coordonner médicalement"]]],["medical_note","Consigne / information médicale transmise","textarea"],["nutrition_action","Action nutritionnelle dans ton champ","textarea"],["retest_date","Contrôle prévu","date"]
    ]},
    body_history:{title:"Historique composition corporelle",add:"Ajouter une mesure",private:false,fields:[
      ["date","Date","date"],["weight_kg","Poids (kg)","number"],["body_fat","Masse grasse (%)","number"],["muscle_mass","Masse musculaire (kg)","number"],["waist_cm","Tour de taille (cm)","number"],["method","Méthode / appareil","text"],["context","Conditions de mesure","text"],["notes","Lecture / décision","textarea"]
    ]},
    supplement_log:{title:"Journal suppléments & antidopage",add:"Ajouter un produit",private:false,fields:[
      ["name","Produit","text"],["brand","Marque","text"],["dose","Dose / timing","text"],["frequency","Fréquence","text"],["batch","N° de lot","text"],["certification","Test / certification / preuve","text"],["status","Décision","select",[["to_check","À vérifier"],["food_first","Food-first"],["batch_tested","Lot testé"],["staff_validated","Validé staff"],["excluded","Exclu / non retenu"]]],["validated_by","Validé avec","text"],["last_checked","Dernière vérification","date"],["notes","Notes","textarea"]
    ]},
    staff_log:{title:"Historique coordination staff",add:"Ajouter un échange",private:false,fields:[
      ["date","Date","date"],["person","Personne","text"],["role","Rôle","text"],["topic","Sujet","text"],["input","Information reçue","textarea"],["decision","Décision nutritionnelle","textarea"],["followup","Suivi / prochaine étape","textarea"],["status","Statut","select",[["open","Ouvert"],["waiting","En attente"],["done","Terminé"]]]
    ]},
    review_history:{title:"Historique reviews hebdomadaires",add:"Ajouter une review",private:false,fields:[
      ["date","Date","date"],["week","Semaine / période","text"],["wins","Ce qui a marché","textarea"],["issues","Points à corriger","textarea"],["energy","Énergie moyenne /5","number"],["recovery","Récupération /5","number"],["digestion","Digestion /5","number"],["appetite","Appétit /5","number"],["sleep","Sommeil /5","number"],["decision","Décisions semaine suivante","textarea"]
    ]},
    travel_dossiers:{title:"Dossiers déplacements — Private",add:"Ajouter un déplacement",private:true,fields:[
      ["start","Départ","date"],["end","Retour","date"],["destination","Destination","text"],["flight","Vol / horaires / transfert","textarea"],["hotel","Hôtel / accès alimentaire","textarea"],["timezone","Fuseau / décalage","text"],["food_access","Ce qui sera disponible","textarea"],["chef","Chef / traiteur / contact local","textarea"],["orders","Commandes / repas organisés","textarea"],["travel_kit","Kit voyage à emporter","textarea"],["food_safety","Sécurité alimentaire / eau / froid","textarea"],["plan_b","Plan B si tout échoue","textarea"],["status","Statut","select",[["prep","À préparer"],["ready","Prêt"],["active","En cours"],["closed","Clôturé"]]]
    ]},
    cultural_food_library:{title:"Cuisine de chez lui — bibliothèque performance",add:"Ajouter un plat",private:true,fields:[
      ["name","Plat","text"],["original","Version habituelle / ce qu'il aime","textarea"],["ingredients","Ingrédients clés","textarea"],["prep","Préparation à transmettre au cuisinier","textarea"],["training","Version jour d'entraînement","textarea"],["rest","Version repos","textarea"],["pre_match","Version / place avant match","textarea"],["recovery","Version récupération","textarea"],["portion_notes","Repères de portions / tolérance","textarea"],["status","Statut","select",[["idea","À tester"],["tested","Testé"],["approved","Validé par le joueur"],["avoid_match","À éloigner du match"]]]
    ]},
    meal_prep_batches:{title:"Chef / traiteur / meal-prep — Private",add:"Ajouter une livraison",private:true,fields:[
      ["date","Date","date"],["provider","Prestataire / relais","text"],["meals","Repas / quantités demandés","textarea"],["instructions","Fiches / instructions envoyées","textarea"],["delivery","Livraison / réception","textarea"],["storage","Conservation / réchauffage","textarea"],["player_feedback","Retour du joueur","textarea"],["next_action","Correction prochaine livraison","textarea"],["status","Statut","select",[["ordered","Commandé"],["delivered","Livré"],["tested","Testé"],["validated","Validé"],["issue","Problème"]]]
    ]},
    private_actions:{title:"File d'actions Private",add:"Ajouter une action",private:true,fields:[
      ["title","Action à résoudre","text"],["category","Catégorie","select",[["food","Repas"],["match","Match"],["travel","Voyage"],["provider","Prestataire"],["staff","Staff"],["recovery","Récupération"],["my","Maison Yanna"],["other","Autre"]]],["owner","Responsable","text"],["due","Échéance","date"],["priority","Priorité","select",[["high","Haute"],["medium","Normale"],["low","Basse"]]],["status","Statut","select",[["todo","À faire"],["doing","En cours"],["waiting","En attente"],["done","Terminé"]]],["notes","Notes / blocage / prochaine étape","textarea"]
    ]},
    rapid_decisions:{title:"Décisions rapides / situations réelles",add:"Ajouter une décision",private:true,fields:[
      ["date","Date","date"],["situation","Situation","textarea"],["decision","Décision envoyée au joueur","textarea"],["reason","Pourquoi","textarea"],["outcome","Résultat / retour","textarea"]
    ]}
  };

  function inputControl(list,key,label,type,value,options){
    const common=`data-mtp-list="${list}" data-mtp-key="${key}"`;
    if(type==="textarea")return `<div style="grid-column:1/-1"><label style="${labelStyle}">${esc(label)}</label><textarea ${common} class="admin-textarea" style="min-height:66px">${esc(value||"")}</textarea></div>`;
    if(type==="select")return `<div><label style="${labelStyle}">${esc(label)}</label><select ${common} class="admin-input">${(options||[]).map(([v,l])=>`<option value="${esc(v)}" ${String(value||"")===v?"selected":""}>${esc(l)}</option>`).join("")}</select></div>`;
    const inputType=["date","time","number"].includes(type)?type:"text";
    const step=inputType==="number"?' step="0.01"':'';
    return `<div><label style="${labelStyle}">${esc(label)}</label><input ${common} type="${inputType}"${step} class="admin-input" value="${attr(value||"")}" /></div>`;
  }
  function listItemHtml(name,item,index){
    const schema=LIST_SCHEMAS[name]; item=item||{};
    const fields=schema.fields.map(f=>inputControl(name,f[0],f[1],f[2],item[f[0]],f[3])).join("");
    const hydro=name==="hydration_tests"?`<div class="mtp-hydration-result" style="grid-column:1/-1;background:#f7faf8;border-radius:12px;padding:10px 12px;font-size:11px;color:var(--brand)">Renseigne les mesures pour calculer la perte hydrique.</div>`:"";
    return `<div class="mtp-list-item" data-mtp-list="${name}" data-id="${esc(item.id||uid())}" style="border:1px solid #e9e4dc;border-radius:14px;padding:12px;background:#fff;position:relative">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:10px"><strong style="font-size:11px;color:var(--ink)">${esc(schema.title)} · ${index+1}</strong><button type="button" data-mtp-remove style="border:0;background:#f6f1eb;color:#8b6a48;border-radius:999px;padding:5px 8px;font:inherit;font-size:10px;cursor:pointer">Retirer</button></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px">${fields}${hydro}</div>
    </div>`;
  }
  function renderList(name,items){
    const c=document.getElementById(`mtp-list-${name}`); if(!c)return;
    const arr=deepArr(items); c.innerHTML=arr.length?arr.map((it,i)=>listItemHtml(name,it,i)).join(""):emptyMsg();
    if(name==="hydration_tests")updateHydrationResults(c);
  }
  function collectList(name){
    const c=document.getElementById(`mtp-list-${name}`); if(!c)return [];
    return [...c.querySelectorAll(`.mtp-list-item[data-mtp-list="${name}"]`)].map(card=>{
      const o={id:card.dataset.id||uid()}; card.querySelectorAll("[data-mtp-key]").forEach(e=>o[e.dataset.mtpKey]=e.value?.trim?.()??e.value??""); return o;
    }).filter(o=>Object.entries(o).some(([k,v])=>k!=="id"&&String(v||"").trim()));
  }
  function listSection(name,open=false){
    const s=LIST_SCHEMAS[name];
    return `<details data-mtp-private="${s.private?"1":"0"}" ${open?"open":""} style="${s.private?"border:1.5px solid rgba(139,101,56,.25);background:#fffaf2;":""}${styleBox}"><summary style="font-size:12px;font-weight:800;color:${s.private?"#7b5732":"var(--ink)"};cursor:pointer">${esc(s.title)}</summary><div style="margin-top:12px"><div id="mtp-list-${name}" style="display:flex;flex-direction:column;gap:10px"></div><button type="button" data-mtp-add="${name}" class="chip" style="margin-top:10px">+ ${esc(s.add)}</button></div></details>`;
  }

  function calcHydration(card){
    const val=k=>parseFloat(card.querySelector(`[data-mtp-key="${k}"]`)?.value||"");
    const pre=val("pre_kg"),post=val("post_kg"),fluid=val("fluids_ml"),urine=val("urine_ml"),min=val("duration_min");
    if(![pre,post,min].every(Number.isFinite)||min<=0)return null;
    const loss=(pre-post)+(Number.isFinite(fluid)?fluid/1000:0)-(Number.isFinite(urine)?urine/1000:0);
    if(!Number.isFinite(loss)||loss<0)return null;
    const rate=loss/(min/60); return {loss,rate,minRehyd:loss*1.25,maxRehyd:loss*1.5};
  }
  function updateHydrationResults(root=document){
    root.querySelectorAll?.('.mtp-list-item[data-mtp-list="hydration_tests"]').forEach(card=>{
      const out=card.querySelector(".mtp-hydration-result"); if(!out)return; const r=calcHydration(card);
      out.textContent=r?`Perte hydrique estimée : ${r.loss.toFixed(2)} L · Sudation : ${r.rate.toFixed(2)} L/h · Repère de réhydratation post-effort : ${r.minRehyd.toFixed(2)}–${r.maxRehyd.toFixed(2)} L, à individualiser.`:"Renseigne poids pré/post et durée pour calculer la perte hydrique.";
    });
  }

  /* ---------- admin ---------- */
  function injectAdminPerformance(){
    if(!window.MT_ADMIN_PAGE||document.getElementById("mt-performance-admin"))return;
    injectOfferOptions();
    const profileTitle=[...document.querySelectorAll(".admin-section h3")].find(h=>h.textContent.trim()==="Profil client");
    const profileSection=profileTitle?.closest(".admin-section"); if(!profileSection)return;
    const block=document.createElement("div"); block.className="admin-section"; block.id="mt-performance-admin";
    block.innerHTML=`
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:14px"><div><h3 class="serif" style="font-size:22px;color:var(--ink);margin:0 0 4px">Performance Pro OS</h3><p style="font-size:11px;color:var(--muted);margin:0;line-height:1.55">Un cockpit opérationnel : anticiper, décider, suivre et coordonner — pas seulement écrire un plan.</p></div><span id="mt-perf-admin-offer" style="font-size:9px;font-weight:800;padding:5px 8px;border-radius:999px;background:#f0ece6;color:var(--brand)">SPORT PRO</span></div>
      <div id="mt-perf-service-scope" style="padding:12px 14px;border-radius:14px;background:#f6f3ee;font-size:11px;line-height:1.6;color:#5e534a;margin-bottom:14px"></div>
      <div id="mt-performance-admin-body" style="display:flex;flex-direction:column;gap:12px">
        <details open style="${styleBox}"><summary style="font-size:12px;font-weight:800;color:var(--ink);cursor:pointer">01 · Profil sportif & contexte</summary><div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px">${field("f-ath-sport","Sport","Football","input")}${field("f-ath-position","Poste / spécialité","Attaquant","input")}${field("f-ath-club","Club / structure","","input")}${field("f-ath-base","Ville / base actuelle","Ex : Tripoli","input")}</div></details>
        <details open style="${styleBox}"><summary style="font-size:12px;font-weight:800;color:var(--ink);cursor:pointer">02 · Performance Board — semaine</summary><div style="display:flex;flex-direction:column;gap:9px;margin-top:12px">${field("f-ath-focus","Priorité de la semaine","Ex : disponibilité + recharge glycogène")}${field("f-ath-load","Charge / contexte","Ex : 4 entraînements + 2 matchs")}${field("f-ath-sessions","Séances clés","Résumé global")}${field("f-ath-matches","Matchs","Résumé global")}${field("f-ath-carbs","Périodisation glucidique","Repères jours légers / lourds / match")}${field("f-ath-protein","Repères protéines","Répartition et récupération")}${field("f-ath-hydration","Hydratation & électrolytes","Objectif de la semaine")}${field("f-ath-recovery","Priorité récupération","Sommeil, post-effort, fenêtre de récupération")}${field("f-ath-week-notes","Ajustements","Fatigue, appétit, changement de planning…")}</div></details>
        ${listSection("calendar",true)}
        ${listSection("meal_analyses",false)}
        ${listSection("match_dossiers",false)}
        <details style="${styleBox}"><summary style="font-size:12px;font-weight:800;color:var(--ink);cursor:pointer">06 · Cadre match J-1 → J+1</summary><div style="display:flex;flex-direction:column;gap:9px;margin-top:12px">${field("f-ath-jm1","J-1","Recharge, fibres, hydratation, dîner")}${field("f-ath-prematch","Jour J / pré-match","Timing, repas, collation, hydratation")}${field("f-ath-intra","Pendant / mi-temps","Boissons, glucides selon stratégie")}${field("f-ath-post","Post-match immédiat","Réhydratation, glucides, protéines")}${field("f-ath-jp1","J+1","Récupération, appétit, digestion, reprise")}</div></details>
        ${listSection("hydration_tests",false)}
        <details style="${styleBox}"><summary style="font-size:12px;font-weight:800;color:var(--ink);cursor:pointer">08 · Vie réelle : hôtel · restaurant · déplacements</summary><div style="display:flex;flex-direction:column;gap:9px;margin-top:12px">${field("f-ath-hotel","Hôtel / buffet","Plan A / Plan B")}${field("f-ath-delivery","Livraison / meal prep","Organisation générale")}${field("f-ath-cultural","Cuisine culturelle à préserver","Plats appréciés + adaptations")}${field("f-ath-restaurant","Restaurant","Règles de choix / commandes type")}${field("f-ath-airport","Aéroport / voyage","À emporter, timing, arrivée tardive")}${field("f-ath-foodsafety","Sécurité alimentaire","Froid, eau, stockage, aliments à risque")}</div></details>
        <details style="${styleBox}"><summary style="font-size:12px;font-weight:800;color:var(--ink);cursor:pointer">09 · Micronutrition & biologie — cadre</summary><div style="display:flex;flex-direction:column;gap:9px;margin-top:12px"><p style="font-size:11px;color:#9a6b2f;margin:0;line-height:1.55">Repères nutritionnels uniquement. Les résultats biologiques ne remplacent pas l'interprétation médicale.</p>${field("f-ath-labs","Biologie disponible","Résumé / contexte")}${field("f-ath-micro","Priorités micronutritionnelles","Uniquement si pertinentes")}${field("f-ath-medical","Consignes médicales transmises","Traitement, carence confirmée, restrictions")}${field("f-ath-micro-date","Dernière revue","","date")}</div></details>
        ${listSection("biomarkers",false)}
        <details style="${styleBox}"><summary style="font-size:12px;font-weight:800;color:var(--ink);cursor:pointer">11 · Composition corporelle — cadre</summary><div style="display:flex;flex-direction:column;gap:9px;margin-top:12px">${field("f-ath-weight-target","Repère poids","Objectif / plage si pertinent","input")}${field("f-ath-body-goal","Objectif de composition corporelle","Maintien, prise de masse, recomposition…")}${field("f-ath-weighin","Protocole de mesure","Fréquence / conditions")}${field("f-ath-body-notes","Lecture globale","Évolution sans obsession du chiffre")}</div></details>
        ${listSection("body_history",false)}
        <details style="${styleBox}"><summary style="font-size:12px;font-weight:800;color:var(--ink);cursor:pointer">13 · Suppléments & antidopage — cadre</summary><div style="display:flex;flex-direction:column;gap:9px;margin-top:12px">${field("f-ath-supp","Produits actuels","Nom, marque, dose, fréquence")}${field("f-ath-anti","Statut global","","select-antidoping")}${field("f-ath-validated","Référent / validation","Médecin / club / pharmacien / nutrition","input")}${field("f-ath-supp-notes","Notes générales","Décision food-first, règles du club…")}</div></details>
        ${listSection("supplement_log",false)}
        <details style="${styleBox}"><summary style="font-size:12px;font-weight:800;color:var(--ink);cursor:pointer">15 · Staff & coordination — contacts</summary><div style="display:flex;flex-direction:column;gap:9px;margin-top:12px">${field("f-ath-coach","Préparateur / coach","Nom / rôle si autorisé","input")}${field("f-ath-medical-contact","Staff médical","Médecin / référent si autorisé","input")}${field("f-ath-physio","Kiné / récupération","Référent si autorisé","input")}${field("f-ath-coordination","Coordination actuelle","Résumé")}</div></details>
        ${listSection("staff_log",false)}
        <details style="${styleBox}"><summary style="font-size:12px;font-weight:800;color:var(--ink);cursor:pointer">17 · Maison Yanna — dotation ciblée</summary><div style="display:flex;flex-direction:column;gap:9px;margin-top:12px">${field("f-ath-my-selection","Sélection du mois","Produits alimentaires retenus")}${field("f-ath-my-usage","Quand les utiliser","Petit-déjeuner, déplacement, récupération…")}${field("f-ath-my-stock","Stock / réassort","À envoyer / reçu / à renouveler")}${field("f-ath-my-notes","Prudence & notes","Sécurisation antidopage si nécessaire")}</div></details>
        ${listSection("review_history",false)}
        <details style="${styleBox}"><summary style="font-size:12px;font-weight:800;color:var(--ink);cursor:pointer">19 · Review actuelle</summary><div style="display:flex;flex-direction:column;gap:9px;margin-top:12px">${field("f-ath-wins","Ce qui a marché","Énergie, digestion, organisation…")}${field("f-ath-issues","À corriger","Faim, fatigue, récupération, logistique…")}${field("f-ath-next","Décisions suivantes","Ce que l'on change concrètement")}</div></details>
        <div id="mt-private-zone" style="display:flex;flex-direction:column;gap:12px">
          <div style="padding:14px 15px;border-radius:14px;background:#1d3327;color:white"><p style="font-size:9px;text-transform:uppercase;letter-spacing:.15em;font-weight:800;opacity:.65;margin:0 0 5px">Private Performance</p><h4 class="serif" style="font-size:19px;margin:0 0 4px">Concierge nutritionnel opérationnel</h4><p style="font-size:11px;line-height:1.6;opacity:.85;margin:0">Ici, Tee ne se contente plus de conseiller : elle organise, anticipe, coordonne et suit l'exécution à distance. Les déplacements physiques restent sur devis/frais séparés.</p></div>
          ${listSection("travel_dossiers",false)}
          ${listSection("cultural_food_library",false)}
          ${listSection("meal_prep_batches",false)}
          ${listSection("private_actions",true)}
          ${listSection("rapid_decisions",false)}
          <details style="border:1.5px solid rgba(139,101,56,.25);border-radius:14px;padding:12px 14px;background:#fffaf2"><summary style="font-size:12px;font-weight:800;color:#7b5732;cursor:pointer">Private — résumé concierge</summary><div style="display:flex;flex-direction:column;gap:9px;margin-top:12px">${field("f-ath-provider","Chef / traiteur / relais local","Nom, coordonnées, contact club")}${field("f-ath-provider-status","Statut prestataire","À chercher / test / validé / suspendu","input")}${field("f-ath-mealprep","Meal prep actuel","Fréquence / repas / retours")}${field("f-ath-mealdelivery","Livraison & conservation","Jours, réception, froid, réchauffage")}${field("f-ath-travelprep","Prochain déplacement","Ce qui doit être préparé")}${field("f-ath-onsite","Présence physique ponctuelle","Paris / stage / étranger — sur devis")}${field("f-ath-priority-notes","Priorité concierge","Ce que Tee doit résoudre maintenant")}</div></details>
        </div>
      </div>`;
    profileSection.parentNode.insertBefore(block,profileSection.nextSibling);

    block.addEventListener("click",e=>{
      const add=e.target.closest("[data-mtp-add]"); if(add){const name=add.dataset.mtpAdd;const c=document.getElementById(`mtp-list-${name}`);if(c){if(c.querySelector("p"))c.innerHTML="";const count=c.querySelectorAll(".mtp-list-item").length;c.insertAdjacentHTML("beforeend",listItemHtml(name,{id:uid()},count));updateHydrationResults(c);}return;}
      const rem=e.target.closest("[data-mtp-remove]"); if(rem){const card=rem.closest(".mtp-list-item");const c=card?.parentElement;card?.remove();if(c&&!c.querySelector(".mtp-list-item"))c.innerHTML=emptyMsg();return;}
    });
    block.addEventListener("input",e=>{if(e.target.closest('[data-mtp-list="hydration_tests"]'))updateHydrationResults(e.target.closest('.mtp-list-item'));});
    const offer=document.getElementById("f-offre"); if(offer)offer.addEventListener("change",()=>toggleAdminPerf(offer.value));
    const parcours=document.getElementById("f-parcours"); if(parcours)parcours.addEventListener("change",()=>toggleAdminPerf(offer?.value||""));
    toggleAdminPerf(offer?.value||"");
  }

  function toggleAdminPerf(offer){
    const block=document.getElementById("mt-performance-admin"); if(!block)return;
    const parcours=document.getElementById("f-parcours")?.value;
    const show=parcours==="performance"&&[PERF_PLUS,PRIVATE].includes(offer);
    block.style.display=show?"block":"none";
    const privateZone=document.getElementById("mt-private-zone"); if(privateZone)privateZone.style.display=offer===PRIVATE?"flex":"none";
    block.querySelectorAll('[data-mtp-private="1"]').forEach(x=>x.style.display=offer===PRIVATE?"block":"none");
    const badge=document.getElementById("mt-perf-admin-offer"); if(badge)badge.textContent=offer===PRIVATE?"PRIVATE PERFORMANCE+":offer===PERF_PLUS?"PRIVATE":"SPORT PRO";
    const scope=document.getElementById("mt-perf-service-scope");
    if(scope)scope.innerHTML=offer===PRIVATE?`<strong>Private Performance+ :</strong> tout le pilotage Performance+ + exécution/logistique à distance : dossiers de voyage, chef/traiteur, meal-prep, cuisine culturelle, file d'actions et décisions rapides.`:`<strong>Private :</strong> planification sportive, analyse des repas, match, récupération, hydratation, micronutrition, composition corporelle, staff et déplacements. Le concierge logistique reste réservé à Private.`;
  }

  function fillPerformanceAdmin(prog){
    if(!window.MT_ADMIN_PAGE)return; prog=window.mtNormalizeProgramme(prog); injectOfferOptions(); const a=prog.athlete;
    const map={
      "f-ath-sport":a.identity.sport,"f-ath-position":a.identity.position,"f-ath-club":a.identity.club,"f-ath-base":a.identity.base_city,
      "f-ath-focus":a.weekly.focus,"f-ath-load":a.weekly.training_load,"f-ath-sessions":a.weekly.sessions,"f-ath-matches":a.weekly.matches,"f-ath-carbs":a.weekly.carbs,"f-ath-protein":a.weekly.protein,"f-ath-hydration":a.weekly.hydration,"f-ath-recovery":a.weekly.recovery,"f-ath-week-notes":a.weekly.notes,
      "f-ath-jm1":a.matchday.jminus1,"f-ath-prematch":a.matchday.prematch,"f-ath-intra":a.matchday.intra,"f-ath-post":a.matchday.postmatch,"f-ath-jp1":a.matchday.jplus1,
      "f-ath-hotel":a.travel.hotel,"f-ath-delivery":a.travel.delivery,"f-ath-cultural":a.travel.cultural_foods,"f-ath-restaurant":a.travel.restaurant,"f-ath-airport":a.travel.airport,"f-ath-foodsafety":a.travel.food_safety,
      "f-ath-labs":a.micronutrition.labs,"f-ath-micro":a.micronutrition.priorities,"f-ath-medical":a.micronutrition.medical_notes,"f-ath-micro-date":a.micronutrition.last_review,
      "f-ath-weight-target":a.body.weight_target,"f-ath-body-goal":a.body.composition_goal,"f-ath-weighin":a.body.weighin,"f-ath-body-notes":a.body.notes,
      "f-ath-supp":a.supplements.current,"f-ath-anti":a.supplements.antidoping,"f-ath-validated":a.supplements.validated_by,"f-ath-supp-notes":a.supplements.notes,
      "f-ath-coach":a.staff.coach,"f-ath-medical-contact":a.staff.medical,"f-ath-physio":a.staff.physio,"f-ath-coordination":a.staff.coordination,
      "f-ath-my-selection":a.maison_yanna.monthly_selection,"f-ath-my-usage":a.maison_yanna.usage,"f-ath-my-stock":a.maison_yanna.stock,"f-ath-my-notes":a.maison_yanna.notes,
      "f-ath-provider":a.private.provider,"f-ath-provider-status":a.private.provider_status,"f-ath-mealprep":a.private.meal_prep,"f-ath-mealdelivery":a.private.meal_delivery,"f-ath-travelprep":a.private.travel_prep,"f-ath-onsite":a.private.onsite,"f-ath-priority-notes":a.private.priority_notes,
      "f-ath-wins":a.review.wins,"f-ath-issues":a.review.issues,"f-ath-next":a.review.next
    };
    Object.entries(map).forEach(([id,v])=>setv(id,v));
    Object.keys(LIST_SCHEMAS).forEach(name=>renderList(name,a[name]));
    toggleAdminPerf(prog.offre||"");
  }

  function collectPerformanceAdmin(prog){
    if(!window.MT_ADMIN_PAGE||!document.getElementById("mt-performance-admin"))return prog;
    prog=window.mtNormalizeProgramme(prog); const a=prog.athlete;
    a.identity={sport:txt("f-ath-sport")||"Football",position:txt("f-ath-position"),club:txt("f-ath-club"),base_city:txt("f-ath-base"),country:a.identity.country||""};
    a.weekly={focus:txt("f-ath-focus"),training_load:txt("f-ath-load"),sessions:txt("f-ath-sessions"),matches:txt("f-ath-matches"),carbs:txt("f-ath-carbs"),protein:txt("f-ath-protein"),hydration:txt("f-ath-hydration"),recovery:txt("f-ath-recovery"),notes:txt("f-ath-week-notes")};
    a.matchday={jminus1:txt("f-ath-jm1"),prematch:txt("f-ath-prematch"),intra:txt("f-ath-intra"),postmatch:txt("f-ath-post"),jplus1:txt("f-ath-jp1")};
    a.travel={hotel:txt("f-ath-hotel"),delivery:txt("f-ath-delivery"),cultural_foods:txt("f-ath-cultural"),restaurant:txt("f-ath-restaurant"),airport:txt("f-ath-airport"),food_safety:txt("f-ath-foodsafety")};
    a.micronutrition={labs:txt("f-ath-labs"),priorities:txt("f-ath-micro"),medical_notes:txt("f-ath-medical"),last_review:txt("f-ath-micro-date")};
    a.body={weight_target:txt("f-ath-weight-target"),composition_goal:txt("f-ath-body-goal"),weighin:txt("f-ath-weighin"),notes:txt("f-ath-body-notes")};
    a.supplements={current:txt("f-ath-supp"),antidoping:txt("f-ath-anti")||"not_checked",validated_by:txt("f-ath-validated"),notes:txt("f-ath-supp-notes")};
    a.staff={coach:txt("f-ath-coach"),medical:txt("f-ath-medical-contact"),physio:txt("f-ath-physio"),coordination:txt("f-ath-coordination")};
    a.maison_yanna={monthly_selection:txt("f-ath-my-selection"),usage:txt("f-ath-my-usage"),stock:txt("f-ath-my-stock"),notes:txt("f-ath-my-notes")};
    a.private={provider:txt("f-ath-provider"),provider_status:txt("f-ath-provider-status"),meal_prep:txt("f-ath-mealprep"),meal_delivery:txt("f-ath-mealdelivery"),travel_prep:txt("f-ath-travelprep"),onsite:txt("f-ath-onsite"),priority_notes:txt("f-ath-priority-notes")};
    a.review={wins:txt("f-ath-wins"),issues:txt("f-ath-issues"),next:txt("f-ath-next")};
    Object.keys(LIST_SCHEMAS).forEach(name=>a[name]=collectList(name));
    return prog;
  }

  /* ---------- rendu client structuré ---------- */
  function statusLabel(v){return ({new:"Nouveau",adjusted:"Ajusté",validated:"Validé",followup:"À revoir",training:"Entraînement",match:"Match",recovery:"Récupération",rest:"Repos",travel:"Voyage",double:"Double séance",prep:"À préparer",ready:"Prêt",active:"En cours",closed:"Clôturé",idea:"À tester",tested:"Testé",approved:"Validé",avoid_match:"À éloigner du match",ordered:"Commandé",delivered:"Livré",issue:"Problème",todo:"À faire",doing:"En cours",waiting:"En attente",done:"Terminé",high:"Haute",medium:"Normale",low:"Basse",to_check:"À vérifier",food_first:"Food-first",batch_tested:"Lot testé",staff_validated:"Validé staff",excluded:"Exclu"})[v]||v||"";}
  function tinyBadge(v){return v?`<span style="display:inline-block;font-size:8px;text-transform:uppercase;letter-spacing:.08em;font-weight:800;background:#f3eee7;color:var(--brand);padding:4px 7px;border-radius:999px">${esc(statusLabel(v))}</span>`:"";}
  function latest(arr,n=4){return deepArr(arr).slice().sort((x,y)=>String(y.date||y.start||"").localeCompare(String(x.date||x.start||""))).slice(0,n);}
  function clientCalendar(arr){
    if(!arr.length)return emptyMsg();
    return arr.slice().sort((x,y)=>String(x.date||"").localeCompare(String(y.date||""))).map(d=>`<div style="border-top:1px solid #eee7df;padding:12px 0"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><strong style="font-size:12px;color:var(--ink)">${esc(d.date||"Journée")}${d.session_time?` · ${esc(d.session_time)}`:""}</strong>${tinyBadge(d.day_type)}</div>${perfRows([{label:"Séance / objectif",value:d.session},{label:"Repas & timing",value:d.fueling},{label:"Hydratation",value:d.hydration},{label:"Récupération",value:d.recovery},{label:"Ajustements",value:d.notes}])}</div>`).join("");
  }
  function clientAnalyses(arr){
    const xs=latest(arr,5); if(!xs.length)return emptyMsg();
    return xs.map(x=>`<div style="border-top:1px solid #eee7df;padding:12px 0"><div style="display:flex;justify-content:space-between;gap:8px"><strong style="font-size:12px;color:var(--ink)">${esc(x.date||"")} ${x.context?`· ${esc(x.context)}`:""}</strong>${tinyBadge(x.status)}</div>${perfRows([{label:"Repas",value:x.meal},{label:"Analyse",value:x.analysis},{label:"Décision",value:x.decision},{label:"À vérifier",value:x.follow_up}])}</div>`).join("");
  }
  function clientMatches(arr){
    const xs=latest(arr,3); if(!xs.length)return emptyMsg();
    return xs.map(x=>`<details style="border-top:1px solid #eee7df;padding:10px 0"><summary style="cursor:pointer;font-size:12px;font-weight:800;color:var(--ink)">${esc(x.date||"Match")} ${x.opponent?`· ${esc(x.opponent)}`:""} ${x.kickoff?`· ${esc(x.kickoff)}`:""}</summary>${perfRows([{label:"Réveil",value:x.wake_time},{label:"Lieu / voyage",value:[x.venue,x.travel].filter(Boolean).join(" — ")},{label:"H-6",value:x.h6},{label:"H-4",value:x.h4},{label:"H-2",value:x.h2},{label:"Avant échauffement",value:x.prewarmup},{label:"Mi-temps",value:x.halftime},{label:"0–60 min post",value:x.post60},{label:"Repas post-match",value:x.evening},{label:"J+1",value:x.jplus1},{label:"Notes",value:x.notes}])}</details>`).join("");
  }
  function hydrationClient(arr){
    const xs=latest(arr,4); if(!xs.length)return emptyMsg();
    return xs.map(x=>{
      const fake=document.createElement("div"); fake.innerHTML=`<input data-mtp-key="pre_kg" value="${attr(x.pre_kg)}"><input data-mtp-key="post_kg" value="${attr(x.post_kg)}"><input data-mtp-key="fluids_ml" value="${attr(x.fluids_ml)}"><input data-mtp-key="urine_ml" value="${attr(x.urine_ml)}"><input data-mtp-key="duration_min" value="${attr(x.duration_min)}">`;
      const r=calcHydration(fake); const result=r?`${r.loss.toFixed(2)} L perdus · ${r.rate.toFixed(2)} L/h · cible post-effort ${r.minRehyd.toFixed(2)}–${r.maxRehyd.toFixed(2)} L`:"Calcul incomplet";
      return `<div style="border-top:1px solid #eee7df;padding:11px 0"><div style="display:flex;justify-content:space-between;gap:8px"><strong style="font-size:12px;color:var(--ink)">${esc(x.date||"")} ${x.session?`· ${esc(x.session)}`:""}</strong></div><p style="font-size:12px;color:var(--brand);font-weight:800;margin:6px 0">${esc(result)}</p>${perfRows([{label:"Conditions",value:x.conditions},{label:"Électrolytes",value:x.electrolytes},{label:"Notes",value:x.notes}])}</div>`;
    }).join("");
  }
  function biomarkersClient(arr){const xs=latest(arr,6);if(!xs.length)return emptyMsg();return xs.map(x=>`<div style="border-top:1px solid #eee7df;padding:10px 0"><div style="display:flex;justify-content:space-between;gap:8px"><strong style="font-size:12px;color:var(--ink)">${esc(x.marker||"Marqueur")}</strong>${tinyBadge(x.status)}</div><div style="font-size:13px;color:var(--ink);margin-top:4px">${esc([x.value,x.unit].filter(Boolean).join(" "))}${x.lab_range?` <span style="font-size:10px;color:var(--muted)">· réf. ${esc(x.lab_range)}</span>`:""}</div>${perfRows([{label:"Action nutritionnelle",value:x.nutrition_action},{label:"Consigne médicale transmise",value:x.medical_note},{label:"Contrôle",value:x.retest_date}])}</div>`).join("");}
  function supplementsClient(arr){const xs=deepArr(arr);if(!xs.length)return emptyMsg();return xs.map(x=>`<div style="border-top:1px solid #eee7df;padding:10px 0"><div style="display:flex;justify-content:space-between;gap:8px"><strong style="font-size:12px;color:var(--ink)">${esc([x.name,x.brand].filter(Boolean).join(" · ")||"Produit")}</strong>${tinyBadge(x.status)}</div>${perfRows([{label:"Dose / timing",value:x.dose},{label:"Lot",value:x.batch},{label:"Test / preuve",value:x.certification},{label:"Validé avec",value:x.validated_by},{label:"Notes",value:x.notes}])}</div>`).join("");}
  function simpleHistory(arr,cols,n=5){const xs=latest(arr,n);if(!xs.length)return emptyMsg();return xs.map(x=>`<div style="border-top:1px solid #eee7df;padding:10px 0"><strong style="font-size:12px;color:var(--ink)">${esc(x.date||x.start||x.title||x.name||"Entrée")}</strong>${perfRows(cols.map(c=>({label:c[1],value:x[c[0]]})))}</div>`).join("");}
  function trendCard(prog){
    const entries=Object.entries(prog.suivi||{}).sort((a,b)=>a[0].localeCompare(b[0])).slice(-7).map(([date,v])=>({date,...(v||{})}));
    if(!entries.length)return emptyMsg("Pas encore assez de check-ins pour afficher les tendances.");
    const avg=k=>{const vals=entries.map(x=>parseFloat(x[k])).filter(Number.isFinite);return vals.length?(vals.reduce((a,b)=>a+b,0)/vals.length):null;};
    const metrics=[["energie","Énergie"],["fatigue","Fatigue"],["appetit","Appétit"],["digestion","Digestion"],["recuperation","Récupération"],["hydratation_litres","Hydratation L/j"]];
    return `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">${metrics.map(([k,l])=>{const v=avg(k);return `<div style="background:#f8f5f0;border-radius:12px;padding:10px"><div style="${labelStyle}">${esc(l)}</div><strong style="font-size:18px;color:var(--ink)">${v==null?"—":v.toFixed(k==="hydratation_litres"?1:1)}</strong></div>`;}).join("")}</div><p style="font-size:10px;color:var(--muted);line-height:1.5;margin:10px 0 0">Moyennes calculées sur les derniers check-ins disponibles, à lire avec le contexte des séances et matchs.</p>`;
  }

  function injectClientPerformance(){
    if(window.MT_ADMIN_PAGE||document.getElementById("tab-performance"))return;
    const main=document.querySelector(".main-scroll"); if(!main)return;
    const sec=document.createElement("section"); sec.id="tab-performance"; sec.className="tab-section"; sec.style.paddingTop="24px"; sec.innerHTML=`<div id="mt-performance-client"></div>`;
    const msg=document.getElementById("tab-messages"); main.insertBefore(sec,msg||null);
    const switcher=document.querySelector("#tab-repas .section-switcher");
    if(switcher&&!document.getElementById("mt-performance-switch")){const b=document.createElement("button");b.id="mt-performance-switch";b.textContent="Performance";b.onclick=()=>switchTab("performance");b.style.display="none";switcher.appendChild(b);}
    const homeTerrain=document.getElementById("terrain-card")?.closest(".card");
    if(homeTerrain&&!document.getElementById("mt-performance-home")){const c=document.createElement("div");c.id="mt-performance-home";c.className="card";c.style.cssText="display:none;padding:20px;margin-top:18px;background:linear-gradient(145deg,#13281d,#244334);color:white;overflow:hidden;position:relative";c.innerHTML=`<div style="position:absolute;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.05);right:-45px;top:-55px"></div><p style="font-size:9px;text-transform:uppercase;letter-spacing:.15em;font-weight:800;opacity:.65;margin:0 0 7px">Cockpit sportif</p><h3 class="serif" style="font-size:21px;margin:0 0 7px">Ta semaine Performance</h3><p id="mt-performance-home-text" style="font-size:12px;line-height:1.65;opacity:.86;margin:0 0 13px"></p><button type="button" onclick="switchTab('performance')" style="border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.1);color:white;border-radius:999px;padding:9px 14px;font:inherit;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;cursor:pointer">Ouvrir mon cockpit</button>`;homeTerrain.parentNode.insertBefore(c,homeTerrain.nextSibling);}
  }

  function renderPerformanceClient(prog){
    prog=window.mtNormalizeProgramme(prog); const pro=isPro(prog),privateMode=isPrivate(prog);
    const switchBtn=document.getElementById("mt-performance-switch"); if(switchBtn)switchBtn.style.display=pro?"":"none";
    const home=document.getElementById("mt-performance-home"); if(home)home.style.display=pro?"block":"none";
    if(!pro)return;
    const a=prog.athlete||{}; const homeTxt=document.getElementById("mt-performance-home-text"); if(homeTxt)homeTxt.textContent=a.weekly?.focus||"Entraînements, matchs, récupération, hydratation et déplacements pilotés semaine après semaine.";
    const box=document.getElementById("mt-performance-client"); if(!box)return;
    const anti={not_checked:"À vérifier",food_only:"Food-first",batch_tested:"Lots testés",staff_validated:"Validé staff",mixed:"Mixte"}[a.supplements?.antidoping]||"À vérifier";
    const baseEyebrow=[a.identity?.base_city,"hôtel","déplacements"].filter(Boolean).join(" · ");
    box.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:18px"><div><p style="font-size:10px;text-transform:uppercase;letter-spacing:.14em;font-weight:800;color:var(--brand);margin:0 0 5px">${privateMode?"Private Performance+":"Private"}</p><h2 class="serif" style="font-size:30px;color:var(--ink);margin:0 0 4px">Cockpit Performance</h2><p style="font-size:12px;color:var(--muted);line-height:1.6;margin:0">Ta nutrition suit ton calendrier réel — pas un menu figé.</p></div><span style="font-size:22px">⚽</span></div>
      ${perfCard("Performance Board",perfRows([{label:"Priorité",value:a.weekly.focus},{label:"Charge / contexte",value:a.weekly.training_load},{label:"Séances clés",value:a.weekly.sessions},{label:"Matchs",value:a.weekly.matches},{label:"Glucides",value:a.weekly.carbs},{label:"Protéines",value:a.weekly.protein},{label:"Hydratation",value:a.weekly.hydration},{label:"Récupération",value:a.weekly.recovery},{label:"Ajustements",value:a.weekly.notes}]),"Cette semaine","📈")}
      ${perfCard("Calendrier nutritionnel",clientCalendar(a.calendar),"Jour par jour","🗓️")}
      ${perfCard("Analyses de repas",clientAnalyses(a.meal_analyses),"Décisions concrètes","🍽️")}
      ${perfCard("Dossiers match",clientMatches(a.match_dossiers),"Chaque match a son plan","🏟️")}
      ${perfCard("Cadre match",perfRows([{label:"J-1",value:a.matchday.jminus1},{label:"Pré-match",value:a.matchday.prematch},{label:"Pendant / mi-temps",value:a.matchday.intra},{label:"Post-match",value:a.matchday.postmatch},{label:"J+1",value:a.matchday.jplus1}]),"J-1 → J+1","⚡")}
      ${perfCard("Hydratation individualisée",hydrationClient(a.hydration_tests),"Mesurer avant de deviner","💧")}
      ${perfCard("Tendances",trendCard(prog),"Derniers check-ins","↗")}
      ${perfCard("Voyages & vraie vie",perfRows([{label:"Hôtel / buffet",value:a.travel.hotel},{label:"Livraison / meal prep",value:a.travel.delivery},{label:"Cuisine de chez toi",value:a.travel.cultural_foods},{label:"Restaurant",value:a.travel.restaurant},{label:"Aéroport / voyage",value:a.travel.airport},{label:"Sécurité alimentaire",value:a.travel.food_safety}]),baseEyebrow||"Hôtel · déplacements","✈️")}
      ${perfCard("Micronutrition & biologie",`${biomarkersClient(a.biomarkers)}${perfRows([{label:"Priorités actuelles",value:a.micronutrition.priorities},{label:"Consignes médicales transmises",value:a.micronutrition.medical_notes}])}`,"Suivi dans le temps","🧬")}
      ${perfCard("Composition corporelle",`${simpleHistory(a.body_history,[["weight_kg","Poids (kg)"],["body_fat","Masse grasse (%)"],["muscle_mass","Masse musculaire (kg)"],["method","Méthode"],["notes","Décision"]],4)}${perfRows([{label:"Objectif",value:a.body.composition_goal},{label:"Repère poids",value:a.body.weight_target},{label:"Protocole de mesure",value:a.body.weighin}])}`,"Évolution contextualisée","📏")}
      ${perfCard("Suppléments & antidopage",`<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:12px;background:#f8f4ee;margin-bottom:8px"><span style="font-size:11px;color:var(--muted)">Statut global</span><strong style="font-size:11px;color:var(--brand)">${esc(anti)}</strong></div>${supplementsClient(a.supplement_log)}${perfRows([{label:"Validé avec",value:a.supplements.validated_by},{label:"Notes générales",value:a.supplements.notes}])}`,"Food-first & traçabilité","🛡️")}
      ${perfCard("Coordination staff",simpleHistory(a.staff_log,[["person","Interlocuteur"],["role","Rôle"],["topic","Sujet"],["input","Information reçue"],["decision","Décision nutritionnelle"],["followup","Suivi"]],5),"Historique","🤝")}
      ${perfCard("Maison Yanna",perfRows([{label:"Dotation du mois",value:a.maison_yanna.monthly_selection},{label:"Utilisation",value:a.maison_yanna.usage},{label:"Stock / réassort",value:a.maison_yanna.stock},{label:"Notes",value:a.maison_yanna.notes}]),"Sélection personnalisée","✦")}
      ${privateMode?perfCard("Private · Voyages préparés",simpleHistory(a.travel_dossiers,[["destination","Destination"],["flight","Vol / transfert"],["hotel","Hôtel"],["food_access","Accès alimentaire"],["chef","Chef / traiteur"],["orders","Repas organisés"],["travel_kit","Kit voyage"],["plan_b","Plan B"],["status","Statut"]],4),"Concierge","🌍"):""}
      ${privateMode?perfCard("Private · Cuisine de chez toi",simpleHistory(a.cultural_food_library,[["original","Version habituelle"],["training","Entraînement"],["rest","Repos"],["pre_match","Avant match"],["recovery","Récupération"],["portion_notes","Repères"],["status","Statut"]],6),"Recettes personnelles","🥘"):""}
      ${privateMode?perfCard("Private · Chef & meal-prep",simpleHistory(a.meal_prep_batches,[["provider","Prestataire"],["meals","Repas demandés"],["instructions","Instructions"],["delivery","Livraison"],["player_feedback","Ton retour"],["next_action","Prochaine correction"],["status","Statut"]],5),"Exécution à distance","👨‍🍳"):""}
      ${privateMode?perfCard("Private · Actions en cours",simpleHistory(a.private_actions,[["category","Catégorie"],["owner","Responsable"],["due","Échéance"],["priority","Priorité"],["status","Statut"],["notes","Notes"]],8),"Tee anticipe et résout","✓"):""}
      ${privateMode?perfCard("Private · Décisions rapides",simpleHistory(a.rapid_decisions,[["situation","Situation"],["decision","Décision"],["reason","Pourquoi"],["outcome","Résultat"]],5),"Vie réelle","⚡"):""}
      ${perfCard("Review de la semaine",perfRows([{label:"Ce qui a marché",value:a.review.wins},{label:"À corriger",value:a.review.issues},{label:"Décisions suivantes",value:a.review.next}]),"Ajuster · apprendre · progresser","✓")}
      ${perfCard("Historique des reviews",simpleHistory(a.review_history,[["week","Période"],["wins","Victoires"],["issues","À corriger"],["energy","Énergie /5"],["recovery","Récupération /5"],["digestion","Digestion /5"],["decision","Décision"]],5),"Progression","📚")}
      <div style="padding:14px 16px;border-radius:14px;background:#fff8e8;border:1px solid #f1dfb5;font-size:11px;line-height:1.6;color:#72572f;margin-bottom:20px"><strong>Repère :</strong> les données biologiques, blessures, traitements et anomalies restent coordonnées avec les professionnels de santé compétents. Les calculs d'hydratation sont des estimations à contextualiser avec les conditions de séance.</div>`;
    try{lucide.createIcons();}catch(e){}
  }

  /* ---------- check-in sportif ---------- */
  function enhancePerformanceCheckin(prog){
    if(!isPro(prog)||prog.parcours!=="performance")return;
    const wrap=document.getElementById("profile-checkin"); if(!wrap||document.getElementById("suivi-fatigue"))return;
    const slider=(id,label)=>`<div style="margin-top:14px"><label style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;display:block;margin-bottom:8px">${label} <span id="val-${id}" style="color:var(--brand)">3/5</span></label><input type="range" id="suivi-${id}" min="1" max="5" value="3" oninput="document.getElementById('val-${id}').textContent=this.value+'/5';saveSuivi()" style="width:100%;accent-color:var(--brand)"></div>`;
    wrap.insertAdjacentHTML("beforeend",slider("fatigue","Fatigue générale")+slider("appetit","Appétit")+slider("charge","Charge ressentie")+`<div style="margin-top:14px"><label style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;display:block;margin-bottom:8px">Hydratation estimée</label><input id="suivi-hydratation-litres" type="number" min="0" max="10" step="0.1" placeholder="L / jour" oninput="saveSuivi()" style="width:100%;border:1.5px solid #e8e4de;border-radius:14px;padding:10px 12px;font:inherit;font-size:13px"></div>`);
  }
  window.saveSuivi=function(){
    const slug=currentSlug||"admin",today=mtLocalDateKey(),key="mt_suivi_"+slug+"_"+today,get=id=>document.getElementById(id);
    const data={eau:!!get("check-eau")?.checked,repas:!!get("check-repas")?.checked,infusion:!!get("check-infusion")?.checked,sport:!!get("check-sport")?.checked,poids:get("suivi-poids")?.value||"",energie:get("suivi-energie")?.value||"",sommeil:get("suivi-sommeil")?.value||"",digestion:get("suivi-digestion")?.value||"",note:get("suivi-note")?.value||"",filled:true,date:today};
    ["recuperation","courbatures","disponibilite","stress","faim","confort","fatigue","appetit","charge"].forEach(id=>{const e=get("suivi-"+id);if(e)data[id]=e.value;}); const h=get("suivi-hydratation-litres"); if(h)data.hydratation_litres=h.value;
    try{localStorage.setItem(key,JSON.stringify(data));}catch(e){} try{updateScore(slug);}catch(e){}
    if(sb&&slug&&slug!=="admin"){clearTimeout(window.saveSuivi._timer);window.saveSuivi._timer=setTimeout(async()=>{try{const res=await sb.from(SB_TABLE).select("programme").eq("slug",slug).single();if(res.error||!res.data)return;const p=Object.assign({},res.data.programme||{});p.suivi=p.suivi||{};p.suivi[today]=data;await sb.from(SB_TABLE).update({programme:p}).eq("slug",slug);if(typeof _currentProg!=="undefined"&&_currentProg)_currentProg.suivi=p.suivi;}catch(e){console.warn("[MT Performance] suivi",e);}},700);}
  };
  const oldInitSuivi=window.initSuivi;
  if(oldInitSuivi)window.initSuivi=function(){oldInitSuivi();const p=(typeof _currentProg!=="undefined"&&_currentProg)?_currentProg:{};enhancePerformanceCheckin(p);try{const slug=currentSlug||"admin",s=JSON.parse(localStorage.getItem("mt_suivi_"+slug+"_"+mtLocalDateKey())||"{}");["fatigue","appetit","charge"].forEach(id=>{const e=document.getElementById("suivi-"+id);if(e&&s[id]){e.value=s[id];const v=document.getElementById("val-"+id);if(v)v.textContent=s[id]+"/5";}});const h=document.getElementById("suivi-hydratation-litres");if(h&&s.hydratation_litres)h.value=s.hydratation_litres;}catch(e){}};

  /* ---------- wrappers ---------- */
  const oldFillAdmin=window.fillAdmin;
  if(oldFillAdmin)window.fillAdmin=function(prenom,prog){injectOfferOptions();oldFillAdmin(prenom,prog);fillPerformanceAdmin(prog);};
  const oldSaveClient=window.saveClient;
  if(oldSaveClient)window.saveClient=async function(){programme=collectPerformanceAdmin(programme);return oldSaveClient();};
  const oldRenderClient=window.renderClientView;
  if(oldRenderClient)window.renderClientView=function(prenom,prog){prog=window.mtNormalizeProgramme(prog);oldRenderClient(prenom,prog);renderPerformanceClient(prog);enhancePerformanceCheckin(prog);const banner=document.getElementById("my-banner"),t=document.getElementById("my-banner-text");if(banner&&t&&OFFER_BANNERS[prog.offre]){t.textContent=OFFER_BANNERS[prog.offre];banner.style.display="block";}};
  const oldSwitchTab=window.switchTab;
  if(oldSwitchTab)window.switchTab=function(name,btn){oldSwitchTab(name,btn);if(name==="performance")document.querySelector('.simplified-nav [data-hub="plan"]')?.classList.add("active");};

  function init(){
    injectOfferOptions();
    if(window.MT_ADMIN_PAGE)injectAdminPerformance();else injectClientPerformance();
    if(typeof _currentProg!=="undefined"&&_currentProg&&!window.MT_ADMIN_PAGE){try{renderPerformanceClient(_currentProg);enhancePerformanceCheckin(_currentProg);}catch(e){console.warn(e);}}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
