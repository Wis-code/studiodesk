import { BRAND, assets as starterAssets, standards as starterStandards, foundationSteps } from './data/seed.js';
import { calculateConfiguration } from './core/pricing-engine.js';
import { diagnoseProject } from './core/diagnostic-engine.js';
import { projectHealth, canReleaseFinal } from './core/project-engine.js';
import { firebaseConnectionStatus } from './services/firebase.js';
import { signInWithEmail, signInWithGoogle, signOutUser, watchAuth } from './services/auth.js';
import {
  getCurrentUserProfile,
  subscribeOwnerWorkspace,
  subscribeToMyProjects,
  subscribeToPublishedCatalog,
  subscribePublicConfig,
  ensureWorkspaceSeed,
  getStudioSettings,
  saveCatalogAsset,
  saveStudioSettings,
  createProjectFromConfiguration,
  createInvoice,
  recordPayment,
  archiveProject,
  submitPublicPackageRequest,
} from './services/firestore.js';

const state = {
  route: location.hash.replace('#/','') || 'dashboard',
  authUser: null,
  profile: null,
  authReady: false,
  connection: { ready:false, label:'Connecting…' },
  workspace: { projects:[], clients:[], tasks:[], invoices:[], payments:[], expenses:[], catalogAssets:[], standards:[], portfolio:[] },
  studioSettings: null,
  publicCatalog: [],
  publicCatalogLoaded: false,
  publicSettings: null,
  selectedAssetIds: new Set(['logo','business-card','letterhead','social-kit']),
  publicSelectedAssetIds: new Set(['logo','business-card','letterhead','social-kit']),
  builderFoundationPrice: 0,
  toast: null,
  workspaceUnsub: null,
};

const app = document.getElementById('app');
const fmt = (n, currency='NGN') => new Intl.NumberFormat(currency === 'NGN' ? 'en-NG':'en-US',{style:'currency',currency,maximumFractionDigits:currency==='NGN'?0:2}).format(Number(n||0));
const esc = (v='') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const dateLabel = v => {
  if (!v) return '—';
  const d = v?.toDate?.() || new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'});
};
const nowIsoPlus = days => new Date(Date.now()+days*864e5).toISOString().slice(0,10);
const activeProjects = () => state.workspace.projects.filter(p=>!p.archived && p.status !== 'closed');
const archivedProjects = () => state.workspace.projects.filter(p=>p.archived || p.status === 'closed');
const myTasks = () => state.workspace.tasks.filter(t=>t.assigneeIds?.includes(state.authUser?.uid));

function toast(message, tone='success') {
  state.toast = { message, tone };
  render();
  setTimeout(()=>{ state.toast=null; render(); }, 3200);
}

function go(route){
  state.route = route;
  location.hash = `#/${route}`;
  render();
  scrollTo({top:0,behavior:'smooth'});
}

function logo(size='normal') { return `<img class="brand-mark ${size}" src="./assets/studiodesk-mark.png" alt="StudioDesk">`; }

const icon = name => {
  const paths = {
    home:'<path d="M3 11 12 3l9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    projects:'<path d="M4 5h6l2 2h8v12H4z"/><path d="M4 9h16"/>',
    clients:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/>',
    builder:'<path d="M4 4h16v16H4z"/><path d="M4 10h16M10 4v16"/>',
    standards:'<path d="m12 2 3 3-3 3-3-3zM5 10l3 3-3 3-3-3zM19 10l3 3-3 3-3-3zM12 16l3 3-3 3-3-3z"/>',
    team:'<circle cx="9" cy="7" r="4"/><path d="M2 21v-2a7 7 0 0 1 14 0v2M16 3.13a4 4 0 0 1 0 7.75M22 21v-2a7 7 0 0 0-5-6.71"/>',
    finance:'<path d="M3 6h18v12H3z"/><path d="M7 10h4M7 14h2M15 14h2"/>',
    portfolio:'<path d="M4 7h16v13H4z"/><path d="M8 7V4h8v3"/>',
    academy:'<path d="m2 10 10-5 10 5-10 5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-2.12 2.12-.06-.06A1.65 1.65 0 0 0 15.8 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.4 1.05V21h-3v-.09A1.65 1.65 0 0 0 10.2 19.4a1.65 1.65 0 0 0-1.82-.33l-.06.06-2.12-2.12.06-.06A1.65 1.65 0 0 0 6.6 15.2a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.05-.4H5v-3h.09A1.65 1.65 0 0 0 6.6 9.8a1.65 1.65 0 0 0-.33-1.82l-.06-.06L8.33 5.8l.06.06A1.65 1.65 0 0 0 10.2 6.2a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .4-1.05V4.5h3v.09A1.65 1.65 0 0 0 15.8 6.2a1.65 1.65 0 0 0 1.82-.33l.06-.06 2.12 2.12-.06.06A1.65 1.65 0 0 0 19.4 9.8a1.65 1.65 0 0 0 .6 1 1.65 1.65 0 0 0 1.05.4H21v3h-.09A1.65 1.65 0 0 0 19.4 15z"/>',
  };
  return `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[name]||paths.home}</svg>`;
};

const ownerNav = [
  ['dashboard','Overview','home'],['projects','Projects','projects'],['clients','Clients','clients'],['builder','Package Builder','builder'],['standards','Standards & Pricing','standards'],['team','Team','team'],['finance','Finance','finance'],['portfolio','Past Work','portfolio'],['academy','Academy','academy'],['settings','Settings','settings']
];
const workerNav = [['dashboard','My Work','home'],['projects','Projects','projects'],['team','Tasks','team'],['portfolio','My Portfolio','portfolio'],['academy','Academy','academy']];
const clientNav = [['dashboard','My Project','home'],['projects','Projects','projects'],['finance','Billing','finance'],['portfolio','Deliveries','portfolio'],['academy','Help','academy']];
function navForRole(role){ return role==='owner'||role==='admin'?ownerNav:role==='client'?clientNav:workerNav; }

function toastView(){
  return state.toast ? `<div class="toast ${state.toast.tone}"><span>${state.toast.tone==='error'?'!':'✓'}</span>${esc(state.toast.message)}</div>` : '';
}

function connectionBadge(){
  return `<span class="live-badge ${state.connection.ready?'online':'offline'}"><i></i>${esc(state.connection.label)}</span>`;
}

