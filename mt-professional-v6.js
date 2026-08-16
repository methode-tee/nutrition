/* Méthode Tee — Patch Professionnel V6
   - menus par semaine + choix progressifs 1/2/3/5
   - bilan initial 65 questions
   - semaine automatique depuis date de début
   - profil/cycle conditionnels
   - bilan terrain prudent + validation Tee
   - statuts produits
   - synchronisation Supabase des interactions client
   - dates locales
   - PDF corrigé
   - échappement des contenus dynamiques
   - tableau d'alertes + clôture de semaine
*/

/* ---------- utilitaires sûrs ---------- */
function mtEsc(v){return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));}
function mtAttr(v){return mtEsc(v).replace(/`/g,"&#96;");}
function mtSafeUrl(v){try{const u=new URL(String(v||""),location.href);return /^https?:$/.test(u.protocol)?u.href:"";}catch(e){return "";}}
function mtLocalDateKey(d=new Date()){
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function mtParseLocalDate(s){
  if(!s)return null; const m=String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/); if(!m)return new Date(s);
  return new Date(+m[1],+m[2]-1,+m[3],12,0,0,0);
}
function mtDaysDiff(a,b){
  const A=new Date(a.getFullYear(),a.getMonth(),a.getDate(),12),B=new Date(b.getFullYear(),b.getMonth(),b.getDate(),12);
  return Math.floor((A-B)/86400000);
}
function mtDeepClone(o){try{return structuredClone(o);}catch(e){return JSON.parse(JSON.stringify(o||{}));}}
function mtLinesFromMeal(v){
  const txt=typeof htmlToText==="function"?htmlToText(v||""):String(v||"").replace(/<br\s*\/?>/gi,"\n").replace(/<[^>]*>/g,"");
  return txt.split(/\n+/).map(x=>x.trim()).filter(Boolean);
}
function mtWeekRequired(week,count=5){return week<=1?Math.min(1,count):week===2?Math.min(2,count):week===3?Math.min(3,count):count;}

const MT_WEEKDAY_ORDER={lundi:0,mardi:1,mercredi:2,jeudi:3,vendredi:4,samedi:5,dimanche:6};
function mtNormalizeDayName(v){
  return String(v||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
}
function mtWeekdayRank(v){
  const n=mtNormalizeDayName(v);
  for(const [day,rank] of Object.entries(MT_WEEKDAY_ORDER)){
    if(n===day || n.startsWith(day+" ") || n.includes(day)) return rank;
  }
  return 99;
}
function mtSortDayKeys(days){
  return Object.keys(days||{}).map((key,index)=>({key,index,rank:mtWeekdayRank(key)}))
    .sort((a,b)=>a.rank-b.rank || (a.rank===99 ? a.index-b.index : 0))
    .map(x=>x.key);
}

/* remplace les utilitaires de conversion HTML pour ne plus stocker du HTML actif */
textToHtml=function(t){return mtEsc(String(t||"").trim()).replace(/\n/g,"<br>");};
htmlToText=function(h){
  const box=document.createElement("textarea");
  box.innerHTML=String(h||"").replace(/<br\s*\/?>/gi,"\n").replace(/<[^>]+>/g,"");
  return box.value;
};

/* ---------- modèle de données V6 ---------- */
let mtAdminWeek=1;
let mtClientViewWeek=1;

function mtNormalizeProgramme(prog){
  prog=prog&&typeof prog==="object"?prog:{};
  prog.timeline=prog.timeline||{};
  prog.timeline.nbSemaines=parseInt(prog.timeline.nbSemaines)||4;
  prog.profile=prog.profile||{sexe:"",cycleMode:"inconnu"};
  if(!prog.profile.cycleMode)prog.profile.cycleMode="inconnu";
  prog.safety=prog.safety||{phytoValidated:false};
  prog.intake=prog.intake||{};
  prog.weeks=prog.weeks||{};
  prog.meal_selections=prog.meal_selections||{};
  prog.task_state=prog.task_state||{};
  prog.suivi=prog.suivi||{};
  prog.week_reviews=prog.week_reviews||{};
  // migration rétro-compatible : les anciens "days" deviennent S1, sans perte
  if(Object.keys(prog.days||{}).length && !Object.keys((prog.weeks["1"]&&prog.weeks["1"].days)||{}).length){
    prog.weeks["1"]={days:mtDeepClone(prog.days)};
  }
  for(let s=1;s<=prog.timeline.nbSemaines;s++){
    if(!prog.weeks[String(s)])prog.weeks[String(s)]={days:{}};
    if(!prog.weeks[String(s)].days)prog.weeks[String(s)].days={};
  }
  // legacy : garde S1 dans days pour compatibilité avec d'anciennes versions
  prog.days=mtDeepClone((prog.weeks["1"]&&prog.weeks["1"].days)||prog.days||{});
  prog.products=(prog.products||[]).map(p=>Object.assign({status:"recommended",visible:true,featured:false},p,{visible:p.visible!==false}));
  return prog;
}

function getSemaineEnCours(dateDebut,nbSemaines){
  if(!dateDebut)return 1;
  const start=mtParseLocalDate(dateDebut); if(!start||Number.isNaN(start.getTime()))return 1;
  let s=Math.floor(mtDaysDiff(new Date(),start)/7)+1;
  if(s<1)s=1; if(nbSemaines&&s>nbSemaines)s=nbSemaines;
  return s;
}
function mtCurrentWeek(prog){prog=mtNormalizeProgramme(prog);return getSemaineEnCours(prog.timeline.dateDebut,prog.timeline.nbSemaines||4);}
function mtWeekDays(prog,week){prog=mtNormalizeProgramme(prog);return (prog.weeks[String(week)]&&prog.weeks[String(week)].days)||{};}
function mtBestDayKey(days){
  const keys=mtSortDayKeys(days); if(!keys.length)return null;
  const weekday=mtNormalizeDayName(new Intl.DateTimeFormat("fr-FR",{weekday:"long"}).format(new Date()));
  const found=keys.find(k=>{const n=mtNormalizeDayName(k);return n===weekday||n.startsWith(weekday+" ")||n.includes(weekday);});
  return found||keys[0];
}
function mtSyncLegacyDays(prog){prog.days=mtDeepClone(mtWeekDays(prog,1));return prog;}

/* ---------- 65 questions du bilan initial ---------- */
const MT_INTAKE_SECTIONS = [
  {title:"1. Son objectif",items:[
    "Qu’est-ce qui t’a donné envie de commencer maintenant ?",
    "Quand tu dis que tu veux réapprendre à manger, qu’aimerais-tu changer exactement ?",
    "Ton objectif principal est-il de mieux manger, perdre du poids, prendre du poids, réduire certains symptômes ou retrouver de l’énergie ?",
    "As-tu un objectif de poids précis ou recherches-tu surtout un changement dans ta silhouette et ton bien-être ?",
    "Dans un mois, qu’aimerais-tu avoir amélioré en priorité ?"
  ]},
  {title:"2. Ses informations de base",items:[
    "Quel âge as-tu ?","Quelle est ta taille ?","Quel est ton poids actuel ?","Ton poids a-t-il beaucoup évolué récemment ?","Quel était ton poids habituel ou le poids auquel tu te sentais bien ?","Quelle est ta profession et à quoi ressemble une journée normale pour toi ?"
  ]},
  {title:"3. Sa santé",items:[
    "As-tu des maladies ou des problèmes de santé diagnostiqués ?","Suis-tu actuellement un traitement médical ?","Prends-tu des médicaments, des compléments alimentaires ou des plantes ?","As-tu des allergies ou des intolérances ?","As-tu récemment réalisé une prise de sang ou d’autres analyses ?","As-tu déjà eu un rapport compliqué à l’alimentation, des restrictions importantes, des crises alimentaires ou un trouble du comportement alimentaire ?","Es-tu enceinte, allaitante ou dans un projet de grossesse ?"
  ]},
  {title:"4. Son alimentation actuelle",items:[
    "Raconte-moi précisément ce que tu manges pendant une journée habituelle, du réveil jusqu’au coucher.","À quelle heure prends-tu ton premier et ton dernier repas ?","Combien de repas prends-tu par jour ?","Prends-tu un petit-déjeuner ?","Est-ce que tu grignotes ? À quels moments et pour quelles raisons ?","As-tu particulièrement envie de sucre, de salé ou de produits gras ?","Quels aliments manges-tu le plus souvent ?","Quels sont les aliments que tu aimes vraiment ?","Quels aliments refuses-tu ou ne supportes-tu pas ?","Qui cuisine à la maison ?","Manges-tu souvent à l’extérieur ou commandes-tu régulièrement ?","Combien de temps peux-tu consacrer à la préparation de tes repas ?","As-tu un budget alimentaire particulier à respecter ?"
  ]},
  {title:"5. Sa faim et son comportement alimentaire",items:[
    "Reconnais-tu facilement la sensation de faim ?","Arrives-tu à sentir quand tu n’as plus faim ?","Manges-tu parfois par stress, ennui, fatigue ou émotion ?","As-tu parfois l’impression de perdre le contrôle face à certains aliments ?","Te sens-tu coupable après avoir mangé ?","As-tu déjà suivi des régimes ? Qu’est-ce qui a fonctionné ou échoué ?"
  ]},
  {title:"6. Sa digestion",items:[
    "Comment se passe ta digestion en général ?","As-tu des ballonnements, des gaz, des lourdeurs, des douleurs, des reflux ou des nausées ?","Ton transit est-il régulier ?","À quelle fréquence vas-tu à la selle ?","As-tu identifié des aliments qui provoquent des inconforts ?"
  ]},
  {title:"7. Son hygiène de vie",items:[
    "À quelle heure te couches-tu et te réveilles-tu ?","Combien d’heures dors-tu ?","Ton sommeil est-il réparateur ?","Comment évalues-tu ton énergie sur 10 ?","Comment évalues-tu ton stress sur 10 ?","Combien d’eau bois-tu quotidiennement ?","Combien de cafés, thés, sodas ou boissons sucrées consommes-tu ?","Consommes-tu de l’alcool ou du tabac ? À quelle fréquence ?"
  ]},
  {title:"8. Son profil féminin",items:[
    "As-tu encore tes règles ?","Ton cycle est-il régulier ?","As-tu des règles douloureuses, abondantes ou des symptômes importants avant les règles ?","Prends-tu une contraception ou un traitement hormonal ?","Es-tu concernée par la ménopause, la préménopause, l’endométriose, le SOPK, des fibromes ou un autre trouble hormonal ?"
  ]},
  {title:"9. Son activité physique",items:[
    "Pratiques-tu une activité physique ?","Laquelle et combien de fois par semaine ?","Ton travail implique-t-il beaucoup de mouvements ou es-tu plutôt assise ?","As-tu des douleurs, blessures ou limitations physiques ?","Quelle activité serais-tu réellement prête à maintenir pendant le suivi ?"
  ]},
  {title:"10. Le format du suivi",items:[
    "Préfères-tu recevoir un cadre précis avec des repas structurés ou avancer progressivement avec des repères et plusieurs possibilités ?","Y a-t-il des jours où ton organisation est particulièrement compliquée ?","Quelles habitudes te semblent les plus faciles à changer ?","Qu’est-ce qui pourrait t’empêcher de suivre l’accompagnement ?","Es-tu à l’aise avec l’utilisation de plantes ou d’infusions si elles sont adaptées à ton profil et compatibles avec ta santé ?"
  ]}
];
const MT_INTAKE_QUESTIONS=[];
MT_INTAKE_SECTIONS.forEach(sec=>sec.items.forEach(q=>MT_INTAKE_QUESTIONS.push({section:sec.title,q,id:"q"+(MT_INTAKE_QUESTIONS.length+1)})));

function mtInjectAdminV6(){
  if(!window.MT_ADMIN_PAGE)return;
  // masque le champ semaine manuel : la timeline devient l'unique source de vérité
  const semaine=document.getElementById("f-semaine");
  if(semaine){const wrap=semaine.closest("div");if(wrap)wrap.style.display="none";}
  const parcours=document.getElementById("f-parcours");
  if(parcours && !document.getElementById("f-sexe")){
    const holder=parcours.closest("div");
    holder.insertAdjacentHTML("afterend",`<div><label class="field-label">Profil / affichage</label><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><select id="f-sexe" class="admin-input"><option value="">Sexe / identité — non renseigné</option><option value="femme">Féminin</option><option value="homme">Masculin</option><option value="autre">Autre / ne souhaite pas préciser</option></select><select id="f-cycle-mode" class="admin-input"><option value="inconnu">Cycle — à préciser</option><option value="actif">Cycle actif</option><option value="menopause">Ménopause / post-ménopause</option><option value="non_concerne">Non concerné</option></select></div></div><div><label style="display:flex;align-items:flex-start;gap:9px;font-size:12px;color:var(--ink);cursor:pointer"><input id="f-phyto-validated" type="checkbox" style="margin-top:2px;accent-color:var(--brand)"><span><strong>Sécurité phyto vérifiée par Tee</strong><br><span style="color:var(--muted)">Médicaments, traitements hormonaux, grossesse/allaitement, tension, allergies et contre-indications vérifiés.</span></span></label></div>`);
  }
  // sélecteur de semaine dans Repas
  const daysNav=document.getElementById("admin-days-nav");
  if(daysNav && !document.getElementById("admin-week-nav")){
    daysNav.insertAdjacentHTML("beforebegin",`<div style="margin-bottom:12px"><label class="field-label">Semaine du menu</label><div id="admin-week-nav" style="display:flex;gap:7px;flex-wrap:wrap"></div><p style="font-size:11px;color:var(--muted);margin:6px 0 0">Chaque semaine conserve son propre menu. S1 n’est plus écrasée quand tu prépares S2.</p></div>`);
  }
  // précise le format des propositions
  ["f-morning","f-lunch","f-snack","f-dinner"].forEach(id=>{const el=document.getElementById(id);if(el && !el.dataset.v6){el.dataset.v6="1";el.placeholder="1 proposition par ligne — idéalement 5 lignes";}});

  // statut produits
  const productsTitle=[...document.querySelectorAll("h3")].find(x=>x.textContent.includes("Soins / Produits"));
  if(productsTitle && !document.getElementById("product-status-help")) productsTitle.parentElement.insertAdjacentHTML("afterend",`<p id="product-status-help" style="font-size:11px;color:var(--muted);margin:-6px 0 14px">Statut conseillé : déjà en possession / recommandé par Tee / à découvrir. Tu peux aussi masquer un produit sans le supprimer.</p>`);

  // bilan initial avant les notes privées
  const notes=document.getElementById("f-notes-priv");
  if(notes && !document.getElementById("mt-intake-admin")){
    const notesSection=notes.closest(".admin-section");
    const intake=document.createElement("div"); intake.className="admin-section"; intake.id="mt-intake-admin";
    intake.innerHTML=`<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:12px"><div><h3 class="serif" style="font-size:20px;color:var(--ink);margin:0 0 4px">Bilan initial — 65 questions</h3><p style="font-size:11px;color:var(--muted);margin:0">Questionnaire intégré au dossier client. Les réponses restent dans le programme privé.</p></div><span style="font-size:10px;font-weight:800;color:var(--brand);background:rgba(83,100,74,.08);padding:5px 9px;border-radius:999px">65</span></div><div id="mt-intake-fields"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px"><button class="btn btn-ghost" type="button" onclick="mtBuildIntakeNotes(false)">Préremplir notes privées</button><button class="btn btn-ghost" type="button" onclick="mtCopyIntakeSummary()">Copier synthèse</button></div>`;
    notesSection.parentNode.insertBefore(intake,notesSection);
    mtRenderIntakeFields({});
  }

  // tableau d'alertes
  const globalFollow=document.getElementById("suivi-global-list")?.closest(".admin-section");
  if(globalFollow && !document.getElementById("mt-admin-alerts")){
    const block=document.createElement("div");block.className="admin-section";block.id="mt-admin-alerts";
    block.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><h3 class="serif" style="font-size:20px;color:var(--ink);margin:0">À regarder aujourd’hui</h3><span id="mt-admin-alert-count" style="font-size:10px;font-weight:800;padding:4px 9px;border-radius:999px;background:#f0ece6;color:var(--muted)">0</span></div><div id="mt-admin-alert-list"><p style="font-size:12px;color:var(--muted)">Charge les clients pour afficher les alertes.</p></div>`;
    globalFollow.parentNode.insertBefore(block,globalFollow.nextSibling);
  }

  // clôture de semaine
  const timelineWeeks=document.getElementById("timeline-admin-weeks");
  if(timelineWeeks && !document.getElementById("mt-week-review")){
    timelineWeeks.insertAdjacentHTML("afterend",`<div id="mt-week-review" style="margin-top:14px;padding:14px;border:1.5px solid #e8e4de;border-radius:16px;background:#fdfbf7"><p style="font-size:10px;text-transform:uppercase;letter-spacing:.1em;font-weight:800;color:var(--brand);margin:0 0 6px">Fin de semaine</p><p id="mt-week-review-label" style="font-size:12px;color:var(--muted);margin:0 0 10px">Sélectionne un client.</p><button class="btn btn-brand" type="button" onclick="mtPrepareNextWeek()" style="width:100%">Valider la semaine → préparer la suivante</button></div>`);
  }

  // renomme Terrain AI dans l'admin visuel s'il est présent
  document.querySelectorAll("h2,h3,p,button,span").forEach(el=>{
    if(el.childElementCount===0 && el.textContent.trim()==="Terrain AI")el.textContent="Bilan Terrain";
    if(el.childElementCount===0 && el.textContent.trim()==="Générer mon profil")el.textContent="Générer mon bilan";
  });
}

