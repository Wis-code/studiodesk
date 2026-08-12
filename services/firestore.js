import { getFirebaseServices, collections } from './firebase.js';
import { ensureAnonymousSession } from './auth.js';
import { services as starterServices, serviceCategories as starterCategories, workflowTemplates, packageTemplates as starterPackages } from '../data/seed.js';

const normalizeRoles = profile => {
  const roles = Array.isArray(profile?.roles) ? profile.roles.filter(Boolean) : [];
  if (roles.length) return [...new Set(roles)];
  const legacy = profile?.role;
  return legacy && !['pending','rejected'].includes(legacy) ? [legacy] : [];
};

const withId = d => ({ id:d.id, ...d.data() });
const stampValue = v => v?.toMillis?.() ?? (v?.seconds ? v.seconds*1000 : 0);
const sortDesc = (a,b,key='updatedAt') => stampValue(b?.[key]) - stampValue(a?.[key]);
const clean = obj => Object.fromEntries(Object.entries(obj).filter(([,v])=>v !== undefined));

async function ctx(){
  const f = await getFirebaseServices();
  if(!f) throw new Error('Firebase is not configured.');
  return f;
}

export async function getCurrentUserProfile(){
  const f=await ctx();
  const user=f.auth.currentUser;
  if(!user || user.isAnonymous) return null;
  const snap=await f.firestoreSdk.getDoc(f.firestoreSdk.doc(f.db,collections.users,user.uid));
  return snap.exists()?withId(snap):null;
}

export async function createPendingProfile({name,email,requestedRole='worker',company='',phone=''}){
  const f=await ctx();
  const user=f.auth.currentUser;
  if(!user || user.isAnonymous) throw new Error('Create an account first.');
  const ref=f.firestoreSdk.doc(f.db,collections.users,user.uid);
  const existing=await f.firestoreSdk.getDoc(ref);
  if(existing.exists()) return withId(existing);
  await f.firestoreSdk.setDoc(ref,{
    displayName:name||user.displayName||email?.split('@')[0]||'New user',
    email:email||user.email||'', phone, company,
    role:'pending', roles:[], requestedRole, requestedRoles:[requestedRole], defaultWorkspace:requestedRole, status:'pending',
    profilePhotoUrl:user.photoURL||'', title:'',
    onboardingComplete:false, createdAt:f.firestoreSdk.serverTimestamp(), updatedAt:f.firestoreSdk.serverTimestamp(),
  });
  return getCurrentUserProfile();
}

export async function ensureGoogleProfile({requestedRole='client'}={}){
  const f=await ctx();
  const user=f.auth.currentUser;
  if(!user || user.isAnonymous) return null;
  const ref=f.firestoreSdk.doc(f.db,collections.users,user.uid);
  const snap=await f.firestoreSdk.getDoc(ref);
  if(snap.exists()) return withId(snap);
  await f.firestoreSdk.setDoc(ref,{
    displayName:user.displayName||user.email?.split('@')[0]||'New user', email:user.email||'', phone:'', company:'',
    role:'pending', roles:[], requestedRole, requestedRoles:[requestedRole], defaultWorkspace:requestedRole, status:'pending', profilePhotoUrl:user.photoURL||'', title:'', onboardingComplete:false,
    createdAt:f.firestoreSdk.serverTimestamp(), updatedAt:f.firestoreSdk.serverTimestamp(),
  });
  return getCurrentUserProfile();
}

export async function subscribeCollection(name,cb,{limit=300,where=null}={}){
  const f=await ctx();
  let parts=[f.firestoreSdk.collection(f.db,name)];
  if(where) parts.push(f.firestoreSdk.where(where[0],where[1],where[2]));
  parts.push(f.firestoreSdk.limit(limit));
  const q=f.firestoreSdk.query(...parts);
  return f.firestoreSdk.onSnapshot(q,s=>cb(s.docs.map(withId)),e=>cb([],e));
}

