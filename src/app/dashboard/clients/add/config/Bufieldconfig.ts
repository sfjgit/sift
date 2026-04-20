// ─────────────────────────────────────────────────────────────────────────────
// BU-DRIVEN FIELD CONFIG
//
// Each business unit category has its own set of visible fields, required
// overrides, and 3-column layout ordering. This is the single source of truth
// — no scattered ifs in components.
//
// Screenshots analysed:
//   Image 1 → B2I / B2C BU (has Fax, Child Clients, Federal ID, VMS Name, Markup)
//   Image 2 → B2G BU        (same as B2I/B2C)
//   Image 3 → CSR BU        (same as B2I/B2C)
//   Image 4 → KaaS BU       (no Fax, no Child Clients, no Federal ID, has About Company)
//   Image 5 → OEM BU        (has Fax, Child Clients, Federal ID, VMS Name)
//   Image 6 → TaaS BU       (no Fax, no Federal ID, no Child Clients, has About Company)
// ─────────────────────────────────────────────────────────────────────────────

export type FieldKey =
  | 'primaryBusinessUnit'
  | 'clientVisibility'
  | 'businessUnits'
  | 'clientName'
  | 'vmsName'
  | 'federalId'
  | 'contactNumber'
  | 'emailId'
  | 'address'
  | 'childClients'
  | 'notifyLocation'
  | 'country'
  | 'state'
  | 'city'
  | 'postalCode'
  | 'website'
  | 'sendRequirement'
  | 'sendHotlist'
  | 'fax'
  | 'industry'
  | 'status'
  | 'category'
  | 'primaryOwner'
  | 'ownership'
  | 'allowAccessAll'
  | 'clientLead'
  | 'requiredDocs'
  | 'displayOnJob'
  | 'paymentTerms'
  | 'practice'
  | 'aboutCompany';

export interface FieldConfig {
  key: FieldKey;
  label: string;
  required?: boolean;
  type: 'text' | 'select' | 'checkbox' | 'toggle' | 'radio' | 'textarea' | 'multiselect';
  placeholder?: string;
  colSpan?: 1 | 2 | 3; // default 1 (of 3)
}

// Fields that are always shown regardless of BU
export const COMMON_FIELDS: FieldConfig[] = [
  { key: 'primaryBusinessUnit', label: 'Primary Business Unit', type: 'select' },
  { key: 'clientVisibility', label: 'Client Visibility', type: 'radio' },
  { key: 'businessUnits', label: 'Business Units', type: 'select' },
  {
    key: 'clientName',
    label: 'Client Name',
    type: 'text',
    required: true,
    placeholder: 'Required',
  },
  { key: 'country', label: 'Country', type: 'select', required: true },
  { key: 'state', label: 'State', type: 'select' },
  { key: 'city', label: 'City', type: 'text' },
  { key: 'postalCode', label: 'Postal Code', type: 'text' },
  { key: 'website', label: 'Website', type: 'text', required: true, placeholder: 'Required' },
  { key: 'sendRequirement', label: 'Send Requirement', type: 'checkbox' },
  { key: 'sendHotlist', label: 'Send Hotlist', type: 'checkbox' },
  { key: 'industry', label: 'Industry', type: 'select' },
  { key: 'status', label: 'Status', type: 'select', required: true },
  { key: 'category', label: 'Category', type: 'select' },
  { key: 'primaryOwner', label: 'Primary Owner', type: 'select' },
  { key: 'ownership', label: 'Ownership', type: 'select', required: true },
  { key: 'allowAccessAll', label: 'Allow Access to All users', type: 'checkbox' },
  { key: 'clientLead', label: 'Client Lead', type: 'select' },
  { key: 'requiredDocs', label: 'Required Documents for Submission', type: 'multiselect' },
  { key: 'displayOnJob', label: 'Display on Job', type: 'toggle' },
  { key: 'paymentTerms', label: 'Payment Terms', type: 'select' },
];

