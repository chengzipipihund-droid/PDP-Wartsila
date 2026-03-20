/* ═══════════════════════════════════════════════════════════
   组件：左侧导航栏 | Sidebar Navigation
   图标按钮：Home / Location / Alarm / Manual / 夜间模式 / 用户
   ─ 夜间模式图标有点击功能（切换日/夜主题）
   ─ 其余图标暂为展示占位，尚未接入路由
   ═══════════════════════════════════════════════════════════ */
import './Sidebar.css';
import HomeIcon     from '../bottombar/Home.svg';
import LocationIcon from '../bottombar/Location.svg';
import AlarmIcon    from '../bottombar/Alarm.svg';
import ManualIcon   from '../bottombar/Manual.svg';
import NightIcon    from '../bottombar/NightMode.svg';
import UserIcon     from '../bottombar/User.svg';

function Sidebar({ onToggleNight }) {
  const buttons = [
    { id: 'home',     icon: HomeIcon     },
    { id: 'location', icon: LocationIcon },
    { id: 'alarm',    icon: AlarmIcon    },
    { id: 'manual',   icon: ManualIcon   },
    { id: 'night',    icon: NightIcon    },
  ];

  return (
    <div className="sidebar">
      {buttons.map(btn => (
        <img
          key={btn.id}
          src={btn.icon}
          alt={btn.id}
          className="sidebar-icon"
          onClick={btn.id === 'night' ? onToggleNight : undefined}
          style={{ cursor: btn.id === 'night' ? 'pointer' : 'default' }}
        />
      ))}
      {/* User icon pinned to bottom-right */}
      <img
        src={UserIcon}
        alt="user"
        style={{ width: 75, height: 75, display: 'block', marginTop: 'auto' }}
      />
    </div>
  );
}

export default Sidebar;
