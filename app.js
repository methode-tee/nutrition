
/* ════════════════════════════════════════
   CONFIG
════════════════════════════════════════ */
const DEFAULT_SB_URL = "https://oomyrntkxroebztukntp.supabase.co";
const DEFAULT_SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vbXlybnRreHJvZWJ6dHVrbnRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyOTEwMDAsImV4cCI6MjA5NDg2NzAwMH0.gCDUggHR2ZOMSn2sgTO2DoJ-0U4fXEFQm-zlUfAFUe4";
const SB_TABLE       = "mt_clients";
const SETTINGS_KEY   = "mt_sb_settings";

/* ════════════════════════════════════════
   AUTH ADMIN (hash SHA-256)
════════════════════════════════════════ */
async function checkAdminAuth(userId) {
  if (!sb) return false;
  if (!userId) return false;
  const request=sb.from("mt_admin_users").select("user_id").eq("user_id",userId).maybeSingle();
  const timeout=new Promise((_,reject)=>setTimeout(()=>reject(new Error("Vérification trop longue")),10000));
  const {data,error} = await Promise.race([request,timeout]);
  return !error && !!data;
}

function showAuthScreen(isAdmin=false) {
  hideLoading();
  const label=isAdmin?"Espace professionnel":"Espace privé";
  const hint=isAdmin?"Connecte-toi avec ton compte administrateur.":"Entre l’adresse e-mail utilisée pour ton accompagnement.";
  document.body.innerHTML=`<main class="auth-page"><section class="auth-card"><p class="auth-kicker">${label}</p><h1>Bienvenue dans<br><em>Méthode Tee</em></h1><p>${hint}</p><form id="mt-auth-form"><label for="mt-auth-email">Adresse e-mail</label><input id="mt-auth-email" type="email" autocomplete="email" required placeholder="bonjour@exemple.com"><button type="submit">Recevoir mon lien sécurisé</button></form><p id="mt-auth-status" class="auth-status"></p></section></main>`;
  document.getElementById("mt-auth-form").addEventListener("submit",async(e)=>{
    e.preventDefault();
    const email=document.getElementById("mt-auth-email").value.trim();
    const status=document.getElementById("mt-auth-status");
    status.textContent="Envoi en cours…";
    const redirectTo=new URL(isAdmin?"admin.html":"index.html",location.href).href;
    const {error}=await sb.auth.signInWithOtp({email,options:{emailRedirectTo:redirectTo}});
    status.textContent=error?"Impossible d’envoyer le lien. Réessaie.":"Lien envoyé. Consulte ta boîte e-mail.";
  });
}

/* ════════════════════════════════════════
   ÉTAT GLOBAL
════════════════════════════════════════ */
let sb = null, currentSlug = null, currentDay = null, adminDay = null, isClientMode = false;
let _currentProg = null, _allClients = [];
let _selection = [], _phytoSymptome = "", _phytoProduits = [];
var _notifTimers = { timeouts:[], intervals:[] };

function emptyProgramme() {
  return {
    semaine:"", parcours:"equilibre", objectif:"", coach:"", goals:[], tasks:[], days:{}, products:[],
    signature:{titre:"",ingredients:[],description:""},
    rituel:{matin:"",midi:"",soir:"",note:""},
    terrain:{dominant:"",axes:[],note:""},
    protocole:{matin:"",midi:"",soir:"",duree:""},
    methode:[], offre:"", timeline:{}, transformation:{},
    statut:"nouveau", promo_code:"", rdv:""
  };
}
let programme = emptyProgramme();

/* ════════════════════════════════════════
   SUPABASE
════════════════════════════════════════ */
function loadSettings() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("reset") === "1") localStorage.removeItem(SETTINGS_KEY);
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    if (!saved || !saved.url || !saved.key) return {url:DEFAULT_SB_URL,key:DEFAULT_SB_KEY};
    // Si une ancienne URL Supabase est restée dans le téléphone, on revient au bon projet.
    if (!String(saved.url).includes("oomyrntkxroebztukntp")) return {url:DEFAULT_SB_URL,key:DEFAULT_SB_KEY};
    return saved;
  } catch {
    return {url:DEFAULT_SB_URL,key:DEFAULT_SB_KEY};
  }
}
function saveSettings(url,key) { localStorage.setItem(SETTINGS_KEY,JSON.stringify({url,key})); }
function getFactory() {
  if (window.supabase?.createClient) return window.supabase.createClient;
  if (window.supabaseJs?.createClient) return window.supabaseJs.createClient;
  throw new Error("Supabase JS non chargé.");
}
function connectSupabase() {
  const url=document.getElementById("sb-url").value.trim();
  const key=document.getElementById("sb-key").value.trim();
  if (!url||!key){log("❌ URL et clé requises.");return;}
  try { sb=getFactory()(url,key); saveSettings(url,key); log("✅ Connecté ! Clique sur Tester."); }
  catch(e){log("❌ "+e.message);}
}
async function testSupabase() {
  if (!sb){log("❌ Connecte d'abord.");return;}
  const {data,error}=await sb.from(SB_TABLE).select("slug").limit(5);
  if (error) { log("❌ "+error.message+"\n\nVérifie que la migration supabase-security.sql a bien été exécutée."); }
  else { log("✅ Table OK — "+(data.length)+" client(s).\n"+(data.length?data.map(r=>"• "+r.slug).join("\n"):"Vide.")); renderClientsList(data); }
}

/* ════════════════════════════════════════
   CHARGEMENT CLIENT DEPUIS URL
════════════════════════════════════════ */
async function loadAuthenticatedClient() {
  isClientMode=true;
  const fabAdmin=document.getElementById("fab-admin");
  if(fabAdmin) fabAdmin.classList.add("hidden");
  const settings=loadSettings();
  if (!settings.url||!settings.key){showError("App non configurée. Contacte ton coach.");return;}
  try {
    sb=getFactory()(settings.url,settings.key);
    const timeout=new Promise((_,r)=>setTimeout(()=>r(new Error("Connexion Supabase trop longue. Vérifie ta connexion puis réessaie.")),12000));
    const {data:{session},error:sessionError}=await sb.auth.getSession();
    if(sessionError) throw sessionError;
    const user=session?.user;
    if(!user){showAuthScreen(false);return;}

    const email=(user.email||"").trim().toLowerCase();
    if(!email){
      await sb.auth.signOut();
      showAuthScreen(false);
      const status=document.getElementById("mt-auth-status");
      if(status) status.textContent="Ta session a expiré. Reconnecte-toi avec l’e-mail de ton accompagnement.";
      return;
    }

    const req=sb.from(SB_TABLE).select("slug,prenom,programme").ilike("client_email",email).maybeSingle();
    const {data,error}=await Promise.race([req,timeout]);
    if(error) throw new Error("Impossible de charger ta fiche pour le moment. Réessaie dans quelques instants.");

    // Une ancienne session (admin, autre cliente, e-mail modifié...) ne doit jamais faire planter l’espace client.
    if(!data){
      await sb.auth.signOut();
      currentSlug=null;
      _currentProg=null;
      showAuthScreen(false);
      const status=document.getElementById("mt-auth-status");
      if(status) status.textContent="Cette session ne correspond à aucune fiche cliente. Entre l’e-mail lié à ton accompagnement.";
      return;
    }

    currentSlug=data.slug;
    renderClientView(data.prenom,data.programme||{});
    hideLoading();
  } catch(e){showError("Erreur : "+e.message);}
}

async function logoutClient(){
  const btn=document.getElementById("client-logout-btn");
  if(btn){btn.disabled=true;btn.style.opacity=".55";}
  try{
    clearNotifTimers();
    if(sb) await sb.auth.signOut();
  }catch(e){
    console.warn("[MT] Déconnexion :",e.message);
  }finally{
    currentSlug=null;
    currentDay=null;
    _currentProg=null;
    _selection=[];
    // Recharge l’entrée client sans conserver d’éventuels paramètres/hash du magic link.
    location.replace(new URL("./index.html",location.href).href);
  }
}

/* ════════════════════════════════════════
   RENDU CLIENT
════════════════════════════════════════ */
function safeRender(fn,label) { try{fn();}catch(e){console.warn("[MT] "+label+" :",e.message);} }

function renderClientView(prenom,prog) {
  _currentProg=prog||{};
  const p=(prenom||"toi").trim();
  document.getElementById("display-prenom").textContent=p;
  document.getElementById("avatar").textContent=p.charAt(0).toUpperCase();
  document.title="Méthode Tee — "+p;
  const d=document.getElementById("today-date");
  if(d) d.textContent=new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});
  document.getElementById("goal-title").textContent=prog.objectif||"";
  document.body.dataset.parcours=prog.parcours==="performance"?"performance":"equilibre";
  const parcoursBadge=document.getElementById("parcours-badge");
  if(parcoursBadge) parcoursBadge.textContent=prog.parcours==="performance"?"Performance":"Équilibre";
  renderProfileCheckin(prog.parcours||"equilibre");
  document.getElementById("goal-list").innerHTML=(prog.goals||[]).map(g=>`<li style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:6px"><i data-lucide="check" style="width:14px;height:14px;flex-shrink:0;opacity:.85"></i>${g}</li>`).join("");
  document.getElementById("coach-msg").textContent=prog.coach?`"${prog.coach}"`:"";
  document.getElementById("week-badge").textContent=prog.semaine||"";
  document.getElementById("tasks-list").innerHTML=(prog.tasks||[]).map((t,i)=>`<div class="task-item" id="task-${i}" onclick="toggleTask(${i})"><div class="task-check" id="check-${i}"><i data-lucide="check" style="width:13px;height:13px;color:white;display:none" id="checkicon-${i}"></i></div><span class="task-text" style="font-size:13px;font-weight:500;color:var(--ink)">${t}</span></div>`).join("");

  // Bannière Maison Yanna + code promo
  const offreVal=prog.offre||"";
  const promoCode=prog.promo_code||"";
  const bannerDiv=document.getElementById("my-banner");
  const bannerTxt=document.getElementById("my-banner-text");
  const promoWrap=document.getElementById("my-promo-wrap");
  const promoEl=document.getElementById("my-promo-code");
  const offresMap={"signature":"Offre Signature : -15% sur toute la boutique Maison Yanna","privilege":"Offre Privilege : 5 produits offerts — envoie ta sélection","elite":"Offre Elite : 10 produits offerts à la quantité souhaitée"};
  if (bannerDiv&&bannerTxt&&offresMap[offreVal]) {
    bannerTxt.textContent=offresMap[offreVal];
    if (promoCode&&promoEl&&promoWrap) { promoEl.textContent=promoCode; promoWrap.style.display="block"; }
    else if (promoWrap) promoWrap.style.display="none";
    bannerDiv.style.display="block";
  } else if(bannerDiv) bannerDiv.style.display="none";

  const messagesNonLus=(prog.messages||[]).filter(m=>m.auteur==="tee"&&!m.lu).length;
  const msgBadge=document.getElementById("messages-badge");
  if(msgBadge){msgBadge.style.display=messagesNonLus>0?"flex":"none";if(messagesNonLus>0)msgBadge.textContent=messagesNonLus;}

  const days=Object.keys(prog.days||{});
  currentDay=days[0]||null;
  renderDaysNav(prog.days||{});
  renderMeals(prog.days||{});
  renderRituel(prog.rituel||{});
  renderTerrain(prog.terrain||{});
  renderProtocole(prog.protocole||{});
  renderProducts(prog.products||[]);
  renderSignature(prog.signature||{});
  renderMethodRules(prog.methode||[]);
  renderProgramme(prog);
  renderTransformation(prog);
  renderPhotos(prog.photos||[]);
  safeRender(()=>renderMessages(prog),"renderMessages");

  const slugR=currentSlug;
  requestAnimationFrame(()=>{
    safeRender(()=>restoreTasks(slugR),"restoreTasks");
    safeRender(()=>renderHistorique(slugR),"renderHistorique");
    safeRender(()=>initSuivi(),"initSuivi");
    setTimeout(()=>safeRender(()=>initNotifications(slugR),"initNotifications"),300);
  });
  lucide.createIcons();
}

function copierPromo() {
  const code=document.getElementById("my-promo-code").textContent;
  if (!code) return;
  if (navigator.clipboard&&window.isSecureContext) {
    navigator.clipboard.writeText(code).then(()=>{ const b=document.getElementById("my-promo-wrap").querySelector("button"); if(b){b.textContent="✓";setTimeout(()=>{b.textContent="⎘";},1500);} });
  } else { prompt("Ton code :",code); }
}

/* ════════════════════════════════════════
   PHOTOS DE PROGRESSION
════════════════════════════════════════ */
async function renderPhotos(photos) {
  const grid=document.getElementById("photos-grid");
  if (!grid) return;
  if (!photos||!photos.length) { grid.innerHTML='<p style="font-size:12px;color:var(--muted);grid-column:1/-1;text-align:center;padding:12px 0">Aucune photo pour le moment.</p>'; return; }
  const secured=await Promise.all(photos.map(async p=>{
    if(!p.path) return Object.assign({},p,{signedUrl:""});
    const {data}=await sb.storage.from("mt-photos").createSignedUrl(p.path,3600);
    return Object.assign({},p,{signedUrl:data?.signedUrl||""});
  }));
  grid.innerHTML=secured.map((p,i)=>`
    <div class="photo-thumb">
      <img src="${p.signedUrl}" alt="Photo ${i+1}" loading="lazy">
      <div class="photo-thumb-label">${p.label||("Semaine "+(i+1))}</div>
    </div>`).join("");
}

async function uploadPhoto(input) {
  const file=input.files[0];
  if (!file||!sb) { alert("Connecte-toi d'abord."); input.value=""; return; }
  const slug=currentSlug;
  if (!slug) return;
  const MAX=5*1024*1024; // 5 Mo
  if (file.size>MAX) { alert("Photo trop lourde (max 5 Mo)."); input.value=""; return; }

  const progress=document.getElementById("photo-upload-progress");
  const bar=document.getElementById("photo-progress-bar");
  if(progress) progress.style.display="block";
  if(bar) bar.style.width="30%";

  try {
    const ext=file.name.split(".").pop().toLowerCase()||"jpg";
    const {data:{session}}=await sb.auth.getSession();
    const user=session?.user;
    if(!user) throw new Error("Session expirée");
    const path=`${user.id}/${Date.now()}.${ext}`;
    // Upload dans Supabase Storage (bucket "mt-photos")
    const {data:upData,error:upErr}=await sb.storage.from("mt-photos").upload(path,file,{contentType:file.type,upsert:false});
    if(upErr) throw new Error(upErr.message);
    if(bar) bar.style.width="70%";
    // Sauvegarder dans programme
    const {data:clientData,error:cErr}=await sb.from(SB_TABLE).select("programme").eq("slug",slug).single();
    if(cErr||!clientData) throw new Error("Client introuvable");
    const prog=Object.assign({},clientData.programme||{});
    if(!prog.photos) prog.photos=[];
    const label=prompt("Label pour cette photo (ex: Semaine 1, Avant…)","Semaine "+(prog.photos.length+1));
    prog.photos.push({path,label:label||("Photo "+(prog.photos.length+1)),date:new Date().toLocaleDateString("fr-FR")});
    const {error:uErr}=await sb.from(SB_TABLE).update({programme:prog}).eq("slug",slug);
    if(uErr) throw new Error(uErr.message);
    if(bar) bar.style.width="100%";
    if(_currentProg) _currentProg.photos=prog.photos;
    renderPhotos(prog.photos);
    setTimeout(()=>{ if(progress) progress.style.display="none"; if(bar) bar.style.width="0%"; },800);
  } catch(e) {
    if(progress) progress.style.display="none";
    alert("Erreur upload : "+e.message);
  }
  input.value="";
}

