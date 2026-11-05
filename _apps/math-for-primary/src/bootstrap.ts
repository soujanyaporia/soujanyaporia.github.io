import { captureRestoreHash } from './services/cloudSync/restoreHash';
captureRestoreHash();
// Capture phase also scrubs codes pasted into the hash of an already-open tab.
window.addEventListener('hashchange', captureRestoreHash, { capture: true });
void import('./main');