function mtRenderIntakeFields(values){
  const box=document.getElementById("mt-intake-fields"); if(!box)return;
  let idx=0;
  box.innerHTML=MT_INTAKE_SECTIONS.map(sec=>{
    const inner=sec.items.map(q=>{idx++;const id="q"+idx;return `<div style="margin-bottom:10px"><label class="field-label" style="text-transform:none;letter-spacing:0;line-height:1.45">${idx}. ${mtEsc(q)}</label><textarea class="admin-textarea mt-intake-answer" data-q="${id}" style="min-height:70px" placeholder="Réponse…">${mtEsc(values[id]||"")}</textarea></div>`;}).join("");
    return `<details style="border:1.5px solid #ede9e3;border-radius:14px;padding:12px 14px;margin-bottom:9px"><summary style="font-size:12px;font-weight:800;color:var(--ink);cursor:pointer">${mtEsc(sec.title)}</summary><div style="margin-top:12px">${inner}</div></details>`;
  }).join("");
}
function mtCollectIntake(){const out={};document.querySelectorAll(".mt-intake-answer").forEach(x=>out[x.dataset.q]=x.value.trim());return out;}
function mtIntakeSummaryText(){
  const vals=mtCollectIntake(); let out="BILAN INITIAL\n\n"; let current="";
  MT_INTAKE_QUESTIONS.forEach((x,i)=>{if(x.section!==current){current=x.section;out+=current.toUpperCase()+"\n";}const a=vals[x.id];if(a)out+=`${i+1}. ${x.q}\n→ ${a}\n`;});
  return out.trim();
}
function mtBuildIntakeNotes(replace=false){const notes=document.getElementById("f-notes-priv");if(!notes)return;const txt=mtIntakeSummaryText();notes.value=replace?txt:(notes.value.trim()?notes.value.trim()+"\n\n"+txt:txt);notes.scrollIntoView({behavior:"smooth",block:"center"});log("✅ Bilan ajouté aux notes privées.");}
async function mtCopyIntakeSummary(){const txt=mtIntakeSummaryText();try{await navigator.clipboard.writeText(txt);log("✅ Synthèse du bilan copiée.");}catch(e){prompt("Copie la synthèse :",txt);}}

/* ---------- menus par semaine : admin ---------- */
function mtRenderAdminWeekNav(){
  const box=document.getElementById("admin-week-nav"); if(!box)return;
  const nb=parseInt(programme?.timeline?.nbSemaines)||parseInt(document.getElementById("f-nb-semaines")?.value)||4;
  box.innerHTML=Array.from({length:nb},(_,i)=>i+1).map(s=>`<button type="button" class="chip ${s===mtAdminWeek?"active":""}" onclick="mtSelectAdminWeek(${s})">S${s}</button>`).join("");
}
function mtPersistAdminDayDraft(){
  if(!adminDay||!programme)return;
  programme=mtNormalizeProgramme(programme);
  const days=mtWeekDays(programme,mtAdminWeek);
  const newName=document.getElementById("f-day-name")?.value.trim()||adminDay;
  days[newName]={morning:textToHtml(document.getElementById("f-morning")?.value||""),lunch:textToHtml(document.getElementById("f-lunch")?.value||""),snack:textToHtml(document.getElementById("f-snack")?.value||""),dinner:textToHtml(document.getElementById("f-dinner")?.value||"")};
  if(adminDay!==newName)delete days[adminDay]; adminDay=newName;
  mtSyncLegacyDays(programme);
}
function mtSelectAdminWeek(s){
  mtPersistAdminDayDraft(); mtAdminWeek=s; const days=mtWeekDays(programme,s); adminDay=mtSortDayKeys(days)[0]||null; mtRenderAdminWeekNav(); renderAdminDaysNav(days);
}
renderAdminDaysNav=function(days){
  if(!window.MT_ADMIN_PAGE)return;
  const real=days||mtWeekDays(programme,mtAdminWeek); const keys=mtSortDayKeys(real);
  if(!adminDay||!keys.includes(adminDay))adminDay=keys[0]||null;
  const nav=document.getElementById("admin-days-nav");if(nav)nav.innerHTML=keys.map(day=>`<button type="button" class="chip ${day===adminDay?"active":""}" data-day="${mtAttr(day)}">${mtEsc(day)}</button>`).join("");
  if(nav)nav.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>selectAdminDay(b.dataset.day,b)));
  if(adminDay&&real[adminDay])fillDayFields(adminDay,real[adminDay]);
};
selectAdminDay=function(day,btn){mtPersistAdminDayDraft();adminDay=day;document.querySelectorAll("#admin-days-nav .chip").forEach(b=>b.classList.remove("active"));if(btn)btn.classList.add("active");fillDayFields(day,mtWeekDays(programme,mtAdminWeek)[day]||{});};
addDay=function(){programme=mtNormalizeProgramme(programme);const days=mtWeekDays(programme,mtAdminWeek);let i=1,name;do{name="Jour "+i;i++;}while(days[name]);days[name]={morning:"",lunch:"",snack:"",dinner:""};adminDay=name;renderAdminDaysNav(days);};
saveDay=function(){mtPersistAdminDayDraft();renderAdminDaysNav(mtWeekDays(programme,mtAdminWeek));log(`✅ ${adminDay} sauvegardé dans S${mtAdminWeek} — sauvegarde ensuite le client.`);};
deleteDay=function(){const days=mtWeekDays(programme,mtAdminWeek);if(!adminDay)return;if(Object.keys(days).length<=1){log("⚠️ Garde au moins un jour.");return;}delete days[adminDay];adminDay=Object.keys(days)[0]||null;renderAdminDaysNav(days);};

