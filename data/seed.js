export const BRAND = {
  name: 'StudioDesk',
  studio: 'Wiscode Studio',
  registeredCompany: 'Wiscode Innovations Limited',
  navy: '#252E3D',
  mint: '#66FECB',
};

export const foundationSteps = [
  { id:'brief', label:'Creative brief', weight:4, estimatedHours:1, status:'done' },
  { id:'research', label:'Research', weight:8, estimatedHours:3, status:'done' },
  { id:'moodboard', label:'Moodboarding', weight:8, estimatedHours:3, status:'review' },
  { id:'direction', label:'Creative direction approval', weight:6, estimatedHours:1, status:'in-progress' },
];

export const standards = {
  logoSystem: {
    id:'logoSystem',
    steps:[
      { id:'logo-exploration', label:'Logo concept exploration', weight:16, estimatedHours:8, status:'not-started' },
      { id:'logo-refinement', label:'Logo refinement', weight:12, estimatedHours:5, status:'not-started' },
      { id:'logo-review', label:'Internal logo review', weight:5, estimatedHours:1, status:'not-started' },
      { id:'logo-presentation', label:'Client logo presentation', weight:5, estimatedHours:2, status:'not-started' },
    ],
    deliverables:[{id:'logo-master', label:'Master logo system'}],
    dependencies:[{id:'core-direction', label:'Approved creative direction'}],
  },
  businessCard: {
    id:'businessCard',
    steps:[
      { id:'card-content', label:'Confirm business card content', weight:2, estimatedHours:0.5, status:'not-started' },
      { id:'card-design', label:'Business card design', weight:5, estimatedHours:2, status:'not-started' },
      { id:'card-preflight', label:'Business card print preflight', weight:2, estimatedHours:0.5, status:'not-started' },
    ],
    deliverables:[{id:'card-final', label:'Business card — print ready'}],
    dependencies:[{id:'logo-approved', label:'Approved logo system'}],
  },
  letterhead: {
    id:'letterhead',
    steps:[
      { id:'stationery-data', label:'Confirm stationery information', weight:2, estimatedHours:0.5, status:'not-started' },
      { id:'letterhead-design', label:'Letterhead design', weight:4, estimatedHours:1.5, status:'not-started' },
      { id:'letterhead-preflight', label:'Letterhead preflight', weight:2, estimatedHours:0.5, status:'not-started' },
    ],
    deliverables:[{id:'letterhead-final', label:'Letterhead — print ready'}],
    dependencies:[{id:'logo-approved', label:'Approved logo system'}],
  },
  socialKit: {
    id:'socialKit',
    steps:[
      { id:'social-specs', label:'Confirm selected social channels', weight:2, estimatedHours:0.5, status:'not-started' },
      { id:'social-system', label:'Develop social visual system', weight:6, estimatedHours:3, status:'not-started' },
      { id:'social-exports', label:'Prepare social exports', weight:3, estimatedHours:1, status:'not-started' },
    ],
    deliverables:[{id:'social-final', label:'Social media kit'}],
    dependencies:[{id:'logo-approved', label:'Approved logo system'}],
  },
  packaging: {
    id:'packaging',
    steps:[
      { id:'packaging-audit', label:'Packaging technical audit', weight:5, estimatedHours:2, status:'not-started' },
      { id:'packaging-design', label:'Packaging design', weight:12, estimatedHours:6, status:'not-started' },
      { id:'packaging-proof', label:'Packaging proof & preflight', weight:4, estimatedHours:2, status:'not-started' },
    ],
    deliverables:[{id:'packaging-final', label:'Packaging production files'}],
    dependencies:[{id:'logo-approved', label:'Approved identity direction'}],
  }
};

export const assets = [
  { id:'logo', name:'Logo System', price:70000, pricingMode:'fixed', standardId:'logoSystem', required:true, guidelineEligible:true, description:'Primary mark, responsive variations and export suite.' },
  { id:'business-card', name:'Business Card', price:20000, pricingMode:'fixed', standardId:'businessCard', guidelineEligible:true, description:'Front/back branded card with print-ready output.' },
  { id:'letterhead', name:'Letterhead', price:15000, pricingMode:'fixed', standardId:'letterhead', guidelineEligible:true, description:'Digital + print letterhead system.' },
  { id:'social-kit', name:'Social Media Kit', price:40000, pricingMode:'fixed', standardId:'socialKit', guidelineEligible:true, description:'Selected platform assets and reusable templates.' },
  { id:'packaging', name:'Packaging', startingPrice:50000, pricingMode:'starting', standardId:'packaging', guidelineEligible:true, description:'Packaging direction; final quote depends on format and complexity.' },
  { id:'signage', name:'Signage System', price:35000, pricingMode:'fixed', standardId:'businessCard', guidelineEligible:true, description:'Core branded signage applications.' },
  { id:'id-card', name:'ID Card', price:15000, pricingMode:'fixed', standardId:'businessCard', guidelineEligible:true, description:'Employee identity card design system.' },
];

export const projects = [
  { id:'WS-0042', name:'Aurasol Identity Refresh', client:'Aurasol Diffusers', type:'Brand Identity', progress:74, deadline:new Date(Date.now()+3*864e5).toISOString(), status:'client-review', balance:30000, clientApproved:false, deliverablesComplete:false, blockedReason:'', manager:'Wisdom', team:['Wisdom','Ada'], next:'Review moodboard feedback' },
  { id:'WS-0041', name:'Conference Campaign', client:'RevivalHub International', type:'Continuous Graphics', progress:86, deadline:new Date(Date.now()+1*864e5).toISOString(), status:'production', balance:0, clientApproved:false, deliverablesComplete:false, blockedReason:'Awaiting final minister photograph', manager:'Ada', team:['Ada','Wisdom'], next:'Resume countdown graphics' },
  { id:'WS-0038', name:'The Main Dream Campaign', client:'TMD', type:'Campaign System', progress:96, deadline:new Date(Date.now()+5*864e5).toISOString(), status:'approved', balance:20000, clientApproved:true, deliverablesComplete:true, blockedReason:'', manager:'Wisdom', team:['Wisdom'], next:'Record balance and release finals' },
];

export const workers = [
  { id:'w1', name:'Wisdom', role:'Owner / Creative Director', active:4, done:18, total:23, overdue:1, status:'Reviewing brand direction' },
  { id:'w2', name:'Ada', role:'Designer', active:3, done:12, total:15, overdue:0, status:'Working on conference campaign' },
  { id:'w3', name:'Emmanuel', role:'Designer', active:2, done:5, total:12, overdue:3, status:'Preparing social kit' },
];
