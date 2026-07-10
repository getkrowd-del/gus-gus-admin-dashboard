var ROWS = [];
var sortKey = 'Timestamp', sortDir = -1;
var ENDPOINT = '/api/public/landing-pages/5432/sheet-data';

function loadData(){
  document.getElementById('err').style.display='none';
  var host = document.getElementById('tableHost');
  host.innerHTML = '<div class="loading">Loading signups…</div>';
  fetch(ENDPOINT)
    .then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
    .then(function(json){
      ROWS = normalize(json);
      render();
    })
    .catch(function(e){
      var err=document.getElementById('err');
      err.style.display='block';
      err.textContent='Could not load sheet data ('+e.message+'). Make sure the sheet is linked to this page.';
      host.innerHTML='<div class="empty">No data available.</div>';
    });
}

function normalize(json){
  var arr = Array.isArray(json) ? json
          : json.rows ? json.rows
          : json.data ? json.data
          : json.values ? valuesToObjects(json.values)
          : [];
  return arr.map(function(o){
    return {
      Timestamp: pick(o,['Timestamp','timestamp','Submitted At','submitted_at']),
      Name: pick(o,['Name','name','Full Name','full_name']),
      Email: pick(o,['Email','email','Email Address','email_address']),
      Phone: pick(o,['Phone','phone','Phone Number','phone_number']),
      Birthday: pick(o,['Birthday','birthday','Birth Date','dob'])
    };
  }).filter(function(r){ return r.Name||r.Email||r.Phone; });
}
function valuesToObjects(values){
  if(!values||!values.length) return [];
  var headers = values[0];
  return values.slice(1).map(function(row){
    var o={}; headers.forEach(function(h,i){ o[h]=row[i]||''; }); return o;
  });
}
function pick(o,keys){ for(var i=0;i<keys.length;i++){ if(o[keys[i]]!=null && o[keys[i]]!=='') return String(o[keys[i]]); } return ''; }

function parseBday(s){
  if(!s) return null;
  var d = new Date(s);
  if(!isNaN(d)) return {m:d.getMonth(), day:d.getDate()};
  var m = s.match(/(\d{1,2})[\/\-](\d{1,2})/);
  if(m) return {m:parseInt(m[1],10)-1, day:parseInt(m[2],10)};
  return null;
}
function daysUntil(b){
  if(!b) return 999;
  var now=new Date(); var y=now.getFullYear();
  var next=new Date(y,b.m,b.day);
  var today=new Date(y,now.getMonth(),now.getDate());
  if(next<today) next=new Date(y+1,b.m,b.day);
  return Math.round((next-today)/86400000);
}

function computeStats(){
  var now=new Date(), month=now.getMonth();
  var total=ROWS.length, mo=0, wk=0;
  ROWS.forEach(function(r){
    var b=parseBday(r.Birthday);
    if(b && b.m===month) mo++;
    if(daysUntil(b)<=7) wk++;
  });
  document.getElementById('statTotal').textContent=total;
  document.getElementById('statMonth').textContent=mo;
  document.getElementById('statWeek').textContent=wk;
}

function sortBy(k){ if(sortKey===k) sortDir*=-1; else{sortKey=k;sortDir=1;} render(); }

function render(){
  computeStats();
  var q=(document.getElementById('search').value||'').toLowerCase();
  var rows=ROWS.filter(function(r){
    return !q || (r.Name+' '+r.Email+' '+r.Phone).toLowerCase().indexOf(q)>-1;
  });
  rows.sort(function(a,b){
    var x=(a[sortKey]||'').toLowerCase(), y=(b[sortKey]||'').toLowerCase();
    return x<y?-1*sortDir : x>y?1*sortDir : 0;
  });
  document.getElementById('countPill').textContent=rows.length;

  var host=document.getElementById('tableHost');
  if(!rows.length){ host.innerHTML='<div class="empty">No signups yet. They\'ll appear here as people join the Birthday Club. 🎂</div>'; return; }

  var html='<table><thead><tr>'
    +'<th onclick="sortBy(\'Name\')">Name</th>'
    +'<th onclick="sortBy(\'Email\')">Email</th>'
    +'<th onclick="sortBy(\'Phone\')">Phone</th>'
    +'<th onclick="sortBy(\'Birthday\')">Birthday</th>'
    +'<th onclick="sortBy(\'Timestamp\')">Signed Up</th>'
    +'</tr></thead><tbody>';
  rows.forEach(function(r){
    var b=parseBday(r.Birthday); var du=daysUntil(b);
    var soon = du<=7;
    html+='<tr class="'+(soon?'soon':'')+'">'
      +'<td>'+esc(r.Name)+(soon?'<span class="tag">🎂 '+(du===0?'today':du+'d')+'</span>':'')+'</td>'
      +'<td><a href="mailto:'+esc(r.Email)+'">'+esc(r.Email)+'</a></td>'
      +'<td><a href="tel:'+esc(r.Phone)+'">'+esc(r.Phone)+'</a></td>'
      +'<td>'+esc(r.Birthday)+'</td>'
      +'<td>'+esc(r.Timestamp)+'</td>'
      +'</tr>';
  });
  html+='</tbody></table>';
  host.innerHTML=html;
}
function esc(s){ return (s||'').replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }

function exportCsv(){
  var q=(document.getElementById('search').value||'').toLowerCase();
  var rows=ROWS.filter(function(r){ return !q || (r.Name+' '+r.Email+' '+r.Phone).toLowerCase().indexOf(q)>-1; });
  var head=['Name','Email','Phone','Birthday','Signed Up'];
  var lines=[head.join(',')];
  rows.forEach(function(r){
    lines.push([r.Name,r.Email,r.Phone,r.Birthday,r.Timestamp].map(function(v){
      v=(v||'').replace(/"/g,'""'); return '"'+v+'"';
    }).join(','));
  });
  var blob=new Blob([lines.join('\n')],{type:'text/csv'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='gus-gus-birthday-club.csv';
  a.click();
}

loadData();