function shell(content, { title } = {}){
  const role = state.profile?.role || 'worker';
  const nav = navForRole(role);
  const current = nav.find(([id])=>id===state.route)?.[1] || title || 'StudioDesk';
  return `<div class="app-shell">
    <aside class="sidebar">
      <button class="brand-lockup" data-route="dashboard">${logo()}<span><strong>StudioDesk</strong><small>Wiscode Studio</small></span></button>
      <div class="workspace-label">Creative operations</div>
      <nav class="side-nav">${nav.map(([id,label,ic])=>`<button class="${state.route===id?'active':''}" data-route="${id}">${icon(ic)}<span>${label}</span></button>`).join('')}</nav>
      <div class="sidebar-bottom">
        ${connectionBadge()}
        <div class="profile-chip"><div class="avatar">${esc((state.profile?.displayName||'W')[0])}</div><div><strong>${esc(state.profile?.displayName||'Studio user')}</strong><small>${esc((state.profile?.role||'user').replaceAll('_',' '))}</small></div><button data-action="logout" title="Sign out">↗</button></div>
      </div>
    </aside>
    <main class="main-shell">
      <header class="topbar"><div><span class="top-kicker">StudioDesk</span><h1>${esc(current)}</h1></div><div class="top-actions"><button class="icon-button" data-action="notifications" title="Notifications">◌</button>${role==='owner'?'<button class="primary-button" data-route="builder">+ New project</button>':''}</div></header>
      <section class="page">${content}</section>
    </main>
    <nav class="mobile-nav">${nav.slice(0,5).map(([id,label,ic])=>`<button class="${state.route===id?'active':''}" data-route="${id}">${icon(ic)}<span>${label}</span></button>`).join('')}</nav>
    ${toastView()}
  </div>`;
}

function loadingScreen(){ return `<div class="auth-stage"><div class="ambient a"></div><div class="ambient b"></div><div class="loader-card">${logo('large')}<h1>StudioDesk</h1><p>Connecting your creative operating system…</p><div class="loader-bar"><span></span></div></div></div>`; }

function publicAssets(){ return state.publicCatalog.length ? state.publicCatalog : starterAssets; }
function publicConfigView(){
  const items = publicAssets();
  const selected = items.filter(a=>state.publicSelectedAssetIds.has(a.id));
  const calc = calculateConfiguration({ foundationPrice: Number((state.authUser && !state.authUser.isAnonymous ? state.studioSettings?.foundationPrice : state.publicSettings?.foundationPrice)||0), selectedAssets:selected });
  const diag = diagnoseProject({foundationSteps, selectedAssets:selected, standards:starterStandards});
  return `<div class="public-builder-section" id="public-builder"><div class="section-heading"><span class="eyebrow">Build what you actually need</span><h2>Configure your brand assets.</h2><p>You choose the outputs. StudioDesk diagnoses the professional process behind them.</p></div><div class="public-builder-grid"><div class="asset-grid">${items.map(a=>`<label class="asset-card light ${state.publicSelectedAssetIds.has(a.id)?'selected':''}"><input type="checkbox" data-public-asset="${esc(a.id)}" ${state.publicSelectedAssetIds.has(a.id)?'checked':''} ${a.required?'disabled':''}><span class="asset-tag">${a.required?'Core':'Optional'}</span><h3>${esc(a.name)}</h3><p>${esc(a.description||'')}</p><strong>${a.pricingMode==='custom'?'Custom quote':a.pricingMode==='starting'?'From '+fmt(a.startingPrice):fmt(a.price)}</strong></label>`).join('')}</div><aside class="public-summary"><span class="eyebrow">Your configuration</span><h3>${selected.length} selected assets</h3><div class="summary-row"><span>Estimated total</span><strong>${calc.hasCustomQuote?'From ':''}${fmt(calc.total)}</strong></div><div class="summary-row"><span>Production diagnosis</span><strong>${diag.steps.length} steps</strong></div><div class="summary-row"><span>Estimated production</span><strong>~${diag.estimatedDays} working days</strong></div><div class="summary-row"><span>Documentation</span><strong>${esc(diag.documentation.label)}</strong></div><button class="dark-button" data-action="open-public-request">Request this configuration</button><small>Submitting a request does not automatically accept the job or lock a final price.</small></aside></div></div>`;
}

function publicLanding(){
  return `<div class="public-site"><header class="public-nav"><div class="public-brand">${logo()}<strong>StudioDesk</strong></div><div><button class="text-button" data-action="scroll-builder">Build package</button><button class="nav-login" data-action="show-login">Client / Team login</button></div></header><section class="public-hero"><div class="ambient mint"></div><div class="ambient blue"></div><div class="hero-copy"><span class="eyebrow">Powered by Wiscode Studio</span><h1>Design work deserves a better operating system.</h1><p>Configure creative assets, follow progress, review protected work, approve directions and receive final deliveries through one premium workspace.</p><div class="hero-actions"><button class="primary-button large" data-action="scroll-builder">Configure a project</button><button class="glass-button large" data-action="show-login">Open portal</button></div><div class="trust-row"><span>Protected review previews</span><span>Live project progress</span><span>Professional delivery</span></div></div><div class="hero-product"><div class="product-window"><div class="window-top"><i></i><i></i><i></i><span>StudioDesk · Project intelligence</span></div><div class="product-body"><div class="mini-sidebar">${logo('mini')}<span></span><span></span><span></span></div><div class="mini-main"><div class="mini-title"><div><small>Brand Identity</small><b>74% complete</b></div><em>Healthy</em></div><div class="mini-progress"><span></span></div><div class="mini-cards"><article class="white-surface"><small>Next action</small><strong>Review moodboard feedback</strong></article><article><small>Worker progress</small><strong>8 / 11 tasks</strong></article></div><div class="mini-preview"><div>${logo('mini')}</div><span>PREVIEW · NOT FINAL</span></div></div></div></div></div></section>${publicConfigView()}<footer class="public-footer"><div>${logo('mini')}<strong>StudioDesk</strong></div><span>Creative operations by Wiscode Studio · Wiscode Innovations Limited</span></footer></div>`;
}

function loginView(){
  return `<div class="auth-stage"><div class="ambient a"></div><div class="ambient b"></div><button class="back-public" data-action="hide-login">← Back to StudioDesk</button><div class="auth-card"><div class="auth-brand">${logo('large')}<div><span class="eyebrow">Wiscode Studio</span><h1>Welcome back.</h1></div></div><p>Sign in to your StudioDesk workspace.</p><form id="login-form"><label>Email<input type="email" name="email" autocomplete="email" required placeholder="you@company.com"></label><label>Password<input type="password" name="password" autocomplete="current-password" required placeholder="••••••••"></label><button class="primary-button auth-submit" type="submit">Sign in</button></form><div class="auth-divider"><span>or</span></div><button class="google-button" data-action="google-login"><b>G</b> Continue with Google</button><small class="auth-note">Access is role-controlled. Clients only see their own portal; workers only see authorized assignments.</small></div></div>`;
}