export async function subscribeOwnerWorkspace(cb){
  const f=await ctx();
  if(!f.auth.currentUser || f.auth.currentUser.isAnonymous) return ()=>{};
  const keys={
    projects:collections.projects, clients:collections.clients, tasks:collections.tasks, users:collections.users,
    invoices:collections.invoices, payments:collections.payments, expenses:collections.expenses,
    services:collections.catalogAssets, categories:collections.serviceCategories, packages:collections.packageTemplates,
    contracts:collections.contracts, moodboards:collections.moodboards, moodboardItems:collections.moodboardItems, standards:collections.standards,
    portfolio:collections.portfolio, reviews:collections.reviews, previews:collections.previews,
    packageRequests:collections.packageRequests, notifications:collections.notifications,
  };
  const state=Object.fromEntries(Object.keys(keys).map(k=>[k,[]]));
  const unsubs=[]; const emit=()=>cb({...state});
  await Promise.all(Object.entries(keys).map(async([key,col])=>{
    const u=await subscribeCollection(col,rows=>{state[key]=rows.sort((a,b)=>sortDesc(a,b));emit();},{limit:400}); unsubs.push(u);
  }));
  return ()=>unsubs.forEach(u=>{try{u?.()}catch{}});
}


export async function subscribeRoleWorkspace(profile, cb){
  const f=await ctx(); const uid=f.auth.currentUser?.uid; if(!uid)return()=>{};
  const roles=normalizeRoles(profile);
  const state={projects:[],clients:[],users:[],tasks:[],invoices:[],payments:[],contracts:[],moodboards:[],moodboardItems:[],previews:[],portfolio:[]};
  const unsubs=[]; const emit=()=>cb({...state});
  const listen=(q,key,sorter=(a,b)=>sortDesc(a,b))=>unsubs.push(f.firestoreSdk.onSnapshot(q,s=>{state[key]=s.docs.map(withId).sort(sorter);emit();},()=>{}));
  const isFinance=roles.includes('finance');
  let scopedUnsubs=[];
  const resetScopedProjectResources=(ids=[])=>{
    scopedUnsubs.forEach(u=>{try{u?.()}catch{}}); scopedUnsubs=[];
    if(!ids.length || isFinance)return;
    const workerScope=roles.some(r=>['worker','designer','lead_designer','project_manager'].includes(r));
    const clientScope=roles.includes('client');
    if(clientScope && !workerScope){
      const accum={contracts:new Map(),previews:new Map(),moodboards:new Map()};
      ids.slice(0,40).forEach(projectId=>{
        const cq=f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.contracts),f.firestoreSdk.where('projectId','==',projectId),f.firestoreSdk.limit(20));
        scopedUnsubs.push(f.firestoreSdk.onSnapshot(cq,snap=>{accum.contracts.set(projectId,snap.docs.map(withId));state.contracts=[...accum.contracts.values()].flat().sort((a,b)=>sortDesc(a,b));emit();},()=>{}));
        for(const [key,col] of [['previews',collections.previews],['moodboards',collections.moodboards]]){
          const q=f.firestoreSdk.query(f.firestoreSdk.collection(f.db,col),f.firestoreSdk.where('projectId','==',projectId),f.firestoreSdk.where('clientVisible','==',true),f.firestoreSdk.limit(50));
          scopedUnsubs.push(f.firestoreSdk.onSnapshot(q,snap=>{accum[key].set(projectId,snap.docs.map(withId));state[key]=[...accum[key].values()].flat().sort((a,b)=>sortDesc(a,b));emit();},()=>{}));
        }
      });
      return;
    }
    if(!workerScope)return;
    const chunks=[];for(let i=0;i<ids.length;i+=30)chunks.push(ids.slice(i,i+30));
    const specs=[['invoices',collections.invoices],['payments',collections.payments],['contracts',collections.contracts],['moodboards',collections.moodboards],['moodboardItems',collections.moodboardItems],['previews',collections.previews]];
    for(const [key,col] of specs){
      const bucket=new Map();
      chunks.forEach((chunk,ci)=>{
        const q=f.firestoreSdk.query(f.firestoreSdk.collection(f.db,col),f.firestoreSdk.where('projectId','in',chunk),f.firestoreSdk.limit(250));
        const u=f.firestoreSdk.onSnapshot(q,snap=>{bucket.set(ci,snap.docs.map(withId));state[key]=[...bucket.values()].flat().sort((a,b)=>sortDesc(a,b));emit();},()=>{});scopedUnsubs.push(u);
      });
    }
  };
  if(isFinance){
    listen(f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.projects),f.firestoreSdk.limit(200)),'projects');
    listen(f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.clients),f.firestoreSdk.limit(250)),'clients');
    listen(f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.invoices),f.firestoreSdk.limit(250)),'invoices');
    listen(f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.payments),f.firestoreSdk.limit(250)),'payments');
    listen(f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.contracts),f.firestoreSdk.limit(250)),'contracts');
  }else{
    const pq=f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.projects),f.firestoreSdk.where('accessUserIds','array-contains',uid),f.firestoreSdk.limit(150));
    unsubs.push(f.firestoreSdk.onSnapshot(pq,snap=>{state.projects=snap.docs.map(withId).sort((a,b)=>sortDesc(a,b));resetScopedProjectResources(state.projects.map(p=>p.id));emit();},()=>{}));
  }
  if(roles.some(r=>['worker','designer','lead_designer','project_manager'].includes(r))){
    const tq=f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.tasks),f.firestoreSdk.where('assigneeIds','array-contains',uid),f.firestoreSdk.limit(250));
    listen(tq,'tasks',(a,b)=>(a.sortOrder||0)-(b.sortOrder||0));
    listen(f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.clients),f.firestoreSdk.limit(250)),'clients');
    listen(f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.users),f.firestoreSdk.limit(250)),'users');
  }
  if(roles.includes('client') && profile?.clientId){
    const iq=f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.invoices),f.firestoreSdk.where('clientId','==',profile.clientId),f.firestoreSdk.where('clientVisible','==',true),f.firestoreSdk.limit(150));
    listen(iq,'invoices');
    const payq=f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.payments),f.firestoreSdk.where('clientId','==',profile.clientId),f.firestoreSdk.limit(150));
    listen(payq,'payments');
  }
  return ()=>{unsubs.forEach(u=>{try{u?.()}catch{}});scopedUnsubs.forEach(u=>{try{u?.()}catch{}});};
}

