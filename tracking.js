
export function buildChart(){

const ctx = document.getElementById('vitalityChart');

new Chart(ctx,{
type:'line',
data:{
labels:['S1','S2','S3','S4','S5','S6'],
datasets:[{
label:'Vitalité',
data:[58,64,69,74,81,87]
}]
}
});
}
