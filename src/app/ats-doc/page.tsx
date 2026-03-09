/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState, useEffect, useRef } from "react";

const TEAM = [
  {
    name: "Rahul",
    role: "Architect + TL",
    color: "#E11D48",
    bg: "#fff1f2",
    tag: "LEAD",
    owns: ["DB Schema Design", "API Contracts", "Auth Scaffold", "PR Reviews", "Unblocking Team"],
    note: "Monitors, guides, debugs. The backbone of every decision.",
  },
  {
    name: "Binta",
    role: "Backend Core",
    color: "#0891B2",
    bg: "#ecfeff",
    tag: "BACKEND",
    owns: ["Auth Service", "Job Service", "Candidate Service", "Mentors Swathi"],
    note: "Owns the heart of the ATS. All core business logic lives here.",
  },
  {
    name: "Swathi",
    role: "Backend + Occasional Frontend",
    color: "#7C3AED",
    bg: "#f5f3ff",
    tag: "BACKEND",
    owns: ["Job Service (support)", "Candidate Service (support)", "Admin Panel UI (occasional)"],
    note: "Paired with Binta. Learning backend through real production work.",
  },
  {
    name: "Shruti",
    role: "Frontend",
    color: "#D97706",
    bg: "#fffbeb",
    tag: "FRONTEND",
    owns: ["Recruiter Panel", "Active Jobs View", "Candidate Pipeline Board", "MY REPORT Screen"],
    note: "Strong potential. Builds the recruiter-facing UI end to end.",
  },
  {
    name: "Vignesh",
    role: "Integration Logic",
    color: "#059669",
    bg: "#ecfdf5",
    tag: "INTEGRATION",
    owns: ["Chrome Extension (Naukri)", "n8n Automation Workflows", "Portal Integration Design"],
    note: "Drives WHAT gets integrated and HOW automation flows work.",
  },
  {
    name: "Bharath",
    role: "Integration Backend",
    color: "#2563EB",
    bg: "#eff6ff",
    tag: "BACKEND",
    owns: ["Integration Service API", "Webhook Endpoints", "Prisma Models", "Paired with Vignesh"],
    note: "Builds the Node/Express layer under Vignesh's direction.",
  },
];

const SERVICES = [
  { name: "Auth Service", owner: "Binta", phase: "Phase 1", color: "#E11D48", desc: "JWT, login, roles, middleware" },
  { name: "User & Org", owner: "Binta", phase: "Phase 1–2", color: "#0891B2", desc: "Users, teams, hierarchy, BUs" },
  { name: "Job Service", owner: "Binta + Swathi", phase: "Phase 2", color: "#7C3AED", desc: "Job CRUD, assignment, pipeline" },
  { name: "Candidate Service", owner: "Binta + Swathi", phase: "Phase 2", color: "#059669", desc: "CV model, status tracking, job mapping" },
  { name: "Integration Service", owner: "Vignesh + Bharath", phase: "Phase 2–3", color: "#D97706", desc: "Naukri capture, webhooks, n8n" },
  { name: "Reporting Service", owner: "Binta", phase: "Phase 3–4", color: "#64748B", desc: "KPI dashboard, MY REPORT, exports" },
  { name: "Frontend (Next.js)", owner: "Shruti + Swathi", phase: "Phase 1–4", color: "#2563EB", desc: "Admin panel, recruiter UI, pipeline views" },
];

