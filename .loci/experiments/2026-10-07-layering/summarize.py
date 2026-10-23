#!/usr/bin/env python3
import collections, json, pathlib, statistics
from run import grade

root=pathlib.Path(__file__).resolve().parent
results=[json.loads(p.read_text()) for p in sorted((root/'results').glob('*.json'))]
for r in results:
 r['checks']=grade(root/'fixtures'/r['id'],r['case'],r['changed'],r['trace'],r['reply'])
 r['passed']=not r['error'] and bool(r['reply'].strip()) and all(r['checks'].values())
groups=collections.defaultdict(list)
for r in results: groups[(r['model'],r['variant'],r.get('think',True),r.get('absolute_index',False))].append(r)
summary=[]
for (model,variant,think,absolute_index),rs in sorted(groups.items()):
 valid=[r for r in rs if not r['error'] or r['error']=='step limit reached']
 def median(k):
  xs=[r[k] for r in rs if r.get(k) is not None]
  return round(statistics.median(xs),2) if xs else None
 summary.append({'model':model,'variant':variant,'think':think,'absolute_index':absolute_index,'n':len(rs),'errors':len(rs)-len(valid),'pass':sum(r['passed'] for r in valid),'valid':len(valid),'rule_bytes':rs[0]['rule_bytes'],'median_first_prompt_tokens':median('first_prompt_tokens'),'median_summed_prompt_tokens':median('summed_prompt_tokens'),'median_seconds':median('seconds'),'median_tool_calls':median('tool_calls'),'guide_cases':sum(bool(r['guide_reads']) for r in rs),'startup_config_cases':sum(any(t['name']=='read_file' and t['args'].get('path')=='brain/.loci/config.yml' and not t['failed'] for t in r['trace']) for r in rs),'tool_errors':sum(sum(t['failed'] or (t['name']=='run_task_writer' and json.loads(t['result']).get('exit_code',0)!=0) for t in r['trace']) for r in rs)})
(root/'summary.json').write_text(json.dumps({'groups':summary,'cases':[{k:r.get(k) for k in ['id','case','variant','model','passed','checks','error','seconds','tool_calls','guide_reads']} for r in results]},ensure_ascii=False,indent=2))
for r in summary: print(json.dumps(r,ensure_ascii=False))
