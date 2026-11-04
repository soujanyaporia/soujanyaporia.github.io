import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

function fakeAudio() {
  const oscillators: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }[] = [];
  const resume = vi.fn().mockResolvedValue(undefined);
  const param = () => ({ setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
  class FakeContext {
    state = 'suspended'; currentTime = 0; destination = {}; resume = resume;
    createOscillator() {
      const osc = { type: 'sine', frequency: param(), connect: vi.fn((gain) => gain), start: vi.fn(), stop: vi.fn(), disconnect: vi.fn(), onended: null };
      oscillators.push(osc); return osc;
    }
    createGain() { return { gain: param(), connect: vi.fn(), disconnect: vi.fn() }; }
  }
  const AudioContext = vi.fn(FakeContext);
  vi.stubGlobal('window', { AudioContext });
  return { AudioContext, oscillators, resume };
}

describe('adventure audio', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllGlobals());
  it('never creates audio when sounds are muted', async () => {
    const mock = fakeAudio(), { playSound } = await import('./sound');
    playSound('correct', false); playSound('complete', false);
    expect(mock.AudioContext).not.toHaveBeenCalled();
  });
  it('schedules a distinct answer melody and cancels scheduled notes on mute', async () => {
    const mock = fakeAudio(), { playSound, stopSounds } = await import('./sound');
    playSound('correct', true);
    expect(mock.oscillators).toHaveLength(3);
    expect(mock.oscillators.map(o => o.start.mock.calls[0][0])).toEqual([0, .075, .15]);
    stopSounds();
    for (const osc of mock.oscillators) expect(osc.stop).toHaveBeenLastCalledWith();
  });
  it('does not queue autoplay before the first user interaction', async () => {
    const mock = fakeAudio();
    vi.stubGlobal('navigator', {userActivation:{hasBeenActive:false}});
    const { playSound } = await import('./sound');
    playSound('complete', true);
    expect(mock.AudioContext).not.toHaveBeenCalled();
  });
  it('keeps rapid taps from building up overlapping audio', async () => {
    const mock = fakeAudio(), { playSound } = await import('./sound');
    playSound('tap', true); playSound('tap', true); playSound('tap', true);
    expect(mock.oscillators).toHaveLength(1);
  });
  it('keeps the app usable when audio is unsupported or blocked', async () => {
    vi.stubGlobal('window', {});
    const { playSound } = await import('./sound');
    expect(() => playSound('complete', true)).not.toThrow();
    const mock = fakeAudio(); mock.resume.mockRejectedValue(new Error('blocked'));
    expect(() => playSound('hint', true)).not.toThrow();
    await Promise.resolve();
  });
});
