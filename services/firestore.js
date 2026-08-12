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

export async function subscribeCurrentUserProfile(cb){
  const f=await ctx();
  const user=f.auth.currentUser;
  if(!user || user.isAnonymous) return ()=>{};
  const ref=f.firestoreSdk.doc(f.db,collections.users,user.uid);
  return f.firestoreSdk.onSnapshot(ref,snap=>cb(snap.exists()?withId(snap):null),()=>cb(null));
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
    onboardingComplete:false, onboardingEligible:true, createdAt:f.firestoreSdk.serverTimestamp(), updatedAt:f.firestoreSdk.serverTimestamp(),
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
    role:'pending', roles:[], requestedRole, requestedRoles:[requestedRole], defaultWorkspace:requestedRole, status:'pending', profilePhotoUrl:user.photoURL||'', title:'', onboardingComplete:false, onboardingEligible:true,
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
  const state={projects:[],clients:[],users:[],tasks:[],invoices:[],payments:[],expenses:[],services:[],categories:[],packages:[],standards:[],contracts:[],moodboards:[],moodboardItems:[],previews:[],portfolio:[]};
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
      const accum={contracts:new Map(),invoices:new Map(),payments:new Map(),previews:new Map(),moodboards:new Map(),moodboardItems:new Map()};
      ids.slice(0,40).forEach(projectId=>{
        const visibleSpecs=[['contracts',collections.contracts,20],['invoices',collections.invoices,50],['previews',collections.previews,100],['moodboards',collections.moodboards,100],['moodboardItems',collections.moodboardItems,150]];
        for(const [key,col,max] of visibleSpecs){
          const q=f.firestoreSdk.query(f.firestoreSdk.collection(f.db,col),f.firestoreSdk.where('projectId','==',projectId),f.firestoreSdk.where('clientVisible','==',true),f.firestoreSdk.limit(max));
          scopedUnsubs.push(f.firestoreSdk.onSnapshot(q,snap=>{accum[key].set(projectId,snap.docs.map(withId));state[key]=[...accum[key].values()].flat().sort((a,b)=>sortDesc(a,b));emit();},()=>{}));
        }
        const payq=f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.payments),f.firestoreSdk.where('projectId','==',projectId),f.firestoreSdk.limit(100));
        scopedUnsubs.push(f.firestoreSdk.onSnapshot(payq,snap=>{accum.payments.set(projectId,snap.docs.map(withId));state.payments=[...accum.payments.values()].flat().sort((a,b)=>sortDesc(a,b));emit();},()=>{}));
      });
      return;
    }
    if(!workerScope)return;
    const chunks=[];for(let i=0;i<ids.length;i+=30)chunks.push(ids.slice(i,i+30));
    const specs=[['tasks',collections.tasks],['invoices',collections.invoices],['payments',collections.payments],['contracts',collections.contracts],['moodboards',collections.moodboards],['moodboardItems',collections.moodboardItems],['previews',collections.previews]];
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
    listen(f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.expenses),f.firestoreSdk.limit(250)),'expenses');
    listen(f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.contracts),f.firestoreSdk.limit(250)),'contracts');
  }else{
    const pq=f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.projects),f.firestoreSdk.where('accessUserIds','array-contains',uid),f.firestoreSdk.limit(150));
    unsubs.push(f.firestoreSdk.onSnapshot(pq,snap=>{state.projects=snap.docs.map(withId).sort((a,b)=>sortDesc(a,b));resetScopedProjectResources(state.projects.map(p=>p.id));emit();},()=>{}));
  }
  if(roles.some(r=>['worker','designer','lead_designer','project_manager'].includes(r))){
    listen(f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.clients),f.firestoreSdk.limit(250)),'clients');
    listen(f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.users),f.firestoreSdk.limit(250)),'users');
    listen(f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.catalogAssets),f.firestoreSdk.limit(250)),'services');
    listen(f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.serviceCategories),f.firestoreSdk.limit(250)),'categories');
    listen(f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.packageTemplates),f.firestoreSdk.limit(250)),'packages');
    listen(f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.standards),f.firestoreSdk.limit(250)),'standards');
    const portq=f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.portfolio),f.firestoreSdk.where('authorizedUserIds','array-contains',uid),f.firestoreSdk.limit(150));
    listen(portq,'portfolio');
  }
  // Client commercial/creative data is subscribed project-by-project above. This keeps Firestore
  // queries aligned with projectAccess() rules instead of relying on clientId as a security filter.
  return ()=>{unsubs.forEach(u=>{try{u?.()}catch{}});scopedUnsubs.forEach(u=>{try{u?.()}catch{}});};
}

