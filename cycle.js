
export function setCycle(phase){

const map = {
menstruation:'Repos • fer • chaleur • infusion réconfortante',
folliculaire:'Énergie • protéines • mouvement',
ovulation:'Hydratation • récupération • vitalité',
luteale:'Magnésium • apaisement • sommeil'
};

document.getElementById('cycle-output').innerHTML = `
<div class="botanical-card">
${map[phase]}
</div>
`;
}