/* ════════════════════════════════════════
   TÂCHES
════════════════════════════════════════ */
function toggleTask(i) {
  const el=document.getElementById("task-"+i);
  const check=document.getElementById("check-"+i);
  const icon=document.getElementById("checkicon-"+i);
  const done=el.classList.toggle("done");
  check.style.background=done?"var(--brand)":"white";
  check.style.borderColor=done?"var(--brand)":"#ddd8d0";
  icon.style.display=done?"block":"none";
  const slug=currentSlug||"admin";
  const today=mtLocalDateKey();
  const key="mt_tasks_"+slug+"_"+today;
  try{const s=JSON.parse(localStorage.getItem(key)||"{}");s[i]=done;localStorage.setItem(key,JSON.stringify(s));}catch(e){}
}
function restoreTasks(slug) {
  const today=mtLocalDateKey();
  const key="mt_tasks_"+(slug||"admin")+"_"+today;
  try {
    const saved=JSON.parse(localStorage.getItem(key)||"{}");
    Object.entries(saved).forEach(([idx,done])=>{
      const el=document.getElementById("task-"+idx);
      const check=document.getElementById("check-"+idx);
      const icon=document.getElementById("checkicon-"+idx);
      if(!el||!done) return;
      el.classList.add("done");
      if(check){check.style.background="var(--brand)";check.style.borderColor="var(--brand)";}
      if(icon) icon.style.display="block";
    });
  }catch(e){}
}

/* ════════════════════════════════════════
   REPAS / JOURS
════════════════════════════════════════ */
function renderDaysNav(days) {
  const keys=Object.keys(days);
  document.getElementById("days-nav").innerHTML=keys.map(day=>`<button class="day-pill ${day===currentDay?"active":""}" onclick="selectDay('${day.replace(/'/g,"\\'")}',this)">${day}</button>`).join("");
}
function selectDay(day,btn) {
  currentDay=day;
  document.querySelectorAll(".day-pill").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  if(_currentProg) renderMeals(_currentProg.days||{});
}
function renderMeals(days) {
  const d=days[currentDay]||{};
  document.getElementById("meal-morning").innerHTML=d.morning||"<em style='color:#ccc'>—</em>";
  document.getElementById("meal-lunch").innerHTML=d.lunch||"<em style='color:#ccc'>—</em>";
  document.getElementById("meal-snack").innerHTML=d.snack||"<em style='color:#ccc'>—</em>";
  document.getElementById("meal-dinner").innerHTML=d.dinner||"<em style='color:#ccc'>—</em>";
}

/* ════════════════════════════════════════
   PRODUITS — liens Shopify dans la DB phyto
════════════════════════════════════════ */
// Map produit → URL Shopify (à enrichir selon ton catalogue)
const SHOPIFY_LINKS = {
  "Maté Boost":                        "https://maisonyanna.com/products/mate-boost",
  "Ashwagandha – racine poudre":       "https://maisonyanna.com/products/ashwagandha",
  "Spiruline – Poudre":                "https://maisonyanna.com/products/spiruline",
  "Plaisir du Coucher":                "https://maisonyanna.com/products/plaisir-du-coucher",
  "Golden Ashwa Latte":                "https://maisonyanna.com/products/golden-ashwa-latte",
  "Nirvana":                           "https://maisonyanna.com/products/nirvana",
  "Bye Bye Tox":                       "https://maisonyanna.com/products/bye-bye-tox",
  "Sunclove":                          "https://maisonyanna.com/products/sunclove",
  "Passion en Provence":               "https://maisonyanna.com/products/passion-en-provence",
  "Homemade Winter Mix":               "https://maisonyanna.com/products/homemade-winter-mix",
  "Sirop de dattes":                   "https://maisonyanna.com/products/sirop-de-dattes",
  "Lune Céleste":                      "https://maisonyanna.com/products/lune-celeste",
  "White Bliss Brownie":               "https://maisonyanna.com/products/white-bliss-brownie",
  "Barre Protéinée Vanilla Dream":     "https://maisonyanna.com/products/barre-vanilla-dream",
  "Thé Vert Detox":                    "https://maisonyanna.com/products/the-vert-detox",
  "Queues de cerise":                  "https://maisonyanna.com/products/queues-de-cerise",
  "Protéines de Chanvre – Poudre Naturelle": "https://maisonyanna.com/products/proteines-chanvre"
};

var PHYTO_DB = {
  fatigue:{mots:["fatig","tired","épuis","exhaust","sans énergie","no energy","mou","faible","crevé"],suggestions:[{emoji:"🧉",nom:"Maté Boost",conseil:"Énergie naturelle durable grâce à la caféine du maté. À prendre le matin."},{emoji:"🌿",nom:"Ashwagandha – racine poudre",conseil:"Plante adaptogène qui combat la fatigue chronique et le stress."},{emoji:"💚",nom:"Spiruline – Poudre",conseil:"Superaliment riche en protéines et fer pour recharger l'organisme."}]},
  sommeil:{mots:["insomni","sleep","dormir","dors pas","réveil","wake up","nuit","sommeil","repos"],suggestions:[{emoji:"🌙",nom:"Plaisir du Coucher",conseil:"Valériane, mélisse et lavande. La tisane sommeil de référence. 1h avant le coucher."},{emoji:"✨",nom:"Golden Ashwa Latte",conseil:"Ashwagandha sans caféine. Apaise le système nerveux pour un sommeil réparateur."},{emoji:"🌿",nom:"Nirvana",conseil:"Sans théine. Menthe, hibiscus, fenouil. Détente et digestion du soir."}]},
  digestion:{mots:["digest","ventre","bloat","gonfle","ballonne","constip","estomac","intestin","lourd"],suggestions:[{emoji:"🌿",nom:"Bye Bye Tox",conseil:"Ortie, fenouil, anis. Drainante et digestive. Après les repas."},{emoji:"🌿",nom:"Nirvana",conseil:"Fenouil, gingembre, menthe, réglisse. Anti-ballonnements naturel."},{emoji:"☀️",nom:"Sunclove",conseil:"Fenouil, réglisse, clou de girofle. Confort digestif et réconfort."}]},
  douleur:{mots:["mal au dos","back pain","courbature","sore","muscle","douleur","pain","articul","joint"],suggestions:[{emoji:"✨",nom:"Golden Ashwa Latte",conseil:"Curcuma + poivre noir = puissant anti-inflammatoire naturel."},{emoji:"🌿",nom:"Ashwagandha – racine poudre",conseil:"Réduit l'inflammation et soutient la récupération musculaire."},{emoji:"🌿",nom:"Passion en Provence",conseil:"Romarin et thym — réconfort articulaire et musculaire."}]},
  stress:{mots:["stress","anxieux","anxiet","nervous","tendu","tension","overwhelm","pression","worry"],suggestions:[{emoji:"✨",nom:"Golden Ashwa Latte",conseil:"L'ashwagandha baisse le cortisol, l'hormone du stress. Sans caféine."},{emoji:"🌙",nom:"Plaisir du Coucher",conseil:"Mélisse, valériane, lavande. Calme profond et rapide."},{emoji:"🌿",nom:"Ashwagandha – racine poudre",conseil:"Plante adaptogène de référence contre le stress chronique."}]},
  toux:{mots:["toux","cough","gorge","throat","rhume","enrhumé","grippe","flu"],suggestions:[{emoji:"🌿",nom:"Passion en Provence",conseil:"Thym et romarin — antiseptiques naturels pour la gorge et les bronches."},{emoji:"🌿",nom:"Homemade Winter Mix",conseil:"Cannelle, clou de girofle, cardamome. Réchauffant et immunisant."},{emoji:"🍯",nom:"Sirop de dattes",conseil:"Adoucissant naturel pour la gorge irritée."}]},
  sucre:{mots:["sucre","sugar","craving","chocolat","grignoter","faim","fringale","hungry"],suggestions:[{emoji:"🍯",nom:"Sirop de dattes",conseil:"Alternative naturelle au sucre raffiné — 100% dattes de Tunisie."},{emoji:"🍫",nom:"White Bliss Brownie",conseil:"Brownie protéiné faible en sucres qui satisfait l'envie de chocolat."},{emoji:"🌿",nom:"Barre Protéinée Vanilla Dream",conseil:"Encas protéiné pour combler la fringale sans sucres vides."}]},
  sport:{mots:["match","training","entraîne","performance","sport","récup","recovery","cardio","endurance","muscle","force"],suggestions:[{emoji:"🧉",nom:"Maté Boost",conseil:"Caféine naturelle du maté pour l'énergie et la concentration avant l'effort."},{emoji:"💚",nom:"Spiruline – Poudre",conseil:"Protéines, fer et antioxydants pour la performance et la récupération."},{emoji:"🌿",nom:"Protéines de Chanvre – Poudre Naturelle",conseil:"Protéine végétale complète pour la récupération musculaire post-entraînement."}]},
  detox:{mots:["detox","détox","purif","nettoyer","cleanse","drain","peau","skin","acné","teint"],suggestions:[{emoji:"🌿",nom:"Bye Bye Tox",conseil:"La tisane détox phare — ortie, bouleau, prêle. Draine en douceur."},{emoji:"🌿",nom:"Thé Vert Detox",conseil:"Stimule le métabolisme et aide l'élimination des toxines."},{emoji:"🌿",nom:"Queues de cerise",conseil:"Anti-rétention d'eau, drainante naturelle classique."}]}
};

function analyserSymptome(texte) {
  _phytoSymptome=texte;
  if(texte.length<3){document.getElementById("phyto-result").style.display="none";return;}
  const txt=texte.toLowerCase();
  let trouve=null;
  for(const cat in PHYTO_DB){
    const db=PHYTO_DB[cat];
    if(db.mots.some(m=>txt.includes(m))){trouve=db;break;}
  }
  if(!trouve){document.getElementById("phyto-result").style.display="none";return;}
  document.getElementById("phyto-result").style.display="block";
  _phytoProduits=trouve.suggestions;
  // ── Suggestions avec lien Shopify direct ──
  document.getElementById("phyto-suggestions").innerHTML=trouve.suggestions.map(s=>{
    const lien=SHOPIFY_LINKS[s.nom]||"https://maisonyanna.com";
    return `<div style="padding:12px 14px;border:1px solid rgba(140,117,97,.15);border-radius:14px;background:#fdfbf7">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="font-size:18px">${s.emoji}</span>
        <span style="font-size:13px;font-weight:700;color:var(--ink);flex:1">${s.nom}</span>
        <a href="${lien}" target="_blank" rel="noopener" style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;background:var(--brand);color:white;padding:4px 10px;border-radius:999px;text-decoration:none;white-space:nowrap">Voir →</a>
      </div>
      <p style="font-size:12px;color:var(--muted);margin:0">${s.conseil}</p>
    </div>`;
  }).join("");
  document.getElementById("phyto-checklist").innerHTML=trouve.suggestions.map((s,i)=>`<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer"><input type="checkbox" id="phyto-check-${i}" style="width:18px;height:18px;accent-color:var(--brand)"><span>${s.emoji} ${s.nom}</span></label>`).join("");
}

async function envoyerPhyto() {
  const slug=currentSlug;
  if(!slug||!sb){alert("Connecte-toi d'abord.");return;}
  const possession=_phytoProduits.filter((_,i)=>{const e=document.getElementById("phyto-check-"+i);return e&&e.checked;}).map(s=>s.nom);
  const payload={symptome:_phytoSymptome,suggestions:_phytoProduits.map(s=>s.emoji+" "+s.nom),possession,date:new Date().toLocaleDateString("fr-FR"),statut:"en_attente"};
  try {
    const res=await sb.from(SB_TABLE).select("programme").eq("slug",slug).single();
    if(res.error||!res.data) throw new Error("Client introuvable");
    const prog=Object.assign({},res.data.programme||{});
    prog.phyto_demande=payload;
    const res2=await sb.from(SB_TABLE).update({programme:prog}).eq("slug",slug);
    if(res2.error) throw new Error(res2.error.message);
    alert("Envoyé à Tee ! Elle te répondra très vite.");
    document.getElementById("phyto-input").value="";
    document.getElementById("phyto-result").style.display="none";
  } catch(e){alert("Erreur : "+e.message);}
}

