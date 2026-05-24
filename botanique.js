
export function buildBotanicals(){

const plantes = [
{
nom:'Ashwagandha',
benef:'Stress • équilibre nerveux',
prod:'Golden Ashwa Latte'
},
{
nom:'Mélisse',
benef:'Sommeil • apaisement',
prod:'Lune Céleste'
},
{
nom:'Romarin',
benef:'Digestion • énergie',
prod:'Pure Skin Detox'
}
];

const grid = document.getElementById('botanical-grid');

plantes.forEach(p=>{

const div = document.createElement('div');
div.className='botanical-card';

div.innerHTML = `
<h4>${p.nom}</h4>
<p>${p.benef}</p>
<small>${p.prod}</small>
`;

grid.appendChild(div);

});
}