export async function saveWorkflowTemplate(id,data){const f=await ctx();const r=id?f.firestoreSdk.doc(f.db,collections.standards,id):f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.standards));await f.firestoreSdk.setDoc(r,{...clean(data),active:data.active!==false,updatedAt:f.firestoreSdk.serverTimestamp(),...(id?{}:{createdAt:f.firestoreSdk.serverTimestamp(),version:1})},{merge:Boolean(id)});return r.id;}
export async function archiveWorkflowTemplate(id,active=false){return saveWorkflowTemplate(id,{active});}
export async function deleteWorkflowTemplate(id){const f=await ctx();const q=f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.catalogAssets),f.firestoreSdk.where('workflowTemplateId','==',id),f.firestoreSdk.limit(1));if(!(await f.firestoreSdk.getDocs(q)).empty)throw new Error('This workflow is still used by a service. Reassign that service before deleting the workflow.');await f.firestoreSdk.deleteDoc(f.firestoreSdk.doc(f.db,collections.standards,id));}

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

export async function createServiceCategory(data){const f=await ctx();const r=f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.serviceCategories));await f.firestoreSdk.setDoc(r,{...clean(data),active:data.active!==false,createdAt:f.firestoreSdk.serverTimestamp(),updatedAt:f.firestoreSdk.serverTimestamp()});return r.id;}
export async function updateServiceCategory(id,patch){const f=await ctx();await f.firestoreSdk.setDoc(f.firestoreSdk.doc(f.db,collections.serviceCategories,id),{...clean(patch),updatedAt:f.firestoreSdk.serverTimestamp()},{merge:true});}
export async function deleteServiceCategory(id){const f=await ctx();const q=f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.catalogAssets),f.firestoreSdk.where('categoryId','==',id),f.firestoreSdk.limit(1));if(!(await f.firestoreSdk.getDocs(q)).empty)throw new Error('This category still contains services. Move or delete those services first.');await f.firestoreSdk.deleteDoc(f.firestoreSdk.doc(f.db,collections.serviceCategories,id));}
export async function saveService(id,data){const f=await ctx();const r=id?f.firestoreSdk.doc(f.db,collections.catalogAssets,id):f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.catalogAssets));await f.firestoreSdk.setDoc(r,{...clean(data),updatedAt:f.firestoreSdk.serverTimestamp(),...(id?{}:{createdAt:f.firestoreSdk.serverTimestamp()})},{merge:Boolean(id)});return r.id;}
export async function deleteService(id){const f=await ctx();const pq=f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.projects),f.firestoreSdk.where('serviceId','==',id),f.firestoreSdk.limit(1));if(!(await f.firestoreSdk.getDocs(pq)).empty)throw new Error('This service is referenced by a project. Archive it instead of deleting it.');const tq=f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.packageTemplates),f.firestoreSdk.where('serviceIds','array-contains',id),f.firestoreSdk.limit(1));if(!(await f.firestoreSdk.getDocs(tq)).empty)throw new Error('This service is used by a package template. Remove it from the template first.');await f.firestoreSdk.deleteDoc(f.firestoreSdk.doc(f.db,collections.catalogAssets,id));}
export async function savePackageTemplate(id,data){const f=await ctx();const r=id?f.firestoreSdk.doc(f.db,collections.packageTemplates,id):f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.packageTemplates));await f.firestoreSdk.setDoc(r,{...clean(data),updatedAt:f.firestoreSdk.serverTimestamp(),...(id?{}:{createdAt:f.firestoreSdk.serverTimestamp()})},{merge:Boolean(id)});return r.id;}
export async function archivePackageTemplate(id,archived=true){const f=await ctx();await f.firestoreSdk.setDoc(f.firestoreSdk.doc(f.db,collections.packageTemplates,id),{archived,updatedAt:f.firestoreSdk.serverTimestamp()},{merge:true});}
export async function deletePackageTemplate(id){const f=await ctx();const q=f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.projects),f.firestoreSdk.where('packageTemplateId','==',id),f.firestoreSdk.limit(1));if(!(await f.firestoreSdk.getDocs(q)).empty)throw new Error('This package template is referenced by a project. Archive it instead.');await f.firestoreSdk.deleteDoc(f.firestoreSdk.doc(f.db,collections.packageTemplates,id));}
export async function duplicatePackageTemplate(id){const f=await ctx();const snap=await f.firestoreSdk.getDoc(f.firestoreSdk.doc(f.db,collections.packageTemplates,id));if(!snap.exists())throw new Error('Template not found.');const d=snap.data();return savePackageTemplate(null,{...d,name:`${d.name||'Package'} Copy`,published:false,archived:false});}

