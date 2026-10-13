/* Admin-only read-only view of the selected client's currently assigned experience. */
(function(){
  if(!window.MT_ADMIN_PAGE||window.__MT_ADMIN_PREVIEW_INSTALLED__)return;
  window.__MT_ADMIN_PREVIEW_INSTALLED__=true;
  let saved=null;
  const clone=value=>{try{return structuredClone(value||{});}catch(_){return JSON.parse(JSON.stringify(value||{}));}};

  window.mtOpenClientPreview=function(){
    if(!currentSlug){window.alert("Ouvre d’abord la fiche d’un client pour voir son espace.");return;}
    if(typeof programme==="undefined"||!programme){window.alert("La fiche client n’est pas encore chargée.");return;}
    const langSwitch=document.getElementById("mt-lang-switch");
    const activity=document.getElementById("activite");
    saved={programme,_currentProg,currentSlug,currentDay,title:document.title,headerLabel:document.querySelector("#app>header p")?.textContent,formule:document.body.dataset.formule,level:document.body.dataset.serviceLevel,parcours:document.body.dataset.parcours,langSwitchParent:langSwitch?.parentElement,langSwitchNext:langSwitch?.nextSibling,returnToActivity:!!activity&&!activity.hidden};
    const clientName=(document.getElementById("f-prenom")?.value||"Client").trim();
    const clientProgramme=clone(programme);
    window.mtLeaveActivity?.();
    window.MT_ADMIN_PREVIEW=true;
    document.body.classList.add("mt-admin-preview-active","mt-client-page");
    window.mtInitClientPerformancePreview?.();
    document.querySelector("#app>header p").textContent="Espace Client";
    if(langSwitch)document.querySelector("#app>header").appendChild(langSwitch);
    document.getElementById("mt-preview-return").hidden=false;
    document.getElementById("mt-preview-nav").hidden=false;
    document.getElementById("mt-plan-navigation").hidden=true;
    document.getElementById("admin-overlay")?.classList.remove("open");
    window.renderClientView(clientName,clientProgramme);
    document.querySelector(".main-scroll").scrollTop=0;
    window.switchTab("accueil");
  };

  window.mtCloseClientPreview=function(){
    if(!saved)return;
    window.MT_ADMIN_PREVIEW=true;
    document.getElementById("mt-preview-nav").hidden=true;
    document.getElementById("mt-plan-navigation").hidden=true;
    document.getElementById("mt-preview-return").hidden=true;
    document.getElementById("mt-formula-badge")?.remove();
    window.renderClientView("toi",window.emptyProgramme());
    window.MT_ADMIN_PREVIEW=false;
    document.body.classList.remove("mt-admin-preview-active","mt-client-page");
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
    const returnToActivity=saved.returnToActivity;saved=null;
    document.getElementById("admin-overlay")?.classList.add("open");
    try{window.renderSuiviGlobal?.();window.renderRenewals?.();}catch(_){}
    if(returnToActivity)window.mtShowActivity?.();
  };

  // Allow navigation and disclosure controls, while keeping client mutations inert.
  ["click","input","change","submit"].forEach(type=>document.addEventListener(type,event=>{
    if(!window.MT_ADMIN_PREVIEW)return;
    if(type==="click"){
      const target=event.target instanceof Element?event.target:null;
      if(!target)return;
      if(target.closest(".bottom-nav, #mt-plan-navigation, summary, [data-preview-navigation]"))return;
      const action=target.closest("[onclick]")?.getAttribute("onclick")||"";
      if(/^\s*switchTab\(\s*['"][a-z0-9_-]+['"]/.test(action))return;
    }
    if(event.target.closest(".main-scroll, .bottom-nav, #mt-plan-navigation")){
      event.preventDefault();event.stopImmediatePropagation();
    }
  },true));
})();