function metric(label,value,caption,tone='mint'){ return `<article class="metric-card"><span>${esc(label)}</span><strong>${esc(value)}</strong><small class="${tone}">${esc(caption)}</small></article>`; }

function ownerDashboard(){
  const projects = activeProjects();
  const tasks = state.workspace.tasks;
  const invoices = state.workspace.invoices;
  const outstanding = invoices.reduce((s,i)=>s+Number(i.balance ?? i.amount ?? 0),0);
  const reviews = tasks.filter(t=>t.status==='review').length;
  const blocked = projects.filter(p=>p.blockedReason).length;
  const incompleteSetup = !state.workspace.catalogAssets.length;
  return shell(`${incompleteSetup?`<div class="setup-banner"><div><span class="eyebrow">First run</span><strong>Initialize StudioDesk standards and catalogue</strong><p>This creates editable starter standards and unpublished asset records. Nothing becomes public until you publish it.</p></div><button class="primary-button" data-action="seed-workspace">Initialize workspace</button></div>`:''}<section class="dashboard-hero"><div class="ambient dashboard-glow"></div><div><span class="eyebrow">Owner command centre</span><h2>Good evening, ${esc(state.profile?.displayName || 'Wisdom')}.</h2><p>StudioDesk connects creative production, people, approvals, money and delivery into one operating state.</p><div class="hero-actions"><button class="primary-button" data-route="builder">Create project</button><button class="glass-button" data-route="projects">Open production</button></div></div><div class="hero-health"><span class="status-chip healthy">● Studio health</span><strong>${blocked?'Attention needed':'Operating normally'}</strong><p>${blocked?`${blocked} project${blocked>1?'s are':' is'} currently blocked.`:'No project blockers have been recorded.'}</p><div class="health-meter"><span style="width:${blocked?76:94}%"></span></div></div></section><div class="metrics">${metric('Active projects',String(projects.length),`${projects.filter(p=>!p.blockedReason).length} moving`)}${metric('Internal review',String(reviews),reviews?'Needs attention':'Queue clear')}${metric('Outstanding',fmt(outstanding),`${invoices.filter(i=>Number(i.balance||0)>0).length} invoice(s)`,'amber')}${metric('Clients',String(state.workspace.clients.length),'Studio records')}</div><div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><span class="eyebrow">Needs your attention</span><h3>Operational queue</h3></div><button class="text-button" data-route="projects">See projects</button></div><div class="attention-list">${projects.length?projects.slice(0,6).map(p=>{const h=projectHealth({...p,deadline:p.deadline||nowIsoPlus(7)});return `<button class="attention-row" data-route="projects"><span class="status-dot ${h.key}"></span><div><strong>${esc(p.name)}</strong><small>${esc(p.clientName||'No client')} · ${esc(p.nextAction||p.status||'Draft')}</small></div><span class="status-chip ${h.key}">${h.label}</span></button>`}).join(''):'<div class="empty-state">No live projects yet. Build your first project from the Package Builder.</div>'}</div></section><section class="panel light-panel"><div class="panel-head"><div><span class="eyebrow dark">Finance pulse</span><h3>Project money</h3></div></div><div class="money-focus"><small>Outstanding balance</small><strong>${fmt(outstanding)}</strong></div><div class="paper-list"><div><span>Invoices</span><b>${invoices.length}</b></div><div><span>Confirmed payments</span><b>${state.workspace.payments.length}</b></div><div><span>Expenses recorded</span><b>${state.workspace.expenses.length}</b></div></div><button class="dark-button" data-route="finance">Open finance</button></section></div>`,{title:'Overview'});
}

function projectCard(p){
  const h = projectHealth({...p,deadline:p.deadline||nowIsoPlus(7)});
  const progress = Number(p.progress||0);
  return `<article class="project-card"><div class="project-top"><span class="status-chip ${h.key}">${h.label}</span><button class="dots">•••</button></div><h3>${esc(p.name||'Untitled project')}</h3><p>${esc(p.clientName||'No client')} · ${esc(p.type||'Design project')}</p><div class="project-progress"><div><span>Progress</span><b>${progress}%</b></div><div class="bar"><span style="width:${progress}%"></span></div></div><div class="project-bottom"><div><small>Next action</small><strong>${esc(p.nextAction||'Define next step')}</strong></div><span>${dateLabel(p.deadline)}</span></div>${p.blockedReason?`<div class="blocker">Blocked · ${esc(p.blockedReason)}</div>`:''}</article>`;
}

function projectsView(){
  const projects = state.profile?.role==='owner' ? activeProjects() : state.workspace.projects.filter(p=>!p.archived);
  return shell(`<div class="page-heading"><div><span class="eyebrow">Production</span><h2>Active projects</h2><p>Progress comes from actual workflow state, dependencies, reviews and release gates.</p></div>${state.profile?.role==='owner'?'<button class="primary-button" data-route="builder">+ Configure project</button>':''}</div><div class="filter-row"><button class="filter active">All</button><button class="filter">Healthy</button><button class="filter">Blocked</button><button class="filter">Review</button></div><div class="project-grid">${projects.length?projects.map(projectCard).join(''):'<div class="empty-card"><div class="logo-orb">'+logo('mini')+'</div><h3>No active projects yet</h3><p>Your first configured project will appear here with its generated workflow and progress.</p><button class="primary-button" data-route="builder">Build first project</button></div>'}</div>`,{title:'Projects'});
}

function clientsView(){
  const clients = state.workspace.clients;
  return shell(`<div class="page-heading"><div><span class="eyebrow">CRM</span><h2>Clients</h2><p>One record for contact routes, brand assets, projects, invoices and history.</p></div><button class="primary-button" data-route="builder">+ Start with project</button></div><section class="panel"><div class="table-wrap"><table><thead><tr><th>Client</th><th>Status</th><th>Projects</th><th>Email</th><th>Contact route</th></tr></thead><tbody>${clients.length?clients.map(c=>{const count=state.workspace.projects.filter(p=>p.clientId===c.id).length;return `<tr><td><strong>${esc(c.name)}</strong><small>${esc(c.company||'')}</small></td><td><span class="status-chip healthy">${esc(c.status||'active')}</span></td><td>${count}</td><td>${esc(c.email||'—')}</td><td>${esc(c.contactRoute||'Studio / project manager')}</td></tr>`}).join(''):'<tr><td colspan="5"><div class="empty-state">No client records yet.</div></td></tr>'}</tbody></table></div></section>`,{title:'Clients'});
}

