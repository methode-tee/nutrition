/* Admin-only, read-only preview of a client plan across all five service formulas. */
(function(){
  if(!window.MT_ADMIN_PAGE || window.__MT_ADMIN_PREVIEW_INSTALLED__) return;
  window.__MT_ADMIN_PREVIEW_INSTALLED__=true;

  const FORMULAS=[
    {price:120,offer:"signature",name:"Essentiel",detail:"Cadre personnalisé"},
    {price:240,offer:"privilege",name:"Suivi",detail:"Ajustements hebdomadaires"},
    {price:400,offer:"elite",name:"Signature",detail:"Espace vivant & Maison Yanna"},
    {price:900,offer:"performance_plus",name:"Private",detail:"Anticipation & suivi proactif"},
    {price:1500,offer:"private_performance",name:"Private Performance+",detail:"Pilotage & concierge sportif"}
  ];
  let saved=null,base=null,clientName="",selectedPrice=120;
  const clone=value=>{try{return structuredClone(value||{});}catch(_){return JSON.parse(JSON.stringify(value||{}));}};

  function currentPrice(prog){
    const price=Number(prog?.formule_prix_eur);
    if(FORMULAS.some(f=>f.price===price)) return price;
    return FORMULAS.find(f=>f.offer===prog?.offre)?.price||120;
  }
  function renderFormulaButtons(){
    const root=document.getElementById("mt-preview-formulas");if(!root)return;
    root.replaceChildren();
    FORMULAS.forEach(f=>{
      const button=document.createElement("button");button.type="button";button.className="mt-preview-formula";
      button.setAttribute("aria-pressed",String(f.price===selectedPrice));
      button.innerHTML=`<strong>${f.name}</strong><span>${f.price.toLocaleString("fr-FR")} €/mois</span>`;
      button.addEventListener("click",()=>renderFormula(f.price));root.appendChild(button);
    });
  }
  function renderFormula(price){
    const formula=FORMULAS.find(f=>f.price===price)||FORMULAS[0];selectedPrice=formula.price;
    const preview=clone(base);preview.formule_prix_eur=formula.price;preview.offre=formula.offer;
    window.MT_ADMIN_PREVIEW=true;
    renderFormulaButtons();
    window.renderClientView(clientName,preview);
    const headerLabel=document.querySelector("#app>header p");if(headerLabel)headerLabel.textContent="Espace Client";
    const title=document.getElementById("mt-preview-client-name");if(title)title.textContent=`${clientName} · aperçu ${formula.name}`;
    const badge=document.getElementById("mt-formula-badge");if(badge)badge.textContent=formula.name;
    const main=document.querySelector(".main-scroll");if(main)main.scrollTop=0;
    window.switchTab("accueil");
  }
  window.mtOpenClientPreview=function(){
    if(!currentSlug){
      window.alert("Ouvre d’abord la fiche d’un client pour voir son espace.");return;
    }
    if(typeof programme==="undefined"||!programme){
      window.alert("La fiche client n’est pas encore chargée.");return;
    }
    const langSwitch=document.getElementById("mt-lang-switch");
    saved={programme,_currentProg,currentSlug,currentDay,title:document.title,headerLabel:document.querySelector("#app>header p")?.textContent,formule:document.body.dataset.formule,level:document.body.dataset.serviceLevel,parcours:document.body.dataset.parcours,langSwitchParent:langSwitch?.parentElement,langSwitchNext:langSwitch?.nextSibling};
    base=clone(programme);clientName=(document.getElementById("f-prenom")?.value||"Client").trim();
    selectedPrice=currentPrice(base);
    window.MT_ADMIN_PREVIEW=true;document.body.classList.add("mt-admin-preview-active");
    window.mtInitClientPerformancePreview?.();
    const header=document.querySelector("#app>header");
    if(header&&langSwitch)header.appendChild(langSwitch);
    document.getElementById("admin-overlay")?.classList.remove("open");
    const controls=document.getElementById("mt-admin-preview-controls");if(controls)controls.hidden=false;
    renderFormula(selectedPrice);
  };
  window.mtCloseClientPreview=function(){
    if(!saved)return;
    // Clear the visible client data behind the admin panel while retaining the
    // read-only guard. The authenticated session and loaded edit form stay intact.
    window.MT_ADMIN_PREVIEW=true;
    document.getElementById("mt-formula-badge")?.remove();
    window.renderClientView("toi",window.emptyProgramme());
    window.MT_ADMIN_PREVIEW=false;document.body.classList.remove("mt-admin-preview-active");
    const controls=document.getElementById("mt-admin-preview-controls");if(controls)controls.hidden=true;
    const langSwitch=document.getElementById("mt-lang-switch");
    if(langSwitch&&saved.langSwitchParent){
      const next=saved.langSwitchNext?.parentElement===saved.langSwitchParent?saved.langSwitchNext:null;
      saved.langSwitchParent.insertBefore(langSwitch,next);
    }
    programme=saved.programme;_currentProg=saved._currentProg;currentSlug=saved.currentSlug;currentDay=saved.currentDay;
    document.title=saved.title;
    const headerLabel=document.querySelector("#app>header p");if(headerLabel&&saved.headerLabel)headerLabel.textContent=saved.headerLabel;
    if(saved.formule)document.body.dataset.formule=saved.formule;else delete document.body.dataset.formule;
    if(saved.level)document.body.dataset.serviceLevel=saved.level;else delete document.body.dataset.serviceLevel;
    if(saved.parcours)document.body.dataset.parcours=saved.parcours;else delete document.body.dataset.parcours;
    saved=null;base=null;
    document.getElementById("admin-overlay")?.classList.add("open");
    try{window.renderSuiviGlobal?.();window.renderRenewals?.();}catch(_){}
  };

  // Keep navigation usable in preview while preventing edits, submissions, and client actions.
  ["click","input","change","submit"].forEach(type=>document.addEventListener(type,event=>{
    if(!window.MT_ADMIN_PREVIEW)return;
    if(type==="click"&&event.target.closest(".bottom-nav, #mt-plan-navigation, .section-switcher"))return;
    if(event.target.closest(".main-scroll, .bottom-nav")){
      event.preventDefault();event.stopImmediatePropagation();
    }
  },true));
})();
