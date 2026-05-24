export function initRealtime(){

console.log('Realtime initialisé');

window.addEventListener('offline',()=>{
console.log('Mode offline');
});

window.addEventListener('online',()=>{
console.log('Retour online');
});
}