function currentCatalog(){ return state.workspace.catalogAssets.length ? state.workspace.catalogAssets.sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0)) : starterAssets; }
function currentStandards(){
  if (!state.workspace.standards.length) return starterStandards;
  return Object.fromEntries(state.workspace.standards.map(s=>[s.id,s]));
}
function ownerBuilder(){
  const items = currentCatalog();
  const selected = items.filter(a=>state.selectedAssetIds.has(a.id));
  const foundationPrice = Number(state.builderFoundationPrice || state.studioSettings?.foundationPrice || 0);
  const calc = calculateConfiguration({foundationPrice,selectedAssets:selected,depositRate:Number(state.studioSettings?.depositRate||0.5)});
  const diag = diagnoseProject({foundationSteps,selectedAssets:selected,standards:currentStandards()});
  return shell(`<div class="page-heading"><div><span class="eyebrow">Diagnostic configurator</span><h2>Build the work, not the task list.</h2><p>Select what the client needs. StudioDesk converts assets into process, dependencies, tasks, timeline and value.</p></div><span class="status-chip healthy">Live diagnostic</span></div><div class="builder-layout"><div class="builder-main"><section class="panel foundation-card"><div><span class="eyebrow">Fixed creative foundation</span><h3>Discovery · Research · Moodboarding · Creative direction</h3><p>These are production methodology—not shoppable assets.</p></div><label>Foundation price<input id="foundation-price" type="number" min="0" value="${foundationPrice}" step="1000"></label></section><div class="asset-grid">${items.map(a=>`<label class="asset-card ${state.selectedAssetIds.has(a.id)?'selected':''}"><input type="checkbox" data-builder-asset="${esc(a.id)}" ${state.selectedAssetIds.has(a.id)?'checked':''} ${a.required?'disabled':''}><span class="asset-tag">${a.required?'Core':'Optional'}</span><h3>${esc(a.name)}</h3><p>${esc(a.description||'')}</p><strong>${a.pricingMode==='custom'?'Custom quote':a.pricingMode==='starting'?'From '+fmt(a.startingPrice):fmt(a.price)}</strong><small>${esc(a.standardId||'')}</small></label>`).join('')}</div></div><aside class="builder-summary panel"><span class="eyebrow">Project diagnosis</span><h3>${selected.length} assets selected</h3><div class="summary-list"><div><span>Estimated total</span><strong>${fmt(calc.total)}</strong></div><div><span>Suggested deposit</span><strong>${fmt(calc.deposit)}</strong></div><div><span>Unique production steps</span><strong>${diag.steps.length}</strong></div><div><span>Estimated effort</span><strong>${diag.estimatedHours}h</strong></div><div><span>Estimated production</span><strong>~${diag.estimatedDays} days</strong></div><div><span>Brand documentation</span><strong>${esc(diag.documentation.label)}</strong></div></div><div class="diagnostic-note"><b>Dependency-aware</b><span>Shared prerequisites are consolidated instead of creating duplicate tasks.</span></div><button class="primary-button full" data-action="open-create-project">Continue to project details</button></aside></div>`,{title:'Package Builder'});
}

function standardsView(){
  const items = currentCatalog();
  return shell(`<div class="page-heading"><div><span class="eyebrow">Operating standards</span><h2>Standards & live pricing</h2><p>Change a standard once. Future configurations immediately read the updated asset price and process.</p></div><button class="glass-button" data-action="seed-workspace">Ensure starter standards</button></div><section class="panel"><div class="panel-head"><div><span class="eyebrow">Shoppable outputs</span><h3>Asset catalogue</h3></div><span class="status-chip">${items.filter(a=>a.published).length} published</span></div><div class="standards-list">${items.map(a=>`<form class="standard-row" data-standard-form="${esc(a.id)}"><div><strong>${esc(a.name)}</strong><small>${esc(a.description||'')}</small></div><label>Price<input name="price" type="number" value="${Number(a.price||a.startingPrice||0)}" min="0" step="1000"></label><label>Mode<select name="pricingMode"><option value="fixed" ${a.pricingMode==='fixed'?'selected':''}>Fixed</option><option value="starting" ${a.pricingMode==='starting'?'selected':''}>Starting</option><option value="quantity" ${a.pricingMode==='quantity'?'selected':''}>Quantity</option><option value="custom" ${a.pricingMode==='custom'?'selected':''}>Custom</option></select></label><label class="switch-label"><span>Public</span><input name="published" type="checkbox" ${a.published?'checked':''}></label><button class="small-button" type="submit">Save</button></form>`).join('')}</div></section><div class="two-grid"><section class="panel"><div class="panel-head"><div><span class="eyebrow">Dependency engine</span><h3>How standards behave</h3></div></div><div class="feature-stack"><div><b>Required dependency</b><span>An asset cannot proceed before its prerequisite is ready.</span></div><div><b>Shared dependency</b><span>Common work is generated once, not repeated for every asset.</span></div><div><b>Composite output</b><span>Brand Guidelines assemble from completed identity assets.</span></div><div><b>Conditional dependency</b><span>Packaging, print and special outputs inject their own checks only when needed.</span></div></div></section><section class="panel light-panel"><div class="panel-head"><div><span class="eyebrow dark">Documentation intelligence</span><h3>Dynamic brand documentation</h3></div></div><div class="documentation-example"><b>4 eligible identity assets</b><span>One-page brand presentation</span><i>→</i><b>7+ eligible identity assets</b><span>Full Brand Guidelines</span></div></section></div>`,{title:'Standards & Pricing'});
}

