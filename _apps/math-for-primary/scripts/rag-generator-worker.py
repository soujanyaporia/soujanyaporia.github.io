#!/usr/bin/env python3
"""Stage one retrieved-source code candidate in an isolated job folder.

No application integration or corpus coverage mutation is performed. Tests run
only when explicit JSON-array commands are supplied; otherwise output remains
unverified. A two-slot advisory lock bounds concurrent local worker processes.
"""
from __future__ import annotations
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import sys
import tempfile
import time
from typing import Callable

ROOT = Path(__file__).resolve().parent
SCHEMA = ROOT / 'rag' / 'candidate-schema.json'
PROMPT = ROOT / 'rag' / 'worker-prompt.txt'
JOB_ID = re.compile(r'^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$')
PATTERN_ID = re.compile(r'^[a-z0-9][a-z0-9-]{0,119}$')
MAX_PACKET = 2_000_000
MAX_CANDIDATE = 2_000_000

class WorkerError(ValueError):
    pass

def packet_check(packet: object) -> dict:
    if not isinstance(packet, dict) or packet.get('schema') != 1 or not isinstance(packet.get('jobId'), str) or not JOB_ID.fullmatch(packet['jobId']):
        raise WorkerError('Packet schema or jobId is invalid.')
    if not isinstance(packet.get('level'), int) or isinstance(packet['level'], bool) or packet['level'] not in range(1, 7) or not isinstance(packet.get('topic'), str) or not packet['topic']:
        raise WorkerError('Packet level or topic is invalid.')
    for key in ('sourceRegions','existingGenerators','referenceFiles','requirements'):
        if not isinstance(packet.get(key), list):
            raise WorkerError(f'Packet {key} must be an array.')
    if not packet['sourceRegions']:
        raise WorkerError('Packet must contain at least one source region.')
    for source in packet['sourceRegions']:
        if not isinstance(source, dict) or not isinstance(source.get('bankLine'), int) or isinstance(source.get('bankLine'), bool) or not isinstance(source.get('paperId'), str) or not source['paperId'] or not isinstance(source.get('questionNumber'), str) or not isinstance(source.get('pageNumbers'), list) or not source['pageNumbers'] or not all(isinstance(p,int) and not isinstance(p,bool) and p>0 for p in source['pageNumbers']):
            raise WorkerError('Invalid source region identity or pages.')
        if source.get('level') != packet['level'] or not isinstance(source.get('rawText'), str):
            raise WorkerError('Source level or text does not match the packet.')
        if not isinstance(source.get('sourceSha256'),str) or not re.fullmatch(r'[a-fA-F0-9]{64}',source['sourceSha256']) or not isinstance(source.get('sourcePdf'),str) or not source['sourcePdf']:
            raise WorkerError('Source PDF path and SHA-256 are required.')
        if not isinstance(source.get('pageTexts'),list) or not isinstance(source.get('pageImages'),list):
            raise WorkerError('Source page texts and image references must be arrays.')
        for page in source['pageTexts']:
            if not isinstance(page,dict) or not isinstance(page.get('page'),int) or isinstance(page.get('page'),bool) or page['page']<1 or not isinstance(page.get('text'),str):
                raise WorkerError('Invalid source page text.')
    return packet

def candidate_path(raw: object) -> PurePosixPath:
    if not isinstance(raw,str) or len(raw)>240 or '\\' in raw or '\x00' in raw:
        raise WorkerError('Candidate path must be a bounded POSIX path.')
    path=PurePosixPath(raw)
    if path.is_absolute() or len(path.parts)!=5 or path.parts[:4]!=('candidate','src','primary','paperImports') or not re.fullmatch(r'rag[A-Za-z0-9_-]+(?:\.test)?\.tsx?',path.name) or any(p in ('.','..') for p in raw.split('/')) or '//' in raw:
        raise WorkerError('Candidate paths must be new code files inside candidate/.')
    if any(part.lower() in ('catalog.ts','catalog.tsx','generate.ts','questions.ts','picture.tsx','practicepapers.tsx','primarygame.tsx','practicepaper.ts','sessionquestions.ts','answerformat.ts','package.json','tsconfig.json') for part in path.parts):
        raise WorkerError('Candidate cannot propose shared routing or configuration files.')
    if ROOT.parent.joinpath(*path.parts[1:]).exists():
        raise WorkerError('Candidate path would overwrite an existing application file.')
    return path