export async function createClient(data){const f=await ctx();const r=f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.clients));const email=String(data.email||'').trim().toLowerCase();await f.firestoreSdk.setDoc(r,{...clean(data),email,userIds:data.userIds||[],status:data.status||'active',archived:Boolean(data.archived),isTest:Boolean(data.isTest),createdBy:data.createdBy||f.auth.currentUser?.uid||'',createdAt:f.firestoreSdk.serverTimestamp(),updatedAt:f.firestoreSdk.serverTimestamp()});return r.id;}
export async function updateClient(id,patch){const f=await ctx();const data={...clean(patch)};if(data.email!==undefined)data.email=String(data.email||'').trim().toLowerCase();await f.firestoreSdk.setDoc(f.firestoreSdk.doc(f.db,collections.clients,id),{...data,updatedAt:f.firestoreSdk.serverTimestamp()},{merge:true});}
export async function archiveClient(id,archived=true){return updateClient(id,{archived,status:archived?'archived':'active'});}
export async function deleteClient(id){const f=await ctx();const q=f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.projects),f.firestoreSdk.where('clientId','==',id),f.firestoreSdk.limit(1));if(!(await f.firestoreSdk.getDocs(q)).empty)throw new Error('This client still has project history. Reassign or remove those projects first.');await f.firestoreSdk.deleteDoc(f.firestoreSdk.doc(f.db,collections.clients,id));}

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
  if(!clientId && client?.name){const cr=f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.clients));clientId=cr.id;batch.set(cr,{name:client.name,email:String(client.email||'').trim().toLowerCase(),phone:client.phone||'',company:client.company||client.name,userIds:[],status:'active',archived:false,isTest:Boolean(client.isTest),createdBy:uid,createdAt:now,updatedAt:now});}
  const pr=f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.projects));
  batch.set(pr,{...clean(project),clientId,clientName,accessUserIds:[...new Set([uid,...clientUserIds])],managementUserIds:[uid],workerIds:[],clientUserIds,progress:0,status:'active',health:'healthy',archived:false,releaseState:'locked',createdBy:uid,createdAt:now,updatedAt:now});
  for(const t of buildTaskRows({workflow,projectId:pr.id,uid,f})){const tr=f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.tasks));batch.set(tr,t);}
  const ar=f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.activity));batch.set(ar,{projectId:pr.id,type:'project_created',message:'Project created.',actorId:uid,createdAt:now});
  await batch.commit(); return {projectId:pr.id,clientId};
}

export async function updateProject(id,patch){const f=await ctx();await f.firestoreSdk.setDoc(f.firestoreSdk.doc(f.db,collections.projects,id),{...clean(patch),updatedAt:f.firestoreSdk.serverTimestamp()},{merge:true});}
export async function setProjectAssignments(id,{managerIds=[],workerIds=[],clientUserIds=[]}={}){
  const f=await ctx();const uid=f.auth.currentUser?.uid||'',now=f.firestoreSdk.serverTimestamp();
  const managers=[...new Set((managerIds||[]).filter(Boolean))],workers=[...new Set((workerIds||[]).filter(Boolean))],clients=[...new Set((clientUserIds||[]).filter(Boolean))];
  const access=[...new Set([uid,...managers,...workers,...clients].filter(Boolean))],allowedTaskUsers=new Set([...managers,...workers]);
  const taskQ=f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.tasks),f.firestoreSdk.where('projectId','==',id),f.firestoreSdk.limit(300));
  const taskSnap=await f.firestoreSdk.getDocs(taskQ);const batch=f.firestoreSdk.writeBatch(f.db);
  batch.set(f.firestoreSdk.doc(f.db,collections.projects,id),{managementUserIds:managers,workerIds:workers,clientUserIds:clients,accessUserIds:access,updatedAt:now},{merge:true});
  taskSnap.docs.forEach(d=>{const before=Array.isArray(d.data().assigneeIds)?d.data().assigneeIds:[],after=before.filter(x=>allowedTaskUsers.has(x));if(after.length!==before.length)batch.set(d.ref,{assigneeIds:after,updatedAt:now},{merge:true});});
  await batch.commit();
}
export async function archiveProject(id,archived=true){return updateProject(id,{archived,status:archived?'closed':'active',closedAt:archived?new Date().toISOString():null});}
export async function deleteProject(id){const f=await ctx();const cols=[collections.tasks,collections.contracts,collections.invoices,collections.payments,collections.expenses,collections.moodboards,collections.moodboardItems,collections.previews,collections.reviews,collections.activity];const refs=[];for(const col of cols){const q=f.firestoreSdk.query(f.firestoreSdk.collection(f.db,col),f.firestoreSdk.where('projectId','==',id),f.firestoreSdk.limit(400));const snap=await f.firestoreSdk.getDocs(q);snap.docs.forEach(d=>refs.push(d.ref));}refs.push(f.firestoreSdk.doc(f.db,collections.projects,id));for(let i=0;i<refs.length;i+=400){const b=f.firestoreSdk.writeBatch(f.db);refs.slice(i,i+400).forEach(r=>b.delete(r));await b.commit();}}

