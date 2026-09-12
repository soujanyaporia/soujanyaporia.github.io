import { useAccount } from './AccountContext';
import { useProgress } from '../state/ProgressContext';
import './school.css';
export function SchoolNav(){
 const {user,connection}=useAccount(),{syncStatus,status,progress}=useProgress();const staff=!!user&&user.role!=='student';
 return <header className="school-header"><div className="school-masthead"><a className="school-wordmark" href="#/" aria-label="Maths for SG Primary Schools — home"><span className="school-brand-symbol" aria-hidden="true">✦</span><span><strong>Maths for SG<br className="brand-break"/> Primary Schools</strong><small>A little curiosity. A world of maths.</small></span></a><span className="school-brand-note">LEARN · EXPLORE · UNDERSTAND</span></div><nav className="school-nav" aria-label="School navigation"><div><a href="#/teach">Learn</a><a href="#/curriculum">Curriculum</a><a href="#/about">About</a><a href={staff?'#/school':'#/school-start'}>{staff?'My school':'School setup'}</a></div>{!user&&<a className="guest-link" href="#/guest">{progress.profile.name?`${progress.profile.name} · Guest`:'Create guest account'}</a>}<a className="account-link" href="#/account">{user?user.name:'School sign in'} <span aria-hidden="true">↗</span></a>
 {user?.role==='student'&&!user.mustChange&&<span className={`sync-label sync-${status.state}`} role="status">{status.state==='expired'||status.state==='error'?<a href="#/account">{syncStatus}</a>:syncStatus}</span>}
 {staff&&connection==='offline'&&<span className="sync-label sync-offline" role="status">Offline — school pages need a connection</span>}</nav></header>;
}