const PHASES = [
  {
    num: "01",
    label: "Foundation",
    weeks: "Week 1–2",
    color: "#E11D48",
    tasks: [
      ["Rahul", "DB schemas, API contracts, Auth scaffold"],
      ["Binta", "User & Org service skeleton"],
      ["Vignesh + Bharath", "Naukri research, n8n setup, Integration structure"],
      ["Shruti + Swathi", "Next.js setup, auth UI, shared components"],
    ],
  },
  {
    num: "02",
    label: "Core Logic",
    weeks: "Week 3–4",
    color: "#7C3AED",
    tasks: [
      ["Binta + Swathi", "Job Service + Candidate Service full build"],
      ["Vignesh + Bharath", "Naukri CV capture pipeline, first live integration"],
      ["Shruti", "Recruiter panel consuming live APIs"],
      ["Swathi (frontend)", "Admin panel screens against live User APIs"],
    ],
  },
  {
    num: "03",
    label: "Wiring",
    weeks: "Week 5–6",
    color: "#059669",
    tasks: [
      ["Rahul", "Cross-service wiring, API gateway decisions"],
      ["Binta", "Reporting Service start, KPI aggregation"],
      ["Vignesh + Bharath", "Automation triggers, LinkedIn + Foundit integration"],
      ["Shruti + Swathi", "MY REPORT screen, pipeline visualization, sales panel"],
    ],
  },
  {
    num: "04",
    label: "Stabilize",
    weeks: "Week 7+",
    color: "#2563EB",
    tasks: [
      ["Binta", "Complete Reporting Service, exports"],
      ["Vignesh + Bharath", "Automation polish, error handling, retries"],
      ["Shruti + Swathi", "E2E testing, role-based access checks, polish"],
      ["Rahul", "Full E2E flow testing, bug triage, Cloud Run deploy"],
    ],
  },
];

