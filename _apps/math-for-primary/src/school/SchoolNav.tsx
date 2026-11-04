import { useAccount } from './AccountContext';
import { useProgress } from '../state/ProgressContext';
import { useRoute } from '../app/router';
import { Icon, type IconName } from '../ui/Icon';
import { AdventureBuddy, MotionToggle, SoundToggle } from '../ui/Adventure';
import './school.css';
import { PUBLIC_BASE } from '../seo/paths';

export function SchoolNav() {
  const { user, connection } = useAccount(), { syncStatus, status, progress } = useProgress(), route = useRoute();
  const staff = !!user && user.role !== 'student';
  const links: { label: string; to: string; icon: IconName; active: boolean }[] = [
    { label: 'My adventures', to: '#/', icon: 'map', active: route.name === 'home' },
    { label: 'Learn', to: '#/teach', icon: 'book', active: route.name === 'teach' },
    { label: 'Watch', to: '#/watch', icon: 'play', active: route.name === 'watch' },
    { label: 'Missions', to: '#/missions', icon: 'puzzle', active: route.name === 'missions' },
    { label: 'Math Lab', to: '#/lab', icon: 'bulb', active: route.name === 'lab' },
    { label: 'My progress', to: '#/progress', icon: 'trophy', active: route.name === 'progress' },
  ];
  return <header className="adventure-sidebar">
    <a className="adventure-brand" href="#/" aria-label="Singapore Primary Maths — home"><span className="brand-buddy"><AdventureBuddy happy /></span><span><strong>Singapore<span>Primary Maths</span></strong><small>LEARN · PLAY · DISCOVER</small></span></a>
    <nav className="adventure-nav" aria-label="Main navigation">{links.map(link => <a key={link.to} className={link.active ? 'active' : ''} aria-current={link.active ? 'page' : undefined} href={link.to}><Icon name={link.icon} size={23} /><span>{link.label}</span>{link.active && <i />}</a>)}</nav>
    <div className="sidebar-bottom"><details className="mobile-preferences"><summary aria-label="Sound and animation settings"><Icon name="sliders" size={21}/></summary><div><SoundToggle/><MotionToggle/></div></details>
      <div className="buddy-note"><AdventureBuddy /><strong>A little curiosity.<br/>A world of maths.</strong><p>Small steps. Big discoveries.</p></div>
      <div className="experience-controls"><SoundToggle /><MotionToggle /></div>
      <nav className="grownup-nav" aria-label="School and information"><a href="#/curriculum">Curriculum</a><a href={`${PUBLIC_BASE}lessons/`}>Lesson guides</a><a href="#/about">About &amp; help</a><a href={staff ? '#/school' : '#/school-start'}>{staff ? 'My school' : 'For schools'}</a></nav>
      <a className="sidebar-account" aria-label={user?`Account for ${user.name}`:progress.profile.name?`Guest profile for ${progress.profile.name}`:'Create a guest profile'} href={user ? '#/account' : '#/guest'}><span className="profile-circle"><Icon name="user" size={20}/></span><span><strong>{user?.name || progress.profile.name || 'Hello, explorer!'}</strong><small>{user ? 'My account' : progress.profile.name ? 'Guest profile' : 'Create a guest profile'}</small></span><Icon name="arrowRight" size={17}/></a>
      {!user && <a className="school-signin" href="#/account">School sign in ↗</a>}
      {user?.role === 'student' && !user.mustChange && <span className={`sync-label sync-${status.state}`} role="status">{status.state === 'expired' || status.state === 'error' ? <a href="#/account">{syncStatus}</a> : syncStatus}</span>}
      {staff && connection === 'offline' && <span className="sync-label" role="status">Offline — school pages need a connection</span>}
    </div>
  </header>;
}
