'use client';

import { useState } from 'react';

const tabs = ['Profile', 'Account', 'Security', 'Notifications', 'Preferences'];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('Profile');

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        fontFamily: "'DM Sans', system-ui, sans-serif",
        background: '#f8fafc',
      }}
    >
      {/* ── Sidebar ───────────────────────── */}
      <div
        style={{
          width: 240,
          background: '#fff',
          borderRight: '1px solid #e2e8f0',
          padding: 16,
        }}
      >
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: '#0f172a' }}>
          Settings
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
                background: activeTab === tab ? '#eff6ff' : 'transparent',
                color: activeTab === tab ? '#2563eb' : '#64748b',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ───────────────────────── */}
      <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>{activeTab}</h1>

        {/* PROFILE */}
        {activeTab === 'Profile' && (
          <div style={cardStyle}>
            <SectionTitle title="Personal Information" />
            <Input label="Full Name" placeholder="John Doe" />
            <Input label="Email" placeholder="john@example.com" />
            <Input label="Phone" placeholder="+91 XXXXX XXXXX" />

            <button style={primaryBtn}>Save Changes</button>
          </div>
        )}

        {/* ACCOUNT */}
        {activeTab === 'Account' && (
          <div style={cardStyle}>
            <SectionTitle title="Account Settings" />
            <Input label="Username" placeholder="john_doe" />
            <Input label="Timezone" placeholder="Asia/Kolkata" />

            <button style={primaryBtn}>Update Account</button>
          </div>
        )}

        {/* SECURITY */}
        {activeTab === 'Security' && (
          <div style={cardStyle}>
            <SectionTitle title="Security" />
            <Input label="Current Password" type="password" />
            <Input label="New Password" type="password" />
            <Input label="Confirm Password" type="password" />

            <button style={primaryBtn}>Change Password</button>

            <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />

            <button style={dangerBtn}>Logout All Devices</button>
          </div>
        )}

        {/* NOTIFICATIONS */}
        {activeTab === 'Notifications' && (
          <div style={cardStyle}>
            <SectionTitle title="Notifications" />

            <Toggle label="Email Notifications" />
            <Toggle label="Push Notifications" />
            <Toggle label="Weekly Reports" />

            <button style={primaryBtn}>Save Preferences</button>
          </div>
        )}

        {/* PREFERENCES */}
        {activeTab === 'Preferences' && (
          <div style={cardStyle}>
            <SectionTitle title="Preferences" />

            <Select label="Theme" options={['Light', 'Dark', 'System']} />
            <Select label="Language" options={['English', 'Hindi']} />

            <button style={primaryBtn}>Save Preferences</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── UI COMPONENTS ───────────────────────── */

function SectionTitle({ title }: { title: string }) {
  return (
    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#0f172a' }}>{title}</h3>
  );
}

function Input({
  label,
  placeholder,
  type = 'text',
}: {
  label: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 12, color: '#64748b' }}>{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        style={{
          width: '100%',
          marginTop: 6,
          padding: '10px 12px',
          borderRadius: 6,
          border: '1px solid #e2e8f0',
          fontSize: 13,
          outline: 'none',
        }}
      />
    </div>
  );
}

function Toggle({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
      <span style={{ fontSize: 13, color: '#0f172a' }}>{label}</span>
      <input type="checkbox" />
    </div>
  );
}

function Select({ label, options }: { label: string; options: string[] }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 12, color: '#64748b' }}>{label}</label>
      <select
        style={{
          width: '100%',
          marginTop: 6,
          padding: '10px 12px',
          borderRadius: 6,
          border: '1px solid #e2e8f0',
          fontSize: 13,
          background: '#fff',
        }}
      >
        {options.map(o => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

/* ───────────────────────── STYLES ───────────────────────── */

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  padding: 16,
  maxWidth: 600,
};

const primaryBtn: React.CSSProperties = {
  marginTop: 12,
  padding: '10px 14px',
  background: '#3b82f6',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  fontSize: 13,
  cursor: 'pointer',
  fontWeight: 500,
};

const dangerBtn: React.CSSProperties = {
  padding: '10px 14px',
  background: '#ef4444',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  fontSize: 13,
  cursor: 'pointer',
  fontWeight: 500,
};
