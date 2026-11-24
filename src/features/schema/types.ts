// File: types.ts
// Path: src/features/schema/types.ts
// GET /api/schema-map (crm-core-service src/routes/schema.routes.ts)

export interface SchemaField {
  name: string;
  type: string;
  list: boolean;
  optional: boolean;
  id: boolean;
  unique: boolean;
  relation?: { to: string; name?: string; fields?: string[]; onDelete?: string };
  default?: string;
  comment?: string;
}
export interface SchemaModel {
  name: string;
  fields: SchemaField[];
  constraints: string[];
  doc?: string;
}
export interface SchemaDomain {
  key: string;
  label: string;
  color: string;
  col: number;
  row: number;
  what: string;
  models: string[];
}
export interface SchemaChange {
  ref: string;
  at: string;
  author: string;
  message: string;
  hash: string;
  tables: number;
  addedModels: string[];
  removedModels: string[];
  fieldChanges: { model: string; added: string[]; removed: string[]; changed: string[] }[];
  enumChanges: string[];
}
export interface SchemaMap {
  graph: {
    models: SchemaModel[];
    enums: { name: string; values: string[] }[];
    links: { from: string; to: string; field: string; optional: boolean }[];
  };
  domains: SchemaDomain[];
  modelNotes: Record<string, { what: string; why: string }>;
  fieldNotes: Record<string, string>;
  history: SchemaChange[];
}