function teamView(){
  const taskCount = state.workspace.tasks.length;
  const assigned = state.workspace.tasks.filter(t=>t.assigneeIds?.length).length;
  const review = state.workspace.tasks.filter(t=>t.status==='review').length;
  return shell(`<div class="page-heading"><div><span class="eyebrow">Worker portal</span><h2>Team & task intelligence</h2><p>Workers inherit generated tasks from the project diagnostic; they do not recreate standard task managers.</p></div><button class="glass-button" data-action="show-worker-note">Add worker</button></div><div class="metrics compact">${metric('Generated tasks',String(taskCount),'Across live projects')}${metric('Assigned',String(assigned),'Worker responsibility')}${metric('Internal review',String(review),'Owner / lead queue')}${metric('Overdue','0','Dependency-aware','amber')}</div><div class="two-grid"><section class="panel"><div class="panel-head"><div><span class="eyebrow">Task flow</span><h3>Assignment queue</h3></div></div><div class="task-list">${state.workspace.tasks.length?state.workspace.tasks.slice(0,12).map(t=>`<div class="task-row"><span class="task-check ${t.status==='done'?'done':''}">${t.status==='done'?'✓':''}</span><div><strong>${esc(t.title)}</strong><small>${esc(state.workspace.projects.find(p=>p.id===t.projectId)?.name||'Project')} · ${esc(t.status||'not-started')}</small></div><span>${Number(t.estimatedHours||0)}h</span></div>`).join(''):'<div class="empty-state">Generated project tasks will appear here.</div>'}</div></section><section class="panel"><div class="panel-head"><div><span class="eyebrow">Worker lifecycle</span><h3>Built for accountability, not surveillance</h3></div></div><div class="feature-stack"><div><b>Worker submits</b><span>Draft enters internal review instead of going directly to the client.</span></div><div><b>Owner / lead reviews</b><span>Approve, annotate or return for correction.</span></div><div><b>Contribution freezes at closure</b><span>Completed assigned work feeds hidden Past Work and portfolio candidates.</span></div><div><b>Client delay ≠ worker delay</b><span>Blocked dependencies remain distinct from performance.</span></div></div></section></div>`,{title:'Team'});
}

function financeView(){
  const invoices = state.workspace.invoices;
  const outstanding = invoices.reduce((s,i)=>s+Number(i.balance ?? i.amount ?? 0),0);
  const paid = state.workspace.payments.reduce((s,p)=>s+Number(p.amount||0),0);
  return shell(`<div class="page-heading"><div><span class="eyebrow">Manual finance</span><h2>Invoices, payments & release gates</h2><p>No payment gateway required. Bank transfers are recorded and verified before the workflow reacts.</p></div><button class="primary-button" data-action="open-invoice">+ New invoice</button></div><div class="metrics compact">${metric('Outstanding',fmt(outstanding),`${invoices.filter(i=>Number(i.balance||0)>0).length} open invoice(s)`,'amber')}${metric('Confirmed payments',fmt(paid),`${state.workspace.payments.length} transactions`)}${metric('Invoices',String(invoices.length),'Project-linked')}${metric('Gateway','Off','Manual verification')}</div><div class="finance-grid"><section class="panel"><div class="panel-head"><div><span class="eyebrow">Invoices</span><h3>Receivables</h3></div></div><div class="table-wrap"><table><thead><tr><th>Invoice</th><th>Client</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th></th></tr></thead><tbody>${invoices.length?invoices.map(i=>`<tr><td><strong>${esc(i.invoiceNo||i.id)}</strong><small>${dateLabel(i.createdAt)}</small></td><td>${esc(i.clientName||'—')}</td><td>${fmt(i.amount,i.currency)}</td><td>${fmt(i.paidAmount,i.currency)}</td><td>${fmt(i.balance??i.amount,i.currency)}</td><td><span class="status-chip ${i.status==='paid'?'healthy':i.status==='partially_paid'?'risk':'blocked'}">${esc(i.status||'unpaid')}</span></td><td>${Number(i.balance??i.amount)>0?`<button class="small-button" data-payment-invoice="${esc(i.id)}">Record payment</button>`:''}</td></tr>`).join(''):'<tr><td colspan="7"><div class="empty-state">No invoices yet.</div></td></tr>'}</tbody></table></div></section><aside class="panel light-panel finance-paper"><span class="eyebrow dark">Release policy</span><h3>Approval does not equal delivery.</h3><div class="release-flow"><div><i>1</i><span>Client approves final design</span></div><div><i>2</i><span>Required balance is verified</span></div><div><i>3</i><span>Final package passes QA</span></div><div><i>4</i><span>Authorized user releases files</span></div></div><small>Owner overrides can be allowed, but the audit trail should record the reason.</small></aside></div>`,{title:'Finance'});
}

function portfolioView(){
  const past = archivedProjects();
  return shell(`<div class="page-heading"><div><span class="eyebrow">Hidden archive</span><h2>Past Work & portfolio pipeline</h2><p>Closed projects disappear from active production but remain visible to you and authorized contributors.</p></div></div><div class="project-grid">${past.length?past.map(p=>`<article class="project-card past"><span class="status-chip healthy">Closed</span><h3>${esc(p.name)}</h3><p>${esc(p.clientName||'')}</p><div class="past-meta"><span>Contribution record</span><b>${(p.workerIds?.length||0)+1} contributor(s)</b></div><div class="past-meta"><span>Portfolio candidate</span><b>${p.portfolioStatus||'Pending decision'}</b></div></article>`).join(''):'<div class="empty-card"><div class="logo-orb">'+logo('mini')+'</div><h3>Nothing archived yet</h3><p>When a deal closes, StudioDesk will move it here and freeze its contribution record.</p></div>'}</div>`,{title:'Past Work'});
}

function academyView(){
  const lessons=[['01','Create from outputs','Choose the assets the client needs. StudioDesk diagnoses the work required.'],['02','Let dependencies lead','Shared prerequisites are deduplicated and blockers are explicit.'],['03','Submit internally first','Workers send drafts into internal review before client presentation.'],['04','Review protected work','Client previews are reduced-resolution and watermarked until release.'],['05','Verify money','Invoice and payment records control production and delivery gates.'],['06','Close with history','Projects move to Past Work and feed authorized portfolio records.']];
  return shell(`<div class="page-heading"><div><span class="eyebrow">StudioDesk Academy</span><h2>The app teaches the operating model.</h2><p>Contextual tutorials should make a complex studio system feel simple to new workers and clients.</p></div></div><div class="lesson-grid">${lessons.map(l=>`<article class="lesson-card"><span>${l[0]}</span><h3>${l[1]}</h3><p>${l[2]}</p><button class="text-button">Open guide →</button></article>`).join('')}</div>`,{title:'Academy'});
}

