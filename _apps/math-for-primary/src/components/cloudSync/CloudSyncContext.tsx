import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAccount } from '../../school/AccountContext';
import { SyncManager, type SyncView } from '../../services/cloudSync/syncManager';
import { applyState, captureState } from '../../services/cloudSync/snapshot';
import { APPLIED_EVENT, CHANGE_EVENT, SESSION_KEY, clearGuestStorage, endSharedMode, isGuestKey, isSharedDevice, startSharedMode } from '../../services/cloudSync/storage';
import { takeRestoreHash } from '../../services/cloudSync/restoreHash';
import { CloudAccountModal } from './CloudAccountModal';
import './cloudSync.css';
interface CloudApi { manager: SyncManager | null; view: SyncView; open: () => void }
const idle: SyncView = { status: 'guest', error: '', connected: false, shared: false, lastSyncedAt: 0, maskedHint: '' };
const Context = createContext<CloudApi>({ manager: null, view: idle, open: () => {} });
const endpoint = import.meta.env.VITE_CLOUD_SYNC_URL ?? '';
export function CloudSyncProvider({ children }: { children: ReactNode }) {
  const { user } = useAccount(), [manager, setManager] = useState<SyncManager | null>(null), [view, setView] = useState(idle), [opened, setOpened] = useState(false), [restore, setRestore] = useState<string | null>(null), [changedIdentity, setChangedIdentity] = useState(false);
  useEffect(() => {
    if (user) { setManager(null); setView(idle); return; }
    let engine: SyncManager;
    try {
      engine = new SyncManager({ endpoint, read: captureState, apply: applyState, local: localStorage, tab: sessionStorage, online: () => navigator.onLine, onChange: setView,
        changeMode: (shared) => { if (shared) startSharedMode(); else if (isSharedDevice()) endSharedMode(); },
        wipe: () => { clearGuestStorage(); if (isSharedDevice()) endSharedMode(); clearGuestStorage(localStorage); window.dispatchEvent(new Event(APPLIED_EVENT)); window.dispatchEvent(new Event('sg-maths-cloud-logout')); },
      });
    } catch { setView({ ...idle, status: 'error', error: 'This browser has blocked storage. Cloud passes need browser storage; keep a learning passport before leaving.' }); return; }
    setManager(engine);
    const restoreFromHash = () => { const code = takeRestoreHash(); if (code !== null) { setRestore(code); setOpened(true); } };
    // Delay initialization one task so React StrictMode cleanup cannot consume a recovery link.
    const boot = window.setTimeout(() => { void engine.resume().then(restoreFromHash); }, 0);
    const changed = (e: Event) => engine.markDirty(!!(e as CustomEvent).detail?.immediate);
    const wake = () => { void engine.syncNow(); };
    const storage = (e: StorageEvent) => {
      if (e.key === SESSION_KEY && !engine.matchesSession(e.newValue)) {
        // Another tab switched identity or logged out: stop this tab before it can recreate credentials.
        engine.dispose(); setChangedIdentity(true); setView({ ...idle, status: 'error', error: 'The cloud pass changed in another tab. Reload this page before continuing.' }); setManager(null);
      } else if (e.key && isGuestKey(e.key)) engine.markDirty();
    };
    const unload = (e: BeforeUnloadEvent) => { if (engine.view.shared && engine.view.status !== 'synced') { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener(CHANGE_EVENT, changed); window.addEventListener('online', wake); window.addEventListener('focus', wake); window.addEventListener('hashchange', restoreFromHash); window.addEventListener('storage', storage); window.addEventListener('beforeunload', unload);
    document.addEventListener('visibilitychange', wake);
    return () => { clearTimeout(boot); engine.dispose(); window.removeEventListener(CHANGE_EVENT, changed); window.removeEventListener('online', wake); window.removeEventListener('focus', wake); window.removeEventListener('hashchange', restoreFromHash); window.removeEventListener('storage', storage); window.removeEventListener('beforeunload', unload); document.removeEventListener('visibilitychange', wake); };
  }, [user]);
  return <Context.Provider value={{ manager, view, open: () => setOpened(true) }}>{changedIdentity ? <main className="school-page"><h1>The cloud pass changed in another tab.</h1><p>Reload this page before continuing, so new work goes to the right profile.</p><button className="btn" onClick={() => window.location.reload()}>Reload this page</button></main> : children}{opened && !user && <CloudAccountModal manager={manager} view={view} restoreCode={restore} onClose={() => { setOpened(false); setRestore(null); }} />}</Context.Provider>;
}
export function useCloudSync() { return useContext(Context); }
export function CloudStatusPill() {
  const { user } = useAccount(), { view, open } = useCloudSync(); if (user) return null;
  const label = view.status === 'syncing' ? 'Saving…' : view.status === 'synced' ? 'Cloud Saved ✓' : view.status === 'offline-saved-locally' ? 'Saved on Device (Offline)' : view.status === 'pending' ? 'Saved on Device' : view.status === 'error' ? 'Cloud save needs attention' : 'Save Progress (Free)';
  return <div className="cloud-controls"><button className={`cloud-pill cloud-${view.status}`} onClick={open} title={view.lastSyncedAt ? `Last saved ${new Date(view.lastSyncedAt).toLocaleString()}` : 'Save your progress on another device'}><span aria-hidden="true">{view.status === 'synced' ? '✓' : '☁'}</span><span>{label}</span></button>{view.shared && <button className="cloud-shared-exit" onClick={open}>Finish &amp; Log Out (Shared Computer)</button>}</div>;
}