export async function createTask(data){const f=await ctx();const r=f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.tasks));const batch=f.firestoreSdk.writeBatch(f.db);batch.set(r,{...clean(data),status:data.status||'not-started',assigneeIds:data.assigneeIds||[],createdAt:f.firestoreSdk.serverTimestamp(),updatedAt:f.firestoreSdk.serverTimestamp()});if(data.projectId&&data.assigneeIds?.length){const pr=f.firestoreSdk.doc(f.db,collections.projects,data.projectId);batch.set(pr,{accessUserIds:f.firestoreSdk.arrayUnion(...data.assigneeIds),workerIds:f.firestoreSdk.arrayUnion(...data.assigneeIds),updatedAt:f.firestoreSdk.serverTimestamp()},{merge:true});}await batch.commit();return r.id;}
export async function updateTask(id,patch){const f=await ctx();const data={...clean(patch)};await f.firestoreSdk.setDoc(f.firestoreSdk.doc(f.db,collections.tasks,id),{...data,updatedAt:f.firestoreSdk.serverTimestamp()},{merge:true});if(data.assigneeIds?.length){const snap=await f.firestoreSdk.getDoc(f.firestoreSdk.doc(f.db,collections.tasks,id));const projectId=snap.data()?.projectId;if(projectId)await f.firestoreSdk.setDoc(f.firestoreSdk.doc(f.db,collections.projects,projectId),{accessUserIds:f.firestoreSdk.arrayUnion(...data.assigneeIds),workerIds:f.firestoreSdk.arrayUnion(...data.assigneeIds),updatedAt:f.firestoreSdk.serverTimestamp()},{merge:true});}}
export async function deleteTask(id){const f=await ctx();await f.firestoreSdk.deleteDoc(f.firestoreSdk.doc(f.db,collections.tasks,id));}

export async function updateUserProfile(uid,patch){const f=await ctx();await f.firestoreSdk.setDoc(f.firestoreSdk.doc(f.db,collections.users,uid),{...clean(patch),updatedAt:f.firestoreSdk.serverTimestamp()},{merge:true});}
export async function approveUser(uid,{roles=[],defaultWorkspace='',title='',status='active'}={}){const unique=[...new Set((roles||[]).filter(Boolean))];const legacy=unique[0]||'worker';return updateUserProfile(uid,{roles:unique,role:legacy,defaultWorkspace:defaultWorkspace||legacy,status,title,approvedAt:new Date().toISOString()});}
export async function updateAccountAccess(uid,{roles=[],defaultWorkspace='',status='active',title=''}={}){const unique=[...new Set((roles||[]).filter(Boolean))];const legacy=unique[0]||'worker';return updateUserProfile(uid,{roles:unique,role:legacy,defaultWorkspace:defaultWorkspace||legacy,status,title,accessUpdatedAt:new Date().toISOString()});}
export async function rejectUser(uid){return updateUserProfile(uid,{status:'rejected'});}

export async function linkClientUser(uid,clientId){
  const f=await ctx(); const now=f.firestoreSdk.serverTimestamp();
  const userRef=f.firestoreSdk.doc(f.db,collections.users,uid); const userSnap=await f.firestoreSdk.getDoc(userRef); const oldClientId=userSnap.data()?.clientId||'';
  const batch=f.firestoreSdk.writeBatch(f.db);
  if(oldClientId && oldClientId!==clientId){
    batch.set(f.firestoreSdk.doc(f.db,collections.clients,oldClientId),{userIds:f.firestoreSdk.arrayRemove(uid),updatedAt:now},{merge:true});
    const oq=f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.projects),f.firestoreSdk.where('clientId','==',oldClientId),f.firestoreSdk.limit(100));
    const os=await f.firestoreSdk.getDocs(oq);
    os.docs.forEach(d=>{const pd=d.data(),stillStaff=(pd.workerIds||[]).includes(uid)||(pd.managementUserIds||[]).includes(uid);const patch={clientUserIds:f.firestoreSdk.arrayRemove(uid),updatedAt:now};if(!stillStaff)patch.accessUserIds=f.firestoreSdk.arrayRemove(uid);batch.set(d.ref,patch,{merge:true});});
  }
  batch.set(userRef,{clientId:clientId||'',updatedAt:now},{merge:true});
  if(clientId){
    batch.set(f.firestoreSdk.doc(f.db,collections.clients,clientId),{userIds:f.firestoreSdk.arrayUnion(uid),updatedAt:now},{merge:true});
    const q=f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.projects),f.firestoreSdk.where('clientId','==',clientId),f.firestoreSdk.limit(100));
    const snap=await f.firestoreSdk.getDocs(q);
    snap.docs.forEach(d=>batch.set(d.ref,{accessUserIds:f.firestoreSdk.arrayUnion(uid),clientUserIds:f.firestoreSdk.arrayUnion(uid),updatedAt:now},{merge:true}));
  }
  await batch.commit();
}
export async function unlinkClientUser(uid){return linkClientUser(uid,'');}