/* ---------- sélection progressive des repas : cliente ---------- */
function mtRenderClientWeekNav(prog){
  const daysNav=document.getElementById("days-nav"); if(!daysNav)return;
  let box=document.getElementById("client-week-nav");
  if(!box){box=document.createElement("div");box.id="client-week-nav";box.style.cssText="display:flex;gap:7px;margin:0 0 12px;flex-wrap:wrap";daysNav.parentNode.insertBefore(box,daysNav);}
  const current=mtCurrentWeek(prog); if(!mtClientViewWeek||mtClientViewWeek>current)mtClientViewWeek=current;
  box.innerHTML=Array.from({length:current},(_,i)=>i+1).map(s=>`<button type="button" class="chip ${s===mtClientViewWeek?"active":""}" onclick="mtSelectClientWeek(${s})">S${s}${s===current?" · en cours":""}</button>`).join("");
}
function mtSelectClientWeek(s){const current=mtCurrentWeek(_currentProg||{});if(s>current)return;mtClientViewWeek=s;const days=mtWeekDays(_currentProg,s);currentDay=mtBestDayKey(days);mtRenderClientWeekNav(_currentProg);renderDaysNav(days);renderMeals(days);}
renderDaysNav=function(days){
  const nav=document.getElementById("days-nav");if(!nav)return;const keys=mtSortDayKeys(days);if(!currentDay||!keys.includes(currentDay))currentDay=mtBestDayKey(days);
  nav.innerHTML=keys.map(day=>`<button type="button" class="day-pill ${day===currentDay?"active":""}" data-day="${mtAttr(day)}">${mtEsc(day)}</button>`).join("");
  nav.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>selectDay(b.dataset.day,b)));
};
selectDay=function(day,btn){currentDay=day;document.querySelectorAll(".day-pill").forEach(b=>b.classList.remove("active"));if(btn)btn.classList.add("active");renderMeals(mtWeekDays(_currentProg,mtClientViewWeek));};
function mtSelectionFor(prog,week,day,moment){return (((prog.meal_selections||{})[String(week)]||{})[day]||{})[moment]||[];}
function mtEnsureSelectionPath(prog,week,day,moment){prog.meal_selections=prog.meal_selections||{};prog.meal_selections[String(week)]=prog.meal_selections[String(week)]||{};prog.meal_selections[String(week)][day]=prog.meal_selections[String(week)][day]||{};prog.meal_selections[String(week)][day][moment]=prog.meal_selections[String(week)][day][moment]||[];return prog.meal_selections[String(week)][day][moment];}

let mtMealPendingVersion=0;
function mtMealPendingKey(){return currentSlug?`mt_pending_meal_selections_${currentSlug}`:null;}
function mtWriteMealPending(value){
  const key=mtMealPendingKey();if(!key)return null;
  const token=`${Date.now()}-${++mtMealPendingVersion}`;
  try{localStorage.setItem(key,JSON.stringify({token,data:mtDeepClone(value)}));}catch(e){}
  return token;
}
function mtReadMealPending(){
  const key=mtMealPendingKey();if(!key)return null;
  try{const raw=JSON.parse(localStorage.getItem(key)||"null");return raw&&raw.data?raw:null;}catch(e){return null;}
}
function mtClearMealPending(token){
  const key=mtMealPendingKey();if(!key)return;
  try{const raw=JSON.parse(localStorage.getItem(key)||"null");if(raw&&raw.token===token)localStorage.removeItem(key);}catch(e){}
}
function mtRestorePendingMealSelections(prog){
  const pending=mtReadMealPending();if(!pending)return null;
  prog.meal_selections=mtDeepClone(pending.data||{});
  return pending.token||null;
}
function mtRenderMealMoment(id,moment,raw){
  const el=document.getElementById(id);if(!el)return;const items=mtLinesFromMeal(raw);if(!items.length){el.innerHTML="<em style='color:#aaa'>—</em>";return;}
  const current=mtCurrentWeek(_currentProg);const readonly=mtClientViewWeek!==current;const selected=mtSelectionFor(_currentProg,mtClientViewWeek,currentDay,moment);const required=mtWeekRequired(mtClientViewWeek,items.length);
  el.style.cssText="margin:0;display:flex;flex-direction:column;gap:7px";
  el.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px"><span style="font-size:10px;color:var(--muted);font-weight:700">${readonly?"Semaine archivée":"Sélectionne tes repères"}</span><span style="font-size:10px;font-weight:800;color:${selected.length>=required?"#15803d":"var(--accent)"};background:${selected.length>=required?"#dcfce7":"rgba(140,117,97,.1)"};padding:3px 8px;border-radius:999px">${selected.length}/${required} minimum</span></div>`+items.map((item,i)=>{const on=selected.includes(i);return `<button type="button" ${readonly?"disabled":""} onclick="mtToggleMealChoice('${moment}',${i})" style="width:100%;text-align:left;border:1.5px solid ${on?"var(--brand)":"#e8e4de"};background:${on?"rgba(83,100,74,.08)":"white"};border-radius:13px;padding:10px 11px;display:flex;gap:9px;align-items:flex-start;color:var(--ink);font-family:inherit;opacity:${readonly&&!on?0.76:1};cursor:${readonly?"default":"pointer"}"><span style="width:20px;height:20px;border-radius:50%;flex:0 0 20px;border:1.5px solid ${on?"var(--brand)":"#d7d1ca"};background:${on?"var(--brand)":"white"};color:white;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900">${on?"✓":""}</span><span style="font-size:12px;line-height:1.5">${mtEsc(item)}</span></button>`;}).join("");
}
renderMeals=function(days){const d=(days||{})[currentDay]||{};mtRenderMealMoment("meal-morning","morning",d.morning);mtRenderMealMoment("meal-lunch","lunch",d.lunch);mtRenderMealMoment("meal-snack","snack",d.snack);mtRenderMealMoment("meal-dinner","dinner",d.dinner);mtRenderMealDayProgress(d);};
function mtRenderMealDayProgress(dayData){
  const nav=document.getElementById("days-nav");if(!nav)return;let box=document.getElementById("meal-progress-summary");if(!box){box=document.createElement("div");box.id="meal-progress-summary";box.style.cssText="margin:0 0 14px;padding:12px 14px;border-radius:14px;background:#f8f4ee;font-size:11px;color:var(--ink)";nav.insertAdjacentElement("afterend",box);}
  const moments=["morning","lunch","snack","dinner"];const labels={morning:"Matin",lunch:"Déjeuner",snack:"Collation",dinner:"Soir"};let ok=0;
  const chips=moments.map(m=>{const n=mtLinesFromMeal(dayData[m]).length,req=mtWeekRequired(mtClientViewWeek,n),sel=mtSelectionFor(_currentProg,mtClientViewWeek,currentDay,m).length,done=req>0&&sel>=req;if(done)ok++;return `<span style="padding:4px 8px;border-radius:999px;background:${done?"#dcfce7":"white"};color:${done?"#166534":"var(--muted)"};font-weight:700">${done?"✓":"○"} ${labels[m]}</span>`;}).join("");
  const min=mtWeekRequired(mtClientViewWeek,5);
  const rule=mtClientViewWeek>=4?`Semaine ${mtClientViewWeek} · les 5 choix par moment`:`Semaine ${mtClientViewWeek} · minimum ${min} choix par moment`;
  box.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px"><strong>Progression du jour</strong><span>${ok}/4 moments validés aujourd’hui</span></div><div style="font-size:10px;color:var(--muted);margin-bottom:8px">${rule}</div><div style="display:flex;gap:6px;flex-wrap:wrap">${chips}</div>`;
}
function mtToggleMealChoice(moment,index){
  if(mtClientViewWeek!==mtCurrentWeek(_currentProg))return;
  const arr=mtEnsureSelectionPath(_currentProg,mtClientViewWeek,currentDay,moment);const pos=arr.indexOf(index);if(pos>=0)arr.splice(pos,1);else arr.push(index);arr.sort((a,b)=>a-b);
  const token=mtWriteMealPending(_currentProg.meal_selections);
  renderMeals(mtWeekDays(_currentProg,mtClientViewWeek));
  mtSyncClientProgrammeKey("meal_selections",_currentProg.meal_selections,{immediate:true,pendingMealToken:token});
}

/* ---------- synchro Supabase des interactions ---------- */
const mtSyncTimers=new Map();
let mtSyncChain=Promise.resolve();
function mtSetMealSyncState(state){
  const box=document.getElementById("meal-progress-summary");if(!box)return;box.dataset.syncState=state||"";
}
async function mtPerformClientProgrammeSync(key,value,options={}){
  if(!sb||!currentSlug||window.MT_ADMIN_PAGE)return false;
  try{
    const res=await sb.from(SB_TABLE).select("programme").eq("slug",currentSlug).single();
    if(res.error||!res.data)throw (res.error||new Error("Programme introuvable"));
    const p=Object.assign({},res.data.programme||{});p[key]=mtDeepClone(value);
    const up=await sb.from(SB_TABLE).update({programme:p}).eq("slug",currentSlug).select("programme").single();
    if(up.error)throw up.error;
    if(_currentProg)_currentProg[key]=mtDeepClone(value);
    if(key==="meal_selections"&&options.pendingMealToken)mtClearMealPending(options.pendingMealToken);
    if(key==="meal_selections")mtSetMealSyncState("saved");
    return true;
  }catch(e){
    console.warn("MT sync",key,e);
    if(key==="meal_selections")mtSetMealSyncState("pending");
    return false;
  }
}
function mtQueueClientProgrammeSync(key,value,options={}){
  const snapshot=mtDeepClone(value);
  mtSyncChain=mtSyncChain.then(()=>mtPerformClientProgrammeSync(key,snapshot,options),()=>mtPerformClientProgrammeSync(key,snapshot,options));
  return mtSyncChain;
}
function mtSyncClientProgrammeKey(key,value,options={}){
  if(!sb||!currentSlug||window.MT_ADMIN_PAGE)return Promise.resolve(false);
  if(options.immediate){
    const old=mtSyncTimers.get(key);if(old)clearTimeout(old);mtSyncTimers.delete(key);
    return mtQueueClientProgrammeSync(key,value,options);
  }
  const old=mtSyncTimers.get(key);if(old)clearTimeout(old);
  return new Promise(resolve=>{
    const timer=setTimeout(()=>{mtSyncTimers.delete(key);mtQueueClientProgrammeSync(key,value,options).then(resolve);},550);
    mtSyncTimers.set(key,timer);
  });
}

