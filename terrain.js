
export function buildTerrain(){

const result = document.getElementById('terrain-output');

let score = 0;

for(let i=0;i<10;i++){
score += Number(document.getElementById(`q-${i}`).value);
}

let terrain = 'équilibré';
let plantes = ['Mélisse','Romarin'];

if(score > 35){
terrain = 'nerveux/hormonal';
plantes = ['Ashwagandha','Mélisse','Camomille'];
}

if(score < 25){
terrain = 'digestif';
plantes = ['Fenouil','Romarin','Menthe'];
}

result.innerHTML = `
<div class="botanical-card">
<h4>Terrain dominant : ${terrain}</h4>

<p>Plantes suggérées :</p>

<ul>
${plantes.map(p=>`<li>${p}</li>`).join('')}
</ul>

<p>Produits Maison Yanna associés.</p>
</div>
`;
}