export async function ensureClientLinkForUser(user,preferredClientId=''){
  const f=await ctx(); let clientId=preferredClientId||user?.clientId||''; const email=String(user?.email||'').trim().toLowerCase();
  if(!clientId && email){
    const q=f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.clients),f.firestoreSdk.where('email','==',email),f.firestoreSdk.limit(5));
    let snap=await f.firestoreSdk.getDocs(q); if(!snap.empty) clientId=snap.docs[0].id;
    if(!clientId && String(user?.email||'')!==email){const q2=f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.clients),f.firestoreSdk.where('email','==',String(user.email)),f.firestoreSdk.limit(5));snap=await f.firestoreSdk.getDocs(q2);if(!snap.empty)clientId=snap.docs[0].id;}
  }
  if(!clientId){
    const r=f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.clients)); clientId=r.id;
    await f.firestoreSdk.setDoc(r,{name:user?.displayName||'Client',email,phone:user?.phone||'',company:user?.company||user?.displayName||'Client',userIds:[],status:'active',createdBy:f.auth.currentUser?.uid||'',createdAt:f.firestoreSdk.serverTimestamp(),updatedAt:f.firestoreSdk.serverTimestamp()});
  }
  await linkClientUser(user.id||user.uid,clientId); return clientId;
}

export async function createWorkerInvite(data){const f=await ctx();const r=f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.workerInvites));await f.firestoreSdk.setDoc(r,{...clean(data),status:'pending',createdAt:f.firestoreSdk.serverTimestamp(),updatedAt:f.firestoreSdk.serverTimestamp()});return r.id;}

export async function createContract(data){const f=await ctx();const r=f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.contracts));await f.firestoreSdk.setDoc(r,{...clean(data),status:data.status||'draft',archived:false,clientVisible:['sent','accepted','signed'].includes(data.status),milestones:data.milestones||[],createdAt:f.firestoreSdk.serverTimestamp(),updatedAt:f.firestoreSdk.serverTimestamp()});return r.id;}
export async function updateContract(id,patch){const f=await ctx();const ref=f.firestoreSdk.doc(f.db,collections.contracts,id),snap=await f.firestoreSdk.getDoc(ref);if(!snap.exists())throw new Error('Agreement not found.');const current=snap.data(),currentStatus=current.status||'draft';if(currentStatus!=='draft')throw new Error('Finalized agreements cannot be edited. Archive/void the historical agreement and create a new draft instead.');const nextStatus=patch.status||currentStatus;await f.firestoreSdk.setDoc(ref,{...clean(patch),clientVisible:['sent','accepted','signed'].includes(nextStatus),finalizedAt:nextStatus!=='draft'?f.firestoreSdk.serverTimestamp():null,updatedAt:f.firestoreSdk.serverTimestamp()},{merge:true});}
export async function archiveContract(id,archived=true){const f=await ctx();await f.firestoreSdk.setDoc(f.firestoreSdk.doc(f.db,collections.contracts,id),{archived:Boolean(archived),archivedAt:archived?f.firestoreSdk.serverTimestamp():null,updatedAt:f.firestoreSdk.serverTimestamp()},{merge:true});}
export async function voidContract(id,reason=''){const f=await ctx();const ref=f.firestoreSdk.doc(f.db,collections.contracts,id),snap=await f.firestoreSdk.getDoc(ref);if(!snap.exists())throw new Error('Agreement not found.');await f.firestoreSdk.setDoc(ref,{status:'void',clientVisible:false,voidReason:String(reason||'').trim(),voidedAt:f.firestoreSdk.serverTimestamp(),updatedAt:f.firestoreSdk.serverTimestamp()},{merge:true});}
export async function deleteContract(id){const f=await ctx();const ref=f.firestoreSdk.doc(f.db,collections.contracts,id);const snap=await f.firestoreSdk.getDoc(ref);if(!snap.exists())return;if((snap.data().status||'draft')!=='draft')throw new Error('Only draft contracts can be deleted. Archive or void finalized contracts instead.');await f.firestoreSdk.deleteDoc(ref);}

