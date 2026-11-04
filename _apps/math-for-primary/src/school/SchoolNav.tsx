import { useEffect, useRef } from 'react';
import { useAccount } from './AccountContext';
import { useProgress } from '../state/ProgressContext';
import { useRoute } from '../app/router';
import { Icon, type IconName } from '../ui/Icon';
import { AdventureBuddy, MotionToggle, SoundToggle } from '../ui/Adventure';
import './school.css';
import './navigation.css';
import { PUBLIC_BASE } from '../seo/paths';

export function SchoolNav() {
  const { user, connection } = useAccount(), { syncStatus, status, progress } = useProgress(), route = useRoute();
  const staff = !!user && user.role !== 'student';
  const more = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (more.current) more.current.open = false;
  }, [route]);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (more.current?.open && event.target instanceof Node && !more.current.contains(event.target)) more.current.open = false;
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, []);
  const links: { label: string; to: string; icon: IconName; active: boolean }[] = [
    { label: 'Daily practice', to: '#/daily', icon: 'target', active: route.name === 'daily' },
    { label: 'Create a paper', to: '#/papers', icon: 'pencil', active: route.name === 'papers' },
    { label: 'Learn', to: '#/teach', icon: 'book', active: route.name === 'teach' },
  ];
  const explore: typeof links = [
    { label: 'Home', to: '#/', icon: 'home', active: route.name === 'home' },
    { label: 'Watch', to: '#/watch', icon: 'play', active: route.name === 'watch' },
    { label: 'Missions', to: '#/missions', icon: 'puzzle', active: route.name === 'missions' },
    { label: 'Math Lab', to: '#/lab', icon: 'bulb', active: route.name === 'lab' },
    { label: 'My progress', to: '#/progress', icon: 'trophy', active: route.name === 'progress' },
  ];
  return <header className="adventure-sidebar clear-navigation">
    <a className="adventure-brand" href="#/" aria-label="Singapore Primary Maths — home" aria-current={route.name === 'home' ? 'page' : undefined}><span className="brand-buddy"><AdventureBuddy happy /></span><span><strong>Singapore<span>Primary Maths</span></strong></span></a>
    <nav className="adventure-nav" aria-label="Main navigation">
      {links.map(link => <a key={link.to} className={link.active ? 'active' : ''} aria-current={link.active ? 'page' : undefined} href={link.to}><Icon name={link.icon} size={23} /><span>{link.label}</span>{link.active && <i />}</a>)}
      <details className="nav-more" ref={more} onKeyDown={event => {
        if (event.key === 'Escape' && more.current?.open) {
          more.current.open = false;
          more.current.querySelector('summary')?.focus();
          event.stopPropagation();
        }
      }}>
        <summary><Icon name="grid" size={23}/><span>More</span></summary>
        <div className="nav-more-panel" onClick={event => { if (event.target instanceof Element && event.target.closest('a') && more.current) more.current.open = false; }}>
          <div className="nav-explore-links">{explore.map(link => <a key={link.to} className={link.active ? 'active' : ''} aria-current={link.active ? 'page' : undefined} href={link.to}><Icon name={link.icon} size={20}/><span>{link.label}</span></a>)}</div>
          <div className="nav-information-links"><a href="#/curriculum">Curriculum</a><a href={`${PUBLIC_BASE}lessons/`}>Lesson guides</a><a href="#/about">About &amp; help</a><a href={staff ? '#/school' : '#/school-start'}>{staff ? 'My school' : 'For schools'}</a>{!user && <a href="#/account">School sign in</a>}</div>
          <div className="nav-preferences"><SoundToggle/><MotionToggle/></div>
        </div>
      </details>
    </nav>
    <div className="sidebar-bottom">
      <a className="sidebar-account" aria-label={user?`Account for ${user.name}`:progress.profile.name?`Guest profile for ${progress.profile.name}`:'Create a guest profile'} href={user ? '#/account' : '#/guest'}><span className="profile-circle"><Icon name="user" size={20}/></span><span><strong>{user?.name || progress.profile.name || 'Hello, explorer!'}</strong><small>{user ? 'My account' : progress.profile.name ? 'Guest profile' : 'Create a guest profile'}</small></span><Icon name="arrowRight" size={17}/></a>
      {user?.role === 'student' && !user.mustChange && <span className={`sync-label sync-${status.state}`} role="status">{status.state === 'expired' || status.state === 'error' ? <a href="#/account">{syncStatus}</a> : syncStatus}</span>}
      {staff && connection === 'offline' && <span className="sync-label" role="status">Offline — school pages need a connection</span>}
    </div>
  </header>;
}