def candidate_check(candidate: object, packet: dict) -> dict:
    required={'decision','canonicalPatternId','sourceRefs','reasoning','files','tests','blockingGaps'}
    if not isinstance(candidate,dict) or set(candidate)!=required:
        raise WorkerError('Candidate does not contain exactly the required fields.')
    decision=candidate['decision']
    if decision not in ('new-generator','reuse','needs-review'):
        raise WorkerError('Unknown decision.')
    pattern=candidate['canonicalPatternId']
    # Reuse may identify a current baseline activity ID (some contain capitals).
    known_id=decision=='reuse' and isinstance(pattern,str) and bool(re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,159}',pattern)) and any(isinstance(g,dict) and g.get('id')==pattern for g in packet['existingGenerators'])
    if not isinstance(pattern,str) or (pattern and not PATTERN_ID.fullmatch(pattern) and not known_id) or (decision!='needs-review' and not pattern):
        raise WorkerError('Invalid canonical pattern ID.')
    for key in ('reasoning',):
        if not isinstance(candidate[key],str) or not candidate[key].strip() or len(candidate[key])>20000:
            raise WorkerError(f'Invalid {key}.')
    for key in ('tests','blockingGaps'):
        if not isinstance(candidate[key],list) or len(candidate[key])>40 or any(not isinstance(x,str) or not x.strip() or len(x)>4000 for x in candidate[key]):
            raise WorkerError(f'Invalid {key}.')
    if decision=='reuse' and not any(isinstance(g,dict) and pattern in (g.get('id'),g.get('canonicalPatternId')) for g in packet['existingGenerators']):
        raise WorkerError('Reuse must identify an existing generator in the packet.')
    refs=candidate['sourceRefs']
    if not isinstance(refs,list) or not refs or len(refs)>len(packet['sourceRegions']):
        raise WorkerError('At least one in-packet source reference is required.')
    identities={(x['bankLine'],x['paperId'],x['questionNumber']):set(x['pageNumbers']) for x in packet['sourceRegions']}
    for ref in refs:
        if not isinstance(ref,dict) or set(ref)!={'bankLine','paperId','questionNumber','pageNumbers'} or not isinstance(ref['pageNumbers'],list) or not ref['pageNumbers']:
            raise WorkerError('Invalid source reference.')
        try: pages=identities[(ref['bankLine'],ref['paperId'],ref['questionNumber'])]
        except (KeyError,TypeError): raise WorkerError('Source reference is not in the packet.') from None
        if any(not isinstance(p,int) or isinstance(p,bool) or p not in pages for p in ref['pageNumbers']):
            raise WorkerError('Source reference contains an unprovided page.')
        source=next(x for x in packet['sourceRegions'] if (x['bankLine'],x['paperId'],x['questionNumber'])==(ref['bankLine'],ref['paperId'],ref['questionNumber']))
        available={p['page'] for p in source['pageTexts'] if p.get('text','').strip() and not p.get('missing',False)}
        if decision!='needs-review' and (ref['questionNumber']=='unresolved' or not set(ref['pageNumbers']).issubset(available)):
            raise WorkerError('Unresolved question identity or missing cited page text requires needs-review.')
    files=candidate['files']
    if not isinstance(files,list) or len(files)>24 or (decision=='new-generator' and (not files or not candidate['tests'])) or (decision!='new-generator' and files):
        raise WorkerError('Files/tests do not fit the decision.')
    paths=set()
    for f in files:
        if not isinstance(f,dict) or set(f)!={'path','content'} or not isinstance(f['content'],str) or not f['content'] or len(f['content'])>250000:
            raise WorkerError('Invalid candidate file.')
        path=str(candidate_path(f['path']))
        if path in paths: raise WorkerError('Duplicate candidate path.')
        paths.add(path)
    if decision=='new-generator' and (not any(p.endswith('.test.ts') for p in paths) or not any(p.endswith(('.ts','.tsx')) and not p.endswith(('.test.ts','.test.tsx')) for p in paths)):
        raise WorkerError('A new generator needs a new rag*.test.ts and a separate rag* implementation file.')
    if decision=='needs-review' and not candidate['blockingGaps']:
        raise WorkerError('A needs-review decision must explain its blocking gaps.')
    return candidate

