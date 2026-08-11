/* ════════════════════════════════════════
   MÉTHODE TEE — FR / EN FIX
   - Switch déplacé pour ne plus couvrir l'avatar client.
   - Traduction élargie de l'interface.
   - Ne traduit pas magiquement tous les contenus coach personnalisés
     enregistrés dans Supabase : pour ça il faut saisir FR + EN côté admin.
════════════════════════════════════════ */

(function(){
  const LANG_KEY = "mt_lang";
  const DEFAULT_LANG = "fr";

  const dictionary = {
    fr: {
      language: "Langue"
    },
    en: {
      language: "Language"
    }
  };

  const exactMap = {
    /* Header / global */
    "Espace Client": "Client Space",
    "ESPACE CLIENT": "CLIENT SPACE",
    "Méthode Tee": "Méthode Tee",
    "Privé": "Private",
    "PRIVÉ": "PRIVATE",
    "Bonjour toi,": "Hello you,",
    "Voici ce que nous travaillons aujourd’hui.": "Here is what we are working on today.",
    "Équilibre": "Balance",
    "Performance": "Performance",
    "Aujourd’hui": "Today",
    "Mon plan": "My plan",
    "Mon suivi": "My check-in",
    "Progression": "Progress",
    "Tee": "Tee",
    "Ton objectif principal": "Your main goal",
    "TON OBJECTIF PRINCIPAL": "YOUR MAIN GOAL",
    "Le mot de Tee": "Tee’s note",
    "LE MOT DE TEE": "TEE’S NOTE",
    "Tes priorités du jour": "Your daily priorities",
    "TES PRIORITÉS DU JOUR": "YOUR DAILY PRIORITIES",
    "Checklist": "Checklist",
    "CHECKLIST": "CHECKLIST",

    /* Accueil */
    "Rituel du jour": "Daily ritual",
    "RITUEL DU JOUR": "DAILY RITUAL",
    "Ton rythme Méthode Tee": "Your Méthode Tee rhythm",
    "Aucun rituel ajouté.": "No ritual added.",
    "Analyse du terrain": "Terrain analysis",
    "ANALYSE DU TERRAIN": "TERRAIN ANALYSIS",
    "Ce que nous travaillons": "What we are working on",
    "Mode rituel": "Ritual mode",
    "Score de vitalité": "Vitality score",
    "Cette semaine": "This week",

    /* Repas */
    "Ton Menu": "Your Menu",
    "Programme alimentaire personnalisé": "Personalized meal program",
    "Éveil & Matin": "Wake-up & Morning",
    "ÉVEIL & MATIN": "WAKE-UP & MORNING",
    "Déjeuner": "Lunch",
    "DÉJEUNER": "LUNCH",
    "Collation": "Snack",
    "COLLATION": "SNACK",
    "Dîner & Soir": "Dinner & Evening",
    "DÎNER & SOIR": "DINNER & EVENING",
    "Matin": "Morning",
    "Midi": "Midday",
    "Soir": "Evening",

    /* Soins / botanique */
    "Soins": "Care",
    "Tes alliés naturels — clique sur une plante pour son lexique.": "Your natural allies — tap a plant to open its lexicon.",
    "Protocole végétal": "Botanical protocol",
    "PROTOCOLE VÉGÉTAL": "BOTANICAL PROTOCOL",
    "Plantes & infusions": "Plants & infusions",
    "Lexique botanique — Clique pour découvrir": "Botanical lexicon — Tap to discover",
    "Ma sélection": "My selection",
    "Envoyer ma sélection à Tee": "Send my selection to Tee",
    "Vider la sélection": "Clear selection",
    "Voir le produit": "View product",
    "+ Sélectionner": "+ Select",
    "✓ Sélectionné": "✓ Selected",

    /* Signature */
    "Signature Healthy": "Healthy Signature",
    "Ton plat signature personnalisé.": "Your personalized signature meal.",
    "Une base saine, pratique et élégante.": "A healthy, practical and elegant base.",
    "Plat Signature": "Signature Meal",

    /* Bilan / transformation */
    "Ma Transformation": "My Transformation",
    "Ton évolution depuis le début du programme.": "Your progress since the beginning of the program.",
    "Photos de progression": "Progress photos",
    "PHOTOS DE PROGRESSION": "PROGRESS PHOTOS",
    "Aucune photo pour le moment.": "No photo yet.",
    "Ajouter une photo": "Add a photo",
    "Avant / Après — visible uniquement par toi et Tee": "Before / After — visible only by you and Tee",
    "Point de départ": "Starting point",
    "POINT DE DÉPART": "STARTING POINT",
    "Bilan de départ à venir…": "Starting assessment coming soon…",
    "Mes objectifs": "My goals",
    "MES OBJECTIFS": "MY GOALS",
    "Mes victoires": "My wins",
    "MES VICTOIRES": "MY WINS",
    "Ressentis marquants": "Key feelings",
    "RESSENTIS MARQUANTS": "KEY FEELINGS",

    /* Programme */
    "Mon Programme": "My Program",
    "Programme personnalisé Méthode Tee": "Personalized Méthode Tee program",
    "Ta règle cette semaine": "Your rule this week",
    "TA RÈGLE CETTE SEMAINE": "YOUR RULE THIS WEEK",
    "Progression globale": "Overall progress",
    "PROGRESSION GLOBALE": "OVERALL PROGRESS",
    "En cours": "Current",
    "Terminée ✓": "Completed ✓",
    "À venir": "Coming next",
    "Note de Tee": "Tee’s note",

    /* Suivi */
    "Mon Suivi": "My Tracking",
    "Mes 7 derniers jours": "My last 7 days",
    "MES 7 DERNIERS JOURS": "MY LAST 7 DAYS",
    "Checks du jour": "Daily checks",
    "CHECKS DU JOUR": "DAILY CHECKS",
    "Eau suffisante": "Enough water",
    "Repas respectés": "Meals followed",
    "Infusion / protocole": "Infusion / protocol",
    "Sport / marche": "Workout / walking",
    "Mesures du jour": "Daily measures",
    "MESURES DU JOUR": "DAILY MEASURES",
    "Poids (kg)": "Weight (kg)",
    "Énergie": "Energy",
    "Sommeil": "Sleep",
    "Digestion": "Digestion",
    "Note du jour": "Daily note",

    /* Terrain questionnaire */
    "Bilan de terrain": "Terrain assessment",
    "10 questions pour identifier ton profil et tes plantes.": "10 questions to identify your profile and plants.",
    "Question": "Question",
    "Précédent": "Previous",
    "Suivant →": "Next →",
    "Voir mon profil →": "See my profile →",
    "Ton terrain dominant": "Your dominant terrain",
    "TON TERRAIN DOMINANT": "YOUR DOMINANT TERRAIN",
    "Plantes recommandées": "Recommended plants",
    "PLANTES RECOMMANDÉES": "RECOMMENDED PLANTS",
    "Conseils alimentaires": "Food guidance",
    "CONSEILS ALIMENTAIRES": "FOOD GUIDANCE",
    "Refaire le bilan": "Retake assessment",

    /* Cycle */
    "Journal de cycle": "Cycle journal",
    "Alimentation et plantes adaptées à chaque phase.": "Food and plants adapted to each phase.",
    "Ma phase actuelle": "My current phase",
    "MA PHASE ACTUELLE": "MY CURRENT PHASE",
    "Menstruelle": "Menstrual",
    "Folliculaire": "Follicular",
    "Ovulatoire": "Ovulatory",
    "Lutéale": "Luteal",
    "Début des règles": "Period start",
    "Durée cycle (j)": "Cycle length (days)",
    "Alimentation": "Food",
    "Plantes": "Plants",

    /* Messages */
    "Messages": "Messages",
    "Ton espace d'échange avec Tee.": "Your space to chat with Tee.",
    "Aucun message pour le moment.": "No messages yet.",
    "Écris à Tee, elle te répondra très vite 🌿": "Write to Tee, she’ll reply very soon 🌿",
    "Envoyer à Tee": "Send to Tee",

    /* Placard */
    "Placard Maison Yanna": "Maison Yanna Pantry",
    "Sélectionne ce que tu as — l'app te propose un rituel adapté.": "Select what you have — the app suggests a suitable ritual.",
    "Ce que j'ai dans mon placard": "What I have in my pantry",
    "Générateur rituel & recette": "Ritual & recipe generator",
    "Fatigue": "Fatigue",
    "Gourmand": "Comfort",
    "Rapide": "Quick",
    "Peau": "Skin",
    "Générer mon rituel": "Generate my ritual",

    /* PDF / renewal */
    "Télécharger mon bilan PDF": "Download my PDF report",
    "Renouveler le programme": "Renew program",
    "Fin de programme": "End of program",
    "Ta transformation": "Your transformation",
    "Un programme se termine, une nouvelle étape commence.": "One program ends, a new stage begins.",
    "Continue avec": "Continue with",
    "Écrire à Tee pour continuer": "Message Tee to continue",
    "Fermer": "Close",

    /* Admin */
    "Admin": "Admin",
    "Connexion Supabase": "Supabase connection",
    "URL Supabase": "Supabase URL",
    "Clé API (anon)": "API key (anon)",
    "Connecter": "Connect",
    "Tester": "Test",
    "Suivi du jour": "Daily tracking",
    "Connecte Supabase pour voir le suivi.": "Connect Supabase to view tracking.",
    "Clients": "Clients",
    "Tous": "All",
    "Nouveaux": "New",
    "Actifs": "Active",
    "Relancer": "Follow up",
    "Profil client": "Client profile",
    "Slug URL": "URL slug",
    "Prénom": "First name",
    "Semaine": "Week",
    "Statut": "Status",
    "Offre": "Offer",
    "Code promo": "Promo code",
    "Prochain RDV": "Next appointment",
    "Objectif principal": "Main goal",
    "Mot du coach": "Coach note",
    "Objectifs (une ligne = un point)": "Goals (one line = one point)",
    "Priorités du jour": "Daily priorities",
    "Sauvegarder": "Save",
    "Copier lien": "Copy link",
    "Dupliquer": "Duplicate",
    "Supprimer": "Delete",
    "Rapport hebdomadaire": "Weekly report",
    "Actions": "Actions",
    "Notes privées": "Private notes",
    "Jamais visible par la cliente.": "Never visible to the client."
  };

  const phraseMap = {
    "Dimanche": "Sunday",
    "Lundi": "Monday",
    "Mardi": "Tuesday",
    "Mercredi": "Wednesday",
    "Jeudi": "Thursday",
    "Vendredi": "Friday",
    "Samedi": "Saturday",
    "janvier": "January",
    "février": "February",
    "mars": "March",
    "avril": "April",
    "mai": "May",
    "juin": "June",
    "juillet": "July",
    "août": "August",
    "septembre": "September",
    "octobre": "October",
    "novembre": "November",
    "décembre": "December",
    "Semaine": "Week",
    "Programme alimentaire personnalisé": "Personalized meal program",
    "Ton plat signature personnalisé": "Your personalized signature meal",
    "depuis le début du programme": "since the beginning of the program"
  };

  function getLang(){
    return localStorage.getItem(LANG_KEY) || DEFAULT_LANG;
  }

  function normalizeText(s){
    return (s || "").replace(/\s+/g, " ").trim();
  }

  function translateValue(text, lang){
    if (lang === "fr") return text;

    const normalized = normalizeText(text);
    if (!normalized) return text;

    if (exactMap[normalized]) {
      const before = text.match(/^\s*/)?.[0] || "";
      const after = text.match(/\s*$/)?.[0] || "";
      return before + exactMap[normalized] + after;
    }

    let next = text;
    Object.entries(phraseMap).forEach(([fr,en]) => {
      next = next.replace(new RegExp("\\b"+fr+"\\b","gi"), (m) => {
        if (m === m.toUpperCase()) return en.toUpperCase();
        if (m[0] === m[0].toUpperCase()) return en[0].toUpperCase()+en.slice(1);
        return en.toLowerCase();
      });
    });

    return next;
  }

  function restoreFrenchValue(text){
    let next = text;

    Object.entries(exactMap).forEach(([fr,en]) => {
      if (normalizeText(next) === en) next = fr;
      if (normalizeText(next) === en.toUpperCase()) next = fr.toUpperCase();
    });

    Object.entries(phraseMap).forEach(([fr,en]) => {
      next = next.replace(new RegExp("\\b"+en+"\\b","gi"), (m) => {
        if (m === m.toUpperCase()) return fr.toUpperCase();
        if (m[0] === m[0].toUpperCase()) return fr[0].toUpperCase()+fr.slice(1);
        return fr.toLowerCase();
      });
    });

    return next;
  }

  function translateStaticNodes(root){
    const lang = getLang();

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node){
        const txt = normalizeText(node.nodeValue);
        if (!txt) return NodeFilter.FILTER_REJECT;
        if (node.parentElement && ["SCRIPT","STYLE","TEXTAREA","INPUT"].includes(node.parentElement.tagName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    while(walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(node => {
      const original = node.nodeValue;
      const current = lang === "fr" ? restoreFrenchValue(original) : translateValue(restoreFrenchValue(original), lang);
      if (current !== original) node.nodeValue = current;
    });

    const placeholders = {
      "Comment tu te sens aujourd'hui ?": "How do you feel today?",
      "Écris ton message à Tee…": "Write your message to Tee…",
      "Ta réponse…": "Your reply…",
      "Message personnalisé…": "Personalized message…",
      "Nouveau produit": "New product",
      "Lien https://...": "Link https://..."
    };

    root.querySelectorAll("[placeholder]").forEach(el => {
      const ph = el.getAttribute("placeholder");
      if (lang === "en" && placeholders[ph]) el.setAttribute("placeholder", placeholders[ph]);
      if (lang === "fr") {
        Object.entries(placeholders).forEach(([fr,en]) => {
          if (ph === en) el.setAttribute("placeholder", fr);
        });
      }
    });
  }

  function findMount(){
    return document.querySelector(".header") || document.querySelector("header") || document.body;
  }

  function injectLanguageSwitch(){
    if (document.getElementById("mt-lang-switch")) return;

    const wrap = document.createElement("div");
    wrap.id = "mt-lang-switch";
    wrap.className = "mt-lang-switch";
    wrap.innerHTML = `
      <button type="button" data-lang="fr" aria-label="Français">FR</button>
      <button type="button" data-lang="en" aria-label="English">EN</button>
    `;

    const mount = findMount();
    mount.appendChild(wrap);

    wrap.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-lang]");
      if (!btn) return;
      setLanguage(btn.dataset.lang);
    });

    updateLangSwitchState();
  }

  function updateLangSwitchState(){
    const lang = getLang();
    document.querySelectorAll("#mt-lang-switch button").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.lang === lang);
    });
  }

  function setLanguage(lang){
    if (!["fr","en"].includes(lang)) lang = DEFAULT_LANG;
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.setAttribute("lang", lang);
    translateStaticNodes(document.body);
    updateLangSwitchState();
    window.dispatchEvent(new CustomEvent("mt:languagechange", { detail: { lang }}));
  }

  let observerReady = false;
  function startObserver(){
    if (observerReady) return;
    observerReady = true;

    let timer = null;
    const obs = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => translateStaticNodes(document.body), 80);
    });

    obs.observe(document.body, { childList:true, subtree:true, characterData:true });
  }

  window.MT_I18N = {
    setLanguage,
    getLang,
    translateStaticNodes,
    exactMap,
    phraseMap
  };
  window.setLanguage = setLanguage;

  document.addEventListener("DOMContentLoaded", () => {
    injectLanguageSwitch();
    setLanguage(getLang());
    startObserver();
  });
})();
