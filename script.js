const $input = document.getElementById('searchInput');
const $btn = document.getElementById('searchBtn');
const $recent = document.getElementById('recent');
const $empty = document.getElementById('empty');
const $loader = document.getElementById('loader');
const $error = document.getElementById('error');
const $profile = document.getElementById('profile');
const $themeBtn = document.getElementById('themeBtn');

let theme = localStorage.getItem('gh-theme') || 'dark';
let recent = JSON.parse(localStorage.getItem('gh-recent')||'[]');
let sortBy = 'updated';

const LANG_COLORS = {JavaScript:"#f1e05a",TypeScript:"#3178c6",Python:"#3572A5",Java:"#b07219",Go:"#00ADD8",HTML:"#e34c26",CSS:"#563d7c",Dart:"#00B4AB",Shell:"#89e051",PHP:"#4F5D95","C++":"#f34b7d",C:"#555",Swift:"#F05138",Kotlin:"#A97BFF",Rust:"#dea584",Vue:"#41b883"};

function getColor(l){return LANG_COLORS[l]||"#8b949e"}

function applyTheme(){
  document.documentElement.setAttribute('data-theme', theme);
  $themeBtn.textContent = theme==='dark' ? '☀️' : '🌙';
  localStorage.setItem('gh-theme', theme);
}
applyTheme();
$themeBtn.onclick=()=>{theme=theme==='dark'?'light':'dark';applyTheme()};

function renderRecent(){
  $recent.innerHTML='';
  recent.slice(0,6).forEach(u=>{
    const b=document.createElement('button');
    b.textContent=u;
    b.onclick=()=>{ $input.value=u; search(u); };
    $recent.appendChild(b);
  });
}
renderRecent();

document.querySelectorAll('[data-user]').forEach(b=>{
  b.onclick=()=>{ $input.value=b.dataset.user; search(b.dataset.user); };
});

async function search(username){
  const u = (username||$input.value).trim();
  if(!u) return;
  $empty.classList.add('hidden');
  $profile.classList.add('hidden');
  $error.classList.add('hidden');
  $loader.classList.remove('hidden');
  $profile.innerHTML='';

  try{
    const userRes = await fetch(`https://api.github.com/users/${u}`);
    if(userRes.status===404) throw new Error(`User "${u}" not found`);
    if(userRes.status===403) throw new Error('GitHub API rate limit exceeded. Wait 1 minute.');
    if(!userRes.ok) throw new Error('GitHub API error '+userRes.status);
    const user = await userRes.json();

    const repoRes = await fetch(`https://api.github.com/users/${u}/repos?per_page=100&sort=updated`);
    const repos = repoRes.ok ? await repoRes.json() : [];

    // save recent
    recent = [u, ...recent.filter(x=>x.toLowerCase()!==u.toLowerCase())].slice(0,6);
    localStorage.setItem('gh-recent', JSON.stringify(recent));
    renderRecent();

    renderProfile(user, repos);
  }catch(err){
    $error.textContent = err.message;
    $error.classList.remove('hidden');
  }finally{
    $loader.classList.add('hidden');
  }
}

function renderProfile(user, repos){
  const totalStars = repos.reduce((a,r)=>a+r.stargazers_count,0);
  
  // language stats
  const counts={}; let total=0;
  repos.forEach(r=>{ if(r.language){ counts[r.language]=(counts[r.language]||0)+1; total++; } });
  const langs = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([lang,c])=>({lang,c,pct: Math.round(c/total*100), color:getColor(lang)}));

  const sorted = [...repos].sort((a,b)=> sortBy==='stars' ? b.stargazers_count - a.stargazers_count : new Date(b.updated_at)-new Date(a.updated_at)).slice(0,10);

  $profile.innerHTML = `
  <div class="profile-grid">
    <div class="card p-card">
      <img class="avatar" src="${user.avatar_url}" alt="${user.login}" />
      <div class="p-name">${user.name||user.login}</div>
      <div class="p-login">@${user.login}</div>
      ${user.bio?`<div class="p-bio">${user.bio}</div>`:''}
      <div class="p-meta">
        ${user.location?`<span>📍 ${user.location}</span>`:''}
        ${user.company?`<span>🏢 ${user.company}</span>`:''}
        ${user.blog?`<span>🔗 <a href="${user.blog.startsWith('http')?user.blog:'https://'+user.blog}" target="_blank" style="color:var(--accent)">${user.blog}</a></span>`:''}
        <span>📅 Joined ${new Date(user.created_at).toLocaleDateString('en-US',{month:'short',year:'numeric'})}</span>
      </div>
      <div class="stats">
        <div class="stat"><b>${user.public_repos}</b><small>Repos</small></div>
        <div class="stat"><b>${totalStars.toLocaleString()}</b><small>Stars</small></div>
        <div class="stat"><b>${user.followers.toLocaleString()}</b><small>Followers</small></div>
        <div class="stat"><b>${user.following.toLocaleString()}</b><small>Following</small></div>
      </div>
      <a class="btn primary" href="${user.html_url}" target="_blank">View on GitHub ↗</a>

      <div class="lang-wrap">
        <h4 style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-top:18px">Languages</h4>
        <div class="lang-bar">${langs.map(l=>`<div style="width:${l.pct}%;background:${l.color}"></div>`).join('')}</div>
        <div class="lang-list">${langs.map(l=>`<span class="lang-item"><i style="background:${l.color}"></i>${l.lang} ${l.pct}%</span>`).join('')||'<span style="color:var(--muted);font-size:12px">No languages yet</span>'}</div>
      </div>
    </div>

    <div class="card">
      <div class="repo-head">
        <h3>Repositories • ${repos.length}</h3>
        <div class="sort">
          <button class="${sortBy==='updated'?'active':''}" id="sUpdated">Updated</button>
          <button class="${sortBy==='stars'?'active':''}" id="sStars">Stars</button>
        </div>
      </div>
      <div class="repos">
        ${sorted.map(r=>`
          <div class="repo">
            <a href="${r.html_url}" target="_blank">${r.name}</a>
            <p>${r.description||'No description'}</p>
            <div class="repo-foot">
              ${r.language?`<span><span class="dot-l" style="background:${getColor(r.language)}"></span> ${r.language}</span>`:''}
              <span>⭐ ${r.stargazers_count}</span>
              <span>⑂ ${r.forks_count}</span>
              <span style="margin-left:auto">${new Date(r.updated_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="heat">
        <h4>Repo activity (last 12 months mock heatmap)</h4>
        <div class="heat-grid" id="heat"></div>
      </div>
      ${repos.length>10?`<div style="padding:16px;text-align:center;border-top:1px solid var(--border)"><a class="btn" href="https://github.com/${user.login}?tab=repositories" target="_blank">View all ${user.public_repos} repos on GitHub</a></div>`:''}
    </div>
  </div>
  `;
  $profile.classList.remove('hidden');

  // heatmap random levels
  const heat = $profile.querySelector('#heat');
  for(let i=0;i<91;i++){
    const d=document.createElement('div');
    const lvl=Math.floor(Math.random()*5);
    if(lvl>0) d.className='l'+lvl;
    heat.appendChild(d);
  }

  $profile.querySelector('#sUpdated').onclick=()=>{ sortBy='updated'; renderProfile(user,repos); };
  $profile.querySelector('#sStars').onclick=()=>{ sortBy='stars'; renderProfile(user,repos); };
}

$btn.onclick=()=>search();
$input.addEventListener('keydown', e=>{ if(e.key==='Enter') search(); });