def validated_images(packet: dict, roots: list[Path]) -> list[str]:
    """Attach only hash-verified page images under the packet or job directory."""
    allowed=[p.resolve() for p in roots];result=[]
    for region in packet['sourceRegions']:
        for item in region['pageImages']:
            if not isinstance(item,dict) or not isinstance(item.get('path'),str) or not isinstance(item.get('page'),int) or item['page'] not in region['pageNumbers'] or not isinstance(item.get('sha256'),str) or not re.fullmatch(r'[a-fA-F0-9]{64}',item['sha256']):
                raise WorkerError('Invalid page image reference.')
            path=Path(item['path']).resolve()
            if not any(path.is_relative_to(root) for root in allowed) or path.suffix.lower() not in ('.png','.jpg','.jpeg','.webp') or not path.is_file() or path.stat().st_size>8_000_000:
                raise WorkerError('Page image must be a bounded local image under the packet or job directory.')
            data=path.read_bytes()
            if hashlib.sha256(data).hexdigest().lower()!=item['sha256'].lower():
                raise WorkerError('Page image SHA-256 does not match the retrieval packet.')
            if not (data.startswith(b'\x89PNG\r\n\x1a\n') or data.startswith(b'\xff\xd8\xff') or (data.startswith(b'RIFF') and data[8:12]==b'WEBP')):
                raise WorkerError('Page image is not a recognised PNG, JPEG or WebP file.')
            if str(path) not in result: result.append(str(path))
            if len(result)>12: raise WorkerError('Too many page images for one job.')
    return result

def atomic_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.NamedTemporaryFile('w',dir=path.parent,delete=False,encoding='utf-8') as stream:
        tmp=Path(stream.name);json.dump(data,stream,indent=2,ensure_ascii=False);stream.write('\n')
    os.replace(tmp,path)

def write_files(job: Path, candidate: dict) -> None:
    base=job/'candidate'
    if base.is_symlink(): raise WorkerError('Candidate directory may not be a symlink.')
    if base.exists(): shutil.rmtree(base)
    for item in candidate['files']:
        rel=candidate_path(item['path']);target=job.joinpath(*rel.parts)
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_text(item['content'],encoding='utf-8')

def parse_commands(values: list[str]) -> list[list[str]]:
    commands=[]
    for raw in values:
        try: command=json.loads(raw)
        except json.JSONDecodeError as e: raise WorkerError(f'Invalid check command JSON: {e.msg}') from e
        if not isinstance(command,list) or not command or len(command)>64 or any(not isinstance(x,str) or not x or '\x00' in x for x in command):
            raise WorkerError('Every check command must be a nonempty JSON array of strings.')
        if Path(command[0]).name.lower() in ('sh','bash','zsh','fish','dash','ksh','cmd','cmd.exe','powershell','powershell.exe'):
            raise WorkerError('Check commands may not invoke a shell.')
        commands.append(command)
    return commands

def file_hashes(job: Path, candidate: dict) -> dict[str,str]:
    hashes={}
    for item in candidate['files']:
        rel=candidate_path(item['path']);target=job.joinpath(*rel.parts)
        if any(job.joinpath(*rel.parts[:i]).is_symlink() for i in range(1,len(rel.parts)+1)) or not target.is_file():
            raise WorkerError('Candidate file is missing or is a symlink.')
        hashes[str(rel)]=hashlib.sha256(target.read_bytes()).hexdigest()
    return hashes

