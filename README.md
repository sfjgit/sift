# SFJBS CRM — frontend

Next.js 16 (App Router) · React 19 · Tailwind v4 · shadcn/radix · TanStack Query + Table · recharts · driver.js.
Talks to `crm-core-service` through the gateway (`NEXT_PUBLIC_API_URL`, proxied same-origin at `/api/proxy/core/api`).

```bash
npm install
npm run dev          # http://localhost:3000
npm run check-types  # tsc --noEmit
npm run check-lint
```

## Where things live

| Path | What |
|---|---|
| `src/app/page.tsx`, `src/app/sign-in` | Public landing, sign-in / forgot / reset (`?token=`) |
| `src/app/(app)/*` | Authenticated pages inside the shell (dashboard, clients, spocs, reports, admin, help, settings…) |
| `src/components/shell` | Sidebar, top bar, ⌘K command palette, notifications, help & account menus, shortcuts |
| `src/components/data-table` | **The** table: server paging/sort/filters, saved views, column chooser, density, bulk bar, export, URL state |
| `src/components/charts` | Chart kit (validated colour order, mark specs, tooltips, legends) |
| `src/components/forms`, `pickers` | RHF + zod field bindings, `FormDialog`, Combobox + Lookup/Master/User/Client pickers |
| `src/lib/api` | `client.ts` (axios, single-flight refresh, `ApiError`), `resource.ts` (`createResource`), `endpoints.ts` (every call) |
| `src/hooks/queries.ts` | react-query hooks per resource (`clientHooks.useList(params)` …) |
| `src/features/*` | Domain UI: clients, spocs, reports, activity, auth (`usePermissions`, `Can`, `RequirePermission`), tour, help |
| `src/config/permissions.ts` | Copy of the backend permission registry — keep in sync |

## Patterns

**A new list page** = `useTableState(id, filterKeys, defaults)` + `xHooks.useList(table.params)` + `<DataTable … />`
with column defs (`meta.sortKey` makes a column sortable, `meta.defaultHidden`, `meta.exportValue`) and `FilterDef[]`.
See `src/app/(app)/clients/page.tsx`.

**A new endpoint** = add it to `src/lib/api/endpoints.ts` (CRUD collections: `createResource<List, Detail, Create, Update>(key, path)`),
then `createResourceHooks(resource, { singular })` or `useAction(fn, { success, invalidate })` for one-off mutations.

**Permissions** are UI hints only — `can('spocs.assign')`, `<Can perm=…>`, `<RequirePermission perm=…>`. The API enforces.

**Tours**: add steps to `src/features/tour/tours/catalog.ts`, register in `tours/index.ts`, mark targets with
`{...tourTarget('key')}`, and call `useTour(tour, { ready })` in the page. Help → "Tour this page" picks the tour by route.

**Charts**: categorical colours are `--chart-1..8` in a fixed, CVD-validated order — never cycle them; state
(Ready / Review / Not usable, email status, client status) uses the status colours.