/* ════════════════════════════════════════
   SÉLECTION PRODUITS
════════════════════════════════════════ */
function renderProducts(products) {
  document.getElementById("products-grid").innerHTML=products.map((p,idx)=>`
    <div class="product-card ${p.featured?"featured":""}" id="pcard-${idx}">
      <div class="product-emoji-wrap" style="background:${p.featured?"var(--ink)":"var(--paper)"}">${p.emoji||"🌿"}</div>
      <h4 style="font-size:12px;font-weight:700;text-align:center;color:var(--ink);margin:0 0 6px;line-height:1.3">${p.titre||""}</h4>
      <p style="font-size:11px;color:var(--muted);text-align:center;line-height:1.5;flex-grow:1;margin:0 0 8px">${p.texte||""}</p>
      ${p.lien?`<a href="${p.lien}" target="_blank" rel="noopener" class="product-btn" style="background:${p.featured?"var(--brand)":"#f0ece6"};color:${p.featured?"white":"var(--ink)"};margin-bottom:6px">Voir le produit</a>`:""}
      <button onclick="toggleSelection(${idx},'${(p.titre||"").replace(/'/g,"\\'")}','${(p.emoji||"🌿")}')" id="selbtn-${idx}" class="product-btn" style="background:#f0ece6;color:var(--ink);border:1.5px solid #e2ddd7" type="button">+ Sélectionner</button>
    </div>`).join("");
  restoreSelection();
}
function toggleSelection(idx,titre,emoji){
  const pos=_selection.findIndex(s=>s.idx===idx);
  if(pos>-1) _selection.splice(pos,1); else _selection.push({idx,titre,emoji});
  updateSelectionUI();
}
function updateSelectionUI(){
  const panel=document.getElementById("selection-panel");
  const list=document.getElementById("selection-list");
  if(!panel||!list) return;
  panel.style.display=_selection.length?"block":"none";
  if(_selection.length) {
    list.innerHTML=_selection.map(s=>`<div style="display:flex;flex-direction:column;gap:4px;padding:8px 0;border-bottom:1px solid #f0ece6"><div style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink)"><span>${s.emoji}</span><span style="flex:1">${s.titre}</span><span onclick="toggleSelection(${s.idx},'${s.titre.replace(/'/g,"\\'")}','${s.emoji}')" style="color:#dc2626;font-size:16px;cursor:pointer">×</span></div><input placeholder="Format (ex: 100g, 10 sachets…)" value="${s.format||""}" onchange="_selection[${_selection.indexOf(s)}].format=this.value" style="width:100%;border:1px solid #e8e4de;border-radius:10px;padding:7px 12px;font-size:12px;font-family:inherit;outline:none;color:var(--ink)"></div>`).join("");
  }
  document.querySelectorAll("[id^='selbtn-']").forEach(btn=>{
    const i=parseInt(btn.id.replace("selbtn-",""));
    const sel=_selection.some(s=>s.idx===i);
    btn.style.background=sel?"var(--brand)":"#f0ece6";
    btn.style.color=sel?"white":"var(--ink)";
    btn.textContent=sel?"✓ Sélectionné":"+ Sélectionner";
  });
}
function restoreSelection(){_selection=[];updateSelectionUI();}
function viderSelection(){_selection=[];updateSelectionUI();}
async function envoyerSelection(){
  if(!_selection.length) return;
  const slug=currentSlug;
  if(!slug||!sb){alert("Impossible d'envoyer — contacte ton coach.");return;}
  const selectionData={produits:_selection.map(s=>s.emoji+" "+s.titre+(s.format?" — "+s.format:"")),date:new Date().toLocaleDateString("fr-FR"),statut:"en_attente"};
  try {
    const res=await sb.from(SB_TABLE).select("programme").eq("slug",slug).single();
    if(res.error||!res.data) throw new Error("Client introuvable");
    const prog=Object.assign({},res.data.programme||{});
    prog.selection=selectionData;
    const res2=await sb.from(SB_TABLE).update({programme:prog}).eq("slug",slug);
    if(res2.error) throw new Error(res2.error.message);
    if(_currentProg) _currentProg.selection=selectionData;
    alert("Sélection envoyée !");
    viderSelection();
  } catch(e){alert("Erreur : "+e.message);}
}

/* ════════════════════════════════════════
   RENDU SECTIONS
════════════════════════════════════════ */
function renderSignature(sig){
  document.getElementById("signature-card").innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:18px">
      <div><h3 class="serif" style="font-size:22px;font-weight:700;color:var(--ink);margin:0 0 4px">${sig.titre||"Plat Signature"}</h3><p style="font-size:12px;color:var(--muted)">Une base saine, pratique et élégante.</p></div>
      <div style="width:48px;height:48px;border-radius:50%;background:var(--paper);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">🍽️</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">${(sig.ingredients||[]).map(i=>`<div style="display:flex;align-items:flex-start;gap:8px;font-size:13px;color:var(--ink)"><span style="color:var(--brand);font-weight:700;margin-top:1px">•</span><span>${i}</span></div>`).join("")}</div>
    <p style="font-size:13px;color:var(--muted);line-height:1.7;margin:0">${sig.description||""}</p>`;
}
function renderMethodRules(rules){
  document.getElementById("method-rules").innerHTML=rules.map(r=>`<div class="method-rule ${r.accent==="accent"?"accent":""}"><h4 style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--ink);margin:0 0 10px">${r.titre||""}</h4><ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px">${(r.items||[]).map(item=>`<li style="font-size:12px;color:var(--muted);display:flex;gap:8px"><span style="color:var(--brand)">•</span>${item}</li>`).join("")}</ul></div>`).join("");
}
function renderRituel(r){
  const el=document.getElementById("rituel-card");
  const rows=[{label:"Matin",value:r.matin},{label:"Midi",value:r.midi},{label:"Soir",value:r.soir}].filter(x=>x.value);
  el.innerHTML=rows.map(x=>`<div style="padding:12px 14px;border:1px solid rgba(140,117,97,.10);border-radius:16px;background:#fff"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.12em;font-weight:800;color:var(--brand);margin-bottom:5px">${x.label}</div><div style="font-size:13px;line-height:1.65;color:var(--ink)">${x.value}</div></div>`).join("")+(r.note?`<p style="font-size:12px;line-height:1.7;color:var(--muted);margin:2px 0 0">${r.note}</p>`:"")+((!rows.length&&!r.note)?`<p style="font-size:12px;color:var(--muted);margin:0">Aucun rituel ajouté.</p>`:"");
}
function renderTerrain(t){
  const el=document.getElementById("terrain-card");
  el.innerHTML=(t.dominant?`<div style="display:inline-flex;padding:6px 12px;border-radius:999px;background:rgba(83,100,74,.1);color:var(--brand);font-size:11px;font-weight:700;margin-bottom:12px">Terrain dominant : ${t.dominant}</div>`:"")+((t.axes||[]).length?`<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">${t.axes.map(a=>`<span style="padding:8px 12px;border-radius:999px;background:var(--paper);font-size:12px;color:var(--ink)">${a}</span>`).join("")}</div>`:"")+(t.note?`<p style="font-size:13px;line-height:1.75;color:var(--muted);margin:0">${t.note}</p>`:"")+((!t.dominant&&!(t.axes||[]).length&&!t.note)?`<p style="font-size:12px;color:var(--muted);margin:0">Aucune analyse ajoutée.</p>`:"");
}
function renderProtocole(p){
  const el=document.getElementById("protocole-card");
  const rows=[{label:"Matin",value:p.matin},{label:"Midi",value:p.midi},{label:"Soir",value:p.soir}].filter(x=>x.value);
  el.innerHTML=rows.map(x=>`<div style="padding:12px 14px;border:1px solid rgba(140,117,97,.10);border-radius:16px;background:#fff"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.12em;font-weight:800;color:var(--brand);margin-bottom:5px">${x.label}</div><div style="font-size:13px;line-height:1.65;color:var(--ink)">${x.value}</div></div>`).join("")+(p.duree?`<p style="font-size:12px;line-height:1.7;color:var(--muted);margin:2px 0 0">Durée : ${p.duree}</p>`:"")+(!rows.length&&!p.duree?`<p style="font-size:12px;color:var(--muted);margin:0">Aucun protocole ajouté.</p>`:"");
}

/* ════════════════════════════════════════
   SUIVI QUOTIDIEN
════════════════════════════════════════ */
function renderProfileCheckin(parcours){
  const el=document.getElementById("profile-checkin");
  if(!el) return;
  const field=(id,label)=>`<div style="margin-top:14px"><label style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;display:block;margin-bottom:8px">${label} <span id="val-${id}" style="color:var(--brand)">3/5</span></label><input type="range" id="suivi-${id}" min="1" max="5" value="3" oninput="document.getElementById('val-${id}').textContent=this.value+'/5';saveSuivi()" style="width:100%;accent-color:var(--brand)"></div>`;
  el.innerHTML=parcours==="performance"
    ?field("recuperation","Récupération")+field("courbatures","Courbatures")+field("disponibilite","Disponibilité physique")
    :field("stress","Stress")+field("faim","Faim et satiété")+field("confort","Confort corporel");
}

function initSuivi(){
  const slug=currentSlug||"admin";
  const today=mtLocalDateKey();
  const el=document.getElementById("suivi-date");
  if(el) el.textContent=new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});
  const key="mt_suivi_"+slug+"_"+today;
  try {
    const s=JSON.parse(localStorage.getItem(key)||"{}");
    if(s.eau) document.getElementById("check-eau").checked=true;
    if(s.repas) document.getElementById("check-repas").checked=true;
    if(s.infusion) document.getElementById("check-infusion").checked=true;
    if(s.sport) document.getElementById("check-sport").checked=true;
    if(s.poids) document.getElementById("suivi-poids").value=s.poids;
    if(s.energie){document.getElementById("suivi-energie").value=s.energie;document.getElementById("val-energie").textContent=s.energie+"/5";}
    if(s.sommeil){document.getElementById("suivi-sommeil").value=s.sommeil;document.getElementById("val-sommeil").textContent=s.sommeil+"/5";}
    if(s.digestion){document.getElementById("suivi-digestion").value=s.digestion;document.getElementById("val-digestion").textContent=s.digestion+"/5";}
    ["recuperation","courbatures","disponibilite","stress","faim","confort"].forEach(id=>{const input=document.getElementById("suivi-"+id);if(input&&s[id]){input.value=s[id];document.getElementById("val-"+id).textContent=s[id]+"/5";}});
    if(s.note) document.getElementById("suivi-note").value=s.note;
  }catch(e){}
  updateScore(slug);
}
function saveSuivi(){
  const slug=currentSlug||"admin";
  const today=mtLocalDateKey();
  const key="mt_suivi_"+slug+"_"+today;
  const data={eau:document.getElementById("check-eau").checked,repas:document.getElementById("check-repas").checked,infusion:document.getElementById("check-infusion").checked,sport:document.getElementById("check-sport").checked,poids:document.getElementById("suivi-poids").value,energie:document.getElementById("suivi-energie").value,sommeil:document.getElementById("suivi-sommeil").value,digestion:document.getElementById("suivi-digestion").value,note:document.getElementById("suivi-note").value,filled:true,date:today};
  ["recuperation","courbatures","disponibilite","stress","faim","confort"].forEach(id=>{const input=document.getElementById("suivi-"+id);if(input)data[id]=input.value;});
  try{localStorage.setItem(key,JSON.stringify(data));}catch(e){}
  updateScore(slug);
  if(sb&&slug&&slug!=="admin"){
    clearTimeout(saveSuivi._timer);
    saveSuivi._timer=setTimeout(async()=>{
      try{
        const res=await sb.from(SB_TABLE).select("programme").eq("slug",slug).single();
        if(res.error||!res.data) return;
        const prog=Object.assign({},res.data.programme||{});
        if(!prog.suivi) prog.suivi={};
        prog.suivi[today]=data;
        await sb.from(SB_TABLE).update({programme:prog}).eq("slug",slug);
      }catch(e){}
    },2000);
  }
}
function updateScore(slug){
  let total=0,filled=0;
  for(let i=6;i>=0;i--){
    const d=new Date();d.setDate(d.getDate()-i);
    const day=mtLocalDateKey(d);
    const key="mt_suivi_"+(slug||"admin")+"_"+day;
    total++;
    try{const s=JSON.parse(localStorage.getItem(key)||"{}");if(s.filled)filled++;}catch(e){}
  }
  const pct=Math.round((filled/total)*100);
  const bar=document.getElementById("score-bar");
  const txt=document.getElementById("score-text");
  if(bar) bar.style.width=pct+"%";
  if(txt) txt.textContent="Tu as rempli "+filled+" jour"+(filled>1?"s":"")+" sur 7 — Score : "+pct+"%";
}

/* ════════════════════════════════════════
   PROGRAMME & TIMELINE
════════════════════════════════════════ */
const REGLES_SEMAINES={
  1:{titre:"1 aliment par moment de la journée",detail:"Tu as 4 moments dans ta journée. Pour chaque moment, choisis 1 aliment parmi ta liste."},
  2:{titre:"2 aliments minimum par moment",detail:"Pour chaque moment de la journée, tu choisis maintenant 2 aliments parmi ta liste."},
  3:{titre:"3 aliments par moment",detail:"On monte en puissance ! Pour chaque moment, tu choisis 3 aliments parmi ta liste."},
  default:{titre:"Respecte toute ta sélection",detail:"Tu es en phase de consolidation. Pour chaque moment, tu consommes l'ensemble de ta liste personnalisée."}
};
function getSemaineEnCours(dateDebut,nbSemaines){
  if(!dateDebut) return 1;
  const diff=Math.floor((new Date()-new Date(dateDebut))/(1000*60*60*24));
  let s=Math.floor(diff/7)+1;
  if(s<1) s=1; if(nbSemaines&&s>nbSemaines) s=nbSemaines;
  return s;
}
function renderProgramme(prog){
  const tl=prog.timeline||{};
  const dateDebut=tl.dateDebut||"";
  const nbSemaines=tl.nbSemaines||4;
  const semaines=tl.semaines||[];
  const sc=getSemaineEnCours(dateDebut,nbSemaines);
  const sub=document.getElementById("prog-subtitle");
  if(sub) sub.textContent=dateDebut?"Programme de "+nbSemaines+" semaines — démarré le "+new Date(dateDebut).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"}):"Programme personnalisé Méthode Tee";
  const regle=REGLES_SEMAINES[sc]||REGLES_SEMAINES.default;
  const rt=document.getElementById("regle-texte");const rd=document.getElementById("regle-detail");
  if(rt) rt.textContent=regle.titre; if(rd) rd.textContent=regle.detail;
  const pct=Math.min(Math.round((sc/nbSemaines)*100),100);
  const bar=document.getElementById("prog-bar");const bl=document.getElementById("prog-bar-label");const sl=document.getElementById("prog-semaine-label");
  if(bar) bar.style.width=pct+"%"; if(bl) bl.textContent="Semaine "+sc+" sur "+nbSemaines; if(sl) sl.textContent="S"+sc+" / S"+nbSemaines;
  const container=document.getElementById("timeline-container");
  if(!container) return;
  let html="";
  for(let s=1;s<=nbSemaines;s++){
    const data=semaines[s-1]||{};
    const enc=s===sc,pass=s<sc;
    const bord=enc?"var(--brand)":pass?"#d1fae5":"#e8e4de";
    const badge=enc?'<span style="font-size:9px;font-weight:800;text-transform:uppercase;padding:3px 8px;border-radius:999px;background:var(--brand);color:white">En cours</span>':pass?'<span style="font-size:9px;font-weight:800;text-transform:uppercase;padding:3px 8px;border-radius:999px;background:#d1fae5;color:#065f46">Terminée ✓</span>':'<span style="font-size:9px;font-weight:800;text-transform:uppercase;padding:3px 8px;border-radius:999px;background:#f0ece6;color:var(--muted)">À venir</span>';
    const rS=REGLES_SEMAINES[s]||REGLES_SEMAINES.default;
    html+=`<div style="border-left:3px solid ${bord};padding-left:16px;position:relative"><div style="position:absolute;left:-8px;top:16px;width:13px;height:13px;border-radius:50%;background:${enc?"var(--brand)":pass?"#34d399":"#e8e4de"};border:2px solid white;box-shadow:0 0 0 2px ${enc?"var(--brand)":pass?"#34d399":"#e8e4de"}"></div><div style="background:${enc?"rgba(83,100,74,.04)":"white"};border:1px solid rgba(140,117,97,.12);border-radius:18px;padding:18px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><h4 class="serif" style="font-size:16px;font-weight:700;color:var(--ink);margin:0">Semaine ${s}</h4>${badge}</div><p style="font-size:11px;color:var(--brand);font-weight:700;margin:0 0 8px">📋 ${rS.titre}</p>`;
    if(data.terrain) html+=`<div style="margin-bottom:10px"><p style="font-size:10px;text-transform:uppercase;letter-spacing:.1em;font-weight:800;color:var(--muted);margin:0 0 6px">Terrain</p><div style="display:flex;flex-wrap:wrap;gap:6px">${data.terrain.split(",").map(t=>`<span style="padding:5px 10px;border-radius:999px;background:rgba(140,117,97,.1);font-size:11px;color:var(--ink)">${t.trim()}</span>`).join("")}</div></div>`;
    if(data.ameliorations) html+=`<div style="margin-bottom:10px"><p style="font-size:10px;text-transform:uppercase;letter-spacing:.1em;font-weight:800;color:var(--muted);margin:0 0 6px">✨ Améliorations</p>${data.ameliorations.split("\n").filter(Boolean).map(a=>`<div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--ink);margin-bottom:4px"><span style="color:#34d399;font-weight:700">+</span>${a.trim()}</div>`).join("")}</div>`;
    if(data.notesCoach) html+=`<div style="background:#f8f4ee;border-radius:12px;padding:10px 12px"><p style="font-size:10px;text-transform:uppercase;letter-spacing:.1em;font-weight:800;color:var(--brand);margin:0 0 4px">Note de Tee</p><p style="font-size:12px;color:var(--ink);font-style:italic;margin:0">"${data.notesCoach}"</p></div>`;
    if(!data.terrain&&!data.ameliorations&&!data.notesCoach&&!enc) html+=`<p style="font-size:12px;color:var(--muted);font-style:italic;margin:0">Données à venir…</p>`;
    html+=`</div></div>`;
  }
  container.innerHTML=html;
}