// ─────────────────────────────────────────
// BU CATEGORY TYPE
// Matches the `category` field on BusinessUnit
// ─────────────────────────────────────────
export type BUCategory = 'KaaS' | 'TaaS' | 'OEM' | 'CSR' | 'B2G' | 'B2I' | 'B2C' | 'DEFAULT';

// ─────────────────────────────────────────
// Per-BU EXTRA FIELDS (not in COMMON_FIELDS)
// ─────────────────────────────────────────
const FIELD_DEFS: Record<string, FieldConfig> = {
  vmsName: { key: 'vmsName', label: 'VMS Client Name', type: 'text' },
  federalId: { key: 'federalId', label: 'Federal ID', type: 'text' },
  address: { key: 'address', label: 'Address', type: 'text' },
  contactNumber: { key: 'contactNumber', label: 'Contact Number', type: 'text' },
  emailId: { key: 'emailId', label: 'Email ID', type: 'text' },
  fax: { key: 'fax', label: 'Fax', type: 'text' },
  childClients: {
    key: 'childClients',
    label: 'Child Clients',
    type: 'select',
    placeholder: 'Select Child Client',
  },
  notifyLocation: {
    key: 'notifyLocation',
    label: 'Notify user if he/she is near by the client location (Mobile Only)',
    type: 'checkbox',
  },
  practice: { key: 'practice', label: 'Practice', type: 'select' },
  aboutCompany: { key: 'aboutCompany', label: 'About Company', type: 'textarea', colSpan: 3 },
};

// ─────────────────────────────────────────
// Layout: array of rows, each row = up to 3 FieldKeys
// This drives the 3-column grid layout per BU
// ─────────────────────────────────────────
export interface BUFieldLayout {
  extraFields: FieldConfig[];
  // Row-by-row layout: each sub-array is a row of [col1, col2, col3]
  // null means empty cell
  rows: (FieldKey | null)[][];
}

// ─────────────────────────────────────────
// B2I / B2C / B2G / CSR — the "classic" layout
// Images 1, 2, 3 show nearly identical layouts
// ─────────────────────────────────────────
const CLASSIC_LAYOUT: BUFieldLayout = {
  extraFields: [
    FIELD_DEFS.vmsName,
    FIELD_DEFS.federalId,
    FIELD_DEFS.contactNumber,
    FIELD_DEFS.emailId,
    FIELD_DEFS.address,
    FIELD_DEFS.childClients,
    FIELD_DEFS.notifyLocation,
    FIELD_DEFS.fax,
    FIELD_DEFS.practice,
  ],
  rows: [
    ['primaryBusinessUnit', 'clientVisibility', 'businessUnits'],
    ['clientName', 'vmsName', 'federalId'],
    ['contactNumber', 'emailId', 'address'],
    ['childClients', 'notifyLocation', 'country'],
    ['state', 'city', 'postalCode'],
    ['website', 'sendRequirement', 'sendHotlist'],
    ['fax', 'industry', 'status'],
    ['category', 'primaryOwner', 'ownership'],
    [null, 'allowAccessAll', null],
    ['clientLead', 'requiredDocs', 'displayOnJob'],
    ['paymentTerms', 'practice', null],
  ],
};

// ─────────────────────────────────────────
// KaaS — Image 4
// Has: About Company editor, no Fax, no FederalId, no ChildClients
// Fields reordered vs classic
// ─────────────────────────────────────────
const KAAS_LAYOUT: BUFieldLayout = {
  extraFields: [FIELD_DEFS.address, FIELD_DEFS.aboutCompany],
  rows: [
    ['primaryBusinessUnit', 'clientVisibility', 'businessUnits'],
    ['clientName', 'contactNumber', 'emailId'],
    ['address', 'country', 'state'],
    ['city', 'postalCode', 'website'],
    ['sendRequirement', 'sendHotlist', null],
    ['industry', 'status', 'category'],
    ['primaryOwner', 'ownership', null],
    [null, 'allowAccessAll', null],
    ['clientLead', 'requiredDocs', 'displayOnJob'],
    ['paymentTerms', null, null],
    ['aboutCompany', null, null],
  ],
};

