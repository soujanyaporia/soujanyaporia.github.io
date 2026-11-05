#!/usr/bin/env python3
"""Recheck a saved model candidate after a host-check fix, without another model call."""
import argparse,fcntl,hashlib,importlib.util,json,subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('rag_worker',ROOT/'rag-generator-worker.py')
worker=importlib.util.module_from_spec(spec);spec.loader.exec_module(worker)

def recheck(job,attempt,app_root):
 job=Path(job).resolve();app_root=Path(app_root).resolve()
 if attempt not in (1,2,3):raise ValueError('Choose saved attempt 1, 2 or 3.')
 with open(job/'.job.lock','a+') as lock:
  fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
  previous=json.loads((job/'checkpoint.json').read_text())
  if previous.get('status')=='running':raise ValueError('Do not recheck an active generation job.')
  packet=worker.packet_check(json.loads((job/'packet.json').read_text()))
  digest=hashlib.sha256(json.dumps(packet,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
  if digest!=previous.get('packetSha256'):raise ValueError('The retrieval packet has changed.')
  path=job/f'candidate-attempt-{attempt}.json'
  candidate=worker.candidate_check(json.loads(path.read_text()),packet)
  if candidate['decision']!='new-generator':raise ValueError('This saved attempt has no code to recheck.')
  worker.write_files(job,candidate)
  command=['node',str(ROOT/'rag-check-candidate.mjs'),'--app-root',str(app_root)]
  state={**previous,'status':'running','attempt':attempt,'recheckOf':{'status':previous['status'],'attempt':previous.get('attempt')},'modelInvokedForRecheck':False}
  worker.atomic_json(job/'checkpoint.json',state)
  try:
   result=subprocess.run(command,cwd=job,text=True,capture_output=True,timeout=300,check=False)
   check={'command':command,'exitCode':result.returncode,'stdout':result.stdout[-12000:],'stderr':result.stderr[-12000:]}
   report_path=job/'rag-check-report.json'
   report=json.loads(report_path.read_text()) if report_path.is_file() else {}
   expected_files={p.removeprefix('candidate/'):h for p,h in worker.file_hashes(job,candidate).items()}
   passed=result.returncode==0 and report.get('status')=='checks-passed' and report.get('packetSha256')==digest and report.get('candidateSha256')==hashlib.sha256(path.read_bytes()).hexdigest() and report.get('candidateFiles')==expected_files
   state.update(status='checks-passed' if passed else 'failed',decision='new-generator',checksExecuted=True,checks=[check],commands=[command],candidateFile=path.name,candidateSha256=hashlib.sha256(path.read_bytes()).hexdigest(),candidateDirectory='candidate',fileSha256=worker.file_hashes(job,candidate))
   if passed:state['checkReportSha256']=hashlib.sha256(report_path.read_bytes()).hexdigest()
   else:state.pop('checkReportSha256',None)
  except (OSError,subprocess.TimeoutExpired,ValueError) as error:
   state.update(status='failed',checksExecuted=True,recheckError=str(error));state.pop('checkReportSha256',None)
  worker.atomic_json(job/'checkpoint.json',state)
  return state

if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('job',type=Path);p.add_argument('--attempt',type=int,required=True);p.add_argument('--app-root',type=Path,required=True);a=p.parse_args()
 try:
  result=recheck(a.job,a.attempt,a.app_root);print(json.dumps({k:result.get(k) for k in ['jobId','status','candidateFile','checksExecuted','modelInvokedForRecheck']}));raise SystemExit(0 if result['status']=='checks-passed' else 1)
 except (OSError,ValueError) as error:p.exit(1,f'Recheck failed: {error}\n')