/* ════════════════════════════════════════
   TRANSFORMATION
════════════════════════════════════════ */
function renderTransformation(prog){
  const transfo=prog.transformation||{};
  const tl=prog.timeline||{};
  const semaines=tl.semaines||[];
  const departTitre=document.getElementById("transfo-depart-titre");
  const departContent=document.getElementById("transfo-depart-content");
  if(departTitre) departTitre.textContent="Semaine 1 — "+new Date(tl.dateDebut||Date.now()).toLocaleDateString("fr-FR",{month:"long",year:"numeric"});
  if(departContent){
    const depart=transfo.depart||"";
    departContent.innerHTML=depart?depart.split("\n").filter(Boolean).map(d=>`<div style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--muted);margin-bottom:6px"><span style="color:var(--accent);font-weight:700">•</span>${d.trim()}</div>`).join(""):`<p style="font-size:12px;color:var(--muted);font-style:italic;margin:0">Bilan de départ à venir…</p>`;
  }
  const objEl=document.getElementById("transfo-objectifs");
  if(objEl){const goals=prog.goals||[];objEl.innerHTML=goals.length?goals.map(g=>`<div style="display:flex;align-items:center;gap:8px;font-size:13px;color:white;margin-bottom:6px"><span style="font-size:16px">→</span>${g}</div>`).join(""):`<p style="font-size:12px;color:rgba(255,255,255,.7);font-style:italic;margin:0">Objectifs à définir…</p>`;}
  const evoEl=document.getElementById("transfo-evolution");
  if(evoEl){evoEl.innerHTML=semaines.length?semaines.map((s,i)=>{if(!s.ameliorations&&!s.notesCoach&&!s.terrain)return"";return`<div style="border-left:3px solid var(--brand);padding-left:14px"><p style="font-size:11px;font-weight:800;color:var(--brand);text-transform:uppercase;letter-spacing:.08em;margin:0 0 6px">Semaine ${i+1}</p>${s.ameliorations?s.ameliorations.split("\n").filter(Boolean).map(a=>`<div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--ink);margin-bottom:4px"><span style="color:#34d399;font-weight:700">+</span>${a.trim()}</div>`).join(""):""}${s.notesCoach?`<p style="font-size:11px;color:var(--muted);font-style:italic;margin:6px 0 0">"${s.notesCoach}"</p>`:""}</div>`;}).filter(Boolean).join("")||`<p style="font-size:12px;color:var(--muted);font-style:italic;margin:0">Évolution en cours…</p>`:`<p style="font-size:12px;color:var(--muted);font-style:italic;margin:0">Évolution en cours…</p>`;}
  const vicEl=document.getElementById("transfo-victoires");
  if(vicEl){const v=transfo.victoires||"";vicEl.innerHTML=v?v.split("\n").filter(Boolean).map(x=>`<div style="display:flex;align-items:center;gap:10px;background:#f8f4ee;border-radius:14px;padding:12px 14px"><span style="font-size:20px">🏆</span><span style="font-size:13px;font-weight:600;color:var(--ink)">${x.trim()}</span></div>`).join(""):`<p style="font-size:12px;color:var(--muted);font-style:italic;margin:0">Tes victoires apparaîtront ici…</p>`;}
  const ressEl=document.getElementById("transfo-ressentis");
  if(ressEl){const r=transfo.ressentis||"";ressEl.innerHTML=r?r.split("\n").filter(Boolean).map(x=>`<div style="background:rgba(83,100,74,.06);border-radius:14px;padding:12px 14px"><p class="serif" style="font-size:13px;color:var(--ink);font-style:italic;margin:0">"${x.trim()}"</p></div>`).join(""):`<p style="font-size:12px;color:var(--muted);font-style:italic;margin:0">Tes ressentis apparaîtront ici…</p>`;}
}

/* ════════════════════════════════════════
   HISTORIQUE VISUEL
════════════════════════════════════════ */
function renderHistorique(slug){
  const jours=[];
  const joursLabels=["D","L","M","M","J","V","S"];
  for(let i=6;i>=0;i--){
    const d=new Date();d.setDate(d.getDate()-i);
    const dateStr=mtLocalDateKey(d);
    const key="mt_suivi_"+(slug||"admin")+"_"+dateStr;
    const label=joursLabels[d.getDay()];
    try{const s=JSON.parse(localStorage.getItem(key)||"{}");jours.push({date:dateStr,label,filled:s.filled||false,energie:parseInt(s.energie)||0,sommeil:parseInt(s.sommeil)||0,digestion:parseInt(s.digestion)||0,poids:s.poids||""});}
    catch(e){jours.push({date:dateStr,label,filled:false,energie:0,sommeil:0,digestion:0,poids:""});}
  }
  let streak=0;
  for(let s=jours.length-1;s>=0;s--){if(jours[s].filled)streak++;else break;}
  const sb2=document.getElementById("streak-badge");
  if(sb2){sb2.style.display=streak>0?"block":"none";if(streak>0)sb2.textContent="🔥 "+streak+" jour"+(streak>1?"s":"")+" de suite";}
  const se=document.getElementById("streak-days");
  if(se){se.innerHTML=jours.map(j=>{const auj=j.date===mtLocalDateKey();const bg=j.filled?"var(--brand)":"#f0ece6";const brd=auj?"2px solid var(--brand)":"2px solid transparent";return`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px"><div style="width:32px;height:32px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;font-size:14px;border:${brd}">${j.filled?"✓":`<span style="color:${j.filled?"white":"var(--muted)"};font-size:10px;font-weight:700">${j.label}</span>`}</div><span style="font-size:9px;color:var(--muted);font-weight:600">${j.label}</span></div>`;}).join("");}
  function renderCourbe(id,key,couleur){const el=document.getElementById(id);if(!el)return;el.innerHTML=jours.map(j=>{const val=j[key];const h=val>0?Math.round((val/5)*50):3;const bg=val>0?couleur:"#f0ece6";return`<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:3px"><span style="font-size:9px;color:var(--muted);font-weight:700">${val>0?val:""}</span><div style="width:100%;height:${h}px;background:${bg};border-radius:4px;opacity:${val>0?"1":"0.5"};transition:height .3s"></div></div>`;}).join("");}
  renderCourbe("chart-energie","energie","#f59e0b");
  renderCourbe("chart-sommeil","sommeil","#6366f1");
  renderCourbe("chart-digestion","digestion","var(--brand)");
  const pe=document.getElementById("poids-list");
  if(pe) pe.innerHTML=jours.map(j=>`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px"><span style="font-size:10px;font-weight:700;color:var(--ink)">${j.poids||"—"}</span><span style="font-size:9px;color:var(--muted)">${j.label}</span></div>`).join("");
}

/* ════════════════════════════════════════
   NOTIFICATIONS (timers trackés)
════════════════════════════════════════ */
function clearNotifTimers(){_notifTimers.timeouts.forEach(clearTimeout);_notifTimers.intervals.forEach(clearInterval);_notifTimers.timeouts=[];_notifTimers.intervals=[];}
function initNotifications(slug){
  if(!("Notification"in window)) return;
  const banner=document.getElementById("notif-banner");
  if(!banner) return;
  if(Notification.permission==="granted"){banner.style.display="none";planifierRappels(slug);}
  else if(Notification.permission==="default") banner.style.display="flex";
  else banner.style.display="none";
}
async function activerNotifications(){
  if(!("Notification"in window)){alert("Navigateur non compatible.");return;}
  const perm=await Notification.requestPermission();
  const banner=document.getElementById("notif-banner");
  if(perm==="granted"){
    if(banner) banner.style.display="none";
    const slug=currentSlug||"admin";
    planifierRappels(slug);
    new Notification("Méthode Tee 🌿",{body:"Rappels activés !",icon:"/nutrition/icon-192.PNG"});
  } else {if(banner) banner.style.display="none";alert("Notifications refusées.");}
}
function planifierRappels(slug){
  if(Notification.permission!=="granted") return;
  clearNotifTimers();
  const maintenant=new Date();
  function prochainHeure(h,m){const d=new Date();d.setHours(h,m,0,0);if(d<=maintenant)d.setDate(d.getDate()+1);return d-maintenant;}
  function creerRappel(delai,titre,body){
    const t=setTimeout(()=>{
      new Notification(titre,{body,icon:"/nutrition/icon-192.PNG"});
      const iv=setInterval(()=>new Notification(titre,{body,icon:"/nutrition/icon-192.PNG"}),86400000);
      _notifTimers.intervals.push(iv);
    },delai);
    _notifTimers.timeouts.push(t);
  }
  creerRappel(prochainHeure(8,0),"🌅 Méthode Tee — Rituel du matin","C'est l'heure de ton rituel du matin. Eau chaude, infusion, et bonne journée !");
  creerRappel(prochainHeure(20,0),"🍵 Méthode Tee — Infusion du soir","Pense à ton infusion du soir pour préparer ton corps au repos.");
  const tSuivi=setTimeout(()=>{
    function check(){const today=mtLocalDateKey();const key="mt_suivi_"+(slug||"admin")+"_"+today;try{const s=JSON.parse(localStorage.getItem(key)||"{}");if(!s.filled)new Notification("✅ Méthode Tee — Suivi du jour",{body:"Tu n'as pas encore rempli ton suivi aujourd'hui. 2 minutes suffisent !",icon:"/nutrition/icon-192.PNG"});}catch(e){}}
    check();const iv=setInterval(check,86400000);_notifTimers.intervals.push(iv);
  },prochainHeure(21,0));
  _notifTimers.timeouts.push(tSuivi);
}

/* ════════════════════════════════════════
   MESSAGERIE
════════════════════════════════════════ */
function renderMessages(prog){
  const messages=prog.messages||[];
  const fil=document.getElementById("messages-fil");
  if(!fil) return;
  if(!messages.length){fil.innerHTML='<div style="text-align:center;padding:40px 20px"><p style="font-size:13px;color:var(--muted)">Aucun message pour le moment.</p><p style="font-size:12px;color:var(--muted)">Écris à Tee, elle te répondra très vite 🌿</p></div>';return;}
  fil.innerHTML=messages.map(m=>{const ec=m.auteur==="client";return`<div style="display:flex;flex-direction:column;align-items:${ec?"flex-end":"flex-start"}"><div style="max-width:85%;background:${ec?"var(--brand)":"white"};color:${ec?"white":"var(--ink)"};border-radius:${ec?"18px 18px 4px 18px":"18px 18px 18px 4px"};padding:12px 16px;border:${ec?"none":"1px solid rgba(140,117,97,.12)"};box-shadow:0 2px 8px rgba(0,0,0,.06)"><p style="font-size:13px;line-height:1.6;margin:0">${m.texte}</p></div><span style="font-size:10px;color:var(--muted);margin-top:4px;padding:0 4px">${m.date||""}${m.auteur==="tee"?" — Tee":""}</span></div>`;}).join("");
  setTimeout(()=>{fil.scrollTop=fil.scrollHeight;},50);
}
async function envoyerMessage(){
  const slug=currentSlug;
  if(!slug||!sb){alert("Impossible d'envoyer.");return;}
  const input=document.getElementById("message-input");
  const texte=input.value.trim();
  if(!texte) return;
  try{
    const res=await sb.from(SB_TABLE).select("programme").eq("slug",slug).single();
    if(res.error||!res.data) throw new Error("Client introuvable");
    const prog=Object.assign({},res.data.programme||{});
    if(!prog.messages) prog.messages=[];
    prog.messages.push({auteur:"client",texte,date:new Date().toLocaleDateString("fr-FR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}),lu:false});
    const res2=await sb.from(SB_TABLE).update({programme:prog}).eq("slug",slug);
    if(res2.error) throw new Error(res2.error.message);
    input.value="";_currentProg=prog;renderMessages(prog);
  }catch(e){alert("Erreur : "+e.message);}
}
function renderMessagesAdmin(prog){
  const messages=prog.messages||[];
  const fil=document.getElementById("messages-admin-fil");
  const badge=document.getElementById("messages-admin-badge");
  if(!fil) return;
  const nonLus=messages.filter(m=>m.auteur==="client"&&!m.lu).length;
  if(badge){badge.style.display=nonLus>0?"block":"none";badge.textContent=nonLus+" nouveau"+(nonLus>1?"x":"");}
  if(!messages.length){fil.innerHTML='<p style="font-size:12px;color:var(--muted);font-style:italic">Aucun message.</p>';return;}
  fil.innerHTML=messages.map(m=>{const ec=m.auteur==="client";return`<div style="display:flex;flex-direction:column;align-items:${ec?"flex-start":"flex-end"}"><div style="max-width:90%;background:${ec?"#f8f4ee":"var(--brand)"};color:${ec?"var(--ink)":"white"};border-radius:14px;padding:10px 14px"><p style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:${ec?"var(--brand)":"rgba(255,255,255,.7)"};margin:0 0 4px">${ec?"Client":"Tee"}</p><p style="font-size:13px;line-height:1.6;margin:0">${m.texte}</p></div><span style="font-size:10px;color:var(--muted);margin-top:3px;padding:0 4px">${m.date||""}</span></div>`;}).join("");
  setTimeout(()=>{fil.scrollTop=fil.scrollHeight;},50);
}
async function repondreMessage(){
  if(!sb||!currentSlug) return;
  const input=document.getElementById("messages-admin-input");
  const texte=input.value.trim();
  if(!texte) return;
  try{
    const res=await sb.from(SB_TABLE).select("programme").eq("slug",currentSlug).single();
    if(res.error||!res.data) return;
    const prog=Object.assign({},res.data.programme||{});
    if(!prog.messages) prog.messages=[];
    prog.messages.forEach(m=>{if(m.auteur==="client")m.lu=true;});
    prog.messages.push({auteur:"tee",texte,date:new Date().toLocaleDateString("fr-FR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}),lu:true});
    await sb.from(SB_TABLE).update({programme:prog}).eq("slug",currentSlug);
    input.value="";renderMessagesAdmin(prog);log("✅ Réponse envoyée.");
  }catch(e){log("❌ "+e.message);}
}

/* ════════════════════════════════════════
   NAVIGATION
════════════════════════════════════════ */
function switchTab(name,btn){
  document.querySelectorAll(".tab-section").forEach(s=>s.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.remove("active"));
  document.getElementById("tab-"+name).classList.add("active");
  const hubMap={soins:"plan",programme:"plan",signature:"plan",terrainai:"suivi",cycle:"suivi",lexique:"plan",pdf:"progression"};
  const activeBtn=btn||document.querySelector(`.simplified-nav [data-hub="${hubMap[name]||name}"]`);
  if(activeBtn) activeBtn.classList.add("active");
  lucide.createIcons();
}

/* ════════════════════════════════════════
   ADMIN : RENOUVELLEMENTS
════════════════════════════════════════ */
function getRenewalStatus(prog) {
  const tl = prog.timeline || {};
  const dateDebut = tl.dateDebut;
  const nbSemaines = tl.nbSemaines || 4;
  if (!dateDebut) return null;
  const fin = new Date(dateDebut);
  fin.setDate(fin.getDate() + (nbSemaines * 7));
  const maintenant = new Date();
  const joursRestants = Math.ceil((fin - maintenant) / (1000 * 60 * 60 * 24));
  return { joursRestants, dateFin: fin.toLocaleDateString("fr-FR", {day:"numeric",month:"long"}) };
}

async function renderRenewals() {
  if (!sb) return;
  const section = document.getElementById("renewal-section");
  const list = document.getElementById("renewal-list");
  if (!section || !list) return;
  const { data, error } = await sb.from(SB_TABLE).select("slug,prenom,programme");
  if (error || !data) return;
  const alerts = [];
  data.forEach(c => {
    const status = getRenewalStatus(c.programme || {});
    if (!status) return;
    const { joursRestants, dateFin } = status;
    if (joursRestants <= 14) {
      alerts.push({ prenom: c.prenom, slug: c.slug, joursRestants, dateFin });
    }
  });
  if (!alerts.length) { section.style.display = "none"; return; }
  alerts.sort((a, b) => a.joursRestants - b.joursRestants);
  section.style.display = "block";
  list.innerHTML = alerts.map(a => {
    const urgent = a.joursRestants <= 3;
    const bientot = a.joursRestants <= 7;
    const bg = urgent ? "#fee2e2" : bientot ? "#fef3c7" : "#f0f9f0";
    const color = urgent ? "#dc2626" : bientot ? "#92400e" : "#16a34a";
    const emoji = urgent ? "🔴" : bientot ? "🟡" : "🟢";
    const label = a.joursRestants <= 0 ? "Programme terminé" : a.joursRestants === 1 ? "Dernier jour !" : `J-${a.joursRestants}`;
    return `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-radius:14px;background:${bg};cursor:pointer" onclick="selectClient('${a.slug}')">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:18px">${emoji}</span>
        <div>
          <p style="font-size:13px;font-weight:700;color:var(--ink);margin:0">${a.prenom}</p>
          <p style="font-size:11px;color:var(--muted);margin:0">Fin le ${a.dateFin}</p>
        </div>
      </div>
      <span style="font-size:10px;font-weight:800;text-transform:uppercase;padding:4px 10px;border-radius:999px;background:white;color:${color}">${label}</span>
    </div>`;
  }).join("");
}

/* ════════════════════════════════════════
   ADMIN : CLIENTS
════════════════════════════════════════ */
async function loadAllClients(){
  if(!sb){log("❌ Connecte Supabase d'abord.");return;}
  const {data,error}=await sb.from(SB_TABLE).select("slug,prenom,programme");
  if(error){log("❌ "+error.message);return;}
  log("✅ "+(data.length)+" client(s) chargé(s).");
  renderClientsList(data);
}
function filtrerClients(statut){
  document.querySelectorAll("[id^='filtre-']").forEach(b=>b.classList.remove("active"));
  const btn=document.getElementById(statut?"filtre-"+statut:"filtre-tous");
  if(btn) btn.classList.add("active");
  const liste=statut?_allClients.filter(c=>(c.programme&&c.programme.statut)===statut):_allClients;
  afficherClients(liste);
}
const STATUT_MAP={nouveau:{label:"Nouveau",color:"#16a34a",bg:"#dcfce7"},actif:{label:"Actif",color:"#2563eb",bg:"#dbeafe"},relancer:{label:"Relancer",color:"#d97706",bg:"#fef3c7"},pause:{label:"Pause",color:"#6b7280",bg:"#f3f4f6"},termine:{label:"Terminé",color:"#7c3aed",bg:"#ede9fe"},vip:{label:"VIP",color:"#b45309",bg:"#fef9c3"}};

function afficherClients(list){
  const el=document.getElementById("clients-list");
  if(!list||!list.length){el.innerHTML='<p style="font-size:12px;color:var(--muted)">Aucun client.</p>';return;}
  el.innerHTML=list.map(c=>{
    const statut=(c.programme&&c.programme.statut)||"nouveau";
    const s=STATUT_MAP[statut]||STATUT_MAP.nouveau;
    // ── Alerte renouvellement dans la liste ──
    const renewal=getRenewalStatus(c.programme||{});
    let renewalBadge="";
    if(renewal&&renewal.joursRestants<=14){
      const urg=renewal.joursRestants<=3;
      const bg=urg?"#fee2e2":"#fef3c7";const color=urg?"#dc2626":"#92400e";
      renewalBadge=`<span style="font-size:8px;font-weight:800;text-transform:uppercase;padding:2px 6px;border-radius:999px;background:${bg};color:${color}">${urg?"🔴":"🟡"} J-${renewal.joursRestants}</span>`;
    }
    // ── RDV prochain ──
    const rdv=c.programme&&c.programme.rdv;
    let rdvLabel="";
    if(rdv){
      const rdvDate=new Date(rdv);
      const diff=Math.ceil((rdvDate-new Date())/(1000*60*60*24));
      if(diff>=0&&diff<=7) rdvLabel=`<span style="font-size:9px;color:#2563eb;font-weight:700">📅 RDV dans ${diff}j</span>`;
    }
    return `<div class="client-row ${c.slug===currentSlug?"active":""}" onclick="selectClient('${c.slug}')">
      <div style="display:flex;align-items:center;gap:10px;min-width:0">
        <div class="mini-avatar">${(c.prenom||c.slug).charAt(0).toUpperCase()}</div>
        <div style="min-width:0">
          <div style="font-size:13px;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.prenom||"—"}</div>
          <div style="display:flex;align-items:center;gap:6px">${rdvLabel?rdvLabel:`<div style="font-size:11px;color:var(--muted)">${c.slug}</div>`}</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <span style="font-size:9px;font-weight:800;text-transform:uppercase;padding:3px 8px;border-radius:999px;background:${s.bg};color:${s.color}">${s.label}</span>
        ${renewalBadge}
      </div>
    </div>`;
  }).join("");
}
function renderClientsList(list){_allClients=list||[];document.getElementById("filtre-tous").classList.add("active");afficherClients(_allClients);}

async function selectClient(slug){
  if(!sb){log("❌ Connecte d'abord.");return;}
  const {data,error}=await sb.from(SB_TABLE).select("*").eq("slug",slug).single();
  if(error){log("❌ "+error.message);return;}
  currentSlug=slug;
  document.getElementById("f-client-email").value=data.client_email||"";
  programme=data.programme||emptyProgramme();
  adminDay=Object.keys(programme.days||{})[0]||null;
  fillAdmin(data.prenom,programme);
  document.getElementById("f-notes-priv").value=data.admin_notes||"";
  log("✅ Client « "+slug+" » chargé.");
  openAdmin();
}
function createClient(){currentSlug=null;programme=emptyProgramme();adminDay=null;fillAdmin("",programme);document.getElementById("f-client-email").value="";document.getElementById("f-notes-priv").value="";log("Nouveau client — remplis le profil puis sauvegarde.");}
function duplicateClient(){
  const base=document.getElementById("f-slug").value.trim()||"client";
  const sug=base.endsWith("-s2")?base+"-copie":base+"-s2";
  const newSlug=prompt("Nouveau slug",sug);
  if(!newSlug) return;
  currentSlug=null;document.getElementById("f-slug").value=newSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g,"-");
  log("✅ Copie prête — sauvegarde.");
}
async function deleteClient(){
  if(!sb||!currentSlug){log("❌ Aucun client sélectionné.");return;}
  if(!confirm("Supprimer « "+currentSlug+" » ?")) return;
  const {error}=await sb.from(SB_TABLE).delete().eq("slug",currentSlug);
  if(error){log("❌ "+error.message);return;}
  log("🗑️ Client supprimé.");currentSlug=null;loadAllClients();
}

/* ════════════════════════════════════════
   ADMIN : REMPLIR CHAMPS
════════════════════════════════════════ */
function fillAdmin(prenom,prog){
  document.getElementById("f-prenom").value=prenom||"";
  document.getElementById("f-slug").value=currentSlug||"";
  document.getElementById("f-semaine").value=prog.semaine||"";
  document.getElementById("f-parcours").value=prog.parcours||"equilibre";
  document.getElementById("f-objectif").value=prog.objectif||"";
  document.getElementById("f-coach").value=prog.coach||"";
  document.getElementById("f-goals").value=(prog.goals||[]).join("\n");
  document.getElementById("f-tasks").value=(prog.tasks||[]).join("\n");
  document.getElementById("f-sig-title").value=prog.signature?.titre||"";
  document.getElementById("f-sig-ingredients").value=(prog.signature?.ingredients||[]).join("\n");
  document.getElementById("f-sig-desc").value=prog.signature?.description||"";
  document.getElementById("f-rituel-matin").value=prog.rituel?.matin||"";
  document.getElementById("f-rituel-midi").value=prog.rituel?.midi||"";
  document.getElementById("f-rituel-soir").value=prog.rituel?.soir||"";
  document.getElementById("f-rituel-note").value=prog.rituel?.note||"";
  document.getElementById("f-terrain-dominant").value=prog.terrain?.dominant||"";
  document.getElementById("f-terrain-axes").value=(prog.terrain?.axes||[]).join("\n");
  document.getElementById("f-terrain-note").value=prog.terrain?.note||"";
  document.getElementById("f-protocole-matin").value=prog.protocole?.matin||"";
  document.getElementById("f-protocole-midi").value=prog.protocole?.midi||"";
  document.getElementById("f-protocole-soir").value=prog.protocole?.soir||"";
  document.getElementById("f-protocole-duree").value=prog.protocole?.duree||"";
  document.getElementById("f-method").value=JSON.stringify(prog.methode||[],null,2);
  document.getElementById("f-offre").value=prog.offre||"";
  document.getElementById("f-statut").value=prog.statut||"nouveau";
  document.getElementById("f-notes-priv").value="";
  document.getElementById("f-promo-code").value=prog.promo_code||"";
  document.getElementById("f-rdv").value=prog.rdv||"";
  const tr=prog.transformation||{};
  document.getElementById("f-transfo-depart").value=tr.depart||"";
  document.getElementById("f-transfo-victoires").value=tr.victoires||"";
  document.getElementById("f-transfo-ressentis").value=tr.ressentis||"";
  const tl=prog.timeline||{};
  document.getElementById("f-date-debut").value=tl.dateDebut||"";
  document.getElementById("f-nb-semaines").value=tl.nbSemaines||4;
  renderTimelineAdmin(tl);
  renderSuiviAdmin(prog);
  renderMessagesAdmin(prog);
  renderAdminDaysNav(prog.days||{});
  renderProductEditors(prog.products||[]);
  // Phyto
  const phytoBlock=document.getElementById("phyto-admin-block");
  if(prog.phyto_demande&&prog.phyto_demande.symptome){
    phytoBlock.style.display="block";
    document.getElementById("phyto-admin-symptome").textContent="Ressenti : "+prog.phyto_demande.symptome;
    document.getElementById("phyto-admin-list").innerHTML=(prog.phyto_demande.suggestions||[]).map(s=>`<div style="font-size:13px;color:var(--ink);padding:8px 12px;background:#f8f4ee;border-radius:10px">${s}</div>`).join("");
    const poss=prog.phyto_demande.possession||[];
    document.getElementById("phyto-admin-possession").textContent=poss.length?"Déjà en possession : "+poss.join(", "):"Aucun produit en possession";
    document.getElementById("phyto-admin-date").textContent="Envoyé le "+(prog.phyto_demande.date||"");
    const st=document.getElementById("phyto-admin-statut");
    st.textContent=prog.phyto_demande.statut==="traite"?"Traité":"En attente";
    st.style.background=prog.phyto_demande.statut==="traite"?"#d1fae5":"#fef3c7";
    st.style.color=prog.phyto_demande.statut==="traite"?"#065f46":"#92400e";
  } else if(phytoBlock) phytoBlock.style.display="none";
  // Sélection
  const selBlock=document.getElementById("selection-admin-block");
  if(prog.selection&&prog.selection.produits&&prog.selection.produits.length){
    selBlock.style.display="block";
    document.getElementById("selection-admin-list").innerHTML=prog.selection.produits.map(p=>`<div style="font-size:13px;color:var(--ink);padding:8px 12px;background:#f8f4ee;border-radius:10px">${p}</div>`).join("");
    document.getElementById("selection-admin-date").textContent="Envoyée le "+(prog.selection.date||"");
    const ss=document.getElementById("selection-statut");
    ss.textContent=prog.selection.statut==="traite"?"Traité":"En attente";
    ss.style.background=prog.selection.statut==="traite"?"#d1fae5":"#fef3c7";
    ss.style.color=prog.selection.statut==="traite"?"#065f46":"#92400e";
  } else selBlock.style.display="none";
}

/* ════════════════════════════════════════
   ADMIN : REPAS
════════════════════════════════════════ */
function renderAdminDaysNav(days){
  const keys=Object.keys(days);
  if(!adminDay||!keys.includes(adminDay)) adminDay=keys[0]||null;
  document.getElementById("admin-days-nav").innerHTML=keys.map(day=>`<button class="chip ${day===adminDay?"active":""}" onclick="selectAdminDay('${day.replace(/'/g,"\\'")}',this)">${day}</button>`).join("");
  if(adminDay&&days[adminDay]) fillDayFields(adminDay,days[adminDay]);
}
function selectAdminDay(day,btn){
  adminDay=day;
  document.querySelectorAll("#admin-days-nav .chip").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  fillDayFields(day,programme.days[day]||{});
}
function fillDayFields(dayName,d){
  document.getElementById("f-day-name").value=dayName;
  document.getElementById("f-morning").value=htmlToText(d.morning||"");
  document.getElementById("f-lunch").value=htmlToText(d.lunch||"");
  document.getElementById("f-snack").value=htmlToText(d.snack||"");
  document.getElementById("f-dinner").value=htmlToText(d.dinner||"");
}
function addDay(){
  let i=1,name;do{name="Jour "+i;i++;}while(programme.days[name]);
  programme.days[name]={morning:"",lunch:"",snack:"",dinner:""};adminDay=name;renderAdminDaysNav(programme.days);
}
function saveDay(){
  const old=adminDay;const newName=document.getElementById("f-day-name").value.trim()||old;
  const payload={morning:textToHtml(document.getElementById("f-morning").value),lunch:textToHtml(document.getElementById("f-lunch").value),snack:textToHtml(document.getElementById("f-snack").value),dinner:textToHtml(document.getElementById("f-dinner").value)};
  if(old&&old!==newName) delete programme.days[old];
  programme.days[newName]=payload;adminDay=newName;renderAdminDaysNav(programme.days);
  log("✅ Jour « "+newName+" » sauvegardé — n'oublie pas de sauvegarder le client.");
}
function deleteDay(){
  if(!adminDay) return;
  if(Object.keys(programme.days).length<=1){log("⚠️ Garder au moins un jour.");return;}
  delete programme.days[adminDay];adminDay=Object.keys(programme.days)[0];renderAdminDaysNav(programme.days);
}

/* ════════════════════════════════════════
   ADMIN : PRODUITS
════════════════════════════════════════ */
function renderProductEditors(products){
  programme.products=products;
  document.getElementById("product-editors").innerHTML=products.map((p,i)=>`
    <div class="product-editor" id="pe-${i}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <span style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)">Produit ${i+1}</span>
        <button class="chip" onclick="removeProduct(${i})" style="color:#dc2626;border-color:rgba(220,38,38,.2)">Supprimer</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <input class="admin-input p-emoji" data-i="${i}" placeholder="Emoji 🌿" value="${p.emoji||""}">
        <input class="admin-input p-titre" data-i="${i}" placeholder="Nom du produit" value="${p.titre||""}">
        <textarea class="admin-textarea p-texte" data-i="${i}" placeholder="Description">${p.texte||""}</textarea>
        <input class="admin-input p-lien" data-i="${i}" placeholder="Lien https://maisonyanna.com/products/..." value="${p.lien||""}">
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer"><input type="checkbox" class="p-featured" data-i="${i}" ${p.featured?"checked":""} style="accent-color:var(--brand);width:16px;height:16px"> Produit mis en avant</label>
      </div>
    </div>`).join("");
}
function syncProducts(){
  programme.products=[];
  document.querySelectorAll("[class*='p-emoji']").forEach(el=>{const i=+el.dataset.i;if(!programme.products[i])programme.products[i]={};programme.products[i].emoji=el.value.trim();});
  document.querySelectorAll(".p-titre").forEach(el=>{programme.products[+el.dataset.i].titre=el.value.trim();});
  document.querySelectorAll(".p-texte").forEach(el=>{programme.products[+el.dataset.i].texte=el.value.trim();});
  document.querySelectorAll(".p-lien").forEach(el=>{let v=el.value.trim();if(v&&!/^https?:\/\//i.test(v))v="https://"+v;programme.products[+el.dataset.i].lien=v;});
  document.querySelectorAll(".p-featured").forEach(el=>{programme.products[+el.dataset.i].featured=el.checked;});
}
function addProduct(){syncProducts();programme.products.push({emoji:"🌿",titre:"Nouveau produit",texte:"",lien:"",featured:false});renderProductEditors(programme.products);}
function removeProduct(i){syncProducts();programme.products.splice(i,1);renderProductEditors(programme.products);}

/* ════════════════════════════════════════
   ADMIN : TIMELINE
════════════════════════════════════════ */
function renderTimelineAdmin(tl){
  const nb=parseInt(document.getElementById("f-nb-semaines").value)||4;
  const semaines=(tl&&tl.semaines)||[];
  const container=document.getElementById("timeline-admin-weeks");
  if(!container) return;
  let html="";
  for(let s=1;s<=nb;s++){
    const data=semaines[s-1]||{};
    html+=`<div style="border:1.5px solid #ede9e3;border-radius:16px;padding:14px"><p style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--brand);margin:0 0 10px">Semaine ${s}</p><div style="display:flex;flex-direction:column;gap:8px"><div><label class="field-label">Terrain (virgules)</label><input class="admin-input tl-terrain" data-s="${s}" placeholder="inflammation, fatigue" value="${data.terrain||""}"></div><div><label class="field-label">Améliorations (une par ligne)</label><textarea class="admin-textarea tl-amelio" data-s="${s}" style="min-height:70px">${data.ameliorations||""}</textarea></div><div><label class="field-label">Note de Tee</label><textarea class="admin-textarea tl-notes" data-s="${s}">${data.notesCoach||""}</textarea></div></div></div>`;
  }
  container.innerHTML=html;
}
function ajouterSemaineTimeline(){
  const nb=parseInt(document.getElementById("f-nb-semaines").value)||4;
  document.getElementById("f-nb-semaines").value=nb+1;
  renderTimelineAdmin(syncTimeline());
}
function syncTimeline(){
  const dateDebut=document.getElementById("f-date-debut").value;
  const nbSemaines=parseInt(document.getElementById("f-nb-semaines").value)||4;
  const semaines=[];
  for(let s=1;s<=nbSemaines;s++){
    const t=document.querySelector(".tl-terrain[data-s='"+s+"']");
    const a=document.querySelector(".tl-amelio[data-s='"+s+"']");
    const n=document.querySelector(".tl-notes[data-s='"+s+"']");
    semaines.push({terrain:t?t.value.trim():"",ameliorations:a?a.value.trim():"",notesCoach:n?n.value.trim():""});
  }
  return {dateDebut,nbSemaines,semaines};
}

/* ════════════════════════════════════════
   ADMIN : SUIVI
════════════════════════════════════════ */
function renderSuiviAdmin(prog){
  const suivi=prog.suivi||{};const dates=Object.keys(suivi).sort().reverse();
  const de=document.getElementById("suivi-admin-derniere");const re=document.getElementById("suivi-admin-resume");const da=document.getElementById("suivi-admin-derniere-data");const hi=document.getElementById("suivi-admin-historique");
  if(!dates.length){if(de)de.textContent="Aucune donnée";if(re)re.style.display="none";if(hi)hi.innerHTML='<p style="font-size:12px;color:var(--muted);font-style:italic">Aucun suivi enregistré.</p>';return;}
  const d=suivi[dates[0]];
  if(de) de.textContent="Dernière : "+new Date(dates[0]).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});
  if(re) re.style.display="block";
  function stat(l,v,u){return`<div style="background:white;border-radius:12px;padding:10px 12px"><p style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;font-weight:800;color:var(--muted);margin:0 0 4px">${l}</p><p style="font-size:16px;font-weight:700;color:var(--ink);margin:0">${v||"—"}<span style="font-size:11px;color:var(--muted)">${u||""}</span></p></div>`;}
  if(da) da.innerHTML=stat("Poids",d.poids," kg")+stat("Énergie",d.energie?d.energie+"/5":"")+stat("Sommeil",d.sommeil?d.sommeil+"/5":"")+stat("Digestion",d.digestion?d.digestion+"/5":"");
  if(re&&d){
    function chk(l,v){return`<div style="display:flex;align-items:center;gap:6px;font-size:12px;color:${v?"var(--brand)":"var(--muted)"}"><span style="font-size:14px">${v?"✅":"⬜"}</span>${l}</div>`;}
    const cd=document.createElement("div");cd.style.cssText="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:10px";cd.className="checks-grid";
    cd.innerHTML=chk("Eau",d.eau)+chk("Repas",d.repas)+chk("Infusion",d.infusion)+chk("Sport",d.sport);
    const ex=re.querySelector(".checks-grid");if(ex)ex.remove();re.appendChild(cd);
    if(d.note){const nd=document.createElement("div");nd.style.cssText="margin-top:10px;padding:10px 12px;background:white;border-radius:12px";nd.className="note-div";nd.innerHTML=`<p style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;font-weight:800;color:var(--muted);margin:0 0 4px">Note</p><p style="font-size:12px;color:var(--ink);font-style:italic;margin:0">"${d.note}"</p>`;const en=re.querySelector(".note-div");if(en)en.remove();re.appendChild(nd);}
  }
  if(hi){
    const jl=["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];let html="";
    for(let i=0;i<Math.min(7,dates.length);i++){
      const date=dates[i];const entry=suivi[date];const jd=new Date(date);const label=jl[jd.getDay()]+" "+jd.getDate();
      const score=[entry.eau,entry.repas,entry.infusion,entry.sport].filter(Boolean).length;const sp=Math.round(score/4*100);
      html+=`<div style="border:1.5px solid #ede9e3;border-radius:14px;padding:12px 14px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span style="font-size:12px;font-weight:700;color:var(--ink)">${label}</span><div style="display:flex;align-items:center;gap:8px">${entry.poids?`<span style="font-size:11px;color:var(--muted)">${entry.poids} kg</span>`:""}<span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:999px;background:${sp===100?"#dcfce7":"#f0ece6"};color:${sp===100?"#16a34a":"var(--muted)"}">${score}/4</span></div></div><div style="display:flex;gap:10px"><span style="font-size:11px;color:#f59e0b">⚡ ${entry.energie||"—"}/5</span><span style="font-size:11px;color:#6366f1">🌙 ${entry.sommeil||"—"}/5</span><span style="font-size:11px;color:var(--brand)">🌿 ${entry.digestion||"—"}/5</span></div>${entry.note?`<p style="font-size:11px;color:var(--muted);font-style:italic;margin:8px 0 0;border-top:1px solid #f0ece6;padding-top:8px">"${entry.note}"</p>`:""}</div>`;
    }
    hi.innerHTML=html||'<p style="font-size:12px;color:var(--muted);font-style:italic">Aucun suivi.</p>';
  }
}

/* ════════════════════════════════════════
   ADMIN : SUIVI GLOBAL
════════════════════════════════════════ */
async function renderSuiviGlobal(){
  if(!sb) return;
  const today=mtLocalDateKey();
  const de=document.getElementById("suivi-global-date");const le=document.getElementById("suivi-global-list");
  if(de) de.textContent=new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});
  if(!le) return;
  le.innerHTML='<p style="font-size:12px;color:var(--muted)">Chargement…</p>';
  try{
    const res=await sb.from(SB_TABLE).select("slug,prenom,programme");
    if(res.error||!res.data){le.innerHTML='<p style="font-size:12px;color:var(--muted)">Erreur.</p>';return;}
    const remplis=[],nonRemplis=[];
    res.data.forEach(c=>{const s=(c.programme&&c.programme.suivi&&c.programme.suivi[today])||null;if(s&&s.filled)remplis.push({prenom:c.prenom,slug:c.slug,suivi:s});else nonRemplis.push({prenom:c.prenom,slug:c.slug});});
    let html=`<div style="display:flex;gap:8px;margin-bottom:12px"><div style="flex:1;background:#dcfce7;border-radius:12px;padding:10px 12px;text-align:center"><p style="font-size:22px;font-weight:800;color:#16a34a;margin:0">${remplis.length}</p><p style="font-size:10px;text-transform:uppercase;font-weight:700;color:#16a34a;margin:0">Remplis</p></div><div style="flex:1;background:#f0ece6;border-radius:12px;padding:10px 12px;text-align:center"><p style="font-size:22px;font-weight:800;color:var(--muted);margin:0">${nonRemplis.length}</p><p style="font-size:10px;text-transform:uppercase;font-weight:700;color:var(--muted);margin:0">En attente</p></div></div>`;
    if(remplis.length){html+='<p style="font-size:10px;text-transform:uppercase;letter-spacing:.1em;font-weight:800;color:var(--brand);margin:0 0 8px">✅ Ont rempli</p>';remplis.forEach(c=>{const s=c.suivi;const ch=[s.eau,s.repas,s.infusion,s.sport].filter(Boolean).length;html+=`<div style="background:#f8f4ee;border-radius:14px;padding:12px 14px;cursor:pointer;margin-bottom:6px" onclick="selectClient('${c.slug}')"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span style="font-size:13px;font-weight:700;color:var(--ink)">${c.prenom||c.slug}</span><span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:999px;background:${ch===4?"#dcfce7":"#fef3c7"};color:${ch===4?"#16a34a":"#92400e"}">${ch}/4</span></div><div style="display:flex;gap:10px"><span style="font-size:11px;color:#f59e0b">⚡ ${s.energie||"—"}/5</span><span style="font-size:11px;color:#6366f1">🌙 ${s.sommeil||"—"}/5</span><span style="font-size:11px;color:var(--brand)">🌿 ${s.digestion||"—"}/5</span>${s.poids?`<span style="font-size:11px;color:var(--muted)">⚖️ ${s.poids} kg</span>`:""}</div>${s.note?`<p style="font-size:11px;color:var(--muted);font-style:italic;margin:6px 0 0;border-top:1px solid #ede9e3;padding-top:6px">"${s.note}"</p>`:""}</div>`;});}
    if(nonRemplis.length){html+='<p style="font-size:10px;text-transform:uppercase;letter-spacing:.1em;font-weight:800;color:var(--muted);margin:12px 0 8px">⏳ N\'ont pas rempli</p><div style="display:flex;flex-wrap:wrap;gap:6px">';nonRemplis.forEach(c=>{html+=`<span style="background:#f0ece6;border-radius:999px;padding:5px 12px;font-size:12px;font-weight:600;color:var(--muted);cursor:pointer" onclick="selectClient('${c.slug}')">${c.prenom||c.slug}</span>`;});html+="</div>";}
    le.innerHTML=html;
    lucide.createIcons();
  }catch(e){le.innerHTML=`<p style="font-size:12px;color:var(--muted)">Erreur : ${e.message}</p>`;}
}

/* ════════════════════════════════════════
   ADMIN : SAUVEGARDER
════════════════════════════════════════ */
async function saveClient(){
  if(!sb){log("❌ Connecte Supabase d'abord.");return;}
  const slug=document.getElementById("f-slug").value.trim().toLowerCase().replace(/[^a-z0-9-]/g,"-").replace(/^-+|-+$/g,"")||"client";
  const prenom=document.getElementById("f-prenom").value.trim()||"Client";
  const client_email=document.getElementById("f-client-email").value.trim().toLowerCase();
  const admin_notes=document.getElementById("f-notes-priv").value.trim();
  if(!client_email){log("❌ L’e-mail de connexion de la cliente est obligatoire.");return;}
  syncProducts();
  if(adminDay){
    programme.days[document.getElementById("f-day-name").value.trim()||adminDay]={morning:textToHtml(document.getElementById("f-morning").value),lunch:textToHtml(document.getElementById("f-lunch").value),snack:textToHtml(document.getElementById("f-snack").value),dinner:textToHtml(document.getElementById("f-dinner").value)};
    if(document.getElementById("f-day-name").value.trim()!==adminDay){delete programme.days[adminDay];adminDay=document.getElementById("f-day-name").value.trim();}
  }
  programme.semaine=document.getElementById("f-semaine").value.trim();
  programme.parcours=document.getElementById("f-parcours").value;
  programme.offre=document.getElementById("f-offre").value;
  programme.statut=document.getElementById("f-statut").value;
  delete programme.notes_priv;
  programme.promo_code=document.getElementById("f-promo-code").value.trim().toUpperCase();
  programme.rdv=document.getElementById("f-rdv").value;
  programme.transformation={depart:document.getElementById("f-transfo-depart").value.trim(),victoires:document.getElementById("f-transfo-victoires").value.trim(),ressentis:document.getElementById("f-transfo-ressentis").value.trim()};
  programme.timeline=syncTimeline();
  programme.objectif=document.getElementById("f-objectif").value.trim();
  programme.coach=document.getElementById("f-coach").value.trim();
  programme.goals=lines(document.getElementById("f-goals").value);
  programme.tasks=lines(document.getElementById("f-tasks").value);
  programme.signature={titre:document.getElementById("f-sig-title").value.trim(),ingredients:lines(document.getElementById("f-sig-ingredients").value),description:document.getElementById("f-sig-desc").value.trim()};
  programme.rituel={matin:document.getElementById("f-rituel-matin").value.trim(),midi:document.getElementById("f-rituel-midi").value.trim(),soir:document.getElementById("f-rituel-soir").value.trim(),note:document.getElementById("f-rituel-note").value.trim()};
  programme.terrain={dominant:document.getElementById("f-terrain-dominant").value.trim(),axes:lines(document.getElementById("f-terrain-axes").value),note:document.getElementById("f-terrain-note").value.trim()};
  programme.protocole={matin:document.getElementById("f-protocole-matin").value.trim(),midi:document.getElementById("f-protocole-midi").value.trim(),soir:document.getElementById("f-protocole-soir").value.trim(),duree:document.getElementById("f-protocole-duree").value.trim()};
  try{programme.methode=JSON.parse(document.getElementById("f-method").value||"[]");}
  catch(e){log("❌ JSON Méthode invalide.");return;}
  log("⏳ Sauvegarde…");
  const {error}=await sb.from(SB_TABLE).upsert({slug,prenom,client_email,admin_notes,programme},{onConflict:"slug"});
  if(error){log("❌ "+error.message);return;}
  currentSlug=slug;document.getElementById("f-slug").value=slug;
  log("✅ "+prenom+" ("+slug+") sauvegardé !\n\nLien : "+buildLink(slug));
  loadAllClients();_currentProg=programme;renderClientView(prenom,programme);
}

/* ════════════════════════════════════════
   ADMIN : DIVERS
════════════════════════════════════════ */
async function marquerPhytoTraite(){
  if(!sb||!currentSlug) return;
  try{const res=await sb.from(SB_TABLE).select("programme").eq("slug",currentSlug).single();if(res.error||!res.data)return;const prog=Object.assign({},res.data.programme||{});if(prog.phyto_demande)prog.phyto_demande.statut="traite";await sb.from(SB_TABLE).update({programme:prog}).eq("slug",currentSlug);document.getElementById("phyto-admin-statut").textContent="Traité";document.getElementById("phyto-admin-statut").style.background="#d1fae5";document.getElementById("phyto-admin-statut").style.color="#065f46";log("✅ Phyto traité.");}catch(e){log("❌ "+e.message);}
}
async function marquerSelectionTraitee(){
  if(!sb||!currentSlug) return;
  try{const res=await sb.from(SB_TABLE).select("programme").eq("slug",currentSlug).single();if(res.error||!res.data)return;const prog=Object.assign({},res.data.programme||{});if(prog.selection)prog.selection.statut="traite";await sb.from(SB_TABLE).update({programme:prog}).eq("slug",currentSlug);document.getElementById("selection-statut").textContent="Traité";document.getElementById("selection-statut").style.background="#d1fae5";document.getElementById("selection-statut").style.color="#065f46";log("✅ Sélection traitée.");}catch(e){log("❌ "+e.message);}
}
function appliquerProtocole(type){
  const p={digestion:{matin:"Eau chaude + citron à jeun. Infusion fenouil ou menthe poivrée.",midi:"Tisane digestive après repas (romarin, thym).",soir:"Infusion camomille ou mélisse. Éviter de manger après 21h.",duree:"21 jours"},energie:{matin:"Maté vert ou matcha. Petit-déjeuner protéiné.",midi:"Infusion gingembre + citron. Éviter les sucres rapides.",soir:"Infusion adaptogène (ashwagandha). Coucher avant minuit.",duree:"14 jours"},recomposition:{matin:"Protéines au réveil. Eau + citron. Infusion thé vert.",midi:"Repas équilibré. Infusion brûle-graisses (thé vert, cannelle).",soir:"Dîner léger avant 20h. Infusion detox.",duree:"30 jours"},inflammation:{matin:"Eau chaude + curcuma + poivre noir. Infusion gingembre.",midi:"Éviter gluten et sucres raffinés. Infusion curcuma.",soir:"Infusion anti-inflammatoire (curcuma, gingembre, cannelle).",duree:"21 jours"},detox:{matin:"Eau chaude + citron + chlorophylle. Infusion ortie.",midi:"Infusion romarin + pissenlit après repas.",soir:"Infusion drainante (queues de cerise, pissenlit, bouleau).",duree:"7 jours"},sommeil:{matin:"Éviter café après 15h. Infusion énergisante douce le matin.",midi:"Magnésium marin au déjeuner.",soir:"Infusion Nirvana ou valériane + passiflore 1h avant coucher.",duree:"14 jours"}}[type];
  if(!p) return;
  document.getElementById("f-protocole-matin").value=p.matin;document.getElementById("f-protocole-midi").value=p.midi;document.getElementById("f-protocole-soir").value=p.soir;document.getElementById("f-protocole-duree").value=p.duree;
  const msg=document.getElementById("protocole-applied");if(msg){msg.style.display="block";setTimeout(()=>{msg.style.display="none";},3000);}
}

/* ════════════════════════════════════════
   RAPPORT HEBDOMADAIRE
════════════════════════════════════════ */
async function genererRapport(){
  if(!sb||!currentSlug){log("❌ Sélectionne un client.");return;}
  const res=await sb.from(SB_TABLE).select("prenom,programme").eq("slug",currentSlug).single();
  if(res.error||!res.data){log("❌ Erreur.");return;}
  const prenom=res.data.prenom||currentSlug;const prog=res.data.programme||{};const suivi=prog.suivi||{};const tl=prog.timeline||{};
  const sc=getSemaineEnCours(tl.dateDebut,tl.nbSemaines||4);
  const jours=[];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const ds=mtLocalDateKey(d);jours.push({date:ds,entry:suivi[ds]||null});}
  const jr=jours.filter(j=>j.entry&&j.entry.filled).length;const score=Math.round(jr/7*100);
  const energies=jours.filter(j=>j.entry&&j.entry.energie).map(j=>parseFloat(j.entry.energie));const sommeils=jours.filter(j=>j.entry&&j.entry.sommeil).map(j=>parseFloat(j.entry.sommeil));const digestions=jours.filter(j=>j.entry&&j.entry.digestion).map(j=>parseFloat(j.entry.digestion));const poids=jours.filter(j=>j.entry&&j.entry.poids).map(j=>parseFloat(j.entry.poids));
  function moy(a){if(!a.length)return null;return(a.reduce((x,y)=>x+y,0)/a.length).toFixed(1);}
  function tend(a){if(a.length<2)return"";const d=a.slice(0,Math.ceil(a.length/2));const f=a.slice(Math.floor(a.length/2));const md=d.reduce((x,y)=>x+y,0)/d.length;const mf=f.reduce((x,y)=>x+y,0)/f.length;if(mf>md+0.2)return" ↑";if(mf<md-0.2)return" ↓";return" →";}
  const me=moy(energies);const ms=moy(sommeils);const md=moy(digestions);const pp=poids.length?poids[0]:null;const dp=poids.length?poids[poids.length-1]:null;const diff=(pp&&dp&&pp!==dp)?(dp-pp).toFixed(1):null;
  const notes=jours.filter(j=>j.entry&&j.entry.note).map(j=>"• "+new Date(j.date).toLocaleDateString("fr-FR",{weekday:"short",day:"numeric"})+" : "+j.entry.note);
  const tEau=jours.filter(j=>j.entry&&j.entry.eau).length;const tRepas=jours.filter(j=>j.entry&&j.entry.repas).length;const tInf=jours.filter(j=>j.entry&&j.entry.infusion).length;const tSport=jours.filter(j=>j.entry&&j.entry.sport).length;
  const dfr=new Date(jours[0].date).toLocaleDateString("fr-FR",{day:"numeric",month:"long"});const dfin=new Date(jours[6].date).toLocaleDateString("fr-FR",{day:"numeric",month:"long"});
  // RDV info
  const rdv=prog.rdv;let rdvLine="";
  if(rdv){const rdvDate=new Date(rdv);const diff2=Math.ceil((rdvDate-new Date())/(1000*60*60*24));rdvLine="📅 Prochain RDV : "+rdvDate.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})+(diff2>=0?" (dans "+diff2+" jours)":"")+"\n";}
  let rapport="━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 RAPPORT HEBDOMADAIRE — MÉTHODE TEE\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
  rapport+="👤 "+prenom+"\n📅 "+dfr+" → "+dfin+"\n🗓️ Semaine "+sc+" du programme\n"+rdvLine+"\n";
  rapport+="━━━ RÉGULARITÉ ━━━\nJours remplis : "+jr+"/7\nScore : "+score+"% "+(score>=80?"🌟 Excellent":score>=60?"✅ Bien":score>=40?"⚠️ À améliorer":"❌ Insuffisant")+"\n\n";
  rapport+="━━━ MESURES ━━━\n";
  if(me) rapport+="⚡ Énergie : "+me+"/5"+tend(energies)+"\n";
  if(ms) rapport+="🌙 Sommeil : "+ms+"/5"+tend(sommeils)+"\n";
  if(md) rapport+="🌿 Digestion : "+md+"/5"+tend(digestions)+"\n";
  if(pp&&dp) rapport+="⚖️ Poids : "+pp+" → "+dp+" kg"+(diff?" ("+(parseFloat(diff)>0?"+":"")+diff+" kg)":"")+"\n";
  rapport+="\n━━━ HABITUDES ━━━\n💧 Hydratation : "+tEau+"/7\n🥗 Repas : "+tRepas+"/7\n🍵 Infusions : "+tInf+"/7\n🏃 Sport : "+tSport+"/7\n\n";
  if(notes.length) rapport+="━━━ NOTES ━━━\n"+notes.join("\n")+"\n\n";
  rapport+="━━━ OBJECTIFS ━━━\n"+(prog.objectif||"Non défini")+"\n";
  if(prog.goals&&prog.goals.length) prog.goals.forEach(g=>{rapport+="→ "+g+"\n";});
  rapport+="\n━━━ RECOMMANDATIONS ━━━\n";
  if(score<60) rapport+="⚠️ Régularité à améliorer.\n";
  if(me&&parseFloat(me)<3) rapport+="⚡ Énergie basse — revoir le protocole.\n";
  if(ms&&parseFloat(ms)<3) rapport+="🌙 Sommeil insuffisant — renforcer le rituel soir.\n";
  if(md&&parseFloat(md)<3) rapport+="🌿 Digestion difficile — adapter le protocole.\n";
  if(tInf<4) rapport+="🍵 Infusions peu suivies — rappeler l'importance.\n";
  if(score>=80&&me&&parseFloat(me)>=4) rapport+="🌟 Excellente semaine !\n";
  // Alerte renouvellement dans le rapport
  const renewal=getRenewalStatus(prog);
  if(renewal&&renewal.joursRestants<=14) rapport+="\n⏰ RENOUVELLEMENT : Programme se termine le "+renewal.dateFin+" (J-"+renewal.joursRestants+")\n";
  rapport+="\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nGénéré par Méthode Tee — "+new Date().toLocaleDateString("fr-FR")+"\n";
  const block=document.getElementById("rapport-block");const contenu=document.getElementById("rapport-contenu");
  if(block) block.style.display="block";if(contenu) contenu.textContent=rapport;
  setTimeout(()=>{if(block)block.scrollIntoView({behavior:"smooth",block:"start"});},100);
  log("✅ Rapport généré pour "+prenom);
}
function copierRapport(){
  const contenu=document.getElementById("rapport-contenu");if(!contenu)return;
  if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(contenu.textContent).then(()=>log("✅ Rapport copié !"));}
  else{const ta=document.createElement("textarea");ta.value=contenu.textContent;document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);log("✅ Rapport copié !");}
}
function buildLink(){return new URL("index.html",window.location.href).href;}
function copyLink(){const slug=currentSlug||document.getElementById("f-slug").value.trim();if(!slug){log("❌ Sauvegarde d'abord.");return;}const link=buildLink(slug);if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(link).then(()=>log("✅ Lien copié !\n"+link));}else{prompt("Copie :",link);}}

function openAdmin(){document.getElementById("admin-overlay").classList.add("open");lucide.createIcons();renderSuiviGlobal();renderRenewals();}
function closeAdmin(){document.getElementById("admin-overlay").classList.remove("open");}

/* ════════════════════════════════════════
   UTILITAIRES
════════════════════════════════════════ */
function lines(t){return String(t||"").split("\n").map(s=>s.trim()).filter(Boolean);}
function textToHtml(t){return String(t||"").trim().replace(/\n/g,"<br>");}
function htmlToText(h){return String(h||"").replace(/<br\s*\/?>/gi,"\n").replace(/<[^>]+>/g,"");}
function log(msg){document.getElementById("sb-log").textContent=msg;}
function hideLoading(){document.getElementById("loading-screen").style.display="none";}
function showError(msg){hideLoading();document.getElementById("error-msg").textContent=msg;document.getElementById("error-screen").style.display="flex";}


/* ════════════════════════════════════════
   PREMIUM V4 — extensions ajoutées sans casser la base
════════════════════════════════════════ */
const MT_PLANTES = {
  "Ashwagandha": {emoji:"✨", terrain:"nerveux", props:["adaptogène","stress","sommeil"], precautions:"Éviter grossesse/allaitement et demander avis en cas de traitement sédatif.", produit:"Golden Ashwa Latte", lien:"https://maisonyanna.com"},
  "Mélisse": {emoji:"🍃", terrain:"nerveux", props:["apaisement","digestion nerveuse","sommeil"], precautions:"Prudence si traitement thyroïdien.", produit:"Lune Céleste", lien:"https://maisonyanna.com"},
  "Fenouil": {emoji:"🌿", terrain:"digestif", props:["ballonnements","confort digestif","spasmes"], precautions:"Éviter fortes doses pendant grossesse.", produit:"Nirvana", lien:"https://maisonyanna.com"},
  "Romarin": {emoji:"🌱", terrain:"digestif", props:["foie","digestion","vitalité"], precautions:"Prudence si hypertension non équilibrée.", produit:"Pure Skin Detox", lien:"https://maisonyanna.com"},
  "Framboisier": {emoji:"🌸", terrain:"hormonal", props:["cycle","confort menstruel","terrain féminin"], precautions:"Demander avis en grossesse.", produit:"Passion en Provence", lien:"https://maisonyanna.com"},
  "Ortie": {emoji:"🌿", terrain:"minéral", props:["reminéralisation","fer","drainage"], precautions:"Prudence avec diurétiques/anticoagulants.", produit:"Bye Bye Tox", lien:"https://maisonyanna.com"}
};

const MT_CYCLE = {
  menstruelle: {titre:"Phase menstruelle", texte:"Repos, chaleur, fer végétal, bouillons, protéines douces. Plantes : ortie, framboisier, mélisse.", couleur:"#fee2e2"},
  folliculaire: {titre:"Phase folliculaire", texte:"Construction, énergie, protéines, fibres, mouvement progressif. Plantes : romarin, maté doux, spiruline.", couleur:"#dcfce7"},
  ovulatoire: {titre:"Phase ovulatoire", texte:"Hydratation, antioxydants, légumes frais, récupération. Plantes : hibiscus, menthe, ortie.", couleur:"#fef3c7"},
  luteale: {titre:"Phase lutéale", texte:"Magnésium, apaisement, réduction sucre/caféine, sommeil. Plantes : ashwagandha, mélisse, camomille.", couleur:"#ede9fe"}
};

const MT_TERRAIN_Q = [
  ["Sommeil léger ou réveils nocturnes ?", "nerveux"],
  ["Stress, charge mentale ou irritabilité ?", "nerveux"],
  ["Ballonnements ou digestion lente ?", "digestif"],
  ["Transit irrégulier ?", "digestif"],
  ["Cycle douloureux, SPM ou variations d’humeur ?", "hormonal"],
  ["Envies de sucre avant les règles ?", "hormonal"],
  ["Fatigue au réveil ?", "nerveux"],
  ["Peau terne ou imperfections ?", "digestif"],
  ["Rétention d’eau ?", "hormonal"],
  ["Récupération difficile après effort ?", "minéral"]
];

function mtInitPremiumFeatures(){
  try{ mtRenderTerrainQuestions(); mtRenderLexique(); mtRegisterSW(); mtOfflineFlushSoon(); }catch(e){ console.warn("MT premium init:", e); }
}

function mtRenderTerrainQuestions(){
  const box=document.getElementById("terrain-ai-questions");
  if(!box || box.dataset.ready) return;
  box.dataset.ready="1";
  box.innerHTML=MT_TERRAIN_Q.map((q,i)=>`
    <div class="card" style="padding:14px;margin:0 0 10px;background:#fdfcfa;box-shadow:none">
      <p style="font-size:13px;color:var(--ink);font-weight:600;margin:0 0 8px">${q[0]}</p>
      <input type="range" min="0" max="5" value="2" id="mt-terrain-q-${i}" style="width:100%;accent-color:var(--brand)">
    </div>`).join("");
}

function mtGenerateTerrainAI(){
  const scores={nerveux:0,digestif:0,hormonal:0,minéral:0};
  MT_TERRAIN_Q.forEach((q,i)=>{ scores[q[1]] += Number(document.getElementById("mt-terrain-q-"+i)?.value||0); });
  const dominant=Object.keys(scores).sort((a,b)=>scores[b]-scores[a])[0] || "nerveux";
  const second=Object.keys(scores).filter(k=>k!==dominant).sort((a,b)=>scores[b]-scores[a])[0] || "digestif";
  const plantes=Object.entries(MT_PLANTES).filter(([_,p])=>p.terrain===dominant || p.terrain===second).slice(0,4);
  const result={
    date:new Date().toISOString(),
    scores, dominant, second,
    plantes:plantes.map(([nom,p])=>({nom, produit:p.produit}))
  };
  try{
    const slug=currentSlug||"admin";
    localStorage.setItem("mt_terrain_ai_"+slug, JSON.stringify(result));
    mtQueueSync({type:"terrain_ai", slug, data:result});
  }catch(e){}
  document.getElementById("terrain-ai-result").innerHTML=`
    <div class="goal-card" style="margin-bottom:16px">
      <p style="font-size:9px;text-transform:uppercase;letter-spacing:.18em;font-weight:800;opacity:.75;margin:0 0 8px">Profil généré</p>
      <h3 class="serif" style="font-size:22px;margin:0 0 10px">Terrain ${dominant} + ${second}</h3>
      <p style="font-size:13px;line-height:1.7;margin:0;opacity:.9">On soutient ton terrain avec une approche douce : plantes ciblées, rythme quotidien et suivi de vitalité.</p>
    </div>
    <div class="card" style="padding:18px">
      <p style="font-size:10px;text-transform:uppercase;letter-spacing:.14em;font-weight:800;color:var(--brand);margin:0 0 12px">Plantes & produits suggérés</p>
      ${plantes.map(([nom,p])=>`<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f0ece6">
        <span style="font-size:20px">${p.emoji}</span><div style="flex:1"><strong style="font-size:13px">${nom}</strong><p style="font-size:11px;color:var(--muted);margin:2px 0 0">${p.produit}</p></div>
      </div>`).join("")}
    </div>`;
}

function mtSetCyclePhase(phase){
  const c=MT_CYCLE[phase]; if(!c) return;
  try{
    const slug=currentSlug||"admin";
    localStorage.setItem("mt_cycle_"+slug, JSON.stringify({phase,date:new Date().toISOString()}));
    mtQueueSync({type:"cycle",slug,data:{phase,date:new Date().toISOString()}});
  }catch(e){}
  document.getElementById("cycle-result").innerHTML=`
    <div class="card" style="padding:20px;background:${c.couleur};border:none">
      <p style="font-size:10px;text-transform:uppercase;letter-spacing:.14em;font-weight:800;color:var(--brand);margin:0 0 8px">${c.titre}</p>
      <p style="font-size:13px;color:var(--ink);line-height:1.7;margin:0">${c.texte}</p>
    </div>`;
}

function mtRenderLexique(){
  const list=document.getElementById("lexique-list"); if(!list || list.dataset.ready) return;
  list.dataset.ready="1";
  list.innerHTML=Object.entries(MT_PLANTES).map(([nom,p])=>`
    <div class="card" style="padding:18px">
      <div style="display:flex;gap:12px;align-items:flex-start">
        <div style="width:42px;height:42px;border-radius:50%;background:var(--paper);display:flex;align-items:center;justify-content:center;font-size:21px">${p.emoji}</div>
        <div style="flex:1">
          <h3 class="serif" style="font-size:19px;margin:0 0 4px;color:var(--ink)">${nom}</h3>
          <p style="font-size:12px;color:var(--muted);line-height:1.6;margin:0 0 8px">${p.props.join(" • ")}</p>
          <p style="font-size:11px;color:#9a6b2f;line-height:1.5;margin:0 0 8px">Précaution : ${p.precautions}</p>
          <span class="badge" style="background:rgba(83,100,74,.1);color:var(--brand)">${p.produit}</span>
        </div>
      </div>
    </div>`).join("");
}

function mtComputeSmartScore(slug){
  const days=[];
  for(let i=6;i>=0;i--){
    const d=new Date(); d.setDate(d.getDate()-i);
    try{ days.push(JSON.parse(localStorage.getItem("mt_suivi_"+slug+"_"+mtLocalDateKey(d))||"{}")); }catch(e){days.push({});}
  }
  let total=0, count=0, checks=0;
  days.forEach(x=>{
    ["energie","sommeil","digestion"].forEach(k=>{ if(x[k]){ total+=Number(x[k]); count++; }});
    ["eau","repas","infusion","sport"].forEach(k=>{ if(x[k]) checks++; });
  });
  const base=count? Math.round((total/(count*5))*65):0;
  const habit=Math.round((checks/(7*4))*35);
  return Math.min(100, base+habit);
}

function mtGeneratePremiumPDF(){
  const jsPDF=window.jspdf?.jsPDF;
  if(!jsPDF){ alert("Le générateur PDF n'est pas chargé."); return; }
  const slug=currentSlug||"cliente";
  const prog=window._currentProg || {};
  const terrain=JSON.parse(localStorage.getItem("mt_terrain_ai_"+slug)||"null");
  const score=mtComputeSmartScore(slug);
  const doc=new jsPDF({unit:"mm",format:"a4"});
  doc.setFillColor(250,248,243); doc.rect(0,0,210,297,"F");
  doc.setTextColor(45,36,30);
  doc.setFont("times","italic"); doc.setFontSize(28); doc.text("Méthode Tee",20,28);
  doc.setFont("helvetica","normal"); doc.setFontSize(10); doc.setTextColor(122,112,104);
  doc.text("Rapport premium de fin de programme",20,38);
  doc.setDrawColor(83,100,74); doc.line(20,44,190,44);
  doc.setTextColor(45,36,30); doc.setFont("times","normal"); doc.setFontSize(18);
  doc.text("Synthèse",20,60);
  doc.setFont("helvetica","normal"); doc.setFontSize(11); doc.setTextColor(80,70,62);
  const lines=[
    "Cliente : "+(document.getElementById("display-prenom")?.textContent||slug),
    "Objectif : "+(prog.objectif||document.getElementById("goal-title")?.textContent||"Programme personnalisé"),
    "Score de vitalité : "+score+"/100",
    terrain ? ("Terrain dominant : "+terrain.dominant+" + "+terrain.second) : "Terrain dominant : non renseigné",
    "Recommandations Maison Yanna : "+(terrain?.plantes?.map(p=>p.nom).join(", ")||"à compléter avec Tee")
  ];
  doc.text(lines,20,72,{maxWidth:170,lineHeightFactor:1.55});
  doc.setFont("times","normal"); doc.setFontSize(18); doc.setTextColor(45,36,30);
  doc.text("Victoires & continuité",20,125);
  doc.setFont("helvetica","normal"); doc.setFontSize(11); doc.setTextColor(80,70,62);
  const transfo=prog.transformation||{};
  const vic=(transfo.victoires||"Régularité du suivi\nMeilleure conscience du terrain\nRituels installés").split("\n").filter(Boolean);
  doc.text(vic.map(v=>"• "+v),20,137,{maxWidth:170,lineHeightFactor:1.6});
  doc.setFillColor(83,100,74); doc.roundedRect(20,230,170,26,6,6,"F");
  doc.setTextColor(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(12);
  doc.text("Continuer l’accompagnement avec Maison Yanna",30,246);
  doc.save("rapport-methode-tee-"+slug+".pdf");
}

function mtQueueSync(item){
  try{
    const q=JSON.parse(localStorage.getItem("mt_offline_queue")||"[]");
    q.push({...item, ts:Date.now()});
    localStorage.setItem("mt_offline_queue",JSON.stringify(q));
    mtOfflineFlushSoon();
  }catch(e){}
}

function mtOfflineFlushSoon(){
  if(!navigator.onLine || !window.sb) return;
  setTimeout(async()=>{
    let q=[]; try{q=JSON.parse(localStorage.getItem("mt_offline_queue")||"[]");}catch(e){}
    if(!q.length) return;
    // Minimal durable sync: store queue snapshots into mt_clients.programme.mt_events when possible
    const rest=[];
    for(const item of q){
      try{
        if(item.slug && item.slug!=="admin" && window.sb){
          const res=await sb.from(SB_TABLE).select("programme").eq("slug",item.slug).single();
          if(res.error||!res.data) throw new Error("no client");
          const prog=Object.assign({},res.data.programme||{});
          if(!prog.mt_events) prog.mt_events=[];
          prog.mt_events.push(item);
          await sb.from(SB_TABLE).update({programme:prog}).eq("slug",item.slug);
        }
      }catch(e){ rest.push(item); }
    }
    localStorage.setItem("mt_offline_queue",JSON.stringify(rest));
  },600);
}
window.addEventListener("online", mtOfflineFlushSoon);

function mtRegisterSW(){
  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("./sw.js").catch(()=>{});
  }
}

// Patch saveSuivi to include score/offline queue while preserving original
if(typeof saveSuivi==="function" && !window.__mtPatchedSave){
  window.__mtPatchedSave=true;
  const oldSaveSuivi=saveSuivi;
  saveSuivi=function(){
    oldSaveSuivi.apply(this,arguments);
    const slug=currentSlug||"admin";
    const score=mtComputeSmartScore(slug);
    const bar=document.getElementById("score-bar"), txt=document.getElementById("score-text"), badge=document.getElementById("score-badge");
    if(bar) bar.style.width=score+"%";
    if(txt) txt.textContent="Score intelligent : "+score+"/100 — calculé depuis énergie, sommeil, digestion et habitudes.";
    if(badge){ badge.style.display="block"; badge.textContent=score+"/100"; }
    try{
      const today=mtLocalDateKey();
      const data=JSON.parse(localStorage.getItem("mt_suivi_"+slug+"_"+today)||"{}");
      mtQueueSync({type:"suivi",slug,date:today,data});
    }catch(e){}
  }
}


/* ════════════════════════════════════════
   INIT
════════════════════════════════════════ */
(async function init(){
  const settings=loadSettings();
  const sbUrl=document.getElementById("sb-url");
  const sbKey=document.getElementById("sb-key");
  if(sbUrl) sbUrl.value=settings.url||"";
  if(sbKey) sbKey.value=settings.key||"";
  if(settings.url&&settings.key){try{sb=getFactory()(settings.url,settings.key);}catch(e){}}
  mtInitPremiumFeatures();
  const isAdminPage = !!window.MT_ADMIN_PAGE || location.pathname.toLowerCase().includes("admin.html");
  if(isAdminPage) {
    try{
      const {data:{session},error:sessionError}=await sb.auth.getSession();
      if(sessionError) throw sessionError;
      const user=session?.user;
      if(!user){showAuthScreen(true);return;}
      const ok=await checkAdminAuth(user.id);
      if(!ok) throw new Error("Ce compte n’est pas autorisé à administrer Méthode Tee.");
      hideLoading();
      renderClientView("toi",emptyProgramme());
      setTimeout(()=>{ try{ openAdmin(); loadAllClients(); }catch(e){} },250);
    }catch(e){
      hideLoading();
      document.body.innerHTML=`<main class="auth-page"><section class="auth-card"><p class="auth-kicker">Espace professionnel</p><h1>Connexion<br><em>interrompue</em></h1><p>${e.message||"La vérification n’a pas abouti."}</p><button onclick="location.reload()">Réessayer</button></section></main>`;
      return;
    }
  } else {
    await loadAuthenticatedClient();
  }
  lucide.createIcons();
})();
