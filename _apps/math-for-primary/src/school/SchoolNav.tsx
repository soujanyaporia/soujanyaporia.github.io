import { useAccount } from './AccountContext';
import { useProgress } from '../state/ProgressContext';
import './school.css';
export function SchoolNav(){
 const {user,connection}=useAccount(),{syncStatus,status}=useProgress();const staff=!!user&&user.role!=='student';
 return <nav className="school-nav" aria-label="School navigation"><a className="school-wordmark" href="#/">✦ <span>Maths for SG Primary Schools</span></a><div><a href="#/curriculum">Curriculum</a><a href="#/about">About</a><a href={staff?'#/school':'#/school-start'}>{staff?'My school':'School setup'}</a><a className="account-link" href="#/account">{user?user.name:'School sign in'} <span aria-hidden="true">↗</span></a></div>
 {user?.role==='student'&&!user.mustChange&&<span className={`sync-label sync-${status.state}`} role="status">{status.state==='expired'||status.state==='error'?<a href="#/account">{syncStatus}</a>:syncStatus}</span>}
 {staff&&connection==='offline'&&<span className="sync-label sync-offline" role="status">Offline — school pages need a connection</span>}</nav>;
}