export async function createInvoice(data){
  const f=await ctx(); const r=f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.invoices));const invoiceNo=`WSC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;const amount=Number(data.amount||0);
  await f.firestoreSdk.setDoc(r,{...clean(data),invoiceNo,amount,paidAmount:0,balance:amount,status:'draft',clientVisible:false,createdBy:f.auth.currentUser?.uid||'',createdAt:f.firestoreSdk.serverTimestamp(),updatedAt:f.firestoreSdk.serverTimestamp()});return {id:r.id,invoiceNo};
}
export async function updateInvoice(id,patch){const f=await ctx();const ref=f.firestoreSdk.doc(f.db,collections.invoices,id);const snap=await f.firestoreSdk.getDoc(ref);if(!snap.exists())throw new Error('Invoice not found.');const current=snap.data();if(current.status!=='draft')throw new Error('Only draft invoices can be edited.');const amount=patch.amount===undefined?Number(current.amount||0):Number(patch.amount||0);await f.firestoreSdk.setDoc(ref,{...clean(patch),amount,balance:Math.max(0,amount-Number(current.paidAmount||0)),updatedAt:f.firestoreSdk.serverTimestamp()},{merge:true});}
export async function issueInvoice(id){
  const f=await ctx();const ref=f.firestoreSdk.doc(f.db,collections.invoices,id),snap=await f.firestoreSdk.getDoc(ref);if(!snap.exists())throw new Error('Invoice not found.');const d=snap.data();if(d.status!=='draft')throw new Error('Only a draft invoice can be issued.');const now=f.firestoreSdk.serverTimestamp(),batch=f.firestoreSdk.writeBatch(f.db);
  batch.set(ref,{status:'sent',clientVisible:true,issuedAt:now,updatedAt:now},{merge:true});
  if(d.revisesInvoiceId){const oldRef=f.firestoreSdk.doc(f.db,collections.invoices,d.revisesInvoiceId),oldSnap=await f.firestoreSdk.getDoc(oldRef);if(oldSnap.exists()){const old=oldSnap.data();if(Number(old.paidAmount||0)>0)throw new Error('The original invoice already has verified payment. Use an adjustment/new invoice rather than replacing it.');batch.set(oldRef,{status:'superseded',clientVisible:false,supersededBy:id,supersededAt:now,updatedAt:now},{merge:true});}}
  await batch.commit();
}
export async function voidInvoice(id,reason=''){const f=await ctx();const ref=f.firestoreSdk.doc(f.db,collections.invoices,id),snap=await f.firestoreSdk.getDoc(ref);if(!snap.exists())throw new Error('Invoice not found.');const d=snap.data();if(Number(d.paidAmount||0)>0||['paid','partially_paid'].includes(d.status))throw new Error('This invoice has verified payment and cannot be voided. Use a documented adjustment/refund workflow instead.');await f.firestoreSdk.setDoc(ref,{status:'void',clientVisible:false,voidReason:String(reason||'').trim(),voidedAt:f.firestoreSdk.serverTimestamp(),updatedAt:f.firestoreSdk.serverTimestamp()},{merge:true});}
export async function deleteDraftInvoice(id){const f=await ctx();const ref=f.firestoreSdk.doc(f.db,collections.invoices,id);const snap=await f.firestoreSdk.getDoc(ref);if(!snap.exists())return;if(snap.data().status!=='draft')throw new Error('Only draft invoices can be deleted. Use Void/Reissue for issued invoices.');await f.firestoreSdk.deleteDoc(ref);}
export async function createInvoiceRevision(invoice){const f=await ctx();if(Number(invoice.paidAmount||0)>0||['paid','partially_paid'].includes(invoice.status))throw new Error('Paid/partially paid invoices cannot be replaced by revision. Create a separate adjustment invoice instead.');const r=f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.invoices));const invoiceNo=`WSC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;const now=f.firestoreSdk.serverTimestamp();await f.firestoreSdk.setDoc(r,{projectId:invoice.projectId,clientId:invoice.clientId,clientName:invoice.clientName,amount:Number(invoice.amount||0),paidAmount:0,balance:Number(invoice.amount||0),currency:invoice.currency||'NGN',dueDate:invoice.dueDate||'',milestoneLabel:invoice.milestoneLabel||'',notes:`Revision of ${invoice.invoiceNo||invoice.id}${invoice.notes?` · ${invoice.notes}`:''}`,revisesInvoiceId:invoice.id,invoiceNo,status:'draft',clientVisible:false,createdBy:f.auth.currentUser?.uid||'',createdAt:now,updatedAt:now});return {id:r.id,invoiceNo};}

export async function submitPayment(data){
  const f=await ctx();const r=f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.payments));await f.firestoreSdk.setDoc(r,{...clean(data),amount:Number(data.amount||0),status:'pending_verification',submittedBy:f.auth.currentUser?.uid||'',createdAt:f.firestoreSdk.serverTimestamp(),updatedAt:f.firestoreSdk.serverTimestamp()});return r.id;
}

export async function verifyPayment(payment,invoice){
  const f=await ctx();const payRef=f.firestoreSdk.doc(f.db,collections.payments,payment.id),invRef=invoice?f.firestoreSdk.doc(f.db,collections.invoices,invoice.id):null;
  await f.firestoreSdk.runTransaction(f.db,async tx=>{const paySnap=await tx.get(payRef);if(!paySnap.exists())throw new Error('Payment record not found.');const pd=paySnap.data();if(pd.status==='verified')throw new Error('This payment is already verified.');const amt=Number(pd.amount||0);if(!(amt>0))throw new Error('Payment amount must be greater than zero.');let nextStatus='verified';if(invRef){const invSnap=await tx.get(invRef);if(!invSnap.exists())throw new Error('Invoice not found.');const id=invSnap.data(),balanceNow=Number(id.balance??id.amount??0);if(amt>balanceNow)throw new Error('Payment is greater than the current invoice balance. Correct the payment record before verifying it.');const nextPaid=Number(id.paidAmount||0)+amt,nextBalance=Math.max(0,Number(id.amount||0)-nextPaid);tx.set(invRef,{paidAmount:nextPaid,balance:nextBalance,status:nextBalance<=0?'paid':'partially_paid',updatedAt:f.firestoreSdk.serverTimestamp()},{merge:true});}tx.set(payRef,{status:nextStatus,verifiedBy:f.auth.currentUser.uid,verifiedAt:f.firestoreSdk.serverTimestamp(),updatedAt:f.firestoreSdk.serverTimestamp()},{merge:true});});
}