export async function saveWorkflowTemplate(id,data){const f=await ctx();const r=id?f.firestoreSdk.doc(f.db,collections.standards,id):f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.standards));await f.firestoreSdk.setDoc(r,{...clean(data),active:true,updatedAt:f.firestoreSdk.serverTimestamp(),...(id?{}:{createdAt:f.firestoreSdk.serverTimestamp(),version:1})},{merge:Boolean(id)});return r.id;}

export async function recordTermsAcceptance({termsVersion='studio-terms-v1',scope='portal'}){const f=await ctx();const user=f.auth.currentUser;if(!user||user.isAnonymous)throw new Error('Sign in first.');const r=f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.legalAcceptances));await f.firestoreSdk.setDoc(r,{userId:user.uid,termsVersion,scope,acceptedAt:f.firestoreSdk.serverTimestamp(),userAgent:navigator.userAgent.slice(0,240)});return r.id;}

export async function subscribeToMyProjects(cb){
  const f=await ctx(); const uid=f.auth.currentUser?.uid; if(!uid)return()=>{};
  const q=f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.projects),f.firestoreSdk.where('accessUserIds','array-contains',uid),f.firestoreSdk.limit(200));
  return f.firestoreSdk.onSnapshot(q,s=>cb(s.docs.map(withId).sort((a,b)=>sortDesc(a,b))),()=>cb([]));
}

export async function getStudioSettings(){
  const f=await ctx(); const snap=await f.firestoreSdk.getDoc(f.firestoreSdk.doc(f.db,collections.settings,'studio'));
  return snap.exists()?withId(snap):null;
}
export async function saveStudioSettings(patch){
  const f=await ctx(); const ref=f.firestoreSdk.doc(f.db,collections.settings,'studio');
  await f.firestoreSdk.setDoc(ref,{...clean(patch),updatedAt:f.firestoreSdk.serverTimestamp()},{merge:true});
}