function settingsView(){
  const s = state.studioSettings || {};
  return shell(`<div class="page-heading"><div><span class="eyebrow">System</span><h2>Studio settings</h2><p>Business identity, finance defaults and legal information should be maintained once and reused where appropriate.</p></div></div><div class="settings-grid"><form id="studio-settings-form" class="panel settings-form"><div class="panel-head"><div><span class="eyebrow">Business profile</span><h3>Core company settings</h3></div></div><label>Studio / trading name<input name="brandName" value="${esc(s.brandName||'Wiscode Studio')}"></label><label>Registered company name<input name="registeredCompanyName" value="${esc(s.registeredCompanyName||'Wiscode Innovations Limited')}"></label><div class="form-two"><label>Default currency<select name="currency"><option value="NGN" ${s.currency!=='USD'?'selected':''}>NGN</option><option value="USD" ${s.currency==='USD'?'selected':''}>USD</option></select></label><label>Default deposit rate<input name="depositRate" type="number" min="0" max="1" step="0.05" value="${Number(s.depositRate??0.5)}"></label></div><label>Fixed creative foundation price<input name="foundationPrice" type="number" min="0" step="1000" value="${Number(s.foundationPrice||0)}"></label><button class="primary-button" type="submit">Save settings</button></form><section class="panel light-panel legal-card"><span class="eyebrow dark">CAC / legal business profile</span><h3>Use legal details only where necessary.</h3><p>Invoices, receipts, portal terms, major project agreements and formal delivery documents can pull from one controlled legal profile.</p><div class="legal-status"><i></i><div><b>${s.legalProfileConfigured?'Legal profile configured':'Legal profile not added yet'}</b><span>We will not invent registration data.</span></div></div><button class="dark-button" disabled>Add CAC documentation later</button></section></div>`,{title:'Settings'});
}

function roleDashboard(){
  if (state.profile?.role === 'owner' || state.profile?.role === 'admin') return ownerDashboard();
  if (state.profile?.role === 'client') {
    const projects = state.workspace.projects.filter(p=>!p.archived);
    return shell(`<div class="client-hero panel"><span class="eyebrow">Client portal</span><h2>Your design workspace.</h2><p>Review protected work, leave feedback, approve direction, follow billing and receive final files after release conditions are satisfied.</p></div><div class="project-grid" style="margin-top:16px">${projects.length?projects.map(projectCard).join(''):'<div class="empty-card"><h3>No active client project</h3><p>Projects assigned to your portal will appear here.</p></div>'}</div>`,{title:'Client Portal'});
  }
  const tasks = myTasks();
  const projects = state.workspace.projects.filter(p=>!p.archived);
  return shell(`<div class="dashboard-hero worker"><div><span class="eyebrow">Worker portal</span><h2>Your next action is what matters.</h2><p>Assignments, blockers and review feedback are derived from the projects you are authorized to work on.</p></div><div class="hero-health"><strong>${tasks.filter(t=>t.status!=='done').length}</strong><p>open assigned tasks</p></div></div><div class="metrics compact">${metric('Assigned projects',String(projects.length),'Authorized work')}${metric('Open tasks',String(tasks.filter(t=>t.status!=='done').length),'Your responsibility')}${metric('In review',String(tasks.filter(t=>t.status==='review').length),'Waiting for internal review')}${metric('Blocked',String(tasks.filter(t=>t.blockedReason).length),'Dependencies','amber')}</div><div class="project-grid">${projects.length?projects.map(projectCard).join(''):'<div class="empty-card"><h3>No assignments yet</h3><p>Projects assigned to you will appear here.</p></div>'}</div>`,{title:'My Work'});
}

function renderRoute(){
  const role = state.profile?.role;
  const routes = { dashboard:roleDashboard, projects:projectsView, clients:clientsView, builder:ownerBuilder, standards:standardsView, team:teamView, finance:financeView, portfolio:portfolioView, academy:academyView, settings:settingsView };
  if ((role!=='owner'&&role!=='admin') && ['clients','builder','standards','settings'].includes(state.route)) state.route='dashboard';
  return (routes[state.route]||roleDashboard)();
}

function createProjectDialog(){
  const items=currentCatalog(); const selected=items.filter(a=>state.selectedAssetIds.has(a.id));
  const foundationPrice=Number(state.builderFoundationPrice||state.studioSettings?.foundationPrice||0);
  const calc=calculateConfiguration({foundationPrice,selectedAssets:selected,depositRate:Number(state.studioSettings?.depositRate||0.5)});
  const diag=diagnoseProject({foundationSteps,selectedAssets:selected,standards:currentStandards()});
  return `<dialog id="project-dialog" class="modal" open><form method="dialog" class="modal-card" id="create-project-form"><div class="modal-head"><div><span class="eyebrow">Create project</span><h3>Turn this diagnosis into live work</h3></div><button value="cancel" class="modal-close">×</button></div><div class="form-grid"><label>Project name<input name="projectName" required placeholder="e.g. Aurasol Brand Identity"></label><label>Client / business name<input name="clientName" required placeholder="Client name"></label><label>Client email<input name="clientEmail" type="email" placeholder="client@example.com"></label><label>Project type<select name="projectType"><option>Brand Identity</option><option>Single Graphic</option><option>Continuous Graphics</option><option>Advertising & Marketing</option><option>Editorial & Publication</option><option>Creative / Conceptual</option></select></label><label>Deadline<input name="deadline" type="date" value="${nowIsoPlus(diag.estimatedDays+3)}"></label><label>Currency<select name="currency"><option>NGN</option><option>USD</option></select></label></div><div class="modal-summary"><div><span>Configured value</span><strong>${fmt(calc.total)}</strong></div><div><span>Generated process</span><strong>${diag.steps.length} tasks · ~${diag.estimatedDays} days</strong></div><div><span>Documentation</span><strong>${esc(diag.documentation.label)}</strong></div></div><input type="hidden" name="total" value="${calc.total}"><button class="primary-button full" type="submit">Create live project</button></form></dialog>`;
}

function publicRequestDialog(){
  const items=publicAssets(); const selected=items.filter(a=>state.publicSelectedAssetIds.has(a.id));
  const calc=calculateConfiguration({foundationPrice:Number((state.authUser && !state.authUser.isAnonymous ? state.studioSettings?.foundationPrice : state.publicSettings?.foundationPrice)||0),selectedAssets:selected});
  return `<dialog id="public-request-dialog" class="modal" open><form method="dialog" class="modal-card light-modal" id="public-request-form"><div class="modal-head"><div><span class="eyebrow dark">Request configuration</span><h3>Tell Wiscode Studio where to reply.</h3></div><button value="cancel" class="modal-close dark">×</button></div><div class="form-grid"><label>Name<input name="name" required></label><label>Email<input name="email" type="email" required></label><label>Business / brand<input name="business" required></label><label>Phone / WhatsApp (optional)<input name="phone"></label></div><label>Anything we should know?<textarea name="note" rows="4" placeholder="Brief context, deadline, intended use…"></textarea></label><div class="modal-summary paper"><div><span>Selected assets</span><strong>${selected.length}</strong></div><div><span>Current estimate</span><strong>${fmt(calc.total)}</strong></div></div><button class="dark-button full" type="submit">Send project request</button><small>This request is not an automatic acceptance of the project or final quotation.</small></form></dialog>`;
}

