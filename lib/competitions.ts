export const presets=[
 {id:'my',name:'Malaysia Premier Circuit',category:'domestic',country:'Malaysia',format:'league',color:'#ffb84b',cities:['Kuala Lumpur City','Johor Southern','Selangor Eagles','Penang Mariners','Perak Royals','Terengganu Coast','Sabah Highlanders','Kedah Northern']},
 {id:'en',name:'English Premier Circuit',category:'domestic',country:'England',format:'league',color:'#bca2ff',cities:['London Borough','Manchester Union','Liverpool Harbour','North London Athletic','Birmingham Forge','Newcastle North','Brighton Coast','Leeds White Rose']},
 {id:'es',name:'Iberian Primera Circuit',category:'domestic',country:'Spain',format:'league',color:'#ff7865',cities:['Madrid Crown','Barcelona Coast','Sevilla Sol','Valencia Orange','Bilbao Athletic','Villarreal Gold','San Sebastian Blue','Vigo Atlantic']},
 {id:'id',name:'Indonesia Premier Circuit',category:'domestic',country:'Indonesia',format:'league',color:'#ff687c',cities:['Jakarta Metropolitan','Bandung United','Surabaya Green','Bali Island','Makassar Eastern','Semarang Central','Malang Pride','Yogyakarta Heritage']},
 {id:'continental',name:'Continental Champions Cup',category:'international',country:'Club football',format:'knockout',color:'#73d9ed',cities:['Madrid Crown','Manchester Union','Barcelona Coast','Munich Red Stars','Milan Rosso','Paris Lumiere','Lisbon Navigators','Amsterdam Orange']},
 {id:'nations',name:'World Nations Championship',category:'international',country:'National teams',format:'groups',color:'#9ce88c',cities:['Malaysia','Brazil','Argentina','France','England','Spain','Germany','Portugal','Japan','South Korea','Morocco','Senegal','Mexico','USA','Australia','Netherlands']},
 {id:'custom',name:'Your competition',category:'custom',country:'Your world',format:'league',color:'#ffdba6',cities:['Atlas United','Coastal Rovers','Capital FC','Northern Athletic','City Wanderers','Royal Sporting','Valley Rangers','Southern Stars']}
];
const colors=['#ff7356','#6ed9d3','#bdabff','#f5ca6a','#79c89b','#75b5f3','#f69bc0','#e6e9ed'];
const first=['Adam','Amir','Danish','Hakim','Irfan','Faris','Arif','Rizal','Syafiq','Azlan','Hafiz','Nazmi','Luqman','Haziq','Faiz','Iman','Aiman','Zafran'];
const globalFirst=['Alex','Lucas','Daniel','Marco','Gabriel','Mateo','Rafael','Leo','Nico','Bruno','Hugo','Oscar','Felix','Samuel','Theo','Enzo','Julian','Noah'];
export function presetTeams(id='my'){
 const p=presets.find(p=>p.id===id)||presets[0];
 return p.cities.map((name,i)=>({id:'t'+i,name,short:name.split(' ').map(w=>w[0]).join('').slice(0,3).toUpperCase(),color:colors[i%colors.length],logo:'',tactics:{formation:'4-3-3',style:'balanced'},players:Array.from({length:11},(_,n)=>({name:(['my','id'].includes(id)?first:globalFirst)[n]+' '+['Azmi','Silva','Reyes','Moreau','Walker','Costa','Weber','Santos'][i%8],position:n===0?'GK':n<5?'DEF':n<8?'MID':'FWD',rating:68+(i*3+n*7)%24})),bench:Array.from({length:7},(_,n)=>({name:(['my','id'].includes(id)?first:globalFirst)[n+11]+' '+['Azmi','Silva','Reyes','Moreau','Walker','Costa','Weber','Santos'][i%8],position:n===0?'GK':n<3?'DEF':n<5?'MID':'FWD',rating:66+(i+n*3)%22}))}));
}
