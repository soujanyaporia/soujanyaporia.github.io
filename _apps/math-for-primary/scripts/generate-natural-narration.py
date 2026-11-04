"""Render continuous Kokoro narration with speech-timed picture cues. All synthesis is local."""
import os,json,pathlib,re,html,time,argparse
ROOT=pathlib.Path(__file__).resolve().parents[1]
os.environ['HF_HOME']=str(ROOT/'.tools/huggingface')
import espeakng_loader
from phonemizer.backend.espeak.wrapper import EspeakWrapper
EspeakWrapper.set_library(espeakng_loader.get_library_path())
from mlx_audio.tts.utils import load_model
import numpy as np,lameenc
import mlx.core as mx
mx.set_cache_limit(128*1024*1024)
mx.set_memory_limit(2*1024*1024*1024)

def normalized(s):return ''.join(c.casefold() for c in html.unescape(s) if c.isalnum())
def cues_for(segments,tokens):
    full=normalized(' '.join(segments));cursor=0;words=[]
    for text,start in tokens:
        token=normalized(text)
        if not token or start is None:continue
        pos=full.find(token,cursor)
        if pos<0:raise ValueError('Word alignment failed: '+text)
        words.append((pos,start));cursor=pos+len(token)
    position=0;cues=[0.]
    for segment in segments[:-1]:
        position+=len(normalized(segment));cue=next((start for pos,start in words if pos>=position),None)
        if cue is None:raise ValueError('Missing picture cue')
        cues.append(round(cue,3))
    return cues

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--voice',choices=['af_heart'],default='af_heart');parser.add_argument('--limit',type=int,default=0);parser.add_argument('--extra-ids');args=parser.parse_args()
    scripts=json.loads((ROOT/'.generated/narration-scripts.json').read_text());by_text={s['text']:s['id'] for s in scripts}
    extra=set(json.loads(pathlib.Path(args.extra_ids).read_text())) if args.extra_ids else set()
    planned=[s for s in scripts if s.get('segments') or s['text']=='How many fireflies are in the forest?' or s['id'] in extra]
    if args.limit:planned=planned[:args.limit]
    published_index=ROOT/'src/media/narration-index.json';index_path=ROOT/'.generated/natural-narration-index.json';index={k:v for k,v in json.loads((index_path if index_path.exists() else published_index).read_text()).items() if v.get('voice')=='kokoro:'+args.voice};target=ROOT/'public/audio';target.mkdir(exist_ok=True,parents=True)
    voice='kokoro:'+args.voice;style='kokoro-'+args.voice+'-v1';started=time.time()
    model=load_model('mlx-community/Kokoro-82M-bf16');pipeline=model._get_pipeline(args.voice[0])
    def save():
        temp=index_path.with_suffix('.tmp');temp.write_text(json.dumps(index,separators=(',',':'))+'\n');temp.replace(index_path)
    def recording(key,audio,cues=None):
        encoder=lameenc.Encoder();encoder.set_bit_rate(80);encoder.set_in_sample_rate(24000);encoder.set_channels(1);encoder.set_quality(2)
        pcm=(np.clip(audio,-1,1)*32767).astype(np.int16).tobytes();data=encoder.encode(pcm)+encoder.flush();temp=target/(key+'.part');temp.write_bytes(data);temp.replace(target/(key+'.mp3'))
        index[key]={'duration':round(len(audio)/24000,3),'voice':voice,'style':style,'approved':True,**({'cues':cues} if cues else {})}
    for i,s in enumerate(planned):
        if index.get(s['id'],{}).get('style')==style and (target/(s['id']+'.mp3')).exists():continue
        samples=[];tokens=[];offset=0.
        for r in pipeline(s['text'],voice=args.voice,speed=.95):
            audio=np.array(r.audio).reshape(-1);samples.append(audio)
            for t in r.tokens or []:
                if t.start_ts is not None:tokens.append((t.text,offset+t.start_ts))
            offset+=len(audio)/24000
        audio=np.concatenate(samples);cues=cues_for(s['segments'],tokens) if s.get('segments') else None
        if not len(audio) or not np.isfinite(audio).all():raise ValueError('Invalid waveform')
        recording(s['id'],audio,cues)
        if cues:
            for j,segment in enumerate(s['segments']):
                key=by_text.get(segment)
                if key and key!=s['id']:
                    start=max(0,int((cues[j]-.035)*24000));end=int((cues[j+1] if j+1<len(cues) else len(audio)/24000)*24000)
                    recording(key,audio[start:end])
        save();print(f'{i+1}/{len(planned)} continuous recordings ready · {time.time()-started:.0f}s',flush=True)
    published_index.write_text(json.dumps({k:{**v,'approved':True} for k,v in index.items()},separators=(',',':'))+'\n');print('Finished natural recordings.',flush=True)
if __name__=='__main__':main()
