import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#080808] font-sans text-white overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] rounded-full opacity-10"
          style={{
            background:
              "radial-gradient(circle, #4f6ef7 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        <div
          className="absolute bottom-[-10%] right-[5%] w-[500px] h-[500px] rounded-full opacity-8"
          style={{
            background:
              "radial-gradient(circle, #7c3aed 0%, transparent 70%)",
            filter: "blur(100px)",
          }}
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      {/* NAV */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          {/* Logo mark */}
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 12L8 4L13 12"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M5 9H11"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span
            className="text-[15px] font-semibold tracking-tight text-white/90"
            style={{ letterSpacing: "-0.02em" }}
          >
            TalentOS
          </span>
        </div>

        {/* Dummy nav links */}
        <div className="hidden md:flex items-center gap-1">
          {["Pipeline", "Candidates", "Jobs", "Analytics", "Settings"].map(
            (item) => (
              <button
                key={item}
                className="px-3.5 py-1.5 rounded-md text-sm text-white/40 hover:text-white/80 hover:bg-white/[0.05] transition-all duration-150"
              >
                {item}
              </button>
            )
          )}
        </div>

        {/* Actual doc routes */}
        <div className="flex items-center gap-2">
          <Link
            href="/org-service-doc"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm text-white/50 hover:text-white/90 hover:bg-white/[0.06] border border-transparent hover:border-white/10 transition-all duration-150"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 14 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2 2h6l3 3v7H2V2z"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
              <path
                d="M8 2v3h3"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
            </svg>
            Org Service
          </Link>
          <Link
            href="/ats-doc"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm text-white/50 hover:text-white/90 hover:bg-white/[0.06] border border-transparent hover:border-white/10 transition-all duration-150"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 14 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2 2h6l3 3v7H2V2z"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
              <path
                d="M8 2v3h3"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
            </svg>
            ATS Docs
          </Link>
          <div className="w-px h-4 bg-white/10 mx-1" />
          <button className="px-4 py-1.5 rounded-md text-sm font-medium bg-white text-black hover:bg-white/90 transition-all duration-150">
            Sign in
          </button>
        </div>
      </nav>

      {/* HERO */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-73px)] px-6 text-center">
        {/* Eyebrow badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.04] text-xs text-white/50 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Internal — ATS Platform v1.0
        </div>

        {/* Headline */}
        <h1
          className="max-w-3xl text-[56px] font-bold leading-[1.08] tracking-tight text-white mb-6"
          style={{ letterSpacing: "-0.03em" }}
        >
          Hire faster.
          <br />
          <span
            style={{
              background:
                "linear-gradient(135deg, #6b8eff 0%, #a78bfa 50%, #818cf8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Track smarter.
          </span>
        </h1>

        <p className="max-w-md text-base text-white/40 leading-relaxed mb-10">
          A unified applicant tracking system built for scale — manage
          pipelines, coordinate interviews, and make better hiring decisions,
          all in one place.
        </p>

        {/* CTAs */}
        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-all duration-150"
            style={{
              background: "linear-gradient(135deg, #4f6ef7 0%, #7c3aed 100%)",
              boxShadow: "0 0 24px rgba(79,110,247,0.3)",
            }}
          >
            Open Dashboard
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 7h8M8 4l3 3-3 3"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <Link
            href="/ats-doc"
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-white/60 hover:text-white border border-white/10 hover:border-white/20 hover:bg-white/[0.04] transition-all duration-150"
          >
            View Docs
          </Link>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-10 mt-20 pt-10 border-t border-white/[0.06]">
          {[
            { value: "6", label: "Team members" },
            { value: "3", label: "Services" },
            { value: "v1", label: "Current version" },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <div
                className="text-2xl font-bold text-white mb-0.5"
                style={{ letterSpacing: "-0.03em" }}
              >
                {value}
              </div>
              <div className="text-xs text-white/30">{label}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}