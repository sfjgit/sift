"use client";

import { useState } from "react";

const SECTIONS = [
  "Overview",
  "Architecture",
  "Auth Routes",
  "User Routes",
  "Role Routes",
  "Team Routes",
  "Business Unit Routes",
  "Client Routes",
  "Requirement Routes",
  "OrgFlow Routes",
  "Auto Routing Logic",
  "Audit Log",
];

const content: Record<string, React.ReactNode> = {
  Overview: (
    <div className="space-y-8">
      <div>
        <div className="tag">Service</div>
        <h2 className="heading">Core Service</h2>
        <p className="sub">
          The backbone of the entire ATS. Handles identity, org structure, clients, and
          requirements. Every other service depends on this one.
        </p>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-label">Port</div>
          <div className="card-value">4001</div>
        </div>
        <div className="card">
          <div className="card-label">Database</div>
          <div className="card-value">ats_core_db</div>
        </div>
        <div className="card">
          <div className="card-label">Stack</div>
          <div className="card-value">Node · Express · Prisma · PostgreSQL</div>
        </div>
        <div className="card">
          <div className="card-label">Owner</div>
          <div className="card-value">Binta</div>
        </div>
      </div>

      <div>
        <div className="section-label">What this service owns</div>
        <div className="list-items">
          {[
            "Auth — login, register, refresh, logout",
            "Users — profiles, hierarchy, reporting structure",
            "Roles — DB-driven roles with per-module permissions",
            "Teams — free-flow naming, parent/child hierarchy",
            "Business Units — sub-BU support, team and client grouping",
            "Clients — sales creates, admin approves, SPOC management",
            "Requirements — job requirements with full lifecycle tracking",
            "OrgFlow — visual flow graph of entire org structure",
            "AuditLog — every action logged with before/after data",
          ].map((item) => (
            <div className="list-item" key={item}>
              <span className="dot" />
              {item}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="section-label">What other services get from this</div>
        <div className="code-block">
          {`// JWT payload — available in every service
{
  userId: "uuid",
  email: "ritu@sfjbs.com",
  role: "KAAS_TECHNICAL_RECRUITER"
}

// Other services NEVER query Core DB directly
// They use userId from JWT + call Core API if they need profile data`}
        </div>
      </div>
    </div>
  ),

  Architecture: (
    <div className="space-y-8">
      <div>
        <div className="tag">System Design</div>
        <h2 className="heading">How Core Service fits</h2>
      </div>

      <div>
        <div className="section-label">3 Service Architecture</div>
        <div className="code-block">
          {`Frontend (Next.js)
      │
      ├──► Core Service (4001)        ← THIS SERVICE
      │    Users, Roles, Teams, BUs
      │    Clients, Requirements
      │    Auth, OrgFlow, AuditLog
      │
      ├──► Recruitment Service (4002)
      │    Candidates, Pipeline
      │    Interviews, Offers, Reports
      │
      └──► Integration Service (4003)
           Naukri Extension API
           LinkedIn/Foundit Webhooks
           n8n Workflow Triggers`}
        </div>
      </div>

      <div>
        <div className="section-label">Requirement auto-routing flow</div>
        <div className="code-block">
          {`Sales raises Requirement for Oracle (KaaS client)
        ↓
System checks ClientTeamAssignment
Oracle is assigned to → KaaS Team A + KaaS Team B
        ↓
Requirement auto routed to BOTH teams
RequirementAssignment created for each
isAutoRouted = true, assignedBy = "SYSTEM"
        ↓
Team Lead A sees it → assigns to Ritu (2 openings) + Sonali (3 openings)
Team Lead B sees it → assigns to his team
        ↓
filledOpenings tracked per assignment
When total filledOpenings = totalOpenings → Requirement auto CLOSED`}
        </div>
      </div>

      <div>
        <div className="section-label">Folder structure</div>
        <div className="code-block">
          {`core-service/
├── src/
│   ├── index.ts
│   ├── app.ts
│   ├── config/
│   │   └── prisma.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   └── validate.middleware.ts
│   ├── utils/
│   │   ├── jwt.ts
│   │   ├── reqCode.ts       ← generates SFJ-R-10001
│   │   └── audit.ts         ← helper to write audit logs
│   ├── validators/
│   │   ├── auth.validator.ts
│   │   ├── user.validator.ts
│   │   ├── client.validator.ts
│   │   └── requirement.validator.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── role.controller.ts
│   │   ├── team.controller.ts
│   │   ├── bu.controller.ts
│   │   ├── client.controller.ts
│   │   ├── requirement.controller.ts
│   │   └── orgflow.controller.ts
│   └── routes/
│       ├── auth.routes.ts
│       ├── user.routes.ts
│       ├── role.routes.ts
│       ├── team.routes.ts
│       ├── bu.routes.ts
│       ├── client.routes.ts
│       ├── requirement.routes.ts
│       └── orgflow.routes.ts
├── prisma/
│   └── schema.prisma
├── .env
└── package.json`}
        </div>
      </div>
    </div>
  ),

  "Auth Routes": (
    <div className="space-y-8">
      <div>
        <div className="tag">Module</div>
        <h2 className="heading">Auth Routes</h2>
        <p className="sub">Login, token management, password recovery by admin.</p>
      </div>

      <RouteTable
        routes={[
          {
            method: "POST",
            path: "/api/auth/register",
            access: "Super Admin only",
            desc: "Create a new user. Only super admin can create users.",
            body: `{ email, password, role, firstName, lastName }`,
            response: `{ id, email, role, createdAt }`,
          },
          {
            method: "POST",
            path: "/api/auth/login",
            access: "Public",
            desc: "Login with email and password. Returns access + refresh token.",
            body: `{ email, password }`,
            response: `{ accessToken, refreshToken, user: { id, email, role } }`,
          },
          {
            method: "POST",
            path: "/api/auth/refresh",
            access: "Public",
            desc: "Rotate refresh token. Old token deleted, new pair issued.",
            body: `{ refreshToken }`,
            response: `{ accessToken, refreshToken }`,
          },
          {
            method: "POST",
            path: "/api/auth/logout",
            access: "Public",
            desc: "Revoke refresh token from DB.",
            body: `{ refreshToken }`,
            response: `{ success: true }`,
          },
          {
            method: "GET",
            path: "/api/auth/verify",
            access: "Any authenticated",
            desc: "Internal route. Other services call this to verify a token.",
            body: `Bearer token in header`,
            response: `{ userId, email, role }`,
          },
          {
            method: "PATCH",
            path: "/api/auth/reset-password/:userId",
            access: "Super Admin only",
            desc: "Admin resets any user password. Stores plain for recovery.",
            body: `{ newPassword }`,
            response: `{ success: true }`,
          },
          {
            method: "GET",
            path: "/api/auth/user-credentials/:userId",
            access: "Super Admin only",
            desc: "Admin views stored plain password for a user.",
            body: `-`,
            response: `{ email, passwordPlain }`,
          },
        ]}
      />
    </div>
  ),

  "User Routes": (
    <div className="space-y-8">
      <div>
        <div className="tag">Module</div>
        <h2 className="heading">User Routes</h2>
        <p className="sub">
          User profiles, hierarchy management. Only super admin creates users.
        </p>
      </div>

      <RouteTable
        routes={[
          {
            method: "GET",
            path: "/api/users",
            access: "Admin",
            desc: "List all users. Supports filters: role, teamId, buId, isActive.",
            body: `Query: ?role=TEAM_LEAD&buId=xxx`,
            response: `[{ id, firstName, lastName, role, team, businessUnit }]`,
          },
          {
            method: "GET",
            path: "/api/users/:id",
            access: "Admin or self",
            desc: "Get single user profile with team, BU, reporting chain.",
            body: `-`,
            response: `{ id, firstName, ..., team, businessUnit, reportingTo }`,
          },
          {
            method: "PATCH",
            path: "/api/users/:id",
            access: "Admin",
            desc: "Update user profile fields. Cannot change role here — use role routes.",
            body: `{ firstName, phone, workingLocation, timezone, ... }`,
            response: `{ updated user }`,
          },
          {
            method: "PATCH",
            path: "/api/users/:id/deactivate",
            access: "Admin",
            desc: "Deactivate user. Does not delete.",
            body: `-`,
            response: `{ success: true }`,
          },
          {
            method: "PATCH",
            path: "/api/users/:id/reporting-to",
            access: "Admin",
            desc: "Set who this user reports to. Builds the org hierarchy.",
            body: `{ reportingToId }`,
            response: `{ updated user }`,
          },
          {
            method: "GET",
            path: "/api/users/:id/subordinates",
            access: "Admin or the user themselves",
            desc: "Get all users reporting to this person. Recursive down the chain.",
            body: `-`,
            response: `[{ id, firstName, lastName, role }]`,
          },
        ]}
      />

      <div>
        <div className="section-label">Example — set reporting hierarchy</div>
        <div className="code-block">
          {`// Papitha reports to KaaS Delivery Manager
PATCH /api/users/papitha-uuid/reporting-to
{ "reportingToId": "kdm-uuid" }

// Ritu reports to Papitha
PATCH /api/users/ritu-uuid/reporting-to
{ "reportingToId": "papitha-uuid" }

// Now GET /api/users/kdm-uuid/subordinates
// Returns → Papitha → [Ritu, Sonali, Madhavi...]`}
        </div>
      </div>
    </div>
  ),

  "Role Routes": (
    <div className="space-y-8">
      <div>
        <div className="tag">Module</div>
        <h2 className="heading">Role Routes</h2>
        <p className="sub">
          Roles stored in DB. Admin creates roles and sets permissions per module.
        </p>
      </div>

      <RouteTable
        routes={[
          {
            method: "GET",
            path: "/api/roles",
            access: "Admin",
            desc: "List all roles with their permissions.",
            body: `-`,
            response: `[{ id, name, permissions: [...] }]`,
          },
          {
            method: "POST",
            path: "/api/roles",
            access: "Super Admin",
            desc: "Create a new role.",
            body: `{ name, description }`,
            response: `{ id, name }`,
          },
          {
            method: "DELETE",
            path: "/api/roles/:id",
            access: "Super Admin",
            desc: "Delete role. Cannot delete if isSystem = true.",
            body: `-`,
            response: `{ success: true }`,
          },
          {
            method: "PUT",
            path: "/api/roles/:id/permissions",
            access: "Super Admin",
            desc: "Set permissions for a role across all modules.",
            body: `[{ module, canView, canAdd, canEdit, canDelete, scope }]`,
            response: `{ updated permissions }`,
          },
          {
            method: "PATCH",
            path: "/api/users/:id/role",
            access: "Super Admin",
            desc: "Change a user's role.",
            body: `{ roleId }`,
            response: `{ updated user }`,
          },
        ]}
      />

      <div>
        <div className="section-label">Example — set KaaS recruiter permissions</div>
        <div className="code-block">
          {`PUT /api/roles/kaas-recruiter-role-id/permissions
[
  { "module": "requirements", "canView": true, "canAdd": false, "canEdit": false, "canDelete": false, "scope": "TEAM" },
  { "module": "clients",      "canView": true, "canAdd": false, "canEdit": false, "canDelete": false, "scope": "TEAM" },
  { "module": "reports",      "canView": true, "canAdd": false, "canEdit": false, "canDelete": false, "scope": "OWN"  },
  { "module": "users",        "canView": false,"canAdd": false, "canEdit": false, "canDelete": false, "scope": "OWN"  }
]`}
        </div>
      </div>
    </div>
  ),

  "Team Routes": (
    <div className="space-y-8">
      <div>
        <div className="tag">Module</div>
        <h2 className="heading">Team Routes</h2>
        <p className="sub">
          Teams are free-flow. Admin names them anything. Members can be in multiple teams.
        </p>
      </div>

      <RouteTable
        routes={[
          {
            method: "GET",
            path: "/api/teams",
            access: "Admin",
            desc: "List all teams. Filter by buId, category, isActive.",
            body: `Query: ?buId=xxx&category=KaaS`,
            response: `[{ id, name, category, members, businessUnit }]`,
          },
          {
            method: "POST",
            path: "/api/teams",
            access: "Admin",
            desc: "Create a team.",
            body: `{ name, description, category, businessUnitId, parentTeamId?, dataPolicy }`,
            response: `{ id, name }`,
          },
          {
            method: "PATCH",
            path: "/api/teams/:id",
            access: "Admin",
            desc: "Update team details.",
            body: `{ name, category, dataPolicy, ... }`,
            response: `{ updated team }`,
          },
          {
            method: "POST",
            path: "/api/teams/:id/members",
            access: "Admin",
            desc: "Add a user to a team with a role.",
            body: `{ userId, teamRole }`,
            response: `{ TeamMember }`,
          },
          {
            method: "DELETE",
            path: "/api/teams/:id/members/:userId",
            access: "Admin",
            desc: "Remove a user from a team.",
            body: `-`,
            response: `{ success: true }`,
          },
          {
            method: "GET",
            path: "/api/teams/:id/members",
            access: "Admin or TL of that team",
            desc: "List all members of a team.",
            body: `-`,
            response: `[{ userId, user, teamRole, joinedAt }]`,
          },
        ]}
      />

      <div>
        <div className="section-label">Example — create Papithas team</div>
        <div className="code-block">
          {`POST /api/teams
{
  "name": "Papitha's Team",
  "category": "KaaS",
  "businessUnitId": "kaas-bu-uuid",
  "dataPolicy": "SHARED"
}

// Add Papitha as Lead
POST /api/teams/team-uuid/members
{ "userId": "papitha-uuid", "teamRole": "LEAD" }

// Add Ritu as member
POST /api/teams/team-uuid/members
{ "userId": "ritu-uuid", "teamRole": "MEMBER" }`}
        </div>
      </div>
    </div>
  ),

  "Business Unit Routes": (
    <div className="space-y-8">
      <div>
        <div className="tag">Module</div>
        <h2 className="heading">Business Unit Routes</h2>
        <p className="sub">BUs can have sub-BUs. Teams and clients belong to BUs.</p>
      </div>

      <RouteTable
        routes={[
          {
            method: "GET",
            path: "/api/business-units",
            access: "Admin",
            desc: "List all BUs with their child BUs, teams, client count.",
            body: `-`,
            response: `[{ id, name, parentBU, childBUs, teams }]`,
          },
          {
            method: "POST",
            path: "/api/business-units",
            access: "Super Admin",
            desc: "Create a BU. Can set parentBUId to make it a sub-BU.",
            body: `{ name, parentBUId? }`,
            response: `{ id, name }`,
          },
          {
            method: "PATCH",
            path: "/api/business-units/:id",
            access: "Super Admin",
            desc: "Update BU name or parent.",
            body: `{ name?, parentBUId? }`,
            response: `{ updated BU }`,
          },
          {
            method: "GET",
            path: "/api/business-units/:id/tree",
            access: "Admin",
            desc: "Get full BU tree — all child BUs, teams, users under this BU.",
            body: `-`,
            response: `{ id, name, childBUs: [...], teams: [...], users: [...] }`,
          },
        ]}
      />
    </div>
  ),

  "Client Routes": (
    <div className="space-y-8">
      <div>
        <div className="tag">Module</div>
        <h2 className="heading">Client Routes</h2>
        <p className="sub">
          Sales creates client. Admin approves. Admin assigns teams. SPOC management.
        </p>
      </div>

      <RouteTable
        routes={[
          {
            method: "POST",
            path: "/api/clients",
            access: "CSM / BDM",
            desc: "Sales creates a client. Status starts as PENDING.",
            body: `{ name, vmsName, category, industry, website, country, state, city, businessUnitId }`,
            response: `{ id, name, status: PENDING }`,
          },
          {
            method: "GET",
            path: "/api/clients",
            access: "Role scoped",
            desc: "List clients. Admin sees all. Sales sees their own. DL sees their BU.",
            body: `Query: ?status=ACTIVE&category=KaaS&buId=xxx`,
            response: `[{ id, name, category, status, businessUnit, teamAssignments }]`,
          },
          {
            method: "GET",
            path: "/api/clients/:id",
            access: "Role scoped",
            desc: "Get full client with contacts, handlers, teams, requirements.",
            body: `-`,
            response: `{ id, name, contacts, handlers, teamAssignments, requirements }`,
          },
          {
            method: "PATCH",
            path: "/api/clients/:id/approve",
            access: "Admin only",
            desc: "Admin approves a pending client.",
            body: `-`,
            response: `{ status: ACTIVE, approvedBy, approvedAt }`,
          },
          {
            method: "POST",
            path: "/api/clients/:id/teams",
            access: "Admin",
            desc: "Assign a team to this client. Requirements will auto-route to this team.",
            body: `{ teamId }`,
            response: `{ ClientTeamAssignment }`,
          },
          {
            method: "DELETE",
            path: "/api/clients/:id/teams/:teamId",
            access: "Admin",
            desc: "Remove team from client.",
            body: `-`,
            response: `{ success: true }`,
          },
          {
            method: "POST",
            path: "/api/clients/:id/handlers",
            access: "Admin",
            desc: "Assign a user as client handler.",
            body: `{ userId, role }`,
            response: `{ ClientHandler }`,
          },
          {
            method: "POST",
            path: "/api/clients/:id/contacts",
            access: "Admin / CSM",
            desc: "Add a SPOC to the client.",
            body: `{ firstName, lastName, designation, email, phone, linkedinUrl, isPrimary }`,
            response: `{ ClientContact }`,
          },
          {
            method: "POST",
            path: "/api/clients/:id/contacts/:contactId/handlers",
            access: "Admin",
            desc: "Assign a user to handle a specific SPOC.",
            body: `{ userId }`,
            response: `{ ContactHandler }`,
          },
          {
            method: "POST",
            path: "/api/clients/:id/notes",
            access: "CSM / Admin",
            desc: "Add a note to the client.",
            body: `{ content }`,
            response: `{ ClientNote }`,
          },
        ]}
      />

      <div>
        <div className="section-label">Example — full client setup flow</div>
        <div className="code-block">
          {`// 1. Sales creates Oracle
POST /api/clients
{ "name": "Oracle", "category": "KaaS", "businessUnitId": "kaas-bu-uuid" }
// → status: PENDING

// 2. Admin approves
PATCH /api/clients/oracle-uuid/approve
// → status: ACTIVE

// 3. Admin assigns KaaS Team A and Team B
POST /api/clients/oracle-uuid/teams
{ "teamId": "kaas-team-a-uuid" }

POST /api/clients/oracle-uuid/teams
{ "teamId": "kaas-team-b-uuid" }

// Now any requirement raised for Oracle
// auto routes to BOTH teams`}
        </div>
      </div>
    </div>
  ),

  "Requirement Routes": (
    <div className="space-y-8">
      <div>
        <div className="tag">Module</div>
        <h2 className="heading">Requirement Routes</h2>
        <p className="sub">
          Full lifecycle. Sales raises → admin approves → auto routes to teams →
          TL assigns recruiters → openings tracked → auto closes.
        </p>
      </div>

      <RouteTable
        routes={[
          {
            method: "POST",
            path: "/api/requirements",
            access: "CSM / BDM / Admin",
            desc: "Raise a new requirement. reqCode auto generated. Status starts DRAFT.",
            body: `{ title, clientId, clientContactId, jobType, remoteType, totalOpenings, salaryMin, salaryMax, priority, location, startDate, respondBy }`,
            response: `{ id, reqCode, status: DRAFT }`,
          },
          {
            method: "GET",
            path: "/api/requirements",
            access: "Role scoped",
            desc: "List requirements. Sales sees their own. TL sees team's. Admin sees all.",
            body: `Query: ?status=ACTIVE&clientId=xxx&teamId=xxx`,
            response: `[{ id, reqCode, title, client, status, totalOpenings, filledOpenings }]`,
          },
          {
            method: "GET",
            path: "/api/requirements/:id",
            access: "Role scoped",
            desc: "Full requirement detail — assignments, documents, notes, status history.",
            body: `-`,
            response: `{ id, reqCode, client, assignments, documents, notes, statusHistory }`,
          },
          {
            method: "PATCH",
            path: "/api/requirements/:id/approve",
            access: "Admin only",
            desc: "Admin approves requirement. Status → ACTIVE. Auto routing triggers here.",
            body: `{ deliveryLeadId?, teamLeadId? }`,
            response: `{ status: ACTIVE, assignments created for each client team }`,
          },
          {
            method: "PATCH",
            path: "/api/requirements/:id/status",
            access: "Admin / DL",
            desc: "Change status. Every change logged in RequirementStatusHistory.",
            body: `{ status, reason? }`,
            response: `{ updated requirement, statusHistory entry }`,
          },
          {
            method: "POST",
            path: "/api/requirements/:id/assign",
            access: "TL / DL / Admin",
            desc: "Assign requirement to individual recruiter or entire team. Set opening split.",
            body: `{ assignmentType, recruiterId?, teamId?, allocatedOpenings? }`,
            response: `{ RequirementAssignment }`,
          },
          {
            method: "PATCH",
            path: "/api/requirements/:id/assignments/:assignmentId/fill",
            access: "TL / Admin",
            desc: "Mark openings as filled for an assignment. Auto closes req if total met.",
            body: `{ filledCount }`,
            response: `{ updated assignment, requirement status if closed }`,
          },
          {
            method: "POST",
            path: "/api/requirements/:id/documents",
            access: "Any assigned",
            desc: "Upload file or log event on requirement. Type: FILE_UPLOAD, NOTE, ISSUE_RAISED etc.",
            body: `{ type, fileName?, fileUrl?, content?, isIssue? }`,
            response: `{ RequirementDocument }`,
          },
          {
            method: "PATCH",
            path: "/api/requirements/:id/documents/:docId/resolve",
            access: "TL / Admin",
            desc: "Mark an issue as resolved.",
            body: `-`,
            response: `{ issueResolved: true, resolvedBy, resolvedAt }`,
          },
          {
            method: "POST",
            path: "/api/requirements/:id/notes",
            access: "Any assigned",
            desc: "Add a note to the requirement.",
            body: `{ content }`,
            response: `{ RequirementNote }`,
          },
          {
            method: "GET",
            path: "/api/requirements/:id/history",
            access: "Any assigned",
            desc: "Full status history of this requirement.",
            body: `-`,
            response: `[{ fromStatus, toStatus, changedBy, reason, changedAt }]`,
          },
        ]}
      />

      <div>
        <div className="section-label">Example — full requirement lifecycle</div>
        <div className="code-block">
          {`// 1. Sales raises requirement
POST /api/requirements
{
  "title": "Senior Java Developer",
  "clientId": "oracle-uuid",
  "jobType": "CONTRACT",
  "remoteType": "HYBRID",
  "totalOpenings": 5,
  "priority": "HIGH"
}
// → reqCode: SFJ-R-10042, status: DRAFT

// 2. Admin approves → auto routing fires
PATCH /api/requirements/req-uuid/approve
// System checks Oracle → has KaaS Team A + KaaS Team B
// Creates:
//   RequirementAssignment { teamId: kaas-team-a, isAutoRouted: true, assignedBy: "SYSTEM" }
//   RequirementAssignment { teamId: kaas-team-b, isAutoRouted: true, assignedBy: "SYSTEM" }

// 3. Papitha (TL of Team A) assigns to Ritu and Sonali
POST /api/requirements/req-uuid/assign
{ "assignmentType": "INDIVIDUAL", "recruiterId": "ritu-uuid", "allocatedOpenings": 2 }

POST /api/requirements/req-uuid/assign
{ "assignmentType": "INDIVIDUAL", "recruiterId": "sonali-uuid", "allocatedOpenings": 3 }

// 4. Ritu fills 1 opening
PATCH /api/requirements/req-uuid/assignments/ritu-assign-id/fill
{ "filledCount": 1 }
// filledOpenings on Requirement: 1 / 5

// 5. When all 5 filled → status auto → CLOSED
// RequirementDocument logged with type: REQUIREMENT_CLOSED`}
        </div>
      </div>
    </div>
  ),

  "OrgFlow Routes": (
    <div className="space-y-8">
      <div>
        <div className="tag">Module</div>
        <h2 className="heading">OrgFlow Routes</h2>
        <p className="sub">
          Every node and edge of the org stored here. Frontend renders as flowchart.
        </p>
      </div>

      <RouteTable
        routes={[
          {
            method: "GET",
            path: "/api/org-flow",
            access: "Admin",
            desc: "Get all flow nodes and edges. Frontend builds full org chart from this.",
            body: `Query: ?fromType=BUSINESS_UNIT&fromId=xxx`,
            response: `[{ fromType, fromId, fromLabel, toType, toId, toLabel, relation }]`,
          },
          {
            method: "POST",
            path: "/api/org-flow",
            access: "Admin",
            desc: "Create a flow edge. Usually auto created when teams/clients/users are assigned.",
            body: `{ fromType, fromId, fromLabel, toType, toId, toLabel, relation }`,
            response: `{ OrgFlow }`,
          },
          {
            method: "PATCH",
            path: "/api/org-flow/:id",
            access: "Admin",
            desc: "Update a flow edge — change relation or labels.",
            body: `{ relation?, fromLabel?, toLabel? }`,
            response: `{ updated OrgFlow }`,
          },
          {
            method: "DELETE",
            path: "/api/org-flow/:id",
            access: "Admin",
            desc: "Remove a flow edge.",
            body: `-`,
            response: `{ success: true }`,
          },
        ]}
      />

      <div>
        <div className="section-label">Example — what gets stored when Oracle is assigned to KaaS Team A</div>
        <div className="code-block">
          {`// Auto created on POST /api/clients/oracle-uuid/teams
{
  "fromType": "CLIENT",
  "fromId": "oracle-uuid",
  "fromLabel": "Oracle",
  "toType": "TEAM",
  "toId": "kaas-team-a-uuid",
  "toLabel": "Papitha's Team",
  "relation": "assigned_to"
}

// Auto created when BU owns a team
{
  "fromType": "BUSINESS_UNIT",
  "fromId": "kaas-bu-uuid",
  "fromLabel": "KaaS BU",
  "toType": "TEAM",
  "toId": "kaas-team-a-uuid",
  "toLabel": "Papitha's Team",
  "relation": "owns"
}`}
        </div>
      </div>
    </div>
  ),

  "Auto Routing Logic": (
    <div className="space-y-8">
      <div>
        <div className="tag">Backend Logic</div>
        <h2 className="heading">Auto Routing Logic</h2>
        <p className="sub">
          When admin approves a requirement this logic fires. Lives in requirement.controller.ts
        </p>
      </div>

      <div>
        <div className="section-label">Code — approveRequirement controller</div>
        <div className="code-block">
          {`// requirement.controller.ts

export const approveRequirement = async (req, res) => {
  const { id } = req.params;
  const { deliveryLeadId, teamLeadId } = req.body;
  const adminId = req.user.userId;

  // 1. Get requirement with client's team assignments
  const requirement = await prisma.requirement.findUnique({
    where: { id },
    include: {
      client: {
        include: { teamAssignments: true }
      }
    }
  });

  // 2. Approve the requirement
  await prisma.requirement.update({
    where: { id },
    data: {
      status: "ACTIVE",
      approvedBy: adminId,
      approvedAt: new Date(),
      deliveryLeadId,
      teamLeadId,
    }
  });

  // 3. Auto route to ALL teams assigned to this client
  const teamAssignments = requirement.client.teamAssignments;

  await prisma.requirementAssignment.createMany({
    data: teamAssignments.map((ta) => ({
      requirementId: id,
      assignmentType: "TEAM",
      teamId: ta.teamId,
      isAutoRouted: true,
      assignedBy: "SYSTEM",
    }))
  });

  // 4. Log status change
  await prisma.requirementStatusHistory.create({
    data: {
      requirementId: id,
      fromStatus: "PENDING_APPROVAL",
      toStatus: "ACTIVE",
      changedBy: adminId,
      reason: "Admin approved"
    }
  });

  // 5. Log in AuditLog
  await writeAuditLog({
    actorId: adminId,
    action: "APPROVE",
    module: "Requirement",
    recordId: id,
    req,
  });

  res.json({ success: true });
};`}
        </div>
      </div>

      <div>
        <div className="section-label">Code — fill openings + auto close</div>
        <div className="code-block">
          {`export const fillOpenings = async (req, res) => {
  const { id, assignmentId } = req.params;
  const { filledCount } = req.body;

  // Update this assignment's filled count
  const assignment = await prisma.requirementAssignment.update({
    where: { id: assignmentId },
    data: { filledOpenings: { increment: filledCount } }
  });

  // Update total filled on requirement
  const requirement = await prisma.requirement.update({
    where: { id },
    data: { filledOpenings: { increment: filledCount } },
  });

  // Auto close if all filled
  if (requirement.filledOpenings >= requirement.totalOpenings) {
    await prisma.requirement.update({
      where: { id },
      data: { status: "CLOSED", closedAt: new Date() }
    });

    await prisma.requirementDocument.create({
      data: {
        requirementId: id,
        type: "REQUIREMENT_CLOSED",
        content: \`All \${requirement.totalOpenings} positions filled. Auto closed.\`,
        raisedBy: "SYSTEM",
      }
    });
  }

  res.json({ success: true, requirement });
};`}
        </div>
      </div>
    </div>
  ),

  "Audit Log": (
    <div className="space-y-8">
      <div>
        <div className="tag">Module</div>
        <h2 className="heading">Audit Log</h2>
        <p className="sub">Every action logged. Admin can view full history of any record.</p>
      </div>

      <RouteTable
        routes={[
          {
            method: "GET",
            path: "/api/audit-logs",
            access: "Super Admin",
            desc: "List audit logs. Filter by module, actorId, action, date range.",
            body: `Query: ?module=Requirement&actorId=xxx&from=2026-01-01`,
            response: `[{ actorId, action, module, recordId, oldData, newData, ip, createdAt }]`,
          },
          {
            method: "GET",
            path: "/api/audit-logs/:recordId",
            access: "Admin",
            desc: "Full history of a specific record — all changes ever made to it.",
            body: `-`,
            response: `[{ action, oldData, newData, actorId, createdAt }]`,
          },
        ]}
      />

      <div>
        <div className="section-label">Audit helper — call this everywhere</div>
        <div className="code-block">
          {`// utils/audit.ts
export const writeAuditLog = async ({
  actorId,
  action,
  module,
  recordId,
  oldData,
  newData,
  req,
}: {
  actorId: string;
  action: string;
  module: string;
  recordId: string;
  oldData?: object;
  newData?: object;
  req: Request;
}) => {
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      module,
      recordId,
      oldData: oldData ?? undefined,
      newData: newData ?? undefined,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    },
  });
};

// Usage in any controller:
await writeAuditLog({
  actorId: req.user.userId,
  action: "UPDATE",
  module: "Client",
  recordId: client.id,
  oldData: existingClient,
  newData: updatedClient,
  req,
});`}
        </div>
      </div>
    </div>
  ),
};

function RouteTable({
  routes,
}: {
  routes: {
    method: string;
    path: string;
    access: string;
    desc: string;
    body: string;
    response: string;
  }[];
}) {
  const methodColor: Record<string, string> = {
    GET: "#22c55e",
    POST: "#3b82f6",
    PATCH: "#f59e0b",
    PUT: "#8b5cf6",
    DELETE: "#ef4444",
  };

  return (
    <div className="route-table">
      {routes.map((r, i) => (
        <div className="route-row" key={i}>
          <div className="route-top">
            <span
              className="method-badge"
              style={{ background: methodColor[r.method] + "22", color: methodColor[r.method] }}
            >
              {r.method}
            </span>
            <span className="route-path">{r.path}</span>
            <span className="route-access">{r.access}</span>
          </div>
          <div className="route-desc">{r.desc}</div>
          <div className="route-bottom">
            <div className="route-field">
              <span className="field-label">Body</span>
              <code className="field-code">{r.body}</code>
            </div>
            <div className="route-field">
              <span className="field-label">Response</span>
              <code className="field-code">{r.response}</code>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CoreServiceDocs() {
  const [active, setActive] = useState("Overview");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500&family=Bricolage+Grotesque:wght@300;400;500;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #0D0D0F;
          --surface: #141416;
          --border: #1f1f23;
          --border-bright: #2a2a30;
          --text: #e8e8ec;
          --muted: #5a5a6e;
          --accent: #6366f1;
          --accent-dim: #6366f122;
          --green: #22c55e;
          --blue: #3b82f6;
          --amber: #f59e0b;
          --red: #ef4444;
          --purple: #8b5cf6;
        }

        html, body { height: 100%; }

        body {
          font-family: 'Bricolage Grotesque', sans-serif;
          background: var(--bg);
          color: var(--text);
          display: flex;
          height: 100vh;
          overflow: hidden;
        }

        /* SIDEBAR */
        .sidebar {
          width: 220px;
          flex-shrink: 0;
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          background: var(--surface);
        }

        .sidebar-header {
          padding: 20px 16px 16px;
          border-bottom: 1px solid var(--border);
        }

        .sidebar-service {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.15em;
          color: var(--accent);
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .sidebar-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
        }

        .sidebar-port {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: var(--muted);
          margin-top: 2px;
        }

        .sidebar-nav {
          padding: 8px 0;
          flex: 1;
        }

        .nav-item {
          width: 100%;
          text-align: left;
          background: none;
          border: none;
          padding: 8px 16px;
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 13px;
          color: var(--muted);
          cursor: pointer;
          transition: all 0.15s;
          border-left: 2px solid transparent;
        }

        .nav-item:hover { color: var(--text); background: #ffffff06; }
        .nav-item.active {
          color: var(--text);
          background: var(--accent-dim);
          border-left-color: var(--accent);
        }

        /* MAIN */
        .main {
          flex: 1;
          overflow-y: auto;
          padding: 40px 48px;
        }

        /* CONTENT */
        .space-y-8 > * + * { margin-top: 32px; }

        .tag {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--accent);
          margin-bottom: 10px;
        }

        .heading {
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--text);
          line-height: 1.1;
        }

        .sub {
          font-size: 14px;
          color: var(--muted);
          line-height: 1.7;
          margin-top: 8px;
          max-width: 560px;
        }

        .section-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 12px;
        }

        .grid-2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1px;
          background: var(--border);
          border: 1px solid var(--border);
        }

        .card {
          background: var(--surface);
          padding: 16px 20px;
        }

        .card-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 6px;
        }

        .card-value {
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
        }

        .list-items { display: flex; flex-direction: column; gap: 8px; }

        .list-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: var(--text);
          padding: 8px 12px;
          background: var(--surface);
          border: 1px solid var(--border);
        }

        .dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: var(--accent);
          flex-shrink: 0;
        }

        .code-block {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          line-height: 1.7;
          background: #0a0a0c;
          border: 1px solid var(--border);
          padding: 20px 24px;
          color: #a8b0c8;
          white-space: pre;
          overflow-x: auto;
        }

        /* ROUTE TABLE */
        .route-table { display: flex; flex-direction: column; gap: 1px; background: var(--border); border: 1px solid var(--border); }

        .route-row {
          background: var(--surface);
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .route-row:hover { background: #16161a; }

        .route-top {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .method-badge {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.1em;
          padding: 3px 8px;
          border-radius: 2px;
          flex-shrink: 0;
        }

        .route-path {
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          color: var(--text);
          font-weight: 500;
        }

        .route-access {
          margin-left: auto;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: var(--muted);
          background: #ffffff08;
          padding: 2px 8px;
          border: 1px solid var(--border-bright);
        }

        .route-desc {
          font-size: 13px;
          color: var(--muted);
          line-height: 1.5;
        }

        .route-bottom {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
        }

        .route-field { display: flex; align-items: flex-start; gap: 8px; }

        .field-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          padding-top: 1px;
          flex-shrink: 0;
        }

        .field-code {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #7dd3fc;
          background: #0a0a0c;
          padding: 1px 6px;
          border: 1px solid var(--border);
        }
      `}</style>

      <div className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-service">ATS · Backend</div>
          <div className="sidebar-title">Core Service</div>
          <div className="sidebar-port">Port 4001</div>
        </div>
        <nav className="sidebar-nav">
          {SECTIONS.map((s) => (
            <button
              key={s}
              className={`nav-item ${active === s ? "active" : ""}`}
              onClick={() => setActive(s)}
            >
              {s}
            </button>
          ))}
        </nav>
      </div>

      <main className="main">{content[active]}</main>
    </>
  );
}