export async function createExpense(data){
  const f=await ctx(),r=f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.expenses)),amount=Number(data.amount||0);
  if(!(amount>0))throw new Error('Expense amount must be greater than zero.');
  await f.firestoreSdk.setDoc(r,{...clean(data),amount,status:'draft',createdBy:f.auth.currentUser?.uid||'',createdAt:f.firestoreSdk.serverTimestamp(),updatedAt:f.firestoreSdk.serverTimestamp()});
  return r.id;
}
export async function updateExpense(id,patch){
  const f=await ctx(),ref=f.firestoreSdk.doc(f.db,collections.expenses,id),snap=await f.firestoreSdk.getDoc(ref);
  if(!snap.exists())throw new Error('Expense not found.');
  if((snap.data().status||'draft')!=='draft')throw new Error('Only draft expenses can be edited.');
  const amount=patch.amount===undefined?Number(snap.data().amount||0):Number(patch.amount||0);
  if(!(amount>0))throw new Error('Expense amount must be greater than zero.');
  await f.firestoreSdk.setDoc(ref,{...clean(patch),amount,updatedAt:f.firestoreSdk.serverTimestamp()},{merge:true});
}
export async function recordExpense(id){
  const f=await ctx(),ref=f.firestoreSdk.doc(f.db,collections.expenses,id),snap=await f.firestoreSdk.getDoc(ref);
  if(!snap.exists())throw new Error('Expense not found.');
  if((snap.data().status||'draft')!=='draft')throw new Error('Only draft expenses can be recorded.');
  await f.firestoreSdk.setDoc(ref,{status:'recorded',recordedBy:f.auth.currentUser?.uid||'',recordedAt:f.firestoreSdk.serverTimestamp(),updatedAt:f.firestoreSdk.serverTimestamp()},{merge:true});
}
export async function voidExpense(id,reason=''){
  const f=await ctx(),ref=f.firestoreSdk.doc(f.db,collections.expenses,id),snap=await f.firestoreSdk.getDoc(ref);
  if(!snap.exists())throw new Error('Expense not found.');
  if((snap.data().status||'')==='draft')throw new Error('Delete the draft instead of voiding it.');
  await f.firestoreSdk.setDoc(ref,{status:'void',voidReason:String(reason||'').trim(),voidedBy:f.auth.currentUser?.uid||'',voidedAt:f.firestoreSdk.serverTimestamp(),updatedAt:f.firestoreSdk.serverTimestamp()},{merge:true});
}
export async function deleteDraftExpense(id){
  const f=await ctx(),ref=f.firestoreSdk.doc(f.db,collections.expenses,id),snap=await f.firestoreSdk.getDoc(ref);
  if(!snap.exists())return;
  if((snap.data().status||'draft')!=='draft')throw new Error('Only draft expenses can be deleted. Void recorded expenses to preserve history.');
  await f.firestoreSdk.deleteDoc(ref);
}

export async function createMoodboard(data){const f=await ctx();const r=f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.moodboards));await f.firestoreSdk.setDoc(r,{...clean(data),status:'draft',createdAt:f.firestoreSdk.serverTimestamp(),updatedAt:f.firestoreSdk.serverTimestamp()});return r.id;}
export async function addMoodboardItem(data){const f=await ctx();const r=f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.moodboardItems));await f.firestoreSdk.setDoc(r,{...clean(data),createdAt:f.firestoreSdk.serverTimestamp(),updatedAt:f.firestoreSdk.serverTimestamp()});return r.id;}
export async function updateMoodboard(id,patch){
  const f=await ctx(),now=f.firestoreSdk.serverTimestamp(),boardRef=f.firestoreSdk.doc(f.db,collections.moodboards,id);
  const batch=f.firestoreSdk.writeBatch(f.db);
  batch.set(boardRef,{...clean(patch),updatedAt:now},{merge:true});
  if(Object.prototype.hasOwnProperty.call(patch,'clientVisible')){
    const q=f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.moodboardItems),f.firestoreSdk.where('moodboardId','==',id),f.firestoreSdk.limit(300));
    const snap=await f.firestoreSdk.getDocs(q);
    snap.docs.forEach(d=>batch.set(d.ref,{clientVisible:Boolean(patch.clientVisible),updatedAt:now},{merge:true}));
  }
  await batch.commit();
}
export async function updateMoodboardItem(id,patch){const f=await ctx();await f.firestoreSdk.setDoc(f.firestoreSdk.doc(f.db,collections.moodboardItems,id),{...clean(patch),updatedAt:f.firestoreSdk.serverTimestamp()},{merge:true});}
export async function deleteMoodboardItem(id){const f=await ctx();await f.firestoreSdk.deleteDoc(f.firestoreSdk.doc(f.db,collections.moodboardItems,id));}
export async function deleteMoodboard(id){const f=await ctx();const q=f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.moodboardItems),f.firestoreSdk.where('moodboardId','==',id),f.firestoreSdk.limit(250));const snap=await f.firestoreSdk.getDocs(q);const batch=f.firestoreSdk.writeBatch(f.db);snap.docs.forEach(d=>batch.delete(d.ref));batch.delete(f.firestoreSdk.doc(f.db,collections.moodboards,id));await batch.commit();}