export async function ensureWorkspaceSeed(){
  const f=await ctx(); const uid=f.auth.currentUser?.uid; if(!uid)throw new Error('Sign in first.');
  const batch=f.firestoreSdk.writeBatch(f.db); const now=f.firestoreSdk.serverTimestamp();
  const settingRef=f.firestoreSdk.doc(f.db,collections.settings,'studio');
  if(!(await f.firestoreSdk.getDoc(settingRef)).exists()) batch.set(settingRef,{
    brandName:'Wiscode Studio',registeredCompanyName:'Wiscode Innovations Limited',brandFont:'Space Grotesk',currency:'NGN',
    defaultDepositRate:.5, requireFullPaymentToRelease:true, legalProfileConfigured:false, createdAt:now,updatedAt:now,
  });
  for(const c of starterCategories){ const r=f.firestoreSdk.doc(f.db,collections.serviceCategories,c.id); if(!(await f.firestoreSdk.getDoc(r)).exists())batch.set(r,{...c,active:true,createdAt:now,updatedAt:now}); }
  for(let i=0;i<starterServices.length;i++){ const s=starterServices[i]; const r=f.firestoreSdk.doc(f.db,collections.catalogAssets,s.id); if(!(await f.firestoreSdk.getDoc(r)).exists())batch.set(r,{...s,sortOrder:i+1,createdAt:now,updatedAt:now}); }
  for(const [id,w] of Object.entries(workflowTemplates)){const r=f.firestoreSdk.doc(f.db,collections.standards,id);if(!(await f.firestoreSdk.getDoc(r)).exists())batch.set(r,{...w,active:true,version:1,createdAt:now,updatedAt:now});}
  for(const p of starterPackages){const r=f.firestoreSdk.doc(f.db,collections.packageTemplates,p.id);if(!(await f.firestoreSdk.getDoc(r)).exists())batch.set(r,{...p,createdAt:now,updatedAt:now});}
  await batch.commit();
}

export async function createServiceCategory(data){const f=await ctx();const r=f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.serviceCategories));await f.firestoreSdk.setDoc(r,{...clean(data),active:true,createdAt:f.firestoreSdk.serverTimestamp(),updatedAt:f.firestoreSdk.serverTimestamp()});return r.id;}
export async function saveService(id,data){const f=await ctx();const r=id?f.firestoreSdk.doc(f.db,collections.catalogAssets,id):f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.catalogAssets));await f.firestoreSdk.setDoc(r,{...clean(data),updatedAt:f.firestoreSdk.serverTimestamp(),...(id?{}:{createdAt:f.firestoreSdk.serverTimestamp()})},{merge:Boolean(id)});return r.id;}
export async function deleteService(id){const f=await ctx();await f.firestoreSdk.deleteDoc(f.firestoreSdk.doc(f.db,collections.catalogAssets,id));}
export async function savePackageTemplate(id,data){const f=await ctx();const r=id?f.firestoreSdk.doc(f.db,collections.packageTemplates,id):f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.packageTemplates));await f.firestoreSdk.setDoc(r,{...clean(data),updatedAt:f.firestoreSdk.serverTimestamp(),...(id?{}:{createdAt:f.firestoreSdk.serverTimestamp()})},{merge:Boolean(id)});return r.id;}
export async function archivePackageTemplate(id){const f=await ctx();await f.firestoreSdk.setDoc(f.firestoreSdk.doc(f.db,collections.packageTemplates,id),{archived:true,updatedAt:f.firestoreSdk.serverTimestamp()},{merge:true});}

export async function createClient(data){const f=await ctx();const r=f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.clients));const email=String(data.email||'').trim().toLowerCase();await f.firestoreSdk.setDoc(r,{...clean(data),email,userIds:data.userIds||[],status:'active',createdAt:f.firestoreSdk.serverTimestamp(),updatedAt:f.firestoreSdk.serverTimestamp()});return r.id;}

function buildTaskRows({workflow=[],projectId,uid,f}){
  return workflow.map((step,index)=>({
    projectId,title:step.label||step[1]||'Task',standardStepId:step.id||step[0]||`step-${index+1}`,
    status:'not-started',weight:Number(step.weight||step[2]||1),estimatedHours:Number(step.estimatedHours||0),
    assigneeIds:[],createdBy:uid,sortOrder:index+1,createdAt:f.firestoreSdk.serverTimestamp(),updatedAt:f.firestoreSdk.serverTimestamp(),
  }));
}

