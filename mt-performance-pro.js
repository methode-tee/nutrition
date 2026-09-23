/* Méthode Tee — Performance Pro
   Extension des suivis sportifs : Performance+ (850€) & Private Performance (1500€)
   - cockpit hebdomadaire athlète
   - périodisation entraînement / match / récupération
   - voyage, hôtel, restaurant & cuisine culturelle
   - micronutrition / biologie (sans diagnostic)
   - composition corporelle, hydratation, suppléments & antidopage
   - coordination staff
   - concierge nutritionnel Private Performance
*/

(function(){
  const PERF_PLUS="performance_plus";
  const PRIVATE="private_performance";
  const OFFER_LABELS={
    signature:"Signature — 120€/mois",
    privilege:"Privilege — 240€/mois",
    elite:"Elite — 400€/mois",
    [PERF_PLUS]:"Performance+ — 850€/mois",
    [PRIVATE]:"Private Performance — 1 500€/mois"
  };
  const OFFER_BANNERS={
    [PERF_PLUS]:"Performance+ : pilotage nutritionnel sportif + dotation Maison Yanna personnalisée",
    [PRIVATE]:"Private Performance : accompagnement nutritionnel rapproché + concierge nutritionnel + dotation Maison Yanna personnalisée"
  };

  function perfLines(v){return String(v||"").split(/\n+/).map(x=>x.trim()).filter(Boolean);}
  function perfText(id){return document.getElementById(id)?.value?.trim()||"";}
  function perfSet(id,v){const e=document.getElementById(id);if(e)e.value=v||"";}
  function perfIsPro(p){return [PERF_PLUS,PRIVATE].includes((p||{}).offre);}
  function perfIsPrivate(p){return (p||{}).offre===PRIVATE;}
  function perfEsc(v){return typeof mtEsc==="function"?mtEsc(v):String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));}
  function perfCard(title,body,eyebrow="",icon=""){
    return `<div class="card mt-perf-card" style="padding:20px;margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px">
        <div>${eyebrow?`<p style="font-size:9px;text-transform:uppercase;letter-spacing:.14em;font-weight:800;color:var(--brand);margin:0 0 5px">${perfEsc(eyebrow)}</p>`:""}<h3 class="serif" style="font-size:20px;color:var(--ink);margin:0">${perfEsc(title)}</h3></div>
        ${icon?`<div style="font-size:22px">${icon}</div>`:""}
      </div>${body}</div>`;
  }
  function perfRows(items){
    const valid=(items||[]).filter(x=>x&&x.value);
    if(!valid.length)return `<p style="font-size:12px;color:var(--muted);margin:0">À personnaliser avec Tee.</p>`;
    return valid.map(x=>`<div style="padding:11px 0;border-top:1px solid #eee7df"><div style="font-size:9px;text-transform:uppercase;letter-spacing:.1em;font-weight:800;color:var(--muted);margin-bottom:4px">${perfEsc(x.label)}</div><div style="font-size:13px;line-height:1.65;color:var(--ink);white-space:pre-wrap">${perfEsc(x.value)}</div></div>`).join("");
  }

  /* ---------- modèle de données ---------- */
  const baseNormalize=window.mtNormalizeProgramme;
  window.mtNormalizeProgramme=function(prog){
    prog=baseNormalize?baseNormalize(prog):(prog||{});
    prog.athlete=prog.athlete||{};
    const a=prog.athlete;
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
    return prog;
  };

  /* ---------- offres ---------- */
  function injectOfferOptions(){
    const select=document.getElementById("f-offre"); if(!select)return;
    if(!select.querySelector(`option[value="${PERF_PLUS}"]`)){
      const o=document.createElement("option");o.value=PERF_PLUS;o.textContent=OFFER_LABELS[PERF_PLUS];select.appendChild(o);
    }
    if(!select.querySelector(`option[value="${PRIVATE}"]`)){
      const o=document.createElement("option");o.value=PRIVATE;o.textContent=OFFER_LABELS[PRIVATE];select.appendChild(o);
    }
  }

  /* ---------- admin ---------- */
  function field(id,label,placeholder="",type="textarea"){
    if(type==="select-antidoping")return `<div><label class="field-label">${label}</label><select id="${id}" class="admin-input"><option value="not_checked">À vérifier</option><option value="food_only">Alimentation uniquement / pas de supplément</option><option value="batch_tested">Lots testés indépendamment</option><option value="staff_validated">Validé avec staff médical</option><option value="mixed">Mixte — voir notes</option></select></div>`;
    if(type==="input")return `<div><label class="field-label">${label}</label><input id="${id}" class="admin-input" placeholder="${placeholder}" /></div>`;
    if(type==="date")return `<div><label class="field-label">${label}</label><input id="${id}" type="date" class="admin-input" /></div>`;
    return `<div><label class="field-label">${label}</label><textarea id="${id}" class="admin-textarea" placeholder="${placeholder}"></textarea></div>`;
  }
  function injectAdminPerformance(){
    if(!window.MT_ADMIN_PAGE||document.getElementById("mt-performance-admin"))return;
    injectOfferOptions();
    const profileTitle=[...document.querySelectorAll(".admin-section h3")].find(h=>h.textContent.trim()==="Profil client");
    const profileSection=profileTitle?.closest(".admin-section"); if(!profileSection)return;
    const block=document.createElement("div");block.className="admin-section";block.id="mt-performance-admin";
    block.innerHTML=`
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:14px">
        <div><h3 class="serif" style="font-size:21px;color:var(--ink);margin:0 0 4px">Performance Pro</h3><p style="font-size:11px;color:var(--muted);margin:0;line-height:1.5">Cockpit sportif réservé à Performance+ et Private Performance.</p></div>
        <span id="mt-perf-admin-offer" style="font-size:9px;font-weight:800;padding:5px 8px;border-radius:999px;background:#f0ece6;color:var(--brand)">SPORT PRO</span>
      </div>
      <div id="mt-performance-admin-body" style="display:flex;flex-direction:column;gap:14px">
        <details open style="border:1.5px solid #ede9e3;border-radius:14px;padding:12px 14px"><summary style="font-size:12px;font-weight:800;color:var(--ink);cursor:pointer">01 · Profil sportif & contexte</summary><div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px">${field("f-ath-sport","Sport","Football","input")}${field("f-ath-position","Poste / spécialité","Attaquant","input")}${field("f-ath-club","Club / structure","","input")}${field("f-ath-base","Ville de résidence sportive","Tripoli","input")}</div></details>
        <details open style="border:1.5px solid #ede9e3;border-radius:14px;padding:12px 14px"><summary style="font-size:12px;font-weight:800;color:var(--ink);cursor:pointer">02 · Performance Board — semaine</summary><div style="display:flex;flex-direction:column;gap:9px;margin-top:12px">${field("f-ath-focus","Priorité de la semaine","Ex : disponibilité + recharge glycogène")}${field("f-ath-load","Charge / contexte","Ex : 4 entraînements + 2 matchs")}${field("f-ath-sessions","Séances clés","Une ligne par séance importante")}${field("f-ath-matches","Matchs","Jour, heure, lieu, déplacement")}${field("f-ath-carbs","Périodisation glucidique","Repères selon jours légers / lourds / match")}${field("f-ath-protein","Repères protéines","Répartition, récupération, collation")}${field("f-ath-hydration","Hydratation & électrolytes","Objectifs, pesées pré/post si disponibles")}${field("f-ath-recovery","Priorité récupération","Sommeil, repas post-effort, fenêtre de récupération")}${field("f-ath-week-notes","Notes de la semaine","Changements de planning, fatigue, appétit…")}</div></details>
        <details style="border:1.5px solid #ede9e3;border-radius:14px;padding:12px 14px"><summary style="font-size:12px;font-weight:800;color:var(--ink);cursor:pointer">03 · Match — J-1 → J+1</summary><div style="display:flex;flex-direction:column;gap:9px;margin-top:12px">${field("f-ath-jm1","J-1","Recharge, fibres, hydratation, dîner")}${field("f-ath-prematch","Jour J / pré-match","Timing, repas, collation, hydratation")}${field("f-ath-intra","Pendant / mi-temps","Boissons, glucides si prévus avec le staff")}${field("f-ath-post","Post-match immédiat","Réhydratation, glucides, protéines")}${field("f-ath-jp1","J+1","Récupération, appétit, digestion, reprise")}</div></details>
        <details style="border:1.5px solid #ede9e3;border-radius:14px;padding:12px 14px"><summary style="font-size:12px;font-weight:800;color:var(--ink);cursor:pointer">04 · Voyage · hôtel · restaurant · cuisine culturelle</summary><div style="display:flex;flex-direction:column;gap:9px;margin-top:12px">${field("f-ath-hotel","Hôtel / buffet","Plan A / Plan B : aliments accessibles")}${field("f-ath-delivery","Livraison / meal prep","Prestataire, fréquence, conservation, réchauffage")}${field("f-ath-cultural","Plats culturels à préserver","Pondu, riz, plantain… + adaptations décidées")}${field("f-ath-restaurant","Restaurant","Règles de choix + commande type")}${field("f-ath-airport","Voyage / aéroport","À emporter, timing, arrivée tardive")}${field("f-ath-foodsafety","Sécurité alimentaire","Chaîne du froid, eau, aliments à risque, stockage")}</div></details>
        <details style="border:1.5px solid #ede9e3;border-radius:14px;padding:12px 14px"><summary style="font-size:12px;font-weight:800;color:var(--ink);cursor:pointer">05 · Micronutrition · biologie · composition corporelle</summary><div style="display:flex;flex-direction:column;gap:9px;margin-top:12px"><p style="font-size:11px;color:#9a6b2f;margin:0;line-height:1.55">Repères nutritionnels uniquement. Les analyses biologiques sont utilisées si elles sont disponibles et interprétées dans le cadre médical approprié ; aucun diagnostic n’est généré.</p>${field("f-ath-labs","Biologie disponible","Date + éléments transmis par le joueur / médecin")}${field("f-ath-micro","Priorités micronutritionnelles","Ex : fer, vitamine D, B12, magnésium — seulement si pertinent")}${field("f-ath-medical","Notes / validation médicale","Carence confirmée, traitement, consignes du médecin")}${field("f-ath-micro-date","Dernière revue micronutrition","","date")}${field("f-ath-weight-target","Repère poids","Objectif / plage, si pertinent","input")}${field("f-ath-body-goal","Composition corporelle","Maintien, prise de masse, recomposition…")}${field("f-ath-weighin","Protocole de mesure","Fréquence, conditions de pesée")}${field("f-ath-body-notes","Notes corps / disponibilité","Évolution sans obsession du chiffre")}</div></details>
        <details style="border:1.5px solid #ede9e3;border-radius:14px;padding:12px 14px"><summary style="font-size:12px;font-weight:800;color:var(--ink);cursor:pointer">06 · Suppléments & antidopage</summary><div style="display:flex;flex-direction:column;gap:9px;margin-top:12px">${field("f-ath-supp","Produits / suppléments actuels","Nom, marque, dose, fréquence")}${field("f-ath-anti","Statut antidopage","","select-antidoping")}${field("f-ath-validated","Validé avec","Médecin / club / pharmacien / nutrition","input")}${field("f-ath-supp-notes","Traçabilité / lots / notes","Lots testés, certificats, décision food-first…")}</div></details>
        <details style="border:1.5px solid #ede9e3;border-radius:14px;padding:12px 14px"><summary style="font-size:12px;font-weight:800;color:var(--ink);cursor:pointer">07 · Staff & coordination</summary><div style="display:flex;flex-direction:column;gap:9px;margin-top:12px">${field("f-ath-coach","Préparateur / coach","Nom / rôle si autorisé","input")}${field("f-ath-medical-contact","Staff médical","Médecin / référent si autorisé","input")}${field("f-ath-physio","Kinésithérapie / récupération","Référent si autorisé","input")}${field("f-ath-coordination","Notes de coordination","Charge communiquée, blessure, contraintes de club…")}</div></details>
        <details style="border:1.5px solid #ede9e3;border-radius:14px;padding:12px 14px"><summary style="font-size:12px;font-weight:800;color:var(--ink);cursor:pointer">08 · Maison Yanna — dotation ciblée</summary><div style="display:flex;flex-direction:column;gap:9px;margin-top:12px">${field("f-ath-my-selection","Sélection du mois","Produits alimentaires retenus pour ses besoins")}${field("f-ath-my-usage","Quand les utiliser","Petit-déjeuner, déplacement, récupération…")}${field("f-ath-my-stock","Stock / réassort","À envoyer / reçu / à renouveler")}${field("f-ath-my-notes","Prudence & notes","Ne pas utiliser un produit à risque antidopage sans sécurisation")}</div></details>
        <details id="mt-private-admin" style="border:1.5px solid rgba(139,101,56,.25);border-radius:14px;padding:12px 14px;background:#fffaf2"><summary style="font-size:12px;font-weight:800;color:#7b5732;cursor:pointer">09 · Private Concierge — 1 500€</summary><div style="display:flex;flex-direction:column;gap:9px;margin-top:12px"><p style="font-size:11px;color:#7b5732;line-height:1.55;margin:0">Pour Private Performance : tu pilotes aussi la logistique nutritionnelle à distance. La présence physique reste une mission séparée avec frais/devis.</p>${field("f-ath-provider","Chef / traiteur / relais local","Nom, coordonnées, contact club")}${field("f-ath-provider-status","Statut prestataire","À chercher / test / validé / suspendu","input")}${field("f-ath-mealprep","Meal prep","Repas, fiches, fréquence, retour joueur")}${field("f-ath-mealdelivery","Livraison & conservation","Jours, réception hôtel, froid, réchauffage")}${field("f-ath-travelprep","Préparation déplacements","Destination, hôtel, menus, stock, plan secours")}${field("f-ath-onsite","Présence physique ponctuelle","Paris / stage / étranger — sur devis")}${field("f-ath-priority-notes","Actions prioritaires Private","Ce que Tee doit résoudre / anticiper cette semaine")}</div></details>
        <details style="border:1.5px solid #ede9e3;border-radius:14px;padding:12px 14px"><summary style="font-size:12px;font-weight:800;color:var(--ink);cursor:pointer">10 · Review hebdomadaire</summary><div style="display:flex;flex-direction:column;gap:9px;margin-top:12px">${field("f-ath-wins","Ce qui a marché","Énergie, digestion, organisation, repas…")}${field("f-ath-issues","Points à corriger","Faim, fatigue, récupération, logistique…")}${field("f-ath-next","Décisions semaine suivante","Ce que l’on change concrètement")}</div></details>
      </div>`;
    profileSection.parentNode.insertBefore(block,profileSection.nextSibling);
    const offer=document.getElementById("f-offre"); if(offer)offer.addEventListener("change",()=>toggleAdminPerf(offer.value));
    const parcours=document.getElementById("f-parcours");if(parcours)parcours.addEventListener("change",()=>toggleAdminPerf(offer?.value||""));
    toggleAdminPerf(offer?.value||"");
  }

  function toggleAdminPerf(offer){
    const block=document.getElementById("mt-performance-admin");if(!block)return;
    const parcours=document.getElementById("f-parcours")?.value;
    const show=parcours==="performance"&&[PERF_PLUS,PRIVATE].includes(offer);
    block.style.display=show?"block":"none";
    const pr=document.getElementById("mt-private-admin");if(pr)pr.style.display=offer===PRIVATE?"block":"none";
    const badge=document.getElementById("mt-perf-admin-offer");if(badge)badge.textContent=offer===PRIVATE?"PRIVATE":offer===PERF_PLUS?"PERFORMANCE+":"SPORT PRO";
  }

  function fillPerformanceAdmin(prog){
    if(!window.MT_ADMIN_PAGE)return;prog=window.mtNormalizeProgramme(prog);injectOfferOptions();
    const a=prog.athlete;
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
    Object.entries(map).forEach(([id,v])=>perfSet(id,v));
    toggleAdminPerf(prog.offre||"");
  }

  function collectPerformanceAdmin(prog){
    if(!window.MT_ADMIN_PAGE||!document.getElementById("mt-performance-admin"))return prog;
    prog=window.mtNormalizeProgramme(prog);const a=prog.athlete;
    a.identity={sport:perfText("f-ath-sport")||"Football",position:perfText("f-ath-position"),club:perfText("f-ath-club"),base_city:perfText("f-ath-base"),country:a.identity.country||""};
    a.weekly={focus:perfText("f-ath-focus"),training_load:perfText("f-ath-load"),sessions:perfText("f-ath-sessions"),matches:perfText("f-ath-matches"),carbs:perfText("f-ath-carbs"),protein:perfText("f-ath-protein"),hydration:perfText("f-ath-hydration"),recovery:perfText("f-ath-recovery"),notes:perfText("f-ath-week-notes")};
    a.matchday={jminus1:perfText("f-ath-jm1"),prematch:perfText("f-ath-prematch"),intra:perfText("f-ath-intra"),postmatch:perfText("f-ath-post"),jplus1:perfText("f-ath-jp1")};
    a.travel={hotel:perfText("f-ath-hotel"),delivery:perfText("f-ath-delivery"),cultural_foods:perfText("f-ath-cultural"),restaurant:perfText("f-ath-restaurant"),airport:perfText("f-ath-airport"),food_safety:perfText("f-ath-foodsafety")};
    a.micronutrition={labs:perfText("f-ath-labs"),priorities:perfText("f-ath-micro"),medical_notes:perfText("f-ath-medical"),last_review:perfText("f-ath-micro-date")};
    a.body={weight_target:perfText("f-ath-weight-target"),composition_goal:perfText("f-ath-body-goal"),weighin:perfText("f-ath-weighin"),notes:perfText("f-ath-body-notes")};
    a.supplements={current:perfText("f-ath-supp"),antidoping:perfText("f-ath-anti")||"not_checked",validated_by:perfText("f-ath-validated"),notes:perfText("f-ath-supp-notes")};
    a.staff={coach:perfText("f-ath-coach"),medical:perfText("f-ath-medical-contact"),physio:perfText("f-ath-physio"),coordination:perfText("f-ath-coordination")};
    a.maison_yanna={monthly_selection:perfText("f-ath-my-selection"),usage:perfText("f-ath-my-usage"),stock:perfText("f-ath-my-stock"),notes:perfText("f-ath-my-notes")};
    a.private={provider:perfText("f-ath-provider"),provider_status:perfText("f-ath-provider-status"),meal_prep:perfText("f-ath-mealprep"),meal_delivery:perfText("f-ath-mealdelivery"),travel_prep:perfText("f-ath-travelprep"),onsite:perfText("f-ath-onsite"),priority_notes:perfText("f-ath-priority-notes")};
    a.review={wins:perfText("f-ath-wins"),issues:perfText("f-ath-issues"),next:perfText("f-ath-next")};
    return prog;
  }

  /* ---------- client UI ---------- */
  function injectClientPerformance(){
    if(window.MT_ADMIN_PAGE||document.getElementById("tab-performance"))return;
    const main=document.querySelector(".main-scroll");if(!main)return;
    const sec=document.createElement("section");sec.id="tab-performance";sec.className="tab-section";sec.style.paddingTop="24px";
    sec.innerHTML=`<div id="mt-performance-client"></div>`;
    const msg=document.getElementById("tab-messages");main.insertBefore(sec,msg||null);
    const switcher=document.querySelector("#tab-repas .section-switcher");
    if(switcher&&!document.getElementById("mt-performance-switch")){
      const b=document.createElement("button");b.id="mt-performance-switch";b.textContent="Performance";b.onclick=()=>switchTab("performance");b.style.display="none";switcher.appendChild(b);
    }
    const homeTerrain=document.getElementById("terrain-card")?.closest(".card");
    if(homeTerrain&&!document.getElementById("mt-performance-home")){
      const c=document.createElement("div");c.id="mt-performance-home";c.className="card";c.style.cssText="display:none;padding:20px;margin-top:18px;background:linear-gradient(145deg,#13281d,#244334);color:white;overflow:hidden;position:relative";
      c.innerHTML=`<div style="position:absolute;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.05);right:-45px;top:-55px"></div><p style="font-size:9px;text-transform:uppercase;letter-spacing:.15em;font-weight:800;opacity:.65;margin:0 0 7px">Cockpit sportif</p><h3 class="serif" style="font-size:21px;margin:0 0 7px">Ta semaine Performance</h3><p id="mt-performance-home-text" style="font-size:12px;line-height:1.65;opacity:.86;margin:0 0 13px"></p><button type="button" onclick="switchTab('performance')" style="border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.1);color:white;border-radius:999px;padding:9px 14px;font:inherit;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;cursor:pointer">Ouvrir mon cockpit</button>`;
      homeTerrain.parentNode.insertBefore(c,homeTerrain.nextSibling);
    }
  }

  function renderPerformanceClient(prog){
    prog=window.mtNormalizeProgramme(prog);const pro=perfIsPro(prog),privateMode=perfIsPrivate(prog);
    const switchBtn=document.getElementById("mt-performance-switch");if(switchBtn)switchBtn.style.display=pro?"":"none";
    const home=document.getElementById("mt-performance-home");if(home)home.style.display=pro?"block":"none";
    if(!pro)return;
    const a=prog.athlete||{};const homeTxt=document.getElementById("mt-performance-home-text");if(homeTxt)homeTxt.textContent=a.weekly?.focus||"Entraînements, matchs, récupération, hydratation et déplacements pilotés semaine après semaine.";
    const box=document.getElementById("mt-performance-client");if(!box)return;
    const anti={not_checked:"À vérifier",food_only:"Food-first",batch_tested:"Lots testés",staff_validated:"Validé staff",mixed:"Mixte"}[a.supplements?.antidoping]||"À vérifier";
    box.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:18px"><div><p style="font-size:10px;text-transform:uppercase;letter-spacing:.14em;font-weight:800;color:var(--brand);margin:0 0 5px">${privateMode?"Private Performance":"Performance+"}</p><h2 class="serif" style="font-size:30px;color:var(--ink);margin:0 0 4px">Cockpit Performance</h2><p style="font-size:12px;color:var(--muted);line-height:1.6;margin:0">Ta nutrition suit ton calendrier réel — pas un menu figé.</p></div><span style="font-size:22px">⚽</span></div>
      ${perfCard("Performance Board",perfRows([{label:"Priorité",value:a.weekly.focus},{label:"Charge / contexte",value:a.weekly.training_load},{label:"Séances clés",value:a.weekly.sessions},{label:"Matchs",value:a.weekly.matches},{label:"Glucides",value:a.weekly.carbs},{label:"Protéines",value:a.weekly.protein},{label:"Hydratation",value:a.weekly.hydration},{label:"Récupération",value:a.weekly.recovery},{label:"Ajustements",value:a.weekly.notes}]),"Cette semaine","📈")}
      ${perfCard("Stratégie match",perfRows([{label:"J-1",value:a.matchday.jminus1},{label:"Pré-match",value:a.matchday.prematch},{label:"Pendant / mi-temps",value:a.matchday.intra},{label:"Post-match",value:a.matchday.postmatch},{label:"J+1",value:a.matchday.jplus1}]),"J-1 → J+1","🏟️")}
      ${perfCard("Voyages & vraie vie",perfRows([{label:"Hôtel / buffet",value:a.travel.hotel},{label:"Livraison / meal prep",value:a.travel.delivery},{label:"Cuisine de chez toi",value:a.travel.cultural_foods},{label:"Restaurant",value:a.travel.restaurant},{label:"Aéroport / voyage",value:a.travel.airport},{label:"Sécurité alimentaire",value:a.travel.food_safety}]),"Tripoli · hôtel · déplacements","✈️")}
      ${perfCard("Micronutrition & corps",perfRows([{label:"Biologie disponible",value:a.micronutrition.labs},{label:"Priorités",value:a.micronutrition.priorities},{label:"Validation médicale",value:a.micronutrition.medical_notes},{label:"Objectif corporel",value:a.body.composition_goal},{label:"Repère poids",value:a.body.weight_target},{label:"Protocole de mesure",value:a.body.weighin}]),"Suivi ciblé","🧬")}
      ${perfCard("Suppléments & antidopage",`<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:12px;background:#f8f4ee;margin-bottom:8px"><span style="font-size:11px;color:var(--muted)">Statut</span><strong style="font-size:11px;color:var(--brand)">${perfEsc(anti)}</strong></div>${perfRows([{label:"Produits actuels",value:a.supplements.current},{label:"Validé avec",value:a.supplements.validated_by},{label:"Traçabilité / notes",value:a.supplements.notes}])}`,"Food-first & sécurité","🛡️")}
      ${perfCard("Maison Yanna",perfRows([{label:"Dotation du mois",value:a.maison_yanna.monthly_selection},{label:"Utilisation",value:a.maison_yanna.usage},{label:"Stock / réassort",value:a.maison_yanna.stock},{label:"Notes",value:a.maison_yanna.notes}]),"Sélection personnalisée","✦")}
      ${privateMode?perfCard("Private Concierge",perfRows([{label:"Chef / traiteur / relais",value:a.private.provider},{label:"Statut",value:a.private.provider_status},{label:"Meal prep",value:a.private.meal_prep},{label:"Livraison & conservation",value:a.private.meal_delivery},{label:"Prochain déplacement",value:a.private.travel_prep},{label:"Présence physique",value:a.private.onsite},{label:"Actions prioritaires",value:a.private.priority_notes}]),"Nutrition personnelle","👑"):""}
      ${perfCard("Review de la semaine",perfRows([{label:"Ce qui a marché",value:a.review.wins},{label:"À corriger",value:a.review.issues},{label:"Décisions suivantes",value:a.review.next}]),"Ajuster · apprendre · progresser","✓")}
      <div style="padding:14px 16px;border-radius:14px;background:#fff8e8;border:1px solid #f1dfb5;font-size:11px;line-height:1.6;color:#72572f;margin-bottom:20px"><strong>Repère :</strong> la rubrique micronutrition/biologie ne pose aucun diagnostic. Les situations médicales, blessures, traitements et anomalies biologiques restent coordonnées avec le professionnel de santé compétent.</div>`;
    try{lucide.createIcons();}catch(e){}
  }

  /* ---------- check-in sportif enrichi ---------- */
  function enhancePerformanceCheckin(prog){
    if(!perfIsPro(prog)||prog.parcours!=="performance")return;
    const wrap=document.getElementById("profile-checkin");if(!wrap||document.getElementById("suivi-fatigue"))return;
    const slider=(id,label)=>`<div style="margin-top:14px"><label style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;display:block;margin-bottom:8px">${label} <span id="val-${id}" style="color:var(--brand)">3/5</span></label><input type="range" id="suivi-${id}" min="1" max="5" value="3" oninput="document.getElementById('val-${id}').textContent=this.value+'/5';saveSuivi()" style="width:100%;accent-color:var(--brand)"></div>`;
    wrap.insertAdjacentHTML("beforeend",slider("fatigue","Fatigue générale")+slider("appetit","Appétit")+slider("charge","Charge ressentie")+`<div style="margin-top:14px"><label style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;display:block;margin-bottom:8px">Hydratation estimée</label><input id="suivi-hydratation-litres" type="number" min="0" max="10" step="0.1" placeholder="L / jour" oninput="saveSuivi()" style="width:100%;border:1.5px solid #e8e4de;border-radius:14px;padding:10px 12px;font:inherit;font-size:13px"></div>`);
  }

  // Remplace saveSuivi afin que les indicateurs sportifs soient enregistrés dans la même entrée Supabase
  // sans être écrasés ensuite par l’ancien debounce.
  window.saveSuivi=function(){
    const slug=currentSlug||"admin",today=mtLocalDateKey(),key="mt_suivi_"+slug+"_"+today;
    const get=(id)=>document.getElementById(id);
    const data={
      eau:!!get("check-eau")?.checked,repas:!!get("check-repas")?.checked,infusion:!!get("check-infusion")?.checked,sport:!!get("check-sport")?.checked,
      poids:get("suivi-poids")?.value||"",energie:get("suivi-energie")?.value||"",sommeil:get("suivi-sommeil")?.value||"",digestion:get("suivi-digestion")?.value||"",
      note:get("suivi-note")?.value||"",filled:true,date:today
    };
    ["recuperation","courbatures","disponibilite","stress","faim","confort","fatigue","appetit","charge"].forEach(id=>{const e=get("suivi-"+id);if(e)data[id]=e.value;});
    const hyd=get("suivi-hydratation-litres");if(hyd)data.hydratation_litres=hyd.value;
    try{localStorage.setItem(key,JSON.stringify(data));}catch(e){}
    try{updateScore(slug);}catch(e){}
    if(sb&&slug&&slug!=="admin"){
      clearTimeout(window.saveSuivi._timer);
      window.saveSuivi._timer=setTimeout(async()=>{
        try{const res=await sb.from(SB_TABLE).select("programme").eq("slug",slug).single();if(res.error||!res.data)return;const p=Object.assign({},res.data.programme||{});p.suivi=p.suivi||{};p.suivi[today]=data;await sb.from(SB_TABLE).update({programme:p}).eq("slug",slug);if(typeof _currentProg!=="undefined"&&_currentProg)_currentProg.suivi=p.suivi;}catch(e){console.warn("[MT Performance] suivi",e);}
      },700);
    }
  };

  const oldInitSuivi=window.initSuivi;
  if(oldInitSuivi)window.initSuivi=function(){oldInitSuivi();const p=(typeof _currentProg!=="undefined"&&_currentProg)?_currentProg:{};enhancePerformanceCheckin(p);try{const slug=currentSlug||"admin",s=JSON.parse(localStorage.getItem("mt_suivi_"+slug+"_"+mtLocalDateKey())||"{}");["fatigue","appetit","charge"].forEach(id=>{const e=document.getElementById("suivi-"+id);if(e&&s[id]){e.value=s[id];const v=document.getElementById("val-"+id);if(v)v.textContent=s[id]+"/5";}});const h=document.getElementById("suivi-hydratation-litres");if(h&&s.hydratation_litres)h.value=s.hydratation_litres;}catch(e){}};

  /* ---------- wrappers ---------- */
  const oldFillAdmin=window.fillAdmin;
  if(oldFillAdmin)window.fillAdmin=function(prenom,prog){injectOfferOptions();oldFillAdmin(prenom,prog);fillPerformanceAdmin(prog);};

  const oldSaveClient=window.saveClient;
  if(oldSaveClient)window.saveClient=async function(){programme=collectPerformanceAdmin(programme);return oldSaveClient();};

  const oldRenderClient=window.renderClientView;
  if(oldRenderClient)window.renderClientView=function(prenom,prog){prog=window.mtNormalizeProgramme(prog);oldRenderClient(prenom,prog);renderPerformanceClient(prog);enhancePerformanceCheckin(prog);const banner=document.getElementById("my-banner"),txt=document.getElementById("my-banner-text");if(banner&&txt&&OFFER_BANNERS[prog.offre]){txt.textContent=OFFER_BANNERS[prog.offre];banner.style.display="block";}};

  const oldSwitchTab=window.switchTab;
  if(oldSwitchTab)window.switchTab=function(name,btn){oldSwitchTab(name,btn);if(name==="performance"){document.querySelector('.simplified-nav [data-hub="plan"]')?.classList.add("active");}};

  /* ---------- init ---------- */
  function init(){
    injectOfferOptions();
    if(window.MT_ADMIN_PAGE)injectAdminPerformance();else injectClientPerformance();
    // Un client peut déjà être chargé au moment de l'injection.
    if(typeof _currentProg!=="undefined"&&_currentProg&&!window.MT_ADMIN_PAGE){try{renderPerformanceClient(_currentProg);enhancePerformanceCheckin(_currentProg);}catch(e){console.warn(e);}}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
