import { buildTerrain } from './terrain.js';
import { buildChart } from './tracking.js';
import { buildBotanicals } from './botanique.js';
import { setCycle } from './cycle.js';
import { generatePDF } from './pdf.js';
import { initRealtime } from './realtime.js';

window.generateTerrain = buildTerrain;
window.setCycle = setCycle;
window.generatePDF = generatePDF;

const questions = [
'Sommeil réparateur ?',
'Ballonnements ?',
'Énergie stable ?',
'Stress élevé ?',
'Cycle douloureux ?',
'Cravings sucre ?',
'Transit lent ?',
'Fatigue mentale ?',
'Récupération difficile ?',
'Humeur fluctuante ?'
];

const wrap = document.getElementById('terrain-form');

questions.forEach((q,i)=>{
const div = document.createElement('div');
div.className='question';

div.innerHTML = `
<p>${q}</p>
<input type="range" min="1" max="5" value="3" id="q-${i}">
`;

wrap.appendChild(div);
});

buildChart();
buildBotanicals();
initRealtime();