export async function createProject({project,client,workflow=[]}){
  const f=await ctx(); const uid=f.auth.currentUser?.uid;if(!uid)throw new Error('Sign in first.');
  const batch=f.firestoreSdk.writeBatch(f.db); const now=f.firestoreSdk.serverTimestamp();
  let clientId=project.clientId||''; let clientName=project.clientName||client?.name||''; let clientUserIds=[];
  if(clientId){
    const cs=await f.firestoreSdk.getDoc(f.firestoreSdk.doc(f.db,collections.clients,clientId));
    if(cs.exists()){const cd=cs.data();clientName=clientName||cd.name||'';clientUserIds=Array.isArray(cd.userIds)?cd.userIds:[];}
  }
  if(!clientId && client?.name){const cr=f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.clients));clientId=cr.id;batch.set(cr,{name:client.name,email:String(client.email||'').trim().toLowerCase(),phone:client.phone||'',company:client.company||client.name,userIds:[],status:'active',createdAt:now,updatedAt:now});}
  const pr=f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.projects));
  batch.set(pr,{...clean(project),clientId,clientName,accessUserIds:[...new Set([uid,...clientUserIds])],managementUserIds:[uid],workerIds:[],clientUserIds,progress:0,status:'active',health:'healthy',archived:false,releaseState:'locked',createdBy:uid,createdAt:now,updatedAt:now});
  for(const t of buildTaskRows({workflow,projectId:pr.id,uid,f})){const tr=f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.tasks));batch.set(tr,t);}
  const ar=f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.activity));batch.set(ar,{projectId:pr.id,type:'project_created',message:'Project created.',actorId:uid,createdAt:now});
  await batch.commit(); return {projectId:pr.id,clientId};
}

export async function updateProject(id,patch){const f=await ctx();await f.firestoreSdk.setDoc(f.firestoreSdk.doc(f.db,collections.projects,id),{...clean(patch),updatedAt:f.firestoreSdk.serverTimestamp()},{merge:true});}
export async function archiveProject(id){return updateProject(id,{archived:true,status:'closed',closedAt:new Date().toISOString()});}

export async function createTask(data){const f=await ctx();const r=f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.tasks));const batch=f.firestoreSdk.writeBatch(f.db);batch.set(r,{...clean(data),status:data.status||'not-started',assigneeIds:data.assigneeIds||[],createdAt:f.firestoreSdk.serverTimestamp(),updatedAt:f.firestoreSdk.serverTimestamp()});if(data.projectId&&data.assigneeIds?.length){const pr=f.firestoreSdk.doc(f.db,collections.projects,data.projectId);batch.set(pr,{accessUserIds:f.firestoreSdk.arrayUnion(...data.assigneeIds),workerIds:f.firestoreSdk.arrayUnion(...data.assigneeIds),updatedAt:f.firestoreSdk.serverTimestamp()},{merge:true});}await batch.commit();return r.id;}
export async function updateTask(id,patch){const f=await ctx();await f.firestoreSdk.setDoc(f.firestoreSdk.doc(f.db,collections.tasks,id),{...clean(patch),updatedAt:f.firestoreSdk.serverTimestamp()},{merge:true});}

export async function updateUserProfile(uid,patch){const f=await ctx();await f.firestoreSdk.setDoc(f.firestoreSdk.doc(f.db,collections.users,uid),{...clean(patch),updatedAt:f.firestoreSdk.serverTimestamp()},{merge:true});}
export async function approveUser(uid,{roles=[],defaultWorkspace='',title='',status='active'}={}){const unique=[...new Set((roles||[]).filter(Boolean))];const legacy=unique[0]||'worker';return updateUserProfile(uid,{roles:unique,role:legacy,defaultWorkspace:defaultWorkspace||legacy,status,title,approvedAt:new Date().toISOString()});}
export async function updateAccountAccess(uid,{roles=[],defaultWorkspace='',status='active',title=''}={}){const unique=[...new Set((roles||[]).filter(Boolean))];const legacy=unique[0]||'worker';return updateUserProfile(uid,{roles:unique,role:legacy,defaultWorkspace:defaultWorkspace||legacy,status,title,accessUpdatedAt:new Date().toISOString()});}
export async function rejectUser(uid){return updateUserProfile(uid,{status:'rejected'});}

