/* ═══════════════════════════════════════════════════════════
   组件：侧边导航栏 | Sidebar Navigation
   图标按钮：Home / Location / Alarm / Manual / 夜间模式 / 用户
   ─ Home → navigate to /
   ─ Alarm → navigate to /alarm
   ─ 夜间模式图标有点击功能（切换日/夜主题）
   ═══════════════════════════════════════════════════════════ */
import { useNavigate, useLocation } from 'react-router-dom';
import './Sidebar.css';
import HomeIcon     from './icons/Home.svg';
import LocationIcon from './icons/Location.svg';
import AlarmIcon    from './icons/Alarm.svg';
import ManualIcon   from './icons/Manual.svg';
import NightIcon    from './icons/NightMode.svg';
import UserIcon     from './icons/User.svg';

function Sidebar({ onToggleNight }) {
  const navigate     = useNavigate();
  const { pathname } = useLocation();

  const buttons = [
    { id: 'home',     icon: HomeIcon,     label: null,          onClick: () => navigate('/') },
    { id: 'location', icon: LocationIcon, label: 'Navigation',  onClick: () => navigate('/nav') },
    { id: 'alarm',    icon: AlarmIcon,    label: null,          onClick: () => navigate('/alarm') },
    { id: 'manual',   icon: ManualIcon,   label: null,          onClick: null },
    { id: 'night',    icon: NightIcon,    label: null,          onClick: onToggleNight },
  ];

  const isActive = (id) => {
    if (id === 'home')     return pathname === '/';
    if (id === 'alarm')    return pathname.startsWith('/alarm');
    if (id === 'location') return pathname.startsWith('/nav');
    return false;
  };

  return (
    <div className="sidebar">
      {buttons.map(btn => (
        <div
          key={btn.id}
          className={`sidebar-btn ${isActive(btn.id) ? 'sidebar-btn--active' : ''}`}
          onClick={btn.onClick || undefined}
          style={{ cursor: btn.onClick ? 'pointer' : 'default' }}
        >
          <img src={btn.icon} alt={btn.id} className="sidebar-icon" />
          {btn.label && (
            <span style={{ position: 'absolute', bottom: 2, fontSize: 8, color: 'rgba(255,255,255,0.7)', fontFamily: 'sans-serif', letterSpacing: 0.5 }}>
              {btn.label}
            </span>
          )}
        </div>
      ))}
      {/* User icon pinned to bottom */}
      <img
        src={UserIcon}
        alt="user"
        style={{ width: 52, height: 52, display: 'block', marginTop: 'auto' }}
      />
    </div>
  );
}

export default Sidebar;