function invoiceDialog(){
  const projects=activeProjects();
  return `<dialog class="modal" open id="invoice-dialog"><form method="dialog" class="modal-card" id="invoice-form"><div class="modal-head"><div><span class="eyebrow">Invoice</span><h3>Create project invoice</h3></div><button value="cancel" class="modal-close">×</button></div><label>Project<select name="projectId" required><option value="">Select project</option>${projects.map(p=>`<option value="${esc(p.id)}">${esc(p.name)} · ${esc(p.clientName||'')}</option>`).join('')}</select></label><div class="form-two"><label>Amount<input name="amount" type="number" min="0" required></label><label>Currency<select name="currency"><option>NGN</option><option>USD</option></select></label></div><label>Due date<input name="dueDate" type="date" value="${nowIsoPlus(7)}"></label><label>Notes<textarea name="notes" rows="3"></textarea></label><button class="primary-button full" type="submit">Create invoice</button></form></dialog>`;
}

function paymentDialog(invoice){
  return `<dialog class="modal" open id="payment-dialog"><form method="dialog" class="modal-card" id="payment-form"><div class="modal-head"><div><span class="eyebrow">Verify payment</span><h3>${esc(invoice.invoiceNo||'Invoice')}</h3></div><button value="cancel" class="modal-close">×</button></div><div class="modal-summary"><div><span>Current balance</span><strong>${fmt(invoice.balance??invoice.amount,invoice.currency)}</strong></div></div><label>Amount received<input name="amount" type="number" min="0" max="${Number(invoice.balance??invoice.amount)}" required></label><label>Method<select name="method"><option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option><option value="other">Other</option></select></label><label>Reference<input name="reference"></label><label>Notes<textarea name="notes" rows="3"></textarea></label><button class="primary-button full" type="submit">Confirm payment</button></form></dialog>`;
}

let overlayHtml='';
function render(){
  if (!state.authReady) { app.innerHTML=loadingScreen(); bind(); return; }
  if (!state.authUser || state.authUser.isAnonymous) {
    app.innerHTML=(state.route==='login'?loginView():publicLanding())+overlayHtml+toastView(); bind(); return;
  }
  if (!state.profile) {
    app.innerHTML=`<div class="auth-stage"><div class="ambient a"></div><div class="auth-card"><div class="auth-brand">${logo('large')}<div><span class="eyebrow">Access pending</span><h1>No StudioDesk role found.</h1></div></div><p>Your Firebase login exists, but this account does not yet have an active StudioDesk user profile.</p><button class="glass-button full" data-action="logout">Sign out</button></div></div>`; bind(); return;
  }
  app.innerHTML=renderRoute()+overlayHtml; bind();
}