export async function linkClientUser(uid,clientId){
  const f=await ctx(); const batch=f.firestoreSdk.writeBatch(f.db); const now=f.firestoreSdk.serverTimestamp();
  batch.set(f.firestoreSdk.doc(f.db,collections.users,uid),{clientId,updatedAt:now},{merge:true});
  if(clientId){
    batch.set(f.firestoreSdk.doc(f.db,collections.clients,clientId),{userIds:f.firestoreSdk.arrayUnion(uid),updatedAt:now},{merge:true});
    const q=f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.projects),f.firestoreSdk.where('clientId','==',clientId),f.firestoreSdk.limit(100));
    const snap=await f.firestoreSdk.getDocs(q);
    snap.docs.forEach(d=>batch.set(d.ref,{accessUserIds:f.firestoreSdk.arrayUnion(uid),clientUserIds:f.firestoreSdk.arrayUnion(uid),updatedAt:now},{merge:true}));
  }
  await batch.commit();
}

export async function ensureClientLinkForUser(user,preferredClientId=''){
  const f=await ctx(); let clientId=preferredClientId||user?.clientId||''; const email=String(user?.email||'').trim().toLowerCase();
  if(!clientId && email){
    const q=f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.clients),f.firestoreSdk.where('email','==',email),f.firestoreSdk.limit(5));
    let snap=await f.firestoreSdk.getDocs(q); if(!snap.empty) clientId=snap.docs[0].id;
    if(!clientId && String(user?.email||'')!==email){const q2=f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.clients),f.firestoreSdk.where('email','==',String(user.email)),f.firestoreSdk.limit(5));snap=await f.firestoreSdk.getDocs(q2);if(!snap.empty)clientId=snap.docs[0].id;}
  }
  if(!clientId){
    const r=f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.clients)); clientId=r.id;
    await f.firestoreSdk.setDoc(r,{name:user?.displayName||'Client',email,phone:user?.phone||'',company:user?.company||user?.displayName||'Client',userIds:[],status:'active',createdAt:f.firestoreSdk.serverTimestamp(),updatedAt:f.firestoreSdk.serverTimestamp()});
  }
  await linkClientUser(user.id||user.uid,clientId); return clientId;
}

export async function createWorkerInvite(data){const f=await ctx();const r=f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.workerInvites));await f.firestoreSdk.setDoc(r,{...clean(data),status:'pending',createdAt:f.firestoreSdk.serverTimestamp(),updatedAt:f.firestoreSdk.serverTimestamp()});return r.id;}

export async function createContract(data){const f=await ctx();const r=f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.contracts));await f.firestoreSdk.setDoc(r,{...clean(data),status:data.status||'draft',milestones:data.milestones||[],createdAt:f.firestoreSdk.serverTimestamp(),updatedAt:f.firestoreSdk.serverTimestamp()});return r.id;}
export async function updateContract(id,patch){const f=await ctx();await f.firestoreSdk.setDoc(f.firestoreSdk.doc(f.db,collections.contracts,id),{...clean(patch),updatedAt:f.firestoreSdk.serverTimestamp()},{merge:true});}

