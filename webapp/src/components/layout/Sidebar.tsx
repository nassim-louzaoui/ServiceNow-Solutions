import { useApp } from '../../context/AppContext';
import type { SectionId } from '../../types';
import { loadSection } from '../../api/engine';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin', leadership: 'Leadership', creator: 'Creator', user: 'User',
};

export default function Sidebar() {
  const { state, dispatch, toast } = useApp();
  const { init, sectionId, sidebarCollapsed } = state;

  async function navigate(id: SectionId) {
    if (sectionId === id && state.sectionData) return;
    dispatch({ type: 'CLOSE_MOBILE' });
    dispatch({ type: 'SET_SECTION', payload: id });
    dispatch({ type: 'SET_SECTION_LOADING', payload: true });
    try {
      const data = await loadSection(id);
      dispatch({ type: 'SET_SECTION_DATA', payload: data.sectionData ?? {} });
    } catch {
      toast('Failed to load section.', 'error');
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load section. Please try again.' });
    } finally {
      dispatch({ type: 'SET_SECTION_LOADING', payload: false });
    }
  }

  const role = ROLE_LABELS[init?.userRole ?? ''] ?? '';

  return (
    <aside className="oi-sidebar">
      <div className="oi-sb-brand">
        <div className="oi-sb-logo">
          <i className="fa fa-bolt" />
        </div>
        <span className="oi-sb-brand-text">Operations Intelligence</span>
      </div>

      <nav className="oi-sb-nav" role="navigation">
        {(init?.sections ?? []).map(s => (
          <button
            key={s.id}
            type="button"
            className={`oi-nav-item${sectionId === s.id ? ' active' : ''}`}
            onClick={() => navigate(s.id as SectionId)}
            title={s.label}
          >
            <i className={`fa ${s.icon} oi-nav-icon`} />
            <span className="oi-nav-label">{s.label}</span>
          </button>
        ))}
      </nav>

      <div className="oi-sb-footer">
        <div className="oi-sb-user">
          <div className="oi-sb-avatar">{init?.userInitials ?? '?'}</div>
          <div className="oi-sb-user-info">
            <div className="oi-sb-user-name">{init?.userName ?? ''}</div>
            <div className="oi-sb-user-role">{role}</div>
          </div>
        </div>
        <button
          type="button"
          className="oi-collapse-btn"
          onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <i className="fa fa-chevron-left" />
        </button>
      </div>
    </aside>
  );
}
