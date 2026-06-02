import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import ProjectListPage from '../projects/ProjectListPage';
import ProjectDetailPage from '../projects/ProjectDetailPage';
import ModuleRegistryPage from '../modules/ModuleRegistryPage';
import PipelineEditorPage from '../pipelines/PipelineEditorPage';
import TemplatesPage from '../templates/TemplatesPage';
import TemplateDetailPage from '../templates/TemplateDetailPage';
import ThemeToggle from '../theme/ThemeToggle';
import { t, space, radius, font } from '../theme/tokens';

const navItems = [
  { path: '/projects', label: 'Projects' },
  { path: '/templates', label: 'Templates' },
  { path: '/modules', label: 'Modules' },
];

export default function AppLayout() {
  const { logout } = useAuth();
  const location = useLocation();

  return (
    <div style={{ display: 'flex', height: '100vh', background: t.bg, color: t.text }}>
      <nav style={{
        width: '220px',
        background: t.surface,
        borderRight: `1px solid ${t.border}`,
        padding: space.lg,
        display: 'flex',
        flexDirection: 'column',
        gap: space.xs,
      }}>
        <div style={{ marginBottom: space.xl, paddingLeft: space.sm }}>
          <div style={{
            color: t.accent,
            fontSize: font.xl,
            fontWeight: 700,
            letterSpacing: '0.08em',
          }}>
            VENOM
          </div>
          <div style={{ color: t.textFaint, fontSize: font.xs, marginTop: '0.15rem' }}>
            artifact builder
          </div>
        </div>

        {navItems.map((item) => {
          const active = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: 'block',
                color: active ? t.text : t.textDim,
                textDecoration: 'none',
                padding: '0.5rem 0.75rem',
                borderRadius: radius.md,
                background: active ? t.surface2 : 'transparent',
                fontSize: font.md,
                transition: 'background 0.15s ease, color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = t.surfaceHover;
                  e.currentTarget.style.color = t.text;
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = t.textDim;
                }
              }}
            >
              {item.label}
            </Link>
          );
        })}

        <div style={{ flex: 1 }} />

        <ThemeToggle />
        <button
          onClick={logout}
          style={{
            marginTop: space.xs,
            padding: '0.55rem 0.75rem',
            background: 'transparent',
            border: `1px solid ${t.border}`,
            borderRadius: radius.md,
            color: t.textDim,
            cursor: 'pointer',
            fontSize: font.sm,
            textAlign: 'left',
            transition: 'background 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = t.surfaceHover;
            e.currentTarget.style.color = t.text;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = t.textDim;
          }}
        >
          Sign out
        </button>
      </nav>

      <main style={{ flex: 1, overflow: 'auto', background: t.bg }}>
        <Routes>
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route path="/projects" element={<div style={{ padding: '1.5rem' }}><ProjectListPage /></div>} />
          <Route path="/projects/:projectId" element={<div style={{ padding: '1.5rem' }}><ProjectDetailPage /></div>} />
          <Route path="/modules" element={<div style={{ padding: '1.5rem' }}><ModuleRegistryPage /></div>} />
          <Route path="/templates" element={<div style={{ padding: '1.5rem' }}><TemplatesPage /></div>} />
          <Route path="/templates/:templateId" element={<TemplateDetailPage />} />
          <Route path="/projects/:projectId/pipelines/:pipelineId" element={<PipelineEditorPage />} />
        </Routes>
      </main>
    </div>
  );
}