def run_job(packet: dict, job: Path, commands: list[list[str]], *, codex: str='codex', timeout: int=180, max_repairs: int=2, resume: bool=False, image_roots: list[Path]|None=None, run: Callable=subprocess.run) -> dict:
    packet=packet_check(packet)
    if timeout<1 or timeout>1800 or max_repairs not in range(3): raise WorkerError('Invalid timeout or repair count.')
    job.mkdir(parents=True,exist_ok=True)
    images=validated_images(packet,image_roots or [job])
    checkpoint=job/'checkpoint.json'
    digest=hashlib.sha256(json.dumps(packet,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
    if checkpoint.exists():
        state=json.loads(checkpoint.read_text(encoding='utf-8'))
        if state.get('packetSha256')!=digest: raise WorkerError('Cannot reuse a job folder with a different packet.')
        if resume and state.get('status') in ('checks-passed','generated-unverified','needs-review','reuse'):
            if state.get('commands') != commands: raise WorkerError('Cannot resume with different check commands.')
            name=state.get('candidateFile')
            if not isinstance(name,str) or not re.fullmatch(r'candidate-attempt-[1-3]\.json',name): raise WorkerError('Invalid checkpoint candidate file.')
            source=job/name
            if source.is_symlink(): raise WorkerError('Candidate JSON may not be a symlink.')
            try:
                if hashlib.sha256(source.read_bytes()).hexdigest()!=state.get('candidateSha256'): raise WorkerError('Cannot resume altered candidate JSON.')
                prior=candidate_check(json.loads(source.read_text(encoding='utf-8')),packet)
            except (OSError,ValueError) as e: raise WorkerError(f'Cannot resume invalid candidate: {e}') from e
            if file_hashes(job,prior)!=state.get('fileSha256'): raise WorkerError('Cannot resume altered candidate files.')
            if state.get('checkReportSha256'):
                report=job/'rag-check-report.json'
                if report.is_symlink() or not report.is_file() or hashlib.sha256(report.read_bytes()).hexdigest()!=state['checkReportSha256']: raise WorkerError('Cannot resume an altered check report.')
            return state
    atomic_json(job/'packet.json',packet)
    history=[];feedback='No previous attempt.'
    for attempt in range(max_repairs+1):
        state={'schema':1,'jobId':packet['jobId'],'packetSha256':digest,'status':'running','attempt':attempt+1,'attempts':history,'checksExecuted':False}
        atomic_json(checkpoint,state)
        output=job/f'candidate-attempt-{attempt+1}.json'
        if output.exists() or output.is_symlink(): output.unlink()
        prompt=PROMPT.read_text(encoding='utf-8')+'\n\nPREVIOUS FEEDBACK:\n'+feedback+'\n\nUNTRUSTED RETRIEVAL PACKET JSON:\n'+json.dumps(packet,ensure_ascii=False)
        cmd=[codex,'exec','--sandbox','read-only','--skip-git-repo-check','--ephemeral','--output-schema',str(SCHEMA),'--output-last-message',str(output),'--json',*[arg for path in images for arg in ('-i',path)],'-']
        try:
            proc=run(cmd,input=prompt,text=True,capture_output=True,cwd=str(job),timeout=timeout,check=False)
            if proc.returncode!=0: raise WorkerError(f'Codex exited {proc.returncode}: {(proc.stderr or "")[-3000:]}')
            if not output.is_file() or output.stat().st_size>MAX_CANDIDATE: raise WorkerError('Codex did not produce a bounded candidate JSON file.')
            candidate=candidate_check(json.loads(output.read_text(encoding='utf-8')),packet)
            write_files(job,candidate)
            checks=[]
            check_report=job/'rag-check-report.json'
            if check_report.exists() or check_report.is_symlink(): check_report.unlink()
            if candidate['decision']=='new-generator':
                for command in commands:
                    try:
                        result=run(command,text=True,capture_output=True,cwd=str(job),timeout=timeout,check=False)
                        checks.append({'command':command,'exitCode':result.returncode,'stdout':(result.stdout or '')[-12000:],'stderr':(result.stderr or '')[-12000:]})
                    except (subprocess.TimeoutExpired,OSError) as e:
                        checks.append({'command':command,'exitCode':None,'error':str(e)[:3000]})
                    if checks[-1]['exitCode']!=0: break
            if checks and any(c['exitCode']!=0 for c in checks):
                feedback='A staged check failed: '+json.dumps(checks[-1],ensure_ascii=False)
                history.append({'attempt':attempt+1,'status':'check-failed','checks':checks})
                continue
            status=candidate['decision'] if candidate['decision']!='new-generator' else ('checks-passed' if checks else 'generated-unverified')
            state={'schema':1,'jobId':packet['jobId'],'packetSha256':digest,'status':status,'attempt':attempt+1,'attempts':history,'decision':candidate['decision'],'checksExecuted':bool(checks),'checks':checks,'candidateFile':output.name,'candidateSha256':hashlib.sha256(output.read_bytes()).hexdigest(),'candidateDirectory':'candidate' if candidate['files'] else None,'fileSha256':file_hashes(job,candidate),'commands':commands}
            if check_report.exists() or check_report.is_symlink():
                if check_report.is_symlink() or check_report.stat().st_size>MAX_CANDIDATE: raise WorkerError('Invalid check report file.')
                report_bytes=check_report.read_bytes();report=json.loads(report_bytes)
                expected_files={k.removeprefix('candidate/'):v for k,v in state['fileSha256'].items()}
                if status!='checks-passed' or report.get('status')!='checks-passed' or report.get('packetSha256')!=digest or report.get('candidateSha256')!=state['candidateSha256'] or report.get('candidateFiles')!=expected_files: raise WorkerError('Check report does not bind the current packet and candidate files.')
                state['checkReportSha256']=hashlib.sha256(report_bytes).hexdigest()
            atomic_json(checkpoint,state);return state
        except (WorkerError,json.JSONDecodeError,UnicodeError,OSError,subprocess.TimeoutExpired) as e:
            feedback=f'Candidate generation or validation failed: {str(e)[:3000]}'
            history.append({'attempt':attempt+1,'status':'invalid-or-failed','error':feedback})
    state={'schema':1,'jobId':packet['jobId'],'packetSha256':digest,'status':'failed','attempt':len(history),'attempts':history,'checksExecuted':any(a.get('checks') for a in history)}
    atomic_json(checkpoint,state);return state

def main() -> int:
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('packet',type=Path);p.add_argument('--jobs-dir',type=Path,required=True);p.add_argument('--codex',default='codex');p.add_argument('--timeout',type=int,default=180);p.add_argument('--max-repairs',type=int,default=2);p.add_argument('--resume',action='store_true');p.add_argument('--check-command-json',action='append',default=[],metavar='JSON_ARRAY')
    args=p.parse_args()
    try:
        if args.packet.stat().st_size>MAX_PACKET: raise WorkerError('Packet exceeds size limit.')
        packet=packet_check(json.loads(args.packet.read_text(encoding='utf-8')));commands=parse_commands(args.check_command_json)
        root=args.jobs_dir.resolve();root.mkdir(parents=True,exist_ok=True);job=root/packet['jobId']
        if job.is_symlink(): raise WorkerError('Job directory may not be a symlink.')
        locks=root/'.worker-locks';locks.mkdir(exist_ok=True)
        held=None
        for n in range(2):
            lock=open(locks/f'slot-{n}.lock','a+')
            try: fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB);held=lock;break
            except BlockingIOError: lock.close()
        if held is None: raise WorkerError('Both worker slots are occupied; retry later.')
        try:
            job.mkdir(parents=True,exist_ok=True)
            with open(job/'.job.lock','a+') as joblock:
                try: fcntl.flock(joblock,fcntl.LOCK_EX|fcntl.LOCK_NB)
                except BlockingIOError: raise WorkerError('This job is already running.') from None
                try: state=run_job(packet,job,commands,codex=args.codex,timeout=args.timeout,max_repairs=args.max_repairs,resume=args.resume,image_roots=[args.packet.resolve().parent,job])
                finally: fcntl.flock(joblock,fcntl.LOCK_UN)
        finally:
            fcntl.flock(held,fcntl.LOCK_UN);held.close()
        print(json.dumps(state,ensure_ascii=False));return 1 if state['status']=='failed' else 0
    except (OSError,ValueError,json.JSONDecodeError) as e:
        print(f'Worker error: {e}',file=sys.stderr);return 2
if __name__=='__main__': raise SystemExit(main())