export async function createInvoice(data){
  const f=await ctx(); const r=f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.invoices));const invoiceNo=`WSC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;const amount=Number(data.amount||0);
  await f.firestoreSdk.setDoc(r,{...clean(data),invoiceNo,amount,paidAmount:0,balance:amount,status:'draft',clientVisible:false,createdBy:f.auth.currentUser?.uid||'',createdAt:f.firestoreSdk.serverTimestamp(),updatedAt:f.firestoreSdk.serverTimestamp()});return {id:r.id,invoiceNo};
}
export async function updateInvoice(id,patch){const f=await ctx();const ref=f.firestoreSdk.doc(f.db,collections.invoices,id);const snap=await f.firestoreSdk.getDoc(ref);if(!snap.exists())throw new Error('Invoice not found.');const current=snap.data();if(current.status!=='draft')throw new Error('Only draft invoices can be edited.');const amount=patch.amount===undefined?Number(current.amount||0):Number(patch.amount||0);await f.firestoreSdk.setDoc(ref,{...clean(patch),amount,balance:Math.max(0,amount-Number(current.paidAmount||0)),updatedAt:f.firestoreSdk.serverTimestamp()},{merge:true});}
export async function issueInvoice(id){const f=await ctx();await f.firestoreSdk.setDoc(f.firestoreSdk.doc(f.db,collections.invoices,id),{status:'sent',clientVisible:true,issuedAt:f.firestoreSdk.serverTimestamp(),updatedAt:f.firestoreSdk.serverTimestamp()},{merge:true});}
export async function voidInvoice(id){const f=await ctx();await f.firestoreSdk.setDoc(f.firestoreSdk.doc(f.db,collections.invoices,id),{status:'void',clientVisible:false,voidedAt:f.firestoreSdk.serverTimestamp(),updatedAt:f.firestoreSdk.serverTimestamp()},{merge:true});}

export async function submitPayment(data){
  const f=await ctx();const r=f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.payments));await f.firestoreSdk.setDoc(r,{...clean(data),amount:Number(data.amount||0),status:'pending_verification',submittedBy:f.auth.currentUser?.uid||'',createdAt:f.firestoreSdk.serverTimestamp(),updatedAt:f.firestoreSdk.serverTimestamp()});return r.id;
}

export async function verifyPayment(payment,invoice){
  const f=await ctx(); const batch=f.firestoreSdk.writeBatch(f.db);const amt=Number(payment.amount||0);const now=f.firestoreSdk.serverTimestamp();
  batch.set(f.firestoreSdk.doc(f.db,collections.payments,payment.id),{status:'verified',verifiedBy:f.auth.currentUser.uid,verifiedAt:now,updatedAt:now},{merge:true});
  if(invoice){const next=Number(invoice.paidAmount||0)+amt;const balance=Math.max(0,Number(invoice.amount||0)-next);batch.set(f.firestoreSdk.doc(f.db,collections.invoices,invoice.id),{paidAmount:next,balance,status:balance<=0?'paid':'partially_paid',updatedAt:now},{merge:true});}
  await batch.commit();
}

export async function createMoodboard(data){const f=await ctx();const r=f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.moodboards));await f.firestoreSdk.setDoc(r,{...clean(data),status:'draft',createdAt:f.firestoreSdk.serverTimestamp(),updatedAt:f.firestoreSdk.serverTimestamp()});return r.id;}
export async function addMoodboardItem(data){const f=await ctx();const r=f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.moodboardItems));await f.firestoreSdk.setDoc(r,{...clean(data),createdAt:f.firestoreSdk.serverTimestamp(),updatedAt:f.firestoreSdk.serverTimestamp()});return r.id;}
export async function updateMoodboard(id,patch){const f=await ctx();await f.firestoreSdk.setDoc(f.firestoreSdk.doc(f.db,collections.moodboards,id),{...clean(patch),updatedAt:f.firestoreSdk.serverTimestamp()},{merge:true});}

export async function createPreview(data){const f=await ctx();const r=f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.previews));await f.firestoreSdk.setDoc(r,{...clean(data),status:'review',createdAt:f.firestoreSdk.serverTimestamp(),updatedAt:f.firestoreSdk.serverTimestamp()});return r.id;}

export async function savePortfolioItem(data){const f=await ctx();const r=f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.portfolio));await f.firestoreSdk.setDoc(r,{...clean(data),createdAt:f.firestoreSdk.serverTimestamp(),updatedAt:f.firestoreSdk.serverTimestamp()});return r.id;}

export async function submitPublicPackageRequest(data){
  const f=await ctx();const user=f.auth.currentUser&&!f.auth.currentUser.isAnonymous?f.auth.currentUser:await ensureAnonymousSession();const r=f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.packageRequests));await f.firestoreSdk.setDoc(r,{...clean(data),createdBy:user.uid,status:'new',createdAt:f.firestoreSdk.serverTimestamp()});return r.id;
}

export async function markOnboardingComplete(){const f=await ctx();const uid=f.auth.currentUser?.uid;if(uid)await updateUserProfile(uid,{onboardingComplete:true});}
