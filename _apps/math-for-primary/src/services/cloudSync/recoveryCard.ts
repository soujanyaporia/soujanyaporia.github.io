import QRCode from 'qrcode';
import { normalizePassphrase } from './wordlist';
export const RESTORE_BASE = 'https://soujanyaporia.github.io/singapore-primary-maths/';
export function restoreUrl(phrase: string) { return `${RESTORE_BASE}#/guest?restore=${encodeURIComponent(normalizePassphrase(phrase))}`; }
export async function qrDataUrl(phrase: string): Promise<string> { return QRCode.toDataURL(restoreUrl(phrase), { errorCorrectionLevel: 'M', margin: 4, width: 300, color: { dark: '#172b24', light: '#ffffff' } }); }
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export async function downloadRecoveryCard(phrase: string, nickname: string) {
  const code = normalizePassphrase(phrase), canvas = document.createElement('canvas'); canvas.width = 1400; canvas.height = 1000;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('This browser cannot make a recovery card. Copy or write down your code.');
  ctx.fillStyle = '#f5f8ef'; ctx.fillRect(0, 0, 1400, 1000); ctx.fillStyle = '#18372a';
  ctx.font = 'bold 52px sans-serif'; ctx.fillText('My Maths Cloud Pass', 70, 110);
  ctx.font = '30px sans-serif'; ctx.fillText((nickname || 'Explorer').slice(0, 30), 70, 167);
  const parts = code.split('-'); ctx.font = 'bold 48px sans-serif';
  ctx.fillText(`${parts[0]}   ·   ${parts[1]}`, 70, 280); ctx.fillText(`${parts[2]}   ·   ${parts[3]}   ·   ${parts[4]}`, 70, 352);
  const qr = document.createElement('canvas'); await QRCode.toCanvas(qr, restoreUrl(code), { errorCorrectionLevel: 'M', margin: 4, width: 400 }); ctx.drawImage(qr, 70, 420, 400, 400);
  ctx.font = 'bold 32px sans-serif'; ctx.fillText('Keep this card secret.', 520, 500);
  ctx.font = '27px sans-serif';
  ['Anyone with this code can open your progress.', 'Ask a grown-up to keep a safe copy.', 'Scan this QR code, or enter all four words', 'and the number on the Cloud Pass screen.'].forEach((line, i) => ctx.fillText(line, 520, 560 + i * 48));
  ctx.font = '25px sans-serif'; ctx.fillText('soujanyaporia.github.io/singapore-primary-maths/#/guest', 70, 900);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('The recovery card could not be downloaded.')), 'image/png'));
  downloadBlob(blob, 'my-maths-recovery-card.png');
}