function bind(){
  document.querySelectorAll('[data-route]').forEach(el=>el.onclick=()=>go(el.dataset.route));
  document.querySelectorAll('[data-action="logout"]').forEach(el=>el.onclick=async()=>{await signOutUser();state.route='public';location.hash='';});
  document.querySelectorAll('[data-action="show-login"]').forEach(el=>el.onclick=()=>go('login'));
  document.querySelectorAll('[data-action="hide-login"]').forEach(el=>el.onclick=()=>{state.route='public';history.replaceState(null,'',location.pathname);render();});
  document.querySelectorAll('[data-action="scroll-builder"]').forEach(el=>el.onclick=()=>document.getElementById('public-builder')?.scrollIntoView({behavior:'smooth'}));
  document.querySelectorAll('[data-public-asset]').forEach(el=>el.onchange=()=>{el.checked?state.publicSelectedAssetIds.add(el.dataset.publicAsset):state.publicSelectedAssetIds.delete(el.dataset.publicAsset);render();});
  document.querySelectorAll('[data-builder-asset]').forEach(el=>el.onchange=()=>{el.checked?state.selectedAssetIds.add(el.dataset.builderAsset):state.selectedAssetIds.delete(el.dataset.builderAsset);render();});
  const foundation=document.getElementById('foundation-price'); if(foundation) foundation.onchange=()=>{state.builderFoundationPrice=Number(foundation.value||0);render();};
  const login=document.getElementById('login-form'); if(login) login.onsubmit=async e=>{e.preventDefault();const fd=new FormData(login);try{await signInWithEmail(fd.get('email'),fd.get('password'));}catch(err){toast(err.message||'Sign in failed','error');}};
  document.querySelectorAll('[data-action="google-login"]').forEach(el=>el.onclick=async()=>{try{await signInWithGoogle();}catch(err){toast(err.message||'Google sign-in failed','error');}});
  document.querySelectorAll('[data-action="seed-workspace"]').forEach(el=>el.onclick=async()=>{try{el.disabled=true;await ensureWorkspaceSeed();state.studioSettings=await getStudioSettings();toast('StudioDesk starter standards created. Review prices before publishing.');}catch(err){toast(err.message||'Could not initialize workspace','error');}});
  document.querySelectorAll('[data-action="open-create-project"]').forEach(el=>el.onclick=()=>{overlayHtml=createProjectDialog();render();});
  document.querySelectorAll('[data-action="open-public-request"]').forEach(el=>el.onclick=()=>{overlayHtml=publicRequestDialog();render();});
  document.querySelectorAll('[data-action="open-invoice"]').forEach(el=>el.onclick=()=>{overlayHtml=invoiceDialog();render();});
  document.querySelectorAll('[data-action="show-worker-note"]').forEach(el=>el.onclick=()=>toast('Worker self-invite flow is next. For now, create the Auth user and user profile before assigning work.'));
  document.querySelectorAll('.modal-close').forEach(el=>el.onclick=()=>{overlayHtml='';render();});
  document.querySelectorAll('[data-standard-form]').forEach(form=>form.onsubmit=async e=>{e.preventDefault();const fd=new FormData(form);const id=form.dataset.standardForm;const current=currentCatalog().find(a=>a.id===id)||{};try{const mode=fd.get('pricingMode');const price=Number(fd.get('price')||0);await saveCatalogAsset(id,{pricingMode:mode,price:mode==='starting'?current.price||0:price,startingPrice:mode==='starting'?price:current.startingPrice||0,published:fd.get('published')==='on',pricingStatus:'configured'});toast(`${current.name||id} updated.`);}catch(err){toast(err.message||'Could not save price','error');}});
  const settings=document.getElementById('studio-settings-form'); if(settings) settings.onsubmit=async e=>{e.preventDefault();const fd=new FormData(settings);try{await saveStudioSettings({brandName:fd.get('brandName'),registeredCompanyName:fd.get('registeredCompanyName'),currency:fd.get('currency'),depositRate:Number(fd.get('depositRate')||0.5),foundationPrice:Number(fd.get('foundationPrice')||0)});state.studioSettings=await getStudioSettings();state.builderFoundationPrice=Number((state.authUser && !state.authUser.isAnonymous ? state.studioSettings?.foundationPrice : state.publicSettings?.foundationPrice)||0);toast('Studio settings saved.');}catch(err){toast(err.message||'Could not save settings','error');}};
  const createProjectForm=document.getElementById('create-project-form'); if(createProjectForm) createProjectForm.onsubmit=async e=>{e.preventDefault();const fd=new FormData(createProjectForm);const items=currentCatalog();const selected=items.filter(a=>state.selectedAssetIds.has(a.id));const foundationPrice=Number(state.builderFoundationPrice||state.studioSettings?.foundationPrice||0);const calc=calculateConfiguration({foundationPrice,selectedAssets:selected,depositRate:Number(state.studioSettings?.depositRate||0.5)});const diag=diagnoseProject({foundationSteps,selectedAssets:selected,standards:currentStandards()});try{const result=await createProjectFromConfiguration({client:{name:fd.get('clientName'),email:fd.get('clientEmail')},project:{name:fd.get('projectName'),type:fd.get('projectType'),deadline:fd.get('deadline'),currency:fd.get('currency'),configuredAssetIds:selected.map(a=>a.id),configuredAssets:selected.map(a=>({id:a.id,name:a.name,price:a.price||a.startingPrice||0})),foundationPrice,totalValue:calc.total,depositRequired:calc.deposit,balance:calc.total,documentationType:diag.documentation.type,nextAction:'Review brief and assign production',clientApproved:false,deliverablesComplete:false,blockedReason:''},diagnostic:diag});overlayHtml='';toast(`Project created · ${result.projectId}`);go('projects');}catch(err){toast(err.message||'Could not create project','error');}};
  const publicRequestForm=document.getElementById('public-request-form'); if(publicRequestForm) publicRequestForm.onsubmit=async e=>{e.preventDefault();const fd=new FormData(publicRequestForm);const items=publicAssets();const selected=items.filter(a=>state.publicSelectedAssetIds.has(a.id));const calc=calculateConfiguration({foundationPrice:Number((state.authUser && !state.authUser.isAnonymous ? state.studioSettings?.foundationPrice : state.publicSettings?.foundationPrice)||0),selectedAssets:selected});try{const id=await submitPublicPackageRequest({name:fd.get('name'),email:fd.get('email'),business:fd.get('business'),phone:fd.get('phone'),note:fd.get('note'),selectedAssetIds:selected.map(a=>a.id),selectedAssets:selected.map(a=>({id:a.id,name:a.name,displayPrice:a.price||a.startingPrice||0})),estimatedTotal:calc.total,currency:'NGN'});overlayHtml='';toast(`Request sent · ${id}`);state.route='public';render();}catch(err){toast(err.message||'Could not submit request','error');}};
  const invoiceForm=document.getElementById('invoice-form'); if(invoiceForm) invoiceForm.onsubmit=async e=>{e.preventDefault();const fd=new FormData(invoiceForm);const project=state.workspace.projects.find(p=>p.id===fd.get('projectId'));if(!project)return;try{const created=await createInvoice({projectId:project.id,clientId:project.clientId,clientName:project.clientName,amount:fd.get('amount'),currency:fd.get('currency'),dueDate:fd.get('dueDate'),notes:fd.get('notes')});overlayHtml='';toast(`Invoice ${created.invoiceNo} created.`);render();}catch(err){toast(err.message||'Could not create invoice','error');}};
  document.querySelectorAll('[data-payment-invoice]').forEach(el=>el.onclick=()=>{const inv=state.workspace.invoices.find(i=>i.id===el.dataset.paymentInvoice);if(inv){overlayHtml=paymentDialog(inv);render();}});
  const paymentForm=document.getElementById('payment-form'); if(paymentForm) paymentForm.onsubmit=async e=>{e.preventDefault();const invoiceId=document.querySelector('[data-payment-invoice]')?.dataset.paymentInvoice;const modalInvoiceNo=document.querySelector('#payment-dialog h3')?.textContent;const invoice=state.workspace.invoices.find(i=>(i.invoiceNo||'Invoice')===modalInvoiceNo)||state.workspace.invoices.find(i=>i.id===invoiceId);if(!invoice)return;const fd=new FormData(paymentForm);try{await recordPayment({invoice,amount:fd.get('amount'),method:fd.get('method'),reference:fd.get('reference'),notes:fd.get('notes')});overlayHtml='';toast('Payment confirmed and invoice balance updated.');render();}catch(err){toast(err.message||'Could not record payment','error');}};
}

async function startLiveWorkspace(){
  if (state.workspaceUnsub) { try{state.workspaceUnsub();}catch{} state.workspaceUnsub=null; }
  if (!state.authUser || state.authUser.isAnonymous || !state.profile) return;
  state.studioSettings = await getStudioSettings().catch(()=>null);
  state.builderFoundationPrice = Number((state.authUser && !state.authUser.isAnonymous ? state.studioSettings?.foundationPrice : state.publicSettings?.foundationPrice)||0);
  if (state.profile.role==='owner' || state.profile.role==='admin') {
    state.workspaceUnsub = await subscribeOwnerWorkspace(data=>{state.workspace=data;render();});
  } else {
    state.workspaceUnsub = await subscribeToMyProjects(projects=>{state.workspace.projects=projects;render();});
  }
}

async function bootstrap(){
  state.connection = await firebaseConnectionStatus();
  subscribeToPublishedCatalog(rows=>{state.publicCatalog=rows;state.publicCatalogLoaded=true;render();}).catch(()=>{});
  subscribePublicConfig(cfg=>{state.publicSettings=cfg;render();}).catch(()=>{});
  state.studioSettings = await getStudioSettings().catch(()=>null);
  await watchAuth(async user=>{
    state.authUser=user;
    state.profile=null;
    if (user && !user.isAnonymous) state.profile=await getCurrentUserProfile().catch(()=>null);
    state.authReady=true;
    if (user && !user.isAnonymous && state.route==='login') state.route='dashboard';
    await startLiveWorkspace();
    render();
  });
}

window.addEventListener('hashchange',()=>{state.route=location.hash.replace('#/','')||(!state.authUser?'public':'dashboard');render();});
if ('serviceWorker' in navigator) addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
bootstrap().catch(err=>{state.authReady=true;state.connection={ready:false,label:'Connection error'};state.toast={message:err.message,tone:'error'};render();});