export async function createPreview(data){const f=await ctx();const r=f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.previews));await f.firestoreSdk.setDoc(r,{...clean(data),status:data.status||'review',createdAt:f.firestoreSdk.serverTimestamp(),updatedAt:f.firestoreSdk.serverTimestamp()});return r.id;}
export async function updatePreview(id,patch){const f=await ctx();await f.firestoreSdk.setDoc(f.firestoreSdk.doc(f.db,collections.previews,id),{...clean(patch),updatedAt:f.firestoreSdk.serverTimestamp()},{merge:true});}
export async function deletePreview(id){const f=await ctx();await f.firestoreSdk.deleteDoc(f.firestoreSdk.doc(f.db,collections.previews,id));}

export async function savePortfolioItem(data){const f=await ctx();const r=f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.portfolio));await f.firestoreSdk.setDoc(r,{...clean(data),createdAt:f.firestoreSdk.serverTimestamp(),updatedAt:f.firestoreSdk.serverTimestamp()});return r.id;}

export async function submitPublicPackageRequest(data){
  const f=await ctx();const user=f.auth.currentUser&&!f.auth.currentUser.isAnonymous?f.auth.currentUser:await ensureAnonymousSession();const r=f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.packageRequests));await f.firestoreSdk.setDoc(r,{...clean(data),createdBy:user.uid,status:'new',createdAt:f.firestoreSdk.serverTimestamp()});return r.id;
}

export async function recordProjectActivity(projectId,type,message,details={}){const f=await ctx();const r=f.firestoreSdk.doc(f.firestoreSdk.collection(f.db,collections.activity));await f.firestoreSdk.setDoc(r,{projectId,type,message,...clean(details),actorId:f.auth.currentUser?.uid||'',createdAt:f.firestoreSdk.serverTimestamp()});return r.id;}

export async function cleanupTestData(){
  const f=await ctx();
  const pq=f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.projects),f.firestoreSdk.where('isTest','==',true),f.firestoreSdk.limit(200));
  const ps=await f.firestoreSdk.getDocs(pq); const projectIds=ps.docs.map(d=>d.id); if(!projectIds.length)return {projects:0,related:0,clients:0};
  const relatedCols=[collections.tasks,collections.contracts,collections.invoices,collections.payments,collections.expenses,collections.moodboards,collections.moodboardItems,collections.previews,collections.reviews,collections.activity];
  const deleteRefs=[];
  for(const col of relatedCols){for(let i=0;i<projectIds.length;i+=30){const chunk=projectIds.slice(i,i+30);const q=f.firestoreSdk.query(f.firestoreSdk.collection(f.db,col),f.firestoreSdk.where('projectId','in',chunk),f.firestoreSdk.limit(400));const snap=await f.firestoreSdk.getDocs(q);snap.docs.forEach(d=>deleteRefs.push(d.ref));}}
  ps.docs.forEach(d=>deleteRefs.push(d.ref));
  let related=deleteRefs.length-ps.size;
  for(let i=0;i<deleteRefs.length;i+=400){const b=f.firestoreSdk.writeBatch(f.db);deleteRefs.slice(i,i+400).forEach(r=>b.delete(r));await b.commit();}
  const cq=f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.clients),f.firestoreSdk.where('isTest','==',true),f.firestoreSdk.limit(200));const cs=await f.firestoreSdk.getDocs(cq);let clientsDeleted=0;
  for(const c of cs.docs){const liveQ=f.firestoreSdk.query(f.firestoreSdk.collection(f.db,collections.projects),f.firestoreSdk.where('clientId','==',c.id),f.firestoreSdk.limit(1));const live=await f.firestoreSdk.getDocs(liveQ);if(live.empty){await f.firestoreSdk.deleteDoc(c.ref);clientsDeleted++;}}
  return {projects:ps.size,related,clients:clientsDeleted};
}

export async function markOnboardingComplete(){const f=await ctx();const uid=f.auth.currentUser?.uid;if(uid)await updateUserProfile(uid,{onboardingComplete:true,onboardingEligible:false});}
