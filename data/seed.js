export const BRAND = {
  name: 'StudioDesk',
  studio: 'Wiscode Studio',
  registeredCompany: 'Wiscode Innovations Limited',
  navy: '#252E3D',
  mint: '#66FECB',
  font: 'Space Grotesk',
};

export const PROJECT_TYPES = [
  { id:'single_graphic', label:'Single Graphic', description:'One-off flyer, poster, cover, social graphic or similar deliverable.' },
  { id:'continuous_graphics', label:'Continuous Graphics', description:'Recurring or campaign-based graphic production.' },
  { id:'branding', label:'Branding / Identity', description:'Logo systems, brand identity and related branded assets.' },
  { id:'editorial', label:'Editorial / Publication', description:'Books, magazines, brochures, reports and editorial systems.' },
  { id:'campaign', label:'Campaign / Marketing', description:'Multi-asset campaigns and marketing creative systems.' },
  { id:'custom', label:'Custom Project', description:'Anything that does not fit a standard category.' },
];

export const COMMERCIAL_ROUTES = [
  { id:'external_quote', label:'Already quoted', description:'Use the agreed amount. Do not re-price the work inside StudioDesk.' },
  { id:'service_catalog', label:'Build from services', description:'Select services from the catalogue and calculate a quote.' },
  { id:'package_template', label:'Use package template', description:'Start from a reusable package and customize it.' },
  { id:'custom_contract', label:'Custom commercial deal', description:'Enter scope, value and payment milestones manually.' },
];

export const serviceCategories = [
  { id:'graphics', name:'Graphic Design', sortOrder:1 },
  { id:'branding', name:'Branding & Identity', sortOrder:2 },
  { id:'editorial', name:'Editorial & Publication', sortOrder:3 },
  { id:'campaign', name:'Campaign & Marketing', sortOrder:4 },
  { id:'custom', name:'Custom', sortOrder:99 },
];

export const services = [
  { id:'flyer-design', categoryId:'graphics', name:'Flyer / Poster Design', description:'Single promotional or event graphic.', pricingMode:'custom', price:0, published:false, workflowTemplateId:'singleGraphic' },
  { id:'social-design', categoryId:'graphics', name:'Social Media Graphic', description:'Single social creative or campaign unit.', pricingMode:'custom', price:0, published:false, workflowTemplateId:'singleGraphic' },
  { id:'book-cover', categoryId:'editorial', name:'Book Cover Design', description:'Front cover or complete wrap depending on scope.', pricingMode:'custom', price:0, published:false, workflowTemplateId:'editorialCover' },
  { id:'editorial-layout', categoryId:'editorial', name:'Editorial Layout', description:'Book, report, magazine or brochure layout.', pricingMode:'custom', price:0, published:false, workflowTemplateId:'editorialLayout' },
  { id:'logo-system', categoryId:'branding', name:'Logo System', description:'Primary mark, variations and export suite.', pricingMode:'custom', price:0, published:false, workflowTemplateId:'logoSystem', guidelineEligible:true },
  { id:'business-card', categoryId:'branding', name:'Business Card', description:'Front/back branded card with print-ready output.', pricingMode:'custom', price:0, published:false, workflowTemplateId:'brandAsset', guidelineEligible:true },
  { id:'letterhead', categoryId:'branding', name:'Letterhead', description:'Digital and print letterhead system.', pricingMode:'custom', price:0, published:false, workflowTemplateId:'brandAsset', guidelineEligible:true },
  { id:'social-kit', categoryId:'branding', name:'Social Media Kit', description:'Reusable branded social templates.', pricingMode:'custom', price:0, published:false, workflowTemplateId:'brandAsset', guidelineEligible:true },
  { id:'packaging', categoryId:'branding', name:'Packaging Design', description:'Packaging direction and production artwork.', pricingMode:'custom', price:0, published:false, workflowTemplateId:'packaging', guidelineEligible:true },
];

export const workflowTemplates = {
  singleGraphic: {
    id:'singleGraphic', name:'Single Graphic',
    steps:[
      ['brief','Confirm brief & content',1],['references','Research / references',1],['concept','Design concept',3],['internal-review','Internal review',1],['client-preview','Protected client preview',1],['revision','Revisions if required',2],['qa','Final QA',1],['release','Final delivery release',1],
    ]
  },
  logoSystem: {
    id:'logoSystem', name:'Logo System',
    steps:[
      ['brief','Brand discovery / brief',1],['research','Research',2],['moodboard','Moodboard & direction',2],['concepts','Logo concept exploration',5],['internal-review','Internal review',1],['presentation','Protected client presentation',2],['refinement','Refinement',3],['qa','Identity QA',1],['release','Final logo package',1],
    ]
  },
  brandAsset: {
    id:'brandAsset', name:'Brand Asset',
    steps:[['content','Confirm asset content/specs',1],['design','Design asset',2],['internal-review','Internal review',1],['client-preview','Protected client preview',1],['preflight','Production preflight',1],['release','Final release',1]]
  },
  editorialCover: {
    id:'editorialCover', name:'Editorial Cover',
    steps:[['brief','Confirm manuscript / cover brief',1],['research','Research & visual direction',2],['concept','Cover concept',4],['review','Internal review',1],['preview','Protected client preview',1],['revision','Revision',2],['preflight','Print/digital preflight',1],['release','Final cover files',1]]
  },
  editorialLayout: {
    id:'editorialLayout', name:'Editorial Layout',
    steps:[['content-audit','Content audit',2],['style-system','Editorial style system',3],['layout','Layout production',6],['proof','Proof review',2],['corrections','Corrections',3],['preflight','Preflight',2],['release','Final publication files',1]]
  },
  packaging: {
    id:'packaging', name:'Packaging',
    steps:[['technical-audit','Packaging technical audit',2],['research','Category research',2],['direction','Visual direction',2],['design','Packaging design',6],['proof','Proof & preflight',2],['release','Production files',1]]
  },
};

export const packageTemplates = [
  { id:'starter-brand', name:'Starter Brand Package', description:'Example template — edit or archive before publishing.', serviceIds:['logo-system','business-card','letterhead'], pricingMode:'calculated', customPrice:0, published:false },
];

export const foundationSteps = [];
export const standards = workflowTemplates;
export const assets = services;

export const onboardingByRole = {
  owner:[
    ['command','Command Centre','See pending approvals, money, deadlines and project risks.'],
    ['projects','Projects','Create work independently of packages, then attach services, tasks, contracts and moodboards.'],
    ['team','Team & approvals','Approve new accounts, assign roles and manage worker profiles.'],
    ['finance','Finance','Track contract value, invoices, payments and verification.'],
    ['more','More','Services, templates, contracts, portfolio, Academy and Settings live here.'],
  ],
  worker:[
    ['work','My Work','Only authorized assignments and projects appear here.'],
    ['tasks','Tasks','Update progress, blockers and submissions from assigned tasks.'],
    ['portfolio','Portfolio','Completed contributions can feed your private work history.'],
  ],
  client:[
    ['project','My Projects','Follow approved progress and milestones.'],
    ['reviews','Reviews','View protected previews and approve or request changes.'],
    ['billing','Billing','See invoices, contract milestones and verified payments.'],
  ],
};
