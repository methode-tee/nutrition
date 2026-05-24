const feed = document.getElementById('feed');

setInterval(()=>{

const item = document.createElement('div');

item.className='botanical-card';

item.innerHTML = `
<strong>Realtime Sync</strong>
<p>Nouvelle activité cliente détectée.</p>
<small>${new Date().toLocaleTimeString()}</small>
`;

feed.prepend(item);

},3500);
