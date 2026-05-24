/* ════════════════════════════════════════
   MÉTHODE TEE — TRANSLATIONS FR / EN
   Fichier autonome : aucun framework, compatible GitHub Pages.
   Utilisation :
   - localStorage.mt_lang = "fr" ou "en"
   - Boutons auto injectés : 🇫🇷 / 🇬🇧
   - Traduit aussi les textes générés dynamiquement via MutationObserver.
════════════════════════════════════════ */

(function(){
  const LANG_KEY = "mt_lang";
  const DEFAULT_LANG = "fr";

  const dictionary = {
    fr: {
      appName: "Méthode Tee",
      clientSpace: "Espace Client",
      admin: "Admin",
      private: "Privé",
      hello: "Bonjour toi,",
      subtitle: "Ton espace nutrition & routines premium.",
      mainGoal: "Ton objectif principal",
      teeWord: "Le mot de Tee",
      dailyPriorities: "Tes priorités du jour",
      checklist: "Checklist",
      dailyRitual: "Rituel du jour",
      methodRhythm: "Ton rythme Méthode Tee",
      noRitual: "Aucun rituel ajouté.",
      terrainAnalysis: "Analyse du terrain",
      whatWeWorkOn: "Ce que nous travaillons",
      meals: "Repas",
      botanical: "Botanique",
      cycle: "Cycle",
      report: "Bilan",
      profile: "Profil",
      program: "Programme",
      messages: "Messages",
      pantry: "Placard",
      method: "Méthode",
      vitality: "Vitalité",
      sleep: "Sommeil",
      digestion: "Digestion",
      stress: "Stress",
      energy: "Énergie",
      hydration: "Hydratation citronnée",
      infusion: "Infusion terrain",
      breathing: "Respiration",
      recommendations: "Recommandations Maison Yanna",
      renewProgram: "Renouveler le programme",
      downloadPDF: "Télécharger mon bilan PDF",
      morning: "Matin",
      lunch: "Déjeuner",
      snack: "Collation",
      dinner: "Dîner",
      followUp: "Suivi",
      transformation: "Transformation",
      connectionSupabase: "Connexion Supabase",
      clients: "Clients",
      save: "Sauvegarder",
      copyLink: "Copier lien",
      duplicate: "Dupliquer",
      delete: "Supprimer",
      weeklyReport: "Rapport hebdomadaire",
      copied: "Copié",
      language: "Langue"
    },
    en: {
      appName: "Méthode Tee",
      clientSpace: "Client Space",
      admin: "Admin",
      private: "Private",
      hello: "Hello you,",
      subtitle: "Your premium nutrition & wellness space.",
      mainGoal: "Your main goal",
      teeWord: "Tee’s note",
      dailyPriorities: "Your daily priorities",
      checklist: "Checklist",
      dailyRitual: "Daily ritual",
      methodRhythm: "Your Méthode Tee rhythm",
      noRitual: "No ritual added.",
      terrainAnalysis: "Terrain analysis",
      whatWeWorkOn: "What we are working on",
      meals: "Meals",
      botanical: "Botanical",
      cycle: "Cycle",
      report: "Report",
      profile: "Profile",
      program: "Program",
      messages: "Messages",
      pantry: "Pantry",
      method: "Method",
      vitality: "Vitality",
      sleep: "Sleep",
      digestion: "Digestion",
      stress: "Stress",
      energy: "Energy",
      hydration: "Lemon hydration",
      infusion: "Terrain infusion",
      breathing: "Breathing",
      recommendations: "Maison Yanna recommendations",
      renewProgram: "Renew program",
      downloadPDF: "Download my PDF report",
      morning: "Morning",
      lunch: "Lunch",
      snack: "Snack",
      dinner: "Dinner",
      followUp: "Tracking",
      transformation: "Transformation",
      connectionSupabase: "Supabase connection",
      clients: "Clients",
      save: "Save",
      copyLink: "Copy link",
      duplicate: "Duplicate",
      delete: "Delete",
      weeklyReport: "Weekly report",
      copied: "Copied",
      language: "Language"
    }
  };

  const textMap = {
    "Espace Client": "clientSpace",
    "Méthode Tee": "appName",
    "PRIVÉ": "private",
    "Privé": "private",
    "Bonjour toi,": "hello",
    "Ton espace nutrition & routines premium.": "subtitle",
    "Ton objectif principal": "mainGoal",
    "LE MOT DE TEE": "teeWord",
    "Le mot de Tee": "teeWord",
    "Tes priorités du jour": "dailyPriorities",
    "TES PRIORITÉS DU JOUR": "dailyPriorities",
    "Checklist": "checklist",
    "CHECKLIST": "checklist",
    "Rituel du jour": "dailyRitual",
    "RITUEL DU JOUR": "dailyRitual",
    "Ton rythme Méthode Tee": "methodRhythm",
    "Aucun rituel ajouté.": "noRitual",
    "Analyse du terrain": "terrainAnalysis",
    "ANALYSE DU TERRAIN": "terrainAnalysis",
    "Ce que nous travaillons": "whatWeWorkOn",
    "Repas": "meals",
    "Botanique": "botanical",
    "Cycle": "cycle",
    "Bilan": "report",
    "Profil": "profile",
    "Programme": "program",
    "Messages": "messages",
    "Placard": "pantry",
    "Méthode": "method",
    "Vitalité": "vitality",
    "Sommeil": "sleep",
    "Digestion": "digestion",
    "Stress": "stress",
    "Énergie": "energy",
    "Hydratation citronnée": "hydration",
    "Infusion terrain": "infusion",
    "Respiration": "breathing",
    "Connexion Supabase": "connectionSupabase",
    "Clients": "clients",
    "Sauvegarder": "save",
    "Copier lien": "copyLink",
    "Dupliquer": "duplicate",
    "Supprimer": "delete",
    "Rapport hebdomadaire": "weeklyReport"
  };

  function getLang(){
    return localStorage.getItem(LANG_KEY) || DEFAULT_LANG;
  }

  function t(key){
    const lang = getLang();
    return (dictionary[lang] && dictionary[lang][key]) || dictionary.fr[key] || key;
  }

  function normalizeText(s){
    return (s || "").replace(/\s+/g, " ").trim();
  }

  function translateStaticNodes(root){
    const lang = getLang();

    // data-i18n support
    root.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      if (dictionary[lang] && dictionary[lang][key]) el.textContent = dictionary[lang][key];
    });

    // text-node replacement for existing app markup
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node){
        const txt = normalizeText(node.nodeValue);
        if (!txt) return NodeFilter.FILTER_REJECT;
        if (node.parentElement && ["SCRIPT","STYLE","TEXTAREA","INPUT"].includes(node.parentElement.tagName)) return NodeFilter.FILTER_REJECT;
        return textMap[txt] ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });

    const nodes = [];
    while(walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(node => {
      const txt = normalizeText(node.nodeValue);
      const key = textMap[txt];
      if (key && dictionary[lang][key]) {
        const original = node.nodeValue;
        const prefix = original.match(/^\s*/)?.[0] || "";
        const suffix = original.match(/\s*$/)?.[0] || "";
        let val = dictionary[lang][key];
        if (txt === txt.toUpperCase()) val = val.toUpperCase();
        node.nodeValue = prefix + val + suffix;
      }
    });

    // placeholders
    const placeholders = {
      "Comment tu te sens aujourd'hui ?": { fr:"Comment tu te sens aujourd'hui ?", en:"How do you feel today?" },
      "Écris ton message à Tee…": { fr:"Écris ton message à Tee…", en:"Write your message to Tee…" },
      "Ta réponse…": { fr:"Ta réponse…", en:"Your reply…" }
    };

    root.querySelectorAll("[placeholder]").forEach(el => {
      const ph = el.getAttribute("placeholder");
      if (placeholders[ph]) el.setAttribute("placeholder", placeholders[ph][lang]);
    });
  }

  function injectLanguageSwitch(){
    if (document.getElementById("mt-lang-switch")) return;

    const wrap = document.createElement("div");
    wrap.id = "mt-lang-switch";
    wrap.className = "mt-lang-switch";
    wrap.setAttribute("aria-label", t("language"));
    wrap.innerHTML = `
      <button type="button" data-lang="fr" aria-label="Français">FR</button>
      <button type="button" data-lang="en" aria-label="English">EN</button>
    `;

    document.body.appendChild(wrap);

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
    if (!dictionary[lang]) lang = DEFAULT_LANG;
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
      timer = setTimeout(() => translateStaticNodes(document.body), 50);
    });
    obs.observe(document.body, { childList:true, subtree:true });
  }

  window.MT_I18N = { dictionary, t, setLanguage, getLang, translateStaticNodes };
  window.setLanguage = setLanguage;

  document.addEventListener("DOMContentLoaded", () => {
    injectLanguageSwitch();
    setLanguage(getLang());
    startObserver();
  });
})();