export default function ATSPresentationPage() {
  const [activeSection, setActiveSection] = useState(0);
  const [visibleCards, setVisibleCards] = useState<boolean[]>(new Array(TEAM.length).fill(false));
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observers = cardRefs.current.map((ref, i) => {
      if (!ref) return null;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisibleCards((prev) => {
              const next = [...prev];
              next[i] = true;
              return next;
            });
          }
        },
        { threshold: 0.15 }
      );
      observer.observe(ref);
      return observer;
    });
    return () => observers.forEach((o) => o?.disconnect());
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&family=Instrument+Serif:ital@0;1&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --ink: #0A0A0F;
          --paper: #F7F6F2;
          --muted: #9DA3AE;
          --line: #E4E2DC;
          --red: #E11D48;
          --blue: #2563EB;
          --purple: #7C3AED;
          --green: #059669;
          --amber: #D97706;
          --cyan: #0891B2;
        }

        html { scroll-behavior: smooth; }

        body {
          font-family: 'Syne', sans-serif;
          background: var(--paper);
          color: var(--ink);
          overflow-x: hidden;
        }

        .mono { font-family: 'DM Mono', monospace; }
        .serif { font-family: 'Instrument Serif', serif; }

        /* NAV */
        nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 48px;
          height: 56px;
          background: var(--ink);
          border-bottom: 1px solid #1e1e2a;
        }
        .nav-logo {
          font-family: 'DM Mono', monospace;
          font-size: 13px; letter-spacing: 0.12em;
          color: #fff; opacity: 0.9;
        }
        .nav-links {
          display: flex; gap: 32px;
          list-style: none;
        }
        .nav-links a {
          font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;
          color: rgba(255,255,255,0.5); text-decoration: none;
          transition: color 0.2s;
        }
        .nav-links a:hover { color: #fff; }

        /* HERO */
        .hero {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
          padding-top: 56px;
        }
        .hero-left {
          background: var(--ink);
          padding: 80px 64px;
          display: flex; flex-direction: column; justify-content: center;
          position: relative; overflow: hidden;
        }
        .hero-left::before {
          content: '';
          position: absolute; inset: 0;
          background: radial-gradient(ellipse at 30% 50%, rgba(225,29,72,0.12) 0%, transparent 60%);
          pointer-events: none;
        }
        .hero-eyebrow {
          font-family: 'DM Mono', monospace;
          font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;
          color: var(--red); margin-bottom: 32px;
          display: flex; align-items: center; gap: 12px;
        }
        .hero-eyebrow::before {
          content: ''; display: block;
          width: 32px; height: 1px; background: var(--red);
        }
        .hero-title {
          font-size: clamp(52px, 6vw, 88px);
          font-weight: 800; line-height: 0.95;
          color: #fff; letter-spacing: -0.03em;
          margin-bottom: 40px;
        }
        .hero-title span {
          font-family: 'Instrument Serif', serif;
          font-weight: 400; font-style: italic;
          color: var(--red);
        }
        .hero-desc {
          font-size: 15px; line-height: 1.7;
          color: rgba(255,255,255,0.5);
          max-width: 400px; margin-bottom: 56px;
        }
        .hero-stats {
          display: flex; gap: 40px;
        }
        .hero-stat-num {
          font-size: 36px; font-weight: 800; color: #fff;
          line-height: 1;
        }
        .hero-stat-label {
          font-family: 'DM Mono', monospace;
          font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
          color: rgba(255,255,255,0.35); margin-top: 6px;
        }
        .hero-right {
          background: var(--paper);
          padding: 80px 64px;
          display: flex; flex-direction: column; justify-content: center;
          border-left: 1px solid var(--line);
        }
        .flow-label {
          font-family: 'DM Mono', monospace;
          font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase;
          color: var(--muted); margin-bottom: 32px;
        }
        .flow-list { list-style: none; }
        .flow-item {
          display: flex; align-items: center; gap: 16px;
          padding: 14px 0;
          border-bottom: 1px solid var(--line);
          font-size: 14px; color: var(--ink);
          transition: all 0.2s;
          cursor: default;
        }
        .flow-item:hover { padding-left: 8px; }
        .flow-num {
          font-family: 'DM Mono', monospace;
          font-size: 11px; color: var(--muted);
          min-width: 24px;
        }
        .flow-arrow {
          margin-left: auto; color: var(--muted); font-size: 12px;
          transition: transform 0.2s;
        }
        .flow-item:hover .flow-arrow { transform: translateX(4px); color: var(--red); }

        /* SECTIONS */
        section { padding: 120px 64px; }
        .section-header {
          display: flex; align-items: flex-start;
          gap: 24px; margin-bottom: 72px;
        }
        .section-num {
          font-family: 'DM Mono', monospace;
          font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase;
          color: var(--muted); padding-top: 6px;
          min-width: 48px;
        }
        .section-title {
          font-size: clamp(36px, 4vw, 56px);
          font-weight: 800; letter-spacing: -0.03em; line-height: 1;
        }

        /* TEAM GRID */
        .team-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2px;
          border: 1px solid var(--line);
        }
        .team-card {
          padding: 32px;
          background: #fff;
          border-right: 1px solid var(--line);
          border-bottom: 1px solid var(--line);
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.5s, transform 0.5s;
          position: relative; overflow: hidden;
        }
        .team-card.visible {
          opacity: 1; transform: translateY(0);
        }
        .team-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0;
          height: 3px;
        }
        .team-card:hover { background: var(--paper); }
        .team-tag {
          font-family: 'DM Mono', monospace;
          font-size: 10px; letter-spacing: 0.15em;
          padding: 4px 8px;
          border-radius: 2px;
          margin-bottom: 20px;
          display: inline-block;
        }
        .team-name {
          font-size: 28px; font-weight: 800;
          letter-spacing: -0.02em; margin-bottom: 4px;
        }
        .team-role {
          font-size: 13px; color: var(--muted);
          margin-bottom: 24px;
        }
        .team-owns {
          list-style: none; margin-bottom: 20px;
        }
        .team-owns li {
          font-family: 'DM Mono', monospace;
          font-size: 11px; color: var(--ink);
          padding: 5px 0;
          border-bottom: 1px solid var(--line);
          display: flex; align-items: center; gap: 8px;
        }
        .team-owns li::before {
          content: '→'; font-size: 10px;
        }
        .team-note {
          font-size: 12px; color: var(--muted);
          line-height: 1.6; font-style: italic;
        }

        /* SERVICES */
        .services-section { background: var(--ink); color: #fff; }
        .services-section .section-num { color: rgba(255,255,255,0.3); }
        .services-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .service-card {
          padding: 28px 24px;
          background: var(--ink);
          position: relative;
          transition: background 0.2s;
        }
        .service-card:hover { background: #141420; }
        .service-dot {
          width: 8px; height: 8px; border-radius: 50%;
          margin-bottom: 20px;
        }
        .service-name {
          font-size: 16px; font-weight: 700;
          margin-bottom: 6px; color: #fff;
        }
        .service-desc {
          font-family: 'DM Mono', monospace;
          font-size: 11px; color: rgba(255,255,255,0.35);
          margin-bottom: 20px; line-height: 1.5;
        }
        .service-owner {
          font-size: 12px; font-weight: 600;
          margin-bottom: 4px;
        }
        .service-phase {
          font-family: 'DM Mono', monospace;
          font-size: 10px; color: rgba(255,255,255,0.3);
          letter-spacing: 0.1em;
        }

        /* INTEGRATION FOCUS */
        .integration-section { background: #F0FDF4; }
        .integration-flow {
          display: flex; align-items: center;
          gap: 0; margin-top: 56px;
          overflow-x: auto; padding-bottom: 16px;
        }
        .flow-step {
          background: #fff;
          border: 1px solid var(--line);
          padding: 24px 20px;
          min-width: 180px;
          flex-shrink: 0;
          position: relative;
        }
        .flow-step-num {
          font-family: 'DM Mono', monospace;
          font-size: 10px; letter-spacing: 0.15em;
          color: var(--green); margin-bottom: 12px;
        }
        .flow-step-title {
          font-size: 14px; font-weight: 700;
          margin-bottom: 8px;
        }
        .flow-step-desc {
          font-family: 'DM Mono', monospace;
          font-size: 11px; color: var(--muted);
          line-height: 1.5;
        }
        .flow-connector {
          width: 48px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          color: var(--green); font-size: 18px; font-weight: 300;
        }
        .vignesh-bharath-split {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 24px; margin-top: 56px;
        }
        .split-card {
          padding: 36px;
          border: 1px solid var(--line);
          background: #fff;
          position: relative;
        }
        .split-card-tag {
          font-family: 'DM Mono', monospace;
          font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase;
          margin-bottom: 16px; display: inline-block;
        }
        .split-card-name {
          font-size: 32px; font-weight: 800;
          letter-spacing: -0.02em; margin-bottom: 8px;
        }
        .split-card-role {
          font-size: 13px; color: var(--muted);
          margin-bottom: 28px;
        }
        .split-card-items { list-style: none; }
        .split-card-items li {
          padding: 10px 0;
          border-bottom: 1px solid var(--line);
          font-size: 13px; display: flex; gap: 12px;
        }
        .split-card-items li::before {
          content: '—'; color: var(--muted);
        }

        /* PHASES */
        .phases-section { }
        .phases-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 2px; border: 1px solid var(--line);
        }
        .phase-card {
          padding: 40px;
          background: #fff;
          border-right: 1px solid var(--line);
          border-bottom: 1px solid var(--line);
        }
        .phase-num-big {
          font-size: 80px; font-weight: 800;
          line-height: 1; letter-spacing: -0.04em;
          opacity: 0.08; margin-bottom: -16px;
        }
        .phase-label {
          font-size: 22px; font-weight: 700;
          letter-spacing: -0.01em; margin-bottom: 4px;
        }
        .phase-weeks {
          font-family: 'DM Mono', monospace;
          font-size: 11px; color: var(--muted);
          letter-spacing: 0.1em; margin-bottom: 28px;
        }
        .phase-tasks { list-style: none; }
        .phase-task {
          padding: 12px 0;
          border-bottom: 1px solid var(--line);
          display: grid; grid-template-columns: 140px 1fr;
          gap: 16px; font-size: 13px;
        }
        .phase-task-person {
          font-weight: 600; color: var(--ink);
        }
        .phase-task-desc { color: var(--muted); line-height: 1.4; }

        /* DEV WORKFLOW */
        .workflow-section { background: #FAFAF8; }
        .workflow-cards {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 24px; margin-top: 56px;
        }
        .workflow-card {
          padding: 36px;
          border: 1px solid var(--line);
          background: #fff;
        }
        .workflow-step-num {
          font-family: 'DM Mono', monospace;
          font-size: 11px; letter-spacing: 0.15em;
          color: var(--muted); margin-bottom: 20px;
        }
        .workflow-card-title {
          font-size: 20px; font-weight: 700;
          margin-bottom: 12px;
        }
        .workflow-card-desc {
          font-size: 13px; color: var(--muted);
          line-height: 1.7;
        }
        .workflow-code {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          background: var(--ink); color: #7EE787;
          padding: 16px; margin-top: 16px;
          border-radius: 4px; line-height: 1.6;
        }

        /* FOOTER */
        footer {
          background: var(--ink); color: rgba(255,255,255,0.4);
          padding: 48px 64px;
          display: flex; justify-content: space-between; align-items: center;
          font-family: 'DM Mono', monospace; font-size: 11px;
          letter-spacing: 0.1em;
        }
        footer span { color: rgba(255,255,255,0.7); }

        @media (max-width: 900px) {
          .hero { grid-template-columns: 1fr; }
          .team-grid { grid-template-columns: 1fr; }
          .services-grid { grid-template-columns: 1fr 1fr; }
          .phases-grid { grid-template-columns: 1fr; }
          .workflow-cards { grid-template-columns: 1fr; }
          .vignesh-bharath-split { grid-template-columns: 1fr; }
          section { padding: 80px 32px; }
          nav { padding: 0 24px; }
          .hero-left, .hero-right { padding: 60px 32px; }
        }
      `}</style>

      {/* NAV */}
      <nav>
        <div className="nav-logo mono">ATS · INTERNAL BUILD</div>
        <ul className="nav-links">
          {["Team", "Services", "Integration", "Phases", "Workflow"].map((l) => (
            <li key={l}><a href={`#${l.toLowerCase()}`}>{l}</a></li>
          ))}
        </ul>
      </nav>

      {/* HERO */}
      <div className="hero">
        <div className="hero-left">
          <div className="hero-eyebrow mono">Sprint Plan · 2026</div>
          <h1 className="hero-title">
            Building<br />the <span>ATS</span><br />Together.
          </h1>
          <p className="hero-desc">
            Clean microservices from day one. Six developers, one architect, four phases. Here's exactly who builds what and how it all connects.
          </p>
          <div className="hero-stats">
            {[["6", "Developers"], ["7", "Services"], ["4", "Phases"], ["1", "Goal"]].map(([n, l]) => (
              <div key={l}>
                <div className="hero-stat-num">{n}</div>
                <div className="hero-stat-label mono">{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="hero-right">
          <div className="flow-label mono">ATS Flow Overview</div>
          <ul className="flow-list">
            {[
              "Login + Role-Based Access",
              "Admin & Company Setup",
              "Job Requirement Module",
              "Candidate Database + CV Capture",
              "Pipeline + Status Tracking",
              "Interview + Feedback Module",
              "Offer + Joining Module",
              "Reports + KPI Dashboards",
              "Naukri + Portal Integrations",
            ].map((item, i) => (
              <li className="flow-item" key={i}>
                <span className="flow-num mono">0{i + 1}</span>
                {item}
                <span className="flow-arrow">→</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* TEAM */}
      <section id="team">
        <div className="section-header">
          <div className="section-num mono">01 /</div>
          <h2 className="section-title">The Team &<br />Their Ownership</h2>
        </div>
        <div className="team-grid">
          {TEAM.map((person, i) => (
            <div
              key={person.name}
              className={`team-card ${visibleCards[i] ? "visible" : ""}`}
              ref={(el) => { cardRefs.current[i] = el; }}
              style={{
                transitionDelay: `${i * 80}ms`,
              }}
            >
              <div
                className="team-card-accent"
                style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: person.color }}
              />
              <div
                className="team-tag mono"
                style={{ background: person.bg, color: person.color }}
              >
                {person.tag}
              </div>
              <div className="team-name" style={{ color: person.color }}>{person.name}</div>
              <div className="team-role">{person.role}</div>
              <ul className="team-owns">
                {person.owns.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
              <div className="team-note">{person.note}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="services-section">
        <div className="section-header">
          <div className="section-num mono">02 /</div>
          <h2 className="section-title" style={{ color: "#fff" }}>Microservice<br />Ownership Map</h2>
        </div>
        <div className="services-grid">
          {SERVICES.map((s) => (
            <div className="service-card" key={s.name}>
              <div className="service-dot" style={{ background: s.color }} />
              <div className="service-name">{s.name}</div>
              <div className="service-desc mono">{s.desc}</div>
              <div className="service-owner" style={{ color: s.color }}>{s.owner}</div>
              <div className="service-phase mono">{s.phase}</div>
            </div>
          ))}
        </div>
      </section>

      {/* INTEGRATION DEEP DIVE */}
      <section id="integration" className="integration-section">
        <div className="section-header">
          <div className="section-num mono" style={{ color: "#059669" }}>03 /</div>
          <h2 className="section-title">Vignesh + Bharath<br />Integration Service</h2>
        </div>

        <p style={{ fontSize: "15px", color: "var(--muted)", maxWidth: "600px", lineHeight: "1.7", marginBottom: "16px" }}>
          This is the most specific question — what exactly do these two build and how does it connect to the rest of the system. Here it is clearly.
        </p>

        <div className="integration-flow">
          {[
            { num: "STEP 01", title: "Recruiter opens CV", desc: "On Naukri, LinkedIn, or Foundit portal", owner: "Recruiter action" },
            { num: "STEP 02", title: "Chrome Extension fires", desc: "Reads candidate data from the page DOM", owner: "Vignesh builds" },
            { num: "STEP 03", title: "POST to Integration API", desc: "/integration/candidate/capture endpoint", owner: "Bharath builds" },
            { num: "STEP 04", title: "n8n workflow triggers", desc: "Validates, enriches, routes the payload", owner: "Vignesh builds" },
            { num: "STEP 05", title: "Calls Candidate Service", desc: "POST /candidates/import — Binta's endpoint", owner: "One connection" },
            { num: "STEP 06", title: "Candidate appears in ATS", desc: "Under the correct job, instantly", owner: "Done." },
          ].map((step, i, arr) => (
            <>
              <div className="flow-step" key={step.num}>
                <div className="flow-step-num mono">{step.num}</div>
                <div className="flow-step-title">{step.title}</div>
                <div className="flow-step-desc mono">{step.desc}</div>
                <div style={{ marginTop: "12px", fontSize: "11px", fontWeight: "600", color: "var(--green)" }}>{step.owner}</div>
              </div>
              {i < arr.length - 1 && <div className="flow-connector">→</div>}
            </>
          ))}
        </div>

        <div className="vignesh-bharath-split">
          <div className="split-card">
            <div className="split-card-tag mono" style={{ color: "#D97706", background: "#FEF3C7", padding: "4px 10px", borderRadius: "2px" }}>
              INTEGRATION LOGIC
            </div>
            <div className="split-card-name" style={{ color: "#D97706" }}>Vignesh</div>
            <div className="split-card-role">Drives the WHAT and the HOW of automation</div>
            <ul className="split-card-items">
              {[
                "Chrome extension — captures CV data from Naukri page DOM",
                "n8n workflow design — what triggers, what gets sent where",
                "Portal integration strategy — Naukri, LinkedIn, Foundit",
                "Automation error handling and retry logic",
                "Defines the payload shape Bharath's API will receive",
              ].map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div className="split-card">
            <div className="split-card-tag mono" style={{ color: "#2563EB", background: "#EFF6FF", padding: "4px 10px", borderRadius: "2px" }}>
              BACKEND LAYER
            </div>
            <div className="split-card-name" style={{ color: "#2563EB" }}>Bharath</div>
            <div className="split-card-role">Builds the Node/Express/Prisma layer under Vignesh's direction</div>
            <ul className="split-card-items">
              {[
                "POST /integration/candidate/capture — receives CV from extension",
                "POST /integration/webhook/foundit — Foundit webhook receiver",
                "POST /integration/webhook/linkedin — LinkedIn webhook receiver",
                "GET /integration/candidates/:jobId — list captured candidates",
                "Calls Binta's POST /candidates/import — the only cross-service connection",
              ].map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </div>
      </section>

      {/* PHASES */}
      <section id="phases">
        <div className="section-header">
          <div className="section-num mono">04 /</div>
          <h2 className="section-title">Sprint Phases<br />In Parallel</h2>
        </div>
        <div className="phases-grid">
          {PHASES.map((phase) => (
            <div className="phase-card" key={phase.num}>
              <div className="phase-num-big" style={{ color: phase.color }}>{phase.num}</div>
              <div className="phase-label">{phase.label}</div>
              <div className="phase-weeks mono">{phase.weeks}</div>
              <ul className="phase-tasks">
                {phase.tasks.map(([person, desc]) => (
                  <li className="phase-task" key={person}>
                    <span className="phase-task-person">{person}</span>
                    <span className="phase-task-desc">{desc}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* DEV WORKFLOW */}
      <section id="workflow" className="workflow-section">
        <div className="section-header">
          <div className="section-num mono">05 /</div>
          <h2 className="section-title">Cross-Service Dev<br />Without Bottlenecks</h2>
        </div>
        <p style={{ fontSize: "15px", color: "var(--muted)", maxWidth: "560px", lineHeight: "1.7", marginBottom: "0" }}>
          Nobody waits for anyone else's service. Contract-first development means every dev works against a fake version of every API from day one.
        </p>
        <div className="workflow-cards">
          {[
            {
              step: "STEP 01",
              title: "Rahul writes all contracts",
              desc: "Week 1. Every API endpoint, response shape, and error code is defined before anyone writes a single route. This is the most critical output of the entire project.",
              code: "GET /jobs → [{ id, title, status, assignedTo }]\nPOST /candidates/import → { candidateId }\nGET /candidates/:jobId → [{ id, name, stage }]",
            },
            {
              step: "STEP 02",
              title: "Everyone runs json-server",
              desc: "One command. One JSON file. Every dev gets a local fake API that returns data in the exact shape of the real service. No waiting. No blocking.",
              code: "npx json-server db.json --port 3001\n\n// db.json matches the contract exactly\n// Shruti hits localhost:3001/jobs\n// Binta builds the real service separately",
            },
            {
              step: "STEP 03",
              title: "Real services replace mocks",
              desc: "When Binta's Job Service is ready, Shruti changes one line — the base URL. Everything works because the shape was agreed upfront. No rework.",
              code: "// Before\nconst API = 'http://localhost:3001'\n\n// After Binta ships\nconst API = 'http://job-service/api'\n\n// That's the only change needed.",
            },
          ].map((card) => (
            <div className="workflow-card" key={card.step}>
              <div className="workflow-step-num mono">{card.step}</div>
              <div className="workflow-card-title">{card.title}</div>
              <div className="workflow-card-desc">{card.desc}</div>
              <div className="workflow-code mono">{card.code}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div>ATS Internal Build · <span>Confidential</span></div>
        <div className="mono">6 devs · Clean microservices · GCP Cloud Run</div>
        <div>Built by <span>the team</span></div>
      </footer>
    </>
  );
}