toggleTask=function(i){
  const el=document.getElementById("task-"+i),check=document.getElementById("check-"+i),icon=document.getElementById("checkicon-"+i);if(!el)return;const done=el.classList.toggle("done");if(check){check.style.background=done?"var(--brand)":"white";check.style.borderColor=done?"var(--brand)":"#ddd8d0";}if(icon)icon.style.display=done?"block":"none";
  const today=mtLocalDateKey();_currentProg.task_state=_currentProg.task_state||{};_currentProg.task_state[today]=_currentProg.task_state[today]||{};_currentProg.task_state[today][i]=done;try{localStorage.setItem("mt_tasks_"+currentSlug+"_"+today,JSON.stringify(_currentProg.task_state[today]));}catch(e){}mtSyncClientProgrammeKey("task_state",_currentProg.task_state);
};
restoreTasks=function(slug){const today=mtLocalDateKey();const saved=(_currentProg?.task_state||{})[today]||(()=>{try{return JSON.parse(localStorage.getItem("mt_tasks_"+(slug||"admin")+"_"+today)||"{}");}catch(e){return {};}})();Object.entries(saved).forEach(([idx,done])=>{if(!done)return;const el=document.getElementById("task-"+idx),check=document.getElementById("check-"+idx),icon=document.getElementById("checkicon-"+idx);if(el)el.classList.add("done");if(check){check.style.background="var(--brand)";check.style.borderColor="var(--brand)";}if(icon)icon.style.display="block";});};

initSuivi=function(){
  const slug=currentSlug||"admin",today=mtLocalDateKey();const el=document.getElementById("suivi-date");if(el)el.textContent=new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});
  let s=(_currentProg?.suivi||{})[today]||{};if(!Object.keys(s).length){try{s=JSON.parse(localStorage.getItem("mt_suivi_"+slug+"_"+today)||"{}");}catch(e){}}
  ["eau","repas","infusion","sport"].forEach(k=>{const x=document.getElementById("check-"+k);if(x)x.checked=!!s[k];});if(s.poids&&document.getElementById("suivi-poids"))document.getElementById("suivi-poids").value=s.poids;
  ["energie","sommeil","digestion","recuperation","courbatures","disponibilite","stress","faim","confort"].forEach(id=>{const input=document.getElementById("suivi-"+id);if(input&&s[id]){input.value=s[id];const val=document.getElementById("val-"+id);if(val)val.textContent=s[id]+"/5";}});if(s.note&&document.getElementById("suivi-note"))document.getElementById("suivi-note").value=s.note;updateScore(slug);
};
saveSuivi=function(){
  const slug=currentSlug||"admin",today=mtLocalDateKey();const gv=id=>document.getElementById(id);const data={eau:!!gv("check-eau")?.checked,repas:!!gv("check-repas")?.checked,infusion:!!gv("check-infusion")?.checked,sport:!!gv("check-sport")?.checked,poids:gv("suivi-poids")?.value||"",energie:gv("suivi-energie")?.value||"",sommeil:gv("suivi-sommeil")?.value||"",digestion:gv("suivi-digestion")?.value||"",note:gv("suivi-note")?.value||"",filled:true,date:today};["recuperation","courbatures","disponibilite","stress","faim","confort"].forEach(id=>{const x=gv("suivi-"+id);if(x)data[id]=x.value;});try{localStorage.setItem("mt_suivi_"+slug+"_"+today,JSON.stringify(data));}catch(e){}if(_currentProg){_currentProg.suivi=_currentProg.suivi||{};_currentProg.suivi[today]=data;mtSyncClientProgrammeKey("suivi",_currentProg.suivi);}updateScore(slug);renderHistorique(slug);
};
updateScore=function(slug){let total=0,filled=0;for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const day=mtLocalDateKey(d);total++;let s=(_currentProg?.suivi||{})[day]||{};if(!Object.keys(s).length){try{s=JSON.parse(localStorage.getItem("mt_suivi_"+(slug||"admin")+"_"+day)||"{}");}catch(e){}}if(s.filled)filled++;}const pct=Math.round(filled/total*100);const bar=document.getElementById("score-bar"),txt=document.getElementById("score-text");if(bar)bar.style.width=pct+"%";if(txt)txt.textContent=`Tu as rempli ${filled} jour${filled>1?"s":""} sur 7 — Score : ${pct}%`;};
renderHistorique=function(slug){
  const jours=[],labels=["D","L","M","M","J","V","S"];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const key=mtLocalDateKey(d);let s=(_currentProg?.suivi||{})[key]||{};if(!Object.keys(s).length){try{s=JSON.parse(localStorage.getItem("mt_suivi_"+(slug||"admin")+"_"+key)||"{}");}catch(e){}}jours.push({date:key,label:labels[d.getDay()],filled:!!s.filled,energie:+s.energie||0,sommeil:+s.sommeil||0,digestion:+s.digestion||0,poids:s.poids||""});}
  let streak=0;for(let i=jours.length-1;i>=0;i--){if(jours[i].filled)streak++;else break;}const sbadge=document.getElementById("streak-badge");if(sbadge){sbadge.style.display=streak?"block":"none";if(streak)sbadge.textContent=`🔥 ${streak} jour${streak>1?"s":""} de suite`;}
  const sd=document.getElementById("streak-days");if(sd)sd.innerHTML=jours.map(j=>`<div style="flex:1;text-align:center"><div style="width:32px;height:32px;margin:auto;border-radius:50%;background:${j.filled?"var(--brand)":"#f0ece6"};color:${j.filled?"white":"var(--muted)"};display:flex;align-items:center;justify-content:center;border:${j.date===mtLocalDateKey()?"2px solid var(--accent)":"2px solid transparent"}">${j.filled?"✓":j.label}</div><span style="font-size:9px;color:var(--muted)">${j.label}</span></div>`).join("");
  function chart(id,k,c){const el=document.getElementById(id);if(!el)return;el.innerHTML=jours.map(j=>{const v=j[k],h=v?Math.round(v/5*50):3;return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:3px"><span style="font-size:9px;color:var(--muted);font-weight:700">${v||""}</span><div style="width:100%;height:${h}px;background:${v?c:"#f0ece6"};border-radius:4px;opacity:${v?1:.5}"></div></div>`;}).join("");}chart("chart-energie","energie","#f59e0b");chart("chart-sommeil","sommeil","#6366f1");chart("chart-digestion","digestion","var(--brand)");const pe=document.getElementById("poids-list");if(pe)pe.innerHTML=jours.map(j=>`<div style="flex:1;text-align:center"><strong style="font-size:10px">${mtEsc(j.poids||"—")}</strong><div style="font-size:9px;color:var(--muted)">${j.label}</div></div>`).join("");
};

/* ---------- profil et cycle conditionnels ---------- */
function mtApplyProfileVisibility(prog){
  const mode=prog.profile?.cycleMode||"inconnu";const show=mode==="actif";
  const cycleTab=document.getElementById("tab-cycle");if(cycleTab)cycleTab.style.display=show?"":"none";
  document.querySelectorAll('[onclick*="cycle"], [data-tab="cycle"]').forEach(el=>{if(el.closest("#tab-cycle"))return; if((el.textContent||"").trim().toLowerCase().includes("cycle"))el.style.display=show?"":"none";});
  // switcher Quotidien/Terrain/Cycle : bouton cycle ciblé
  document.querySelectorAll("button").forEach(b=>{if((b.getAttribute("onclick")||"").includes("switchTab('cycle')"))b.style.display=show?"":"none";});
}

/* ---------- rendu client sécurisé + semaine auto ---------- */
renderClientView=function(prenom,prog){
  prog=mtNormalizeProgramme(prog);
  const pendingMealToken=mtRestorePendingMealSelections(prog);
  _currentProg=prog;
  if(pendingMealToken)mtSyncClientProgrammeKey("meal_selections",prog.meal_selections,{immediate:true,pendingMealToken});
  const p=(prenom||"toi").trim();const setText=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};setText("display-prenom",p);setText("avatar",p.charAt(0).toUpperCase());document.title="Méthode Tee — "+p;const d=document.getElementById("today-date");if(d)d.textContent=new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});setText("goal-title",prog.objectif||"");document.body.dataset.parcours=prog.parcours==="performance"?"performance":"equilibre";setText("parcours-badge",prog.parcours==="performance"?"Performance":"Équilibre");renderProfileCheckin(prog.parcours||"equilibre");
  const goals=document.getElementById("goal-list");if(goals)goals.innerHTML=(prog.goals||[]).map(g=>`<li style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:6px"><span style="color:var(--brand)">✓</span>${mtEsc(g)}</li>`).join("");setText("coach-msg",prog.coach?`“${prog.coach}”`:"");const cw=mtCurrentWeek(prog);mtClientViewWeek=cw;setText("week-badge","Semaine "+cw);
  const tasks=document.getElementById("tasks-list");if(tasks)tasks.innerHTML=(prog.tasks||[]).map((t,i)=>`<div class="task-item" id="task-${i}" onclick="toggleTask(${i})"><div class="task-check" id="check-${i}"><span id="checkicon-${i}" style="display:none;color:white">✓</span></div><span class="task-text" style="font-size:13px;font-weight:500;color:var(--ink)">${mtEsc(t)}</span></div>`).join("");
  const offre=prog.offre||"",promo=prog.promo_code||"",banner=document.getElementById("my-banner"),bt=document.getElementById("my-banner-text"),pw=document.getElementById("my-promo-wrap"),pe=document.getElementById("my-promo-code"),map={signature:"Offre Signature : -15% sur toute la boutique Maison Yanna",privilege:"Offre Privilege : 5 produits offerts — envoie ta sélection",elite:"Offre Elite : 10 produits offerts à la quantité souhaitée"};if(banner&&bt&&map[offre]){bt.textContent=map[offre];if(promo&&pe&&pw){pe.textContent=promo;pw.style.display="block";}else if(pw)pw.style.display="none";banner.style.display="block";}else if(banner)banner.style.display="none";
  const badge=document.getElementById("messages-badge"),unread=(prog.messages||[]).filter(m=>m.auteur==="tee"&&!m.lu).length;if(badge){badge.style.display=unread?"flex":"none";if(unread)badge.textContent=unread;}
  const days=mtWeekDays(prog,cw);currentDay=mtBestDayKey(days);mtRenderClientWeekNav(prog);renderDaysNav(days);renderMeals(days);renderRituel(prog.rituel||{});renderTerrain(prog.terrain||{});renderProtocole(prog.protocole||{});renderProducts(prog.products||[]);renderSignature(prog.signature||{});renderMethodRules(prog.methode||[]);renderProgramme(prog);renderTransformation(prog);renderPhotos(prog.photos||[]);renderMessages(prog);try{mtRenderTerrainQuestions();}catch(e){}mtApplyProfileVisibility(prog);
  const slugR=currentSlug;requestAnimationFrame(()=>{restoreTasks(slugR);renderHistorique(slugR);initSuivi();setTimeout(()=>initNotifications(slugR),300);});try{lucide.createIcons();}catch(e){}
};