// ─────────────────────────────────────────
// TaaS — Image 6
// Has: About Company, no Fax, no FederalId
// Has VMS Name, Contact Number, Email ID, Child Clients removed
// Slightly different order
// ─────────────────────────────────────────
const TAAS_LAYOUT: BUFieldLayout = {
  extraFields: [
    FIELD_DEFS.vmsName,
    FIELD_DEFS.contactNumber,
    FIELD_DEFS.emailId,
    FIELD_DEFS.address,
    FIELD_DEFS.childClients,
    FIELD_DEFS.notifyLocation,
    FIELD_DEFS.aboutCompany,
  ],
  rows: [
    ['primaryBusinessUnit', 'clientVisibility', 'businessUnits'],
    ['clientName', 'vmsName', 'contactNumber'],
    ['emailId', 'address', 'childClients'],
    [null, 'notifyLocation', 'country'],
    ['state', 'city', 'postalCode'], // Karnataka prefilled
    [null, null, 'website'],
    ['sendRequirement', 'sendHotlist', null],
    ['industry', 'status', 'category'],
    ['primaryOwner', 'ownership', null],
    [null, 'allowAccessAll', null],
    ['clientLead', 'requiredDocs', 'displayOnJob'],
    ['paymentTerms', null, null],
    ['aboutCompany', null, null],
  ],
};

// ─────────────────────────────────────────
// OEM — Image 5
// Has Fax, VMS, FederalID, Child Clients, no About Company
// ─────────────────────────────────────────
const OEM_LAYOUT: BUFieldLayout = {
  extraFields: [
    FIELD_DEFS.vmsName,
    FIELD_DEFS.federalId,
    FIELD_DEFS.contactNumber,
    FIELD_DEFS.emailId,
    FIELD_DEFS.address,
    FIELD_DEFS.childClients,
    FIELD_DEFS.notifyLocation,
    FIELD_DEFS.fax,
    FIELD_DEFS.practice,
  ],
  rows: [...CLASSIC_LAYOUT.rows], // identical to classic
};

// ─────────────────────────────────────────
// DEFAULT fallback
// ─────────────────────────────────────────
const DEFAULT_LAYOUT: BUFieldLayout = {
  extraFields: [
    FIELD_DEFS.vmsName,
    FIELD_DEFS.contactNumber,
    FIELD_DEFS.emailId,
    FIELD_DEFS.address,
  ],
  rows: [
    ['primaryBusinessUnit', 'clientVisibility', 'businessUnits'],
    ['clientName', 'vmsName', 'contactNumber'],
    ['emailId', 'address', 'country'],
    ['state', 'city', 'postalCode'],
    ['website', 'sendRequirement', 'sendHotlist'],
    ['industry', 'status', 'category'],
    ['primaryOwner', 'ownership', null],
    [null, 'allowAccessAll', null],
    ['clientLead', 'requiredDocs', 'displayOnJob'],
    ['paymentTerms', null, null],
  ],
};

export const BU_LAYOUT_MAP: Record<BUCategory, BUFieldLayout> = {
  KaaS: KAAS_LAYOUT,
  TaaS: TAAS_LAYOUT,
  OEM: OEM_LAYOUT,
  CSR: CLASSIC_LAYOUT,
  B2G: CLASSIC_LAYOUT,
  B2I: CLASSIC_LAYOUT,
  B2C: CLASSIC_LAYOUT,
  DEFAULT: DEFAULT_LAYOUT,
};

export function getLayoutForBU(category?: string | null): BUFieldLayout {
  if (!category) return BU_LAYOUT_MAP.DEFAULT;
  return BU_LAYOUT_MAP[category as BUCategory] ?? BU_LAYOUT_MAP.DEFAULT;
}

// All field metadata merged (common + extra) — used for label/type lookup
export const ALL_FIELD_DEFS: Record<FieldKey, FieldConfig> = {
  ...Object.fromEntries(COMMON_FIELDS.map(f => [f.key, f])),
  ...FIELD_DEFS,
} as Record<FieldKey, FieldConfig>;