/* sécurise les rendus texte les plus exposés */
renderRituel=function(r){const el=document.getElementById("rituel-card");if(!el)return;const rows=[{label:"Matin",value:r.matin},{label:"Midi",value:r.midi},{label:"Soir",value:r.soir}].filter(x=>x.value);el.innerHTML=rows.map(x=>`<div style="padding:12px 14px;border:1px solid rgba(140,117,97,.10);border-radius:16px;background:#fff"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.12em;font-weight:800;color:var(--brand);margin-bottom:5px">${x.label}</div><div style="font-size:13px;line-height:1.65;color:var(--ink)">${mtEsc(x.value)}</div></div>`).join("")+(r.note?`<p style="font-size:12px;line-height:1.7;color:var(--muted);margin:2px 0 0">${mtEsc(r.note)}</p>`:"" )+(!rows.length&&!r.note?`<p style="font-size:12px;color:var(--muted);margin:0">Aucun rituel ajouté.</p>`:"");};
renderTerrain=function(t){const el=document.getElementById("terrain-card");if(!el)return;el.innerHTML=(t.dominant?`<div style="display:inline-flex;padding:6px 12px;border-radius:999px;background:rgba(83,100,74,.1);color:var(--brand);font-size:11px;font-weight:700;margin-bottom:12px">Repère principal : ${mtEsc(t.dominant)}</div>`:"")+((t.axes||[]).length?`<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">${t.axes.map(a=>`<span style="padding:8px 12px;border-radius:999px;background:var(--paper);font-size:12px;color:var(--ink)">${mtEsc(a)}</span>`).join("")}</div>`:"")+(t.note?`<p style="font-size:13px;line-height:1.75;color:var(--muted);margin:0">${mtEsc(t.note)}</p>`:"")+(!t.dominant&&!(t.axes||[]).length&&!t.note?`<p style="font-size:12px;color:var(--muted);margin:0">Aucun bilan ajouté.</p>`:"");};
renderProtocole=function(p){const el=document.getElementById("protocole-card");if(!el)return;const rows=[{label:"Matin",value:p.matin},{label:"Midi",value:p.midi},{label:"Soir",value:p.soir}].filter(x=>x.value);el.innerHTML=rows.map(x=>`<div style="padding:12px 14px;border:1px solid rgba(140,117,97,.10);border-radius:16px;background:#fff"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.12em;font-weight:800;color:var(--brand);margin-bottom:5px">${x.label}</div><div style="font-size:13px;line-height:1.65;color:var(--ink)">${mtEsc(x.value)}</div></div>`).join("")+(p.duree?`<p style="font-size:12px;line-height:1.7;color:var(--muted);margin:2px 0 0">Durée : ${mtEsc(p.duree)}</p>`:"")+(!rows.length&&!p.duree?`<p style="font-size:12px;color:var(--muted);margin:0">Aucun protocole ajouté.</p>`:"");};
renderSignature=function(sig){const el=document.getElementById("signature-card");if(!el)return;el.innerHTML=`<div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:18px"><div><h3 class="serif" style="font-size:22px;font-weight:700;color:var(--ink);margin:0 0 4px">${mtEsc(sig.titre||"Plat Signature")}</h3><p style="font-size:12px;color:var(--muted)">Une base saine, pratique et adaptée à ton rythme.</p></div><div style="font-size:24px">🍽️</div></div><div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">${(sig.ingredients||[]).map(i=>`<div style="display:flex;gap:8px;font-size:13px"><span style="color:var(--brand)">•</span><span>${mtEsc(i)}</span></div>`).join("")}</div><p style="font-size:13px;color:var(--muted);line-height:1.7;margin:0">${mtEsc(sig.description||"")}</p>`;};
renderMethodRules=function(rules){const el=document.getElementById("method-rules");if(!el)return;el.innerHTML=(rules||[]).map(r=>`<div class="method-rule ${r.accent==="accent"?"accent":""}"><h4 style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--ink);margin:0 0 10px">${mtEsc(r.titre||"")}</h4><ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px">${(r.items||[]).map(item=>`<li style="font-size:12px;color:var(--muted);display:flex;gap:8px"><span style="color:var(--brand)">•</span>${mtEsc(item)}</li>`).join("")}</ul></div>`).join("");};
renderMessages=function(prog){const msgs=prog.messages||[],fil=document.getElementById("messages-fil");if(!fil)return;if(!msgs.length){fil.innerHTML='<div style="text-align:center;padding:40px 20px"><p style="font-size:13px;color:var(--muted)">Aucun message pour le moment.</p></div>';return;}fil.innerHTML=msgs.map(m=>{const c=m.auteur==="client";return `<div style="display:flex;flex-direction:column;align-items:${c?"flex-end":"flex-start"}"><div style="max-width:85%;background:${c?"var(--brand)":"white"};color:${c?"white":"var(--ink)"};border-radius:16px;padding:12px 16px"><p style="font-size:13px;line-height:1.6;margin:0;white-space:pre-wrap">${mtEsc(m.texte)}</p></div><span style="font-size:10px;color:var(--muted);margin-top:4px">${mtEsc(m.date||"")}${m.auteur==="tee"?" — Tee":""}</span></div>`;}).join("");};

/* ---------- produits : statut + visibilité ---------- */
renderProducts=function(products){const grid=document.getElementById("products-grid");if(!grid)return;const visible=(products||[]).filter(p=>p.visible!==false);const statusLabel={owned:"Déjà en ta possession",recommended:"Recommandé par Tee",discover:"À découvrir"};grid.innerHTML=visible.map((p,visibleIdx)=>{const idx=(products||[]).indexOf(p),status=p.status||"recommended";return `<div class="product-card ${p.featured?"featured":""}" id="pcard-${idx}"><div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--brand);margin-bottom:6px">${mtEsc(statusLabel[status]||statusLabel.recommended)}</div><div class="product-emoji-wrap" style="background:${p.featured?"var(--ink)":"var(--paper)"}">${mtEsc(p.emoji||"🌿")}</div><h4 style="font-size:12px;font-weight:700;text-align:center;color:var(--ink);margin:0 0 6px">${mtEsc(p.titre||"")}</h4><p style="font-size:11px;color:var(--muted);text-align:center;line-height:1.5;flex-grow:1;margin:0 0 8px">${mtEsc(p.texte||"")}</p>${mtSafeUrl(p.lien)?`<a href="${mtAttr(mtSafeUrl(p.lien))}" target="_blank" rel="noopener noreferrer" class="product-btn" style="background:${p.featured?"var(--brand)":"#f0ece6"};color:${p.featured?"white":"var(--ink)"};margin-bottom:6px">Voir le produit</a>`:""}<button onclick="toggleSelection(${idx})" id="selbtn-${idx}" class="product-btn" style="background:#f0ece6;color:var(--ink);border:1.5px solid #e2ddd7" type="button">+ Sélectionner</button></div>`;}).join("");restoreSelection();};
renderProductEditors=function(products){programme.products=(products||[]).map(p=>Object.assign({status:"recommended",visible:true},p));const box=document.getElementById("product-editors");if(!box)return;box.innerHTML=programme.products.map((p,i)=>`<div class="product-editor" id="pe-${i}"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><span style="font-size:11px;font-weight:800;text-transform:uppercase;color:var(--muted)">Produit ${i+1}</span><button class="chip" onclick="removeProduct(${i})" style="color:#dc2626">Supprimer</button></div><div style="display:flex;flex-direction:column;gap:8px"><input class="admin-input p-emoji" data-i="${i}" placeholder="Emoji 🌿" value="${mtAttr(p.emoji||"")}"><input class="admin-input p-titre" data-i="${i}" placeholder="Nom du produit" value="${mtAttr(p.titre||"")}"><textarea class="admin-textarea p-texte" data-i="${i}" placeholder="Description">${mtEsc(p.texte||"")}</textarea><input class="admin-input p-lien" data-i="${i}" placeholder="Lien produit" value="${mtAttr(p.lien||"")}"><select class="admin-input p-status" data-i="${i}"><option value="owned" ${p.status==="owned"?"selected":""}>Déjà en possession</option><option value="recommended" ${!p.status||p.status==="recommended"?"selected":""}>Recommandé par Tee</option><option value="discover" ${p.status==="discover"?"selected":""}>À découvrir</option></select><label style="display:flex;align-items:center;gap:8px;font-size:13px"><input type="checkbox" class="p-visible" data-i="${i}" ${p.visible!==false?"checked":""}> Visible dans l’espace client</label><label style="display:flex;align-items:center;gap:8px;font-size:13px"><input type="checkbox" class="p-featured" data-i="${i}" ${p.featured?"checked":""}> Produit mis en avant</label></div></div>`).join("");};
syncProducts=function(){const arr=[];document.querySelectorAll(".p-titre").forEach(el=>{const i=+el.dataset.i;arr[i]=arr[i]||{};arr[i].titre=el.value.trim();});document.querySelectorAll(".p-emoji").forEach(el=>{arr[+el.dataset.i]=arr[+el.dataset.i]||{};arr[+el.dataset.i].emoji=el.value.trim();});document.querySelectorAll(".p-texte").forEach(el=>arr[+el.dataset.i].texte=el.value.trim());document.querySelectorAll(".p-lien").forEach(el=>{let v=el.value.trim();if(v&&!/^https?:\/\//i.test(v))v="https://"+v;arr[+el.dataset.i].lien=v;});document.querySelectorAll(".p-status").forEach(el=>arr[+el.dataset.i].status=el.value);document.querySelectorAll(".p-visible").forEach(el=>arr[+el.dataset.i].visible=el.checked);document.querySelectorAll(".p-featured").forEach(el=>arr[+el.dataset.i].featured=el.checked);programme.products=arr;};
addProduct=function(){syncProducts();programme.products.push({emoji:"🌿",titre:"Nouveau produit",texte:"",lien:"",status:"recommended",visible:true,featured:false});renderProductEditors(programme.products);};

/* ---------- Bilan Terrain prudent ---------- */
const MT_BILAN_Q=[
  ["Sommeil léger ou réveils nocturnes ?","nerveux",false],["Stress, charge mentale ou irritabilité ?","nerveux",false],["Ballonnements ou digestion lente ?","digestif",false],["Transit irrégulier ?","digestif",false],["Symptômes marqués autour du cycle ?","hormonal",true],["Envies alimentaires plus fortes avant les règles ?","hormonal",true],["Fatigue au réveil ?","energie",false],["Peau inconfortable ou imperfections ?","peau",false],["Sensation de rétention d’eau ?","hydratation",false],["Récupération difficile après effort ?","recuperation",false]
];
mtRenderTerrainQuestions=function(){const box=document.getElementById("terrain-ai-questions");if(!box)return;const context=window.MT_ADMIN_PAGE?programme:(_currentProg||programme||{});const cycle=context?.profile?.cycleMode==="actif";const qs=MT_BILAN_Q.filter(q=>!q[2]||cycle);box.dataset.ready="1";box.innerHTML=`<p style="font-size:11px;color:var(--muted);line-height:1.6;margin:0 0 12px">Ce bilan donne des repères de suivi. Il ne pose aucun diagnostic et toute proposition de plante doit être validée par Tee.</p>`+qs.map((q,i)=>`<div class="card" style="padding:14px;margin:0 0 10px;background:#fdfcfa;box-shadow:none"><p style="font-size:13px;color:var(--ink);font-weight:600;margin:0 0 8px">${mtEsc(q[0])}</p><input type="range" min="0" max="5" value="2" data-cat="${q[1]}" class="mt-bilan-range" style="width:100%;accent-color:var(--brand)"></div>`).join("");};
mtGenerateTerrainAI=function(){const scores={};document.querySelectorAll(".mt-bilan-range").forEach(x=>scores[x.dataset.cat]=(scores[x.dataset.cat]||0)+Number(x.value||0));const sorted=Object.keys(scores).sort((a,b)=>scores[b]-scores[a]);const dominant=sorted[0]||"équilibre",second=sorted[1]||"";const result={date:new Date().toISOString(),scores,dominant,second,validatedByTee:!!(_currentProg||programme)?.safety?.phytoValidated};if(_currentProg){_currentProg.terrain_bilan=result;mtSyncClientProgrammeKey("terrain_bilan",result);}const el=document.getElementById("terrain-ai-result");if(el)el.innerHTML=`<div class="goal-card" style="margin-bottom:16px"><p style="font-size:9px;text-transform:uppercase;letter-spacing:.18em;font-weight:800;opacity:.75;margin:0 0 8px">Repères générés</p><h3 class="serif" style="font-size:22px;margin:0 0 10px">${mtEsc(dominant)}${second?" + "+mtEsc(second):""}</h3><p style="font-size:13px;line-height:1.7;margin:0;opacity:.9">Ces repères servent à personnaliser le suivi. Ils ne constituent pas un diagnostic.</p></div><div class="card" style="padding:18px"><strong style="font-size:12px;color:var(--ink)">Plantes / produits</strong><p style="font-size:12px;color:var(--muted);line-height:1.6;margin:6px 0 0">${result.validatedByTee?"Tee a vérifié les précautions du profil. Les produits visibles dans ton espace restent ceux qu’elle a sélectionnés manuellement.":"Aucune suggestion automatique : Tee doit d’abord vérifier médicaments, traitements, tension, grossesse/allaitement, allergies et contre-indications."}</p></div>`;};
mtSetCyclePhase=function(phase){if((_currentProg?.profile?.cycleMode||"inconnu")!=="actif")return;const c=MT_CYCLE[phase];if(!c)return;_currentProg.cycle={phase,date:new Date().toISOString()};mtSyncClientProgrammeKey("cycle",_currentProg.cycle);const el=document.getElementById("cycle-result");if(el)el.innerHTML=`<div class="card" style="padding:20px;background:${c.couleur};border:none"><p style="font-size:10px;text-transform:uppercase;letter-spacing:.14em;font-weight:800;color:var(--brand);margin:0 0 8px">${mtEsc(c.titre)}</p><p style="font-size:13px;color:var(--ink);line-height:1.7;margin:0">${mtEsc(c.texte)}</p></div>`;};

/* protocoles : modèles neutres et à valider */
appliquerProtocole=function(type){
  const models={digestion:{matin:"Hydratation au réveil. Si utile, infusion simple choisie selon la tolérance.",midi:"Repas simples et observation du confort digestif. Infusion digestive seulement si adaptée.",soir:"Dîner adapté au rythme réel et rituel calme sans surcharger les prises.",duree:"7 jours puis réévaluation"},energie:{matin:"Hydratation + repas ou collation selon la faim et le rythme de la journée.",midi:"Repas complet et régulier ; observer les baisses d’énergie.",soir:"Préparer le sommeil et limiter les stimulants tardifs.",duree:"7 jours puis réévaluation"},recomposition:{matin:"Repères alimentaires adaptés à la faim, sans restriction automatique.",midi:"Repas complet : protéines, féculent, végétaux et matières grasses selon le besoin.",soir:"Dîner complet ajusté aux sensations et à l’activité du jour.",duree:"14 jours puis réévaluation"},inflammation:{matin:"Alimentation variée et hydratation régulière. Toute plante ciblée est validée individuellement.",midi:"Favoriser des repas simples et observer les aliments réellement tolérés.",soir:"Rituel calme et sommeil prioritaire.",duree:"7 jours puis réévaluation"},detox:{matin:"Hydratation régulière ; pas de restriction ni de cure intensive automatique.",midi:"Repas complets et végétaux variés selon tolérance.",soir:"Infusion simple seulement si elle est compatible avec le profil.",duree:"7 jours puis réévaluation"},sommeil:{matin:"Lumière du jour, hydratation et stimulants plutôt en première partie de journée.",midi:"Repas régulier ; observer l’effet de la caféine et du stress.",soir:"Créer une transition calme avant le coucher ; infusion sans stimulant si adaptée.",duree:"7 jours puis réévaluation"}};
  const p=models[type];if(!p)return;if(!confirm("Ce modèle est une base de travail. Vérifie le profil santé et adapte-le avant de sauvegarder."))return;document.getElementById("f-protocole-matin").value=p.matin;document.getElementById("f-protocole-midi").value=p.midi;document.getElementById("f-protocole-soir").value=p.soir;document.getElementById("f-protocole-duree").value=p.duree;const msg=document.getElementById("protocole-applied");if(msg){msg.textContent="✅ Modèle chargé — à adapter et valider.";msg.style.display="block";setTimeout(()=>msg.style.display="none",3000);}
};

/* ---------- admin : chargement/sauvegarde V6 ---------- */
const mtOriginalFillAdmin=fillAdmin;
fillAdmin=function(prenom,prog){prog=mtNormalizeProgramme(prog);programme=prog;const current=mtCurrentWeek(prog);mtAdminWeek=Math.min(current,prog.timeline.nbSemaines||4);mtOriginalFillAdmin(prenom,prog);const sexe=document.getElementById("f-sexe"),cycle=document.getElementById("f-cycle-mode"),safe=document.getElementById("f-phyto-validated");if(sexe)sexe.value=prog.profile?.sexe||"";if(cycle)cycle.value=prog.profile?.cycleMode||"inconnu";if(safe)safe.checked=!!prog.safety?.phytoValidated;mtRenderIntakeFields(prog.intake||{});mtRenderAdminWeekNav();adminDay=Object.keys(mtWeekDays(prog,mtAdminWeek))[0]||null;renderAdminDaysNav(mtWeekDays(prog,mtAdminWeek));const lbl=document.getElementById("mt-week-review-label");if(lbl)lbl.textContent=`Semaine ${current} en cours — les améliorations restent à valider par Tee.`;};

const mtOriginalSelectClient=selectClient;
selectClient=async function(slug){await mtOriginalSelectClient(slug);programme=mtNormalizeProgramme(programme);fillAdmin(document.getElementById("f-prenom")?.value||"",programme);};
createClient=function(){currentSlug=null;programme=mtNormalizeProgramme(emptyProgramme());adminDay=null;mtAdminWeek=1;fillAdmin("",programme);const em=document.getElementById("f-client-email"),notes=document.getElementById("f-notes-priv");if(em)em.value="";if(notes)notes.value="";log("Nouveau client — remplis le profil puis sauvegarde.");};

saveClient=async function(){
  if(!sb){log("❌ Connecte Supabase d'abord.");return;}programme=mtNormalizeProgramme(programme);mtPersistAdminDayDraft();syncProducts();
  const slug=(document.getElementById("f-slug").value.trim().toLowerCase().replace(/[^a-z0-9-]/g,"-").replace(/^-+|-+$/g,"")||"client"),prenom=document.getElementById("f-prenom").value.trim()||"Client",client_email=document.getElementById("f-client-email").value.trim().toLowerCase(),admin_notes=document.getElementById("f-notes-priv").value.trim();if(!client_email){log("❌ L’e-mail de connexion est obligatoire.");return;}
  programme.parcours=document.getElementById("f-parcours").value;programme.profile={sexe:document.getElementById("f-sexe")?.value||"",cycleMode:document.getElementById("f-cycle-mode")?.value||"inconnu"};programme.safety={phytoValidated:!!document.getElementById("f-phyto-validated")?.checked};programme.intake=mtCollectIntake();programme.offre=document.getElementById("f-offre").value;programme.statut=document.getElementById("f-statut").value;programme.promo_code=document.getElementById("f-promo-code").value.trim().toUpperCase();programme.rdv=document.getElementById("f-rdv").value;programme.transformation={depart:document.getElementById("f-transfo-depart").value.trim(),victoires:document.getElementById("f-transfo-victoires").value.trim(),ressentis:document.getElementById("f-transfo-ressentis").value.trim()};programme.timeline=syncTimeline();programme.objectif=document.getElementById("f-objectif").value.trim();programme.coach=document.getElementById("f-coach").value.trim();programme.goals=lines(document.getElementById("f-goals").value);programme.tasks=lines(document.getElementById("f-tasks").value);programme.signature={titre:document.getElementById("f-sig-title").value.trim(),ingredients:lines(document.getElementById("f-sig-ingredients").value),description:document.getElementById("f-sig-desc").value.trim()};programme.rituel={matin:document.getElementById("f-rituel-matin").value.trim(),midi:document.getElementById("f-rituel-midi").value.trim(),soir:document.getElementById("f-rituel-soir").value.trim(),note:document.getElementById("f-rituel-note").value.trim()};programme.terrain={dominant:document.getElementById("f-terrain-dominant").value.trim(),axes:lines(document.getElementById("f-terrain-axes").value),note:document.getElementById("f-terrain-note").value.trim()};programme.protocole={matin:document.getElementById("f-protocole-matin").value.trim(),midi:document.getElementById("f-protocole-midi").value.trim(),soir:document.getElementById("f-protocole-soir").value.trim(),duree:document.getElementById("f-protocole-duree").value.trim()};try{programme.methode=JSON.parse(document.getElementById("f-method").value||"[]");}catch(e){log("❌ JSON Méthode invalide.");return;}delete programme.semaine;delete programme.notes_priv;mtSyncLegacyDays(programme);log("⏳ Sauvegarde…");const {error}=await sb.from(SB_TABLE).upsert({slug,prenom,client_email,admin_notes,programme},{onConflict:"slug"});if(error){log("❌ "+error.message);return;}currentSlug=slug;document.getElementById("f-slug").value=slug;_currentProg=programme;log(`✅ ${prenom} sauvegardé — Semaine ${mtCurrentWeek(programme)} calculée automatiquement.`);await loadAllClients();renderClientView(prenom,programme);fillAdmin(prenom,programme);
};

/* ---------- programme/timeline : libellé auto ---------- */
const mtOriginalRenderProgramme=renderProgramme;
renderProgramme=function(prog){
  prog=mtNormalizeProgramme(prog);mtOriginalRenderProgramme(prog);const sc=mtCurrentWeek(prog),badge=document.getElementById("week-badge");if(badge)badge.textContent="Semaine "+sc;
  const rt=document.getElementById("regle-texte"),rd=document.getElementById("regle-detail");
  const req=sc===1?1:sc===2?2:sc===3?3:5;
  if(rt)rt.textContent=sc>=4?"Toute la sélection par moment":`${req} proposition${req>1?"s":""} minimum par moment`;
  if(rd)rd.textContent=sc>=4?"Pour chacun des 4 moments de la journée, suis toute ta sélection personnalisée (20 repères si 5 propositions sont prévues par moment).":`Pour chacun des 4 moments de la journée, choisis au minimum ${req} proposition${req>1?"s":""} parmi les aliments, plantes ou produits proposés — soit ${req*4} minimum sur la journée.`;
};

/* ---------- tableau d'alertes admin ---------- */
function mtLastFilledDate(prog){const dates=Object.keys(prog.suivi||{}).filter(d=>prog.suivi[d]?.filled).sort();return dates.length?dates[dates.length-1]:null;}
function mtRenderAdminAlerts(clients){const box=document.getElementById("mt-admin-alert-list"),count=document.getElementById("mt-admin-alert-count");if(!box)return;const alerts=[];const today=mtParseLocalDate(mtLocalDateKey());(clients||[]).forEach(c=>{const p=mtNormalizeProgramme(c.programme||{});const last=mtLastFilledDate(p);if(p.statut==="actif"&&(!last||mtDaysDiff(today,mtParseLocalDate(last))>=2))alerts.push({slug:c.slug,prenom:c.prenom,type:"Suivi",text:last?`Pas de suivi depuis ${mtDaysDiff(today,mtParseLocalDate(last))} jours`:"Aucun suivi enregistré",prio:2});const unread=(p.messages||[]).filter(m=>m.auteur==="client"&&!m.lu).length;if(unread)alerts.push({slug:c.slug,prenom:c.prenom,type:"Message",text:`${unread} message${unread>1?"s":""} à lire`,prio:1});const sc=mtCurrentWeek(p);const start=mtParseLocalDate(p.timeline?.dateDebut);if(start){const day=mtDaysDiff(today,start)%7;if(day>=5&&sc<(p.timeline.nbSemaines||4)&&!p.week_reviews?.[String(sc)])alerts.push({slug:c.slug,prenom:c.prenom,type:"Semaine",text:`Fin de S${sc} : préparer S${sc+1}`,prio:1});}const last3=Object.keys(p.suivi||{}).sort().slice(-3).map(d=>p.suivi[d]).filter(Boolean);if(last3.length===3&&last3.every(x=>+x.stress>=4))alerts.push({slug:c.slug,prenom:c.prenom,type:"Stress",text:"Stress élevé sur les 3 derniers suivis",prio:1});});alerts.sort((a,b)=>a.prio-b.prio);if(count){count.textContent=alerts.length;count.style.background=alerts.length?"#fee2e2":"#dcfce7";count.style.color=alerts.length?"#b91c1c":"#166534";}box.innerHTML=alerts.length?alerts.map(a=>`<button type="button" onclick="selectClient('${mtAttr(a.slug)}')" style="width:100%;text-align:left;border:1px solid #eee7df;background:white;border-radius:13px;padding:11px 12px;margin-bottom:7px;font-family:inherit"><div style="display:flex;justify-content:space-between;gap:8px"><strong style="font-size:12px;color:var(--ink)">${mtEsc(a.prenom||a.slug)}</strong><span style="font-size:9px;font-weight:800;color:var(--brand);text-transform:uppercase">${mtEsc(a.type)}</span></div><div style="font-size:11px;color:var(--muted);margin-top:3px">${mtEsc(a.text)}</div></button>`).join(""):'<p style="font-size:12px;color:#166534;margin:0">✓ Rien d’urgent à regarder aujourd’hui.</p>';}
const mtOriginalLoadAllClients=loadAllClients;
loadAllClients=async function(){if(!sb){log("❌ Connecte Supabase d'abord.");return;}const {data,error}=await sb.from(SB_TABLE).select("slug,prenom,programme");if(error){log("❌ "+error.message);return;}const norm=(data||[]).map(c=>({...c,programme:mtNormalizeProgramme(c.programme||{})}));log(`✅ ${norm.length} client(s) chargé(s).`);renderClientsList(norm);mtRenderAdminAlerts(norm);};

/* ---------- clôture de semaine ---------- */
function mtPrepareNextWeek(){if(!currentSlug){log("❌ Sélectionne un client.");return;}programme=mtNormalizeProgramme(programme);mtPersistAdminDayDraft();const current=mtCurrentWeek(programme),nb=programme.timeline.nbSemaines||4;if(current>=nb){log("✅ Dernière semaine : pas de semaine suivante à préparer.");return;}if(!confirm(`Valider S${current} et préparer S${current+1} ? Le menu de S${current} sera copié comme base, puis tu pourras l’adapter.`))return;programme.week_reviews[String(current)]={validatedAt:new Date().toISOString()};const next=String(current+1);if(!Object.keys(mtWeekDays(programme,current+1)).length)programme.weeks[next]={days:mtDeepClone(mtWeekDays(programme,current))};mtAdminWeek=current+1;adminDay=Object.keys(mtWeekDays(programme,mtAdminWeek))[0]||null;mtRenderAdminWeekNav();renderAdminDaysNav(mtWeekDays(programme,mtAdminWeek));log(`✅ S${current} validée. S${current+1} est prête à être adaptée — sauvegarde le client.`);}

/* ---------- PDF corrigé : aucune victoire inventée ---------- */
mtComputeSmartScore=function(slug){const p=_currentProg||programme||{};let total=0,count=0,checks=0;for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const x=(p.suivi||{})[mtLocalDateKey(d)]||{};["energie","sommeil","digestion"].forEach(k=>{if(x[k]){total+=Number(x[k]);count++;}});["eau","repas","infusion","sport"].forEach(k=>{if(x[k])checks++;});}const base=count?Math.round(total/(count*5)*65):0,habit=Math.round(checks/(7*4)*35);return Math.min(100,base+habit);};
mtGeneratePremiumPDF=function(){const jsPDF=window.jspdf?.jsPDF;if(!jsPDF){alert("Le générateur PDF n'est pas chargé.");return;}const slug=currentSlug||"cliente",prog=mtNormalizeProgramme(_currentProg||programme||{}),score=mtComputeSmartScore(slug),doc=new jsPDF({unit:"mm",format:"a4"});doc.setFillColor(250,248,243);doc.rect(0,0,210,297,"F");doc.setTextColor(45,36,30);doc.setFont("times","italic");doc.setFontSize(28);doc.text("Méthode Tee",20,28);doc.setFont("helvetica","normal");doc.setFontSize(10);doc.setTextColor(122,112,104);doc.text("Rapport de fin de programme",20,38);doc.setDrawColor(83,100,74);doc.line(20,44,190,44);doc.setTextColor(45,36,30);doc.setFont("times","normal");doc.setFontSize(18);doc.text("Synthèse",20,60);doc.setFont("helvetica","normal");doc.setFontSize(11);doc.setTextColor(80,70,62);const lines=["Cliente : "+(document.getElementById("display-prenom")?.textContent||slug),"Objectif : "+(prog.objectif||"Non renseigné"),"Semaine actuelle : "+mtCurrentWeek(prog)+"/"+(prog.timeline.nbSemaines||4),"Score de suivi : "+score+"/100",prog.terrain?.dominant?"Repère principal : "+prog.terrain.dominant:"Repère principal : non renseigné"];doc.text(lines,20,72,{maxWidth:170,lineHeightFactor:1.55});doc.setFont("times","normal");doc.setFontSize(18);doc.setTextColor(45,36,30);doc.text("Victoires & continuité",20,125);doc.setFont("helvetica","normal");doc.setFontSize(11);doc.setTextColor(80,70,62);const vic=(prog.transformation?.victoires||"").split("\n").filter(Boolean);doc.text(vic.length?vic.map(v=>"• "+v):["Aucune victoire renseignée pour le moment."],20,137,{maxWidth:170,lineHeightFactor:1.6});const ressentis=(prog.transformation?.ressentis||"").split("\n").filter(Boolean);if(ressentis.length){doc.setFont("times","normal");doc.setFontSize(16);doc.setTextColor(45,36,30);doc.text("Ressentis",20,175);doc.setFont("helvetica","normal");doc.setFontSize(10);doc.setTextColor(80,70,62);doc.text(ressentis.map(v=>"• "+v),20,184,{maxWidth:170,lineHeightFactor:1.5});}doc.setFillColor(83,100,74);doc.roundedRect(20,244,170,20,5,5,"F");doc.setTextColor(255,255,255);doc.setFont("helvetica","bold");doc.setFontSize(11);doc.text("Continuer avec les repères validés avec Tee",34,256);doc.save("rapport-methode-tee-"+slug+".pdf");};

/* ---------- dates locales dans rapport global ---------- */
const mtOriginalRenderSuiviGlobal=renderSuiviGlobal;
renderSuiviGlobal=async function(){if(!sb)return;const today=mtLocalDateKey();const de=document.getElementById("suivi-global-date"),le=document.getElementById("suivi-global-list");if(de)de.textContent=new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});if(!le)return;le.innerHTML='<p style="font-size:12px;color:var(--muted)">Chargement…</p>';try{const res=await sb.from(SB_TABLE).select("slug,prenom,programme");if(res.error||!res.data){le.innerHTML='<p style="font-size:12px;color:var(--muted)">Erreur.</p>';return;}const filled=[],waiting=[];res.data.forEach(c=>{const s=c.programme?.suivi?.[today];(s?.filled?filled:waiting).push({prenom:c.prenom,slug:c.slug,suivi:s});});let h=`<div style="display:flex;gap:8px;margin-bottom:12px"><div style="flex:1;background:#dcfce7;border-radius:12px;padding:10px;text-align:center"><strong style="font-size:22px;color:#16a34a">${filled.length}</strong><div style="font-size:10px;color:#16a34a">Remplis</div></div><div style="flex:1;background:#f0ece6;border-radius:12px;padding:10px;text-align:center"><strong style="font-size:22px;color:var(--muted)">${waiting.length}</strong><div style="font-size:10px;color:var(--muted)">En attente</div></div></div>`;filled.forEach(c=>h+=`<button type="button" onclick="selectClient('${mtAttr(c.slug)}')" style="width:100%;text-align:left;border:0;background:#f8f4ee;border-radius:12px;padding:10px 12px;margin-bottom:6px;font-family:inherit"><strong style="font-size:12px">${mtEsc(c.prenom||c.slug)}</strong><span style="font-size:11px;color:var(--muted);margin-left:8px">Énergie ${mtEsc(c.suivi?.energie||"—")}/5 · Sommeil ${mtEsc(c.suivi?.sommeil||"—")}/5</span></button>`);if(waiting.length)h+=`<p style="font-size:10px;color:var(--muted);font-weight:800;margin:12px 0 6px">EN ATTENTE</p><div style="display:flex;gap:6px;flex-wrap:wrap">${waiting.map(c=>`<button type="button" class="chip" onclick="selectClient('${mtAttr(c.slug)}')">${mtEsc(c.prenom||c.slug)}</button>`).join("")}</div>`;le.innerHTML=h;}catch(e){le.textContent="Erreur : "+e.message;}};

/* ---------- messages admin sécurisés ---------- */
renderMessagesAdmin=function(prog){const msgs=prog.messages||[],fil=document.getElementById("messages-admin-fil"),badge=document.getElementById("messages-admin-badge");if(!fil)return;const n=msgs.filter(m=>m.auteur==="client"&&!m.lu).length;if(badge){badge.style.display=n?"inline-block":"none";if(n)badge.textContent=`${n} nouveau${n>1?"x":""}`;}fil.innerHTML=msgs.length?msgs.map(m=>{const c=m.auteur==="client";return `<div style="display:flex;flex-direction:column;align-items:${c?"flex-start":"flex-end"}"><div style="max-width:90%;background:${c?"#f8f4ee":"var(--brand)"};color:${c?"var(--ink)":"white"};border-radius:14px;padding:10px 14px"><p style="font-size:10px;font-weight:800;text-transform:uppercase;margin:0 0 4px">${c?"Client":"Tee"}</p><p style="font-size:13px;line-height:1.6;margin:0;white-space:pre-wrap">${mtEsc(m.texte)}</p></div><span style="font-size:10px;color:var(--muted);margin-top:3px">${mtEsc(m.date||"")}</span></div>`;}).join(""):'<p style="font-size:12px;color:var(--muted);font-style:italic">Aucun message.</p>';};

/* ---------- init DOM V6 ---------- */
mtInjectAdminV6();
try{mtRenderTerrainQuestions();}catch(e){}
if(window.MT_ADMIN_PAGE){
  const nb=document.getElementById("f-nb-semaines");if(nb)nb.addEventListener("change",()=>{programme=mtNormalizeProgramme(programme);programme.timeline.nbSemaines=parseInt(nb.value)||4;for(let s=1;s<=programme.timeline.nbSemaines;s++)if(!programme.weeks[String(s)])programme.weeks[String(s)]={days:{}};mtRenderAdminWeekNav();renderTimelineAdmin(syncTimeline());});
}

/* ---------- demande phyto : plus de recommandation automatique ---------- */
analyserSymptome=function(texte){
  _phytoSymptome=String(texte||"").trim();
  const result=document.getElementById("phyto-result"),suggestions=document.getElementById("phyto-suggestions"),checklist=document.getElementById("phyto-checklist");
  if(!result)return;
  if(_phytoSymptome.length<3){result.style.display="none";return;}
  _phytoProduits=[];
  result.style.display="block";
  if(suggestions)suggestions.innerHTML=`<div style="padding:14px;border:1px solid rgba(140,117,97,.15);border-radius:14px;background:#fdfbf7"><strong style="font-size:12px;color:var(--ink)">Demande envoyable à Tee</strong><p style="font-size:12px;color:var(--muted);line-height:1.6;margin:6px 0 0">L’application ne recommande plus automatiquement de plante ou de produit à partir d’un symptôme. Tee vérifie ton dossier, les traitements et les précautions avant de te répondre.</p></div>`;
  if(checklist)checklist.innerHTML="";
};
envoyerPhyto=async function(){
  if(!currentSlug||!sb){alert("Connecte-toi d'abord.");return;}
  const payload={symptome:_phytoSymptome,suggestions:[],possession:[],date:new Date().toLocaleDateString("fr-FR"),statut:"en_attente",validationRequise:true};
  try{const res=await sb.from(SB_TABLE).select("programme").eq("slug",currentSlug).single();if(res.error||!res.data)throw new Error("Client introuvable");const p=Object.assign({},res.data.programme||{});p.phyto_demande=payload;const up=await sb.from(SB_TABLE).update({programme:p}).eq("slug",currentSlug);if(up.error)throw up.error;if(_currentProg)_currentProg.phyto_demande=payload;alert("Demande envoyée à Tee. Elle vérifiera ton profil avant toute recommandation.");const input=document.getElementById("phyto-input");if(input)input.value="";const result=document.getElementById("phyto-result");if(result)result.style.display="none";}catch(e){alert("Erreur : "+e.message);}
};

/* lexique : informations prudentes, sans promesse thérapeutique */
mtRenderLexique=function(){
  const list=document.getElementById("lexique-list");if(!list)return;
  list.innerHTML=Object.entries(MT_PLANTES||{}).map(([nom,p])=>`<div class="card" style="padding:18px"><div style="display:flex;gap:12px;align-items:flex-start"><div style="width:42px;height:42px;border-radius:50%;background:var(--paper);display:flex;align-items:center;justify-content:center;font-size:21px">${mtEsc(p.emoji||"🌿")}</div><div style="flex:1"><h3 class="serif" style="font-size:19px;margin:0 0 4px;color:var(--ink)">${mtEsc(nom)}</h3><p style="font-size:12px;color:var(--muted);line-height:1.6;margin:0 0 8px">Repère botanique à intégrer uniquement si Tee l’a retenu dans ton accompagnement.</p><p style="font-size:11px;color:#9a6b2f;line-height:1.5;margin:0 0 8px">Précaution : ${mtEsc(p.precautions||"Vérifier la compatibilité avec le profil et les traitements.")}</p>${p.produit?`<span class="badge" style="background:rgba(83,100,74,.1);color:var(--brand)">${mtEsc(p.produit)}</span>`:""}</div></div></div>`).join("");
};
try{mtRenderLexique();}catch(e){}

/* liste clients : échappement des champs dynamiques */
afficherClients=function(list){
  const el=document.getElementById("clients-list");if(!el)return;if(!list||!list.length){el.innerHTML='<p style="font-size:12px;color:var(--muted)">Aucun client.</p>';return;}
  el.innerHTML=list.map(c=>{const statut=(c.programme&&c.programme.statut)||"nouveau",s=STATUT_MAP[statut]||STATUT_MAP.nouveau,renewal=getRenewalStatus(c.programme||{});let rb="";if(renewal&&renewal.joursRestants<=14){const urg=renewal.joursRestants<=3;rb=`<span style="font-size:8px;font-weight:800;padding:2px 6px;border-radius:999px;background:${urg?"#fee2e2":"#fef3c7"};color:${urg?"#dc2626":"#92400e"}">${urg?"🔴":"🟡"} J-${renewal.joursRestants}</span>`;}const rdv=c.programme?.rdv;let rdvLabel="";if(rdv){const rd=mtParseLocalDate(rdv),diff=mtDaysDiff(rd,new Date());if(diff>=0&&diff<=7)rdvLabel=`<span style="font-size:9px;color:#2563eb;font-weight:700">📅 RDV dans ${diff}j</span>`;}return `<div class="client-row ${c.slug===currentSlug?"active":""}" data-slug="${mtAttr(c.slug)}"><div style="display:flex;align-items:center;gap:10px;min-width:0"><div class="mini-avatar">${mtEsc((c.prenom||c.slug||"?").charAt(0).toUpperCase())}</div><div style="min-width:0"><div style="font-size:13px;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${mtEsc(c.prenom||"—")}</div><div style="display:flex;align-items:center;gap:6px">${rdvLabel||`<div style="font-size:11px;color:var(--muted)">${mtEsc(c.slug)}</div>`}</div></div></div><div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px"><span style="font-size:9px;font-weight:800;text-transform:uppercase;padding:3px 8px;border-radius:999px;background:${s.bg};color:${s.color}">${mtEsc(s.label)}</span>${rb}</div></div>`;}).join("");
  el.querySelectorAll(".client-row").forEach(row=>row.addEventListener("click",()=>selectClient(row.dataset.slug)));
};

/* assure le nouveau rendu des questions si l'ancien init avait déjà tourné */
try{mtRenderTerrainQuestions();}catch(e){}

/* sélection produits : évite d'injecter les titres dans du JavaScript inline */
toggleSelection=function(idx){
  const p=(_currentProg?.products||programme?.products||[])[idx]||{};
  const pos=_selection.findIndex(s=>s.idx===idx);
  if(pos>-1)_selection.splice(pos,1);else _selection.push({idx,titre:p.titre||"Produit",emoji:p.emoji||"🌿"});
  updateSelectionUI();
};
updateSelectionUI=function(){
  const panel=document.getElementById("selection-panel"),list=document.getElementById("selection-list");if(!panel||!list)return;
  panel.style.display=_selection.length?"block":"none";
  list.innerHTML=_selection.map((s,i)=>`<div style="display:flex;flex-direction:column;gap:4px;padding:8px 0;border-bottom:1px solid #f0ece6"><div style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink)"><span>${mtEsc(s.emoji)}</span><span style="flex:1">${mtEsc(s.titre)}</span><button type="button" data-remove-product="${s.idx}" style="border:0;background:transparent;color:#dc2626;font-size:18px;cursor:pointer">×</button></div><input class="mt-selection-format" data-selection-index="${i}" placeholder="Format (ex: 100g, 10 sachets…)" value="${mtAttr(s.format||"")}" style="width:100%;border:1px solid #e8e4de;border-radius:10px;padding:7px 12px;font-size:12px;font-family:inherit;outline:none;color:var(--ink)"></div>`).join("");
  list.querySelectorAll("[data-remove-product]").forEach(b=>b.addEventListener("click",()=>toggleSelection(+b.dataset.removeProduct)));
  list.querySelectorAll(".mt-selection-format").forEach(inp=>inp.addEventListener("change",()=>{const i=+inp.dataset.selectionIndex;if(_selection[i])_selection[i].format=inp.value;}));
  document.querySelectorAll("[id^='selbtn-']").forEach(btn=>{const idx=+btn.id.replace("selbtn-","");const sel=_selection.some(s=>s.idx===idx);btn.style.background=sel?"var(--brand)":"#f0ece6";btn.style.color=sel?"white":"var(--ink)";btn.textContent=sel?"✓ Sélectionné":"+ Sélectionner";});
};

/* renouvellement calculé en date locale */
getRenewalStatus=function(prog){const tl=prog.timeline||{},start=mtParseLocalDate(tl.dateDebut);if(!start)return null;const fin=new Date(start);fin.setDate(fin.getDate()+((tl.nbSemaines||4)*7));const joursRestants=Math.ceil(mtDaysDiff(fin,new Date()));return{joursRestants,dateFin:fin.toLocaleDateString("fr-FR",{day:"numeric",month:"long"})};};
