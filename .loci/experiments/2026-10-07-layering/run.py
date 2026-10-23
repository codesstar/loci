#!/usr/bin/env python3
"""Isolated Ollama tool-agent ablation. No native client loading is implied."""
import argparse, hashlib, json, pathlib, re, shutil, subprocess, time, urllib.request

HERE = pathlib.Path(__file__).resolve().parent
REPO = next(p for p in HERE.parents if (p/'scripts/loci-task.js').is_file())

GUIDES = {
 'startup.md': '''# 启动与保存
读 me/preferences.md 和 .loci/config.yml 一次；偏好用于本次回复。persistence.mode=auto 时保存明确任务、日程、稳定偏好/事实、已作出的决策。manual 只按明确保存/更新请求写入。不保存闲聊、原始对话、未确定想法；敏感、临时情绪、重大个人方向先问。
按需读最小来源，不全量扫描。所有新增记录标注时间和来源。每次修改在 .loci/activity/YYYY-MM.md 当天标题下留一行 - HH:MM · 类别 · 摘要，工具已记录不重复。写成功后简短确认，失败不假装成功。''',
 'tasks.md': '''# 任务和日程
要完成的事情是任务，带日期时间仍是任务；会议、预约、占用时间块是日程。两者不自动复制。任务、日程只能通过 scripts/loci-task.js 写入，不直接改 tasks/*.json，不用 daily 文件代替。
先读相关数据去重；不认识参数时调用帮助。
任务：add --title 标题 --date YYYY-MM-DD --start HH:MM
日程：schedule --title 标题 --date YYYY-MM-DD --start HH:MM --end HH:MM
工具已写活动记录，不重复追加。提醒未验证送达不说已送达。''',
 'personal.md': '''# 个人资料
称呼、语言、语气、工作方式写 me/preferences.md，立即在回复生效。保留已有内容，新记录带时间与来源。
稳定身份 me/identity.md；新反思 me/insights.md；稳定原则 me/values.md；经验 me/learned.md；身心状态 me/wellbeing.md。重大变化先更新当前文件再追加 me/evolution.md。目标 plan.md。短暂情绪和探索不提升为事实。修改后活动记录一次。''',
 'projects.md': '''# 项目
大脑 projects/index.md 只存索引，先匹配该索引再去对应仓库读 .loci/memory.md 当前状态；详细旧决定按需读取，勿扫所有项目。
项目的技术决定只对该项目有意义，写对应仓库 .loci/decisions/YYYY-MM-DD-slug.md，四部分：Background / Options / Decision / Follow-up；frontmatter 至少 date、status: decided，保留理由与 ISO 时间来源。已确定改变当前行为的决定，同步更新该项目 .loci/memory.md，不复制到个人 decisions/，不把完整决定复制入 projects/index.md。
稳定信息 .loci/profile.md，进展 .loci/progress/YYYY-MM.md；研究文档 .loci/knowledge/，待办用 loci-projtodo.js。只按用户要求或同意连接新项目。修改后活动记录一次。''',
 'people.md': '''# 人物、关系与地点
人物记录 people/<slug>.md，YAML name 是匹配键；不要凭文件名猜名字。写关系须确认两端都有记录，不存在就先创建，再写 people/.connections.json。
连接文件为数组，元素 [a,b,"关系说明"]，a/b 必须与 name 完全相同，保留旧边，不重复。过往互动进入该人物 interactions。人物是联系人而非稳定用户身份。修改后活动记录一次。''',
 'notes.md': '''# 笔记与碎片
用户自己的笔记写 notes/ 并在 notes/index.md 留一行指针；外部笔记只存指针，正文原位。项目研究文档写项目 .loci/knowledge/。
短想法、外部链接、引用、图片是碎片，用 scripts/loci-scrap.js，不向 inbox.md 追加。不要把探索当决定。写后活动记录一次。''',
}

INDEX = '''
## 详细规则索引（路径相对大脑）
遇到对应内容，先读取相应指南；本会话已读且未变化就复用。启动和保存设置→rules/startup.md；任务/日程→rules/tasks.md；偏好/个人资料→rules/personal.md；项目读取/决定/研究→rules/projects.md；人物/关系/地点→rules/people.md；笔记/碎片→rules/notes.md。不要启动时一次加载全部指南。
'''

COMPACT = '''# Loci 共享记忆
大脑：`brain`。数据路径相对大脑，项目路径由 projects/index.md 定位。
启动只读 me/preferences.md 和 .loci/config.yml 一次，偏好立即生效。persistence.mode 默认 auto，读失败暂停自动保存；不预读全部任务/笔记/历史。缓存已读内容，当前/最新问题刷新最小来源。
每次请求后检查：auto 保存明确任务、日程、稳定事实/偏好、已决定事项、希望保留的材料；manual 仅按明确保存/更新请求写入。无信号不保存；敏感、含糊、临时情绪、重大个人策略先问。提炼不存原始聊天，写前查重，不把讨论当结论。
## 常驻路由索引
| 场景 | 数据入口 | 执行前的指南 |
|---|---|---|
| 任务或日程 | tasks/tasks.json、tasks/calendar.json | rules/tasks.md |
| 偏好或个人资料 | me/preferences.md、me/ | rules/personal.md |
| 目标、个人决策 | plan.md、decisions/ | rules/personal.md、rules/startup.md |
| 项目上下文或决定 | projects/index.md → 对应仓库 .loci/ | rules/projects.md |
| 人物、关系、地点 | people/、places/ | rules/people.md |
| 笔记、碎片、材料 | notes/index.md、references/ | rules/notes.md |
遇到对应场景先读该指南，只加载需要的一份；已读未变则复用。参数和格式在指南及工具帮助里。
结构化数据通过对应写入工具维护；普通 Markdown 保留原内容，标注时间来源。成功再确认；写后活动记录一次，工具已记录不重复。无法读写如实说明。撤销尽量恢复上次修改并保留其他变更。
'''

POINTER = '''# Loci
共享大脑在 `brain`。启动读 me/preferences.md 和 .loci/config.yml，一次后复用；不要扫描整个大脑。Loci 提供个人记忆的按需读写，遇到记忆相关内容按以下索引读取规则再处理。
- 启动、保存判断、记录要求：rules/startup.md
- 任务与日程：rules/tasks.md → tasks/
- 偏好与个人资料：rules/personal.md → me/
- 项目：rules/projects.md → projects/index.md → 项目仓库 .loci/
- 人物/关系/地点：rules/people.md → people/、places/
- 笔记/碎片：rules/notes.md → notes/index.md、references/
详细指令留在上述文件，按需加载，本会话已读未变则复用。成功后简短确认。
'''

CASES = [
 ('chitchat','今天地铁上人好多啊。','auto'),
 ('timed-task','明天早上九点把季度材料发给客户。','auto'),
 ('meeting','明天下午三点到四点和林舟开会。','auto'),
 ('manual','明天早上九点把季度材料发给客户。','manual'),
 ('preference','以后叫我队长，回答简短一点。','auto'),
 ('latest','风铃项目现在选的存储方案是什么？为什么？','auto'),
 ('decision','风铃项目已经决定采用 SQLite，不用云数据库，因为第一版必须离线可用。','auto'),
 ('relationship','记一下：林舟是周楠的朋友。','auto'),
 ('manual-statement','我明天早上九点要把季度材料发给客户。','manual'),
]

def schema(name, description, properties, required):
 return {'type':'function','function':{'name':name,'description':description,'parameters':{'type':'object','properties':properties,'required':required}}}
TOOLS = [
 schema('read_file','读取工作区内一个 UTF-8 文件；路径相对工作区。',{'path':{'type':'string'}},['path']),
 schema('list_files','列出工作区内目录的直接子项。',{'path':{'type':'string'}},['path']),
 schema('write_file','以给定完整内容写入工作区文件。',{'path':{'type':'string'},'content':{'type':'string'}},['path','content']),
 schema('run_task_writer','运行工作区 brain/scripts/loci-task.js，argv 是命令和参数数组。',{'argv':{'type':'array','items':{'type':'string'}}},['argv']),
]

def put(root, path, content):
 p=root/path; p.parent.mkdir(parents=True,exist_ok=True); p.write_text(content)

def fixture(root, variant, mode):
 if root.exists(): shutil.rmtree(root)
 root.mkdir(parents=True)
 for name,content in GUIDES.items(): put(root,'brain/rules/'+name,content)
 put(root,'brain/me/README.md',GUIDES['personal.md'])
 put(root,'brain/me/preferences.md','# 偏好\n用中文回复。\n')
 put(root,'brain/.loci/config.yml',f'language: zh\npersistence:\n  mode: {mode}\n')
 put(root,'brain/tasks/tasks.json','[]\n'); put(root,'brain/tasks/calendar.json','{}\n')
 put(root,'brain/tasks/active.md','# 当前任务\n')
 put(root,'brain/projects/index.md','# 项目索引\n- 风铃 · ../work/windbell · 状态与指针在该仓库 .loci/memory.md\n')
 put(root,'work/windbell/.loci/memory.md','# 风铃\n## Now\n已决定采用 SQLite，第一版必须离线可用；不依赖云数据库。\n## Next\n验证离线迁移。\n')
 put(root,'work/windbell/.loci/profile.md','# 风铃\n本地日程应用。\n')
 for slug,name in [('lin','林舟'),('zhou','周楠')]: put(root,f'brain/people/{slug}.md',f'---\nname: {name}\ninteractions: []\n---\n# {name}\n')
 put(root,'brain/people/.connections.json','[]\n')
 put(root,'brain/notes/index.md','# 笔记\n'); put(root,'brain/plan.md','# 长期目标\n')
 (root/'brain/decisions').mkdir(); (root/'work/windbell/.loci/decisions').mkdir()
 script=root/'brain/scripts/loci-task.js'; script.parent.mkdir(); shutil.copy2(REPO/'scripts/loci-task.js',script)
 put(root,'AGENTS.md',variant)

def snapshots(root):
 return {str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in root.rglob('*') if p.is_file()}

def resolve(root, path):
 p=(root/path).resolve()
 if not p.is_relative_to(root.resolve()): raise ValueError('Path outside isolated workspace')
 return p

def execute(root,name,args):
 if name=='run_task_writer':
  argv=args['argv']
  if not isinstance(argv,list) or not all(isinstance(s,str) for s in argv): raise ValueError('argv must be string array')
  r=subprocess.run(['node',str(root/'brain/scripts/loci-task.js'),*argv],cwd=root,capture_output=True,text=True,timeout=15)
  return json.dumps({'exit_code':r.returncode,'stdout':r.stdout,'stderr':r.stderr},ensure_ascii=False)
 p=resolve(root,args['path'])
 if name=='read_file': return p.read_text()[:24000]
 if name=='list_files': return '\n'.join(x.name+('/' if x.is_dir() else '') for x in sorted(p.iterdir()))
 if name=='write_file':
  if 'scripts' in p.relative_to(root).parts or 'rules' in p.relative_to(root).parts or p.name=='AGENTS.md': raise ValueError('Read-only experiment instructions or executable')
  p.parent.mkdir(parents=True,exist_ok=True); p.write_text(args['content']); return 'Write succeeded'
 raise ValueError('Unknown tool')

def grade(root,case,changed,trace,reply):
 checks={}
 def was_read(path):
  historical_root=REPO/'.loci/knowledge/experiments'/HERE.name/'fixtures'/root.name
  for t in trace:
   if t['name']!='read_file' or t['failed']: continue
   supplied=pathlib.Path(t['args'].get('path',''))
   if supplied.is_absolute() and supplied.is_relative_to(historical_root): supplied=root/supplied.relative_to(historical_root)
   if resolve(root,str(supplied))==root/path: return True
  return False
 taskfile=root/'brain/tasks/tasks.json'; calfile=root/'brain/tasks/calendar.json'
 try: tasks=json.loads(taskfile.read_text()); calendar=json.loads(calfile.read_text())
 except Exception: tasks=[]; calendar={}
 rows=tasks.get('tasks',[]) if isinstance(tasks,dict) else tasks
 used=[t['name'] for t in trace]
 if case in ('chitchat','manual','manual-statement','latest'): checks['no_writes']=not changed
 if case in ('timed-task','meeting'):
  checks['used_guarded_writer']='run_task_writer' in used
  if case=='timed-task':
   checks['task_saved']=any(isinstance(row,dict) and row.get('date')=='2026-10-08' and row.get('startTime')=='09:00' for row in rows)
   checks['calendar_unchanged']='brain/tasks/calendar.json' not in changed
  else:
   checks['meeting_saved']=isinstance(calendar,dict) and any(isinstance(row,dict) and row.get('startKey')==900 and row.get('endKey')==960 for row in calendar.get('2026-10-08',[]))
   checks['task_pool_unchanged']='brain/tasks/tasks.json' not in changed
 if case=='preference':
  checks['preference_saved']='队长' in (root/'brain/me/preferences.md').read_text()
  checks['existing_preference_preserved']='中文' in (root/'brain/me/preferences.md').read_text()
  checks['immediate_reply']='队长' in reply
 if case=='latest':
  checks['index_read']=was_read('brain/projects/index.md')
  checks['project_read']=was_read('work/windbell/.loci/memory.md')
  checks['correct_answer']='SQLite' in reply and '离线' in reply
 if case=='decision':
  files=list((root/'work/windbell/.loci/decisions').glob('*.md'))
  s='\n'.join(p.read_text() for p in files)
  checks['project_decision_saved']=bool(files) and 'SQLite' in s and '离线' in s
  checks['decision_format']=all(x in s for x in ['Background','Options','Decision','Follow-up']) and bool(re.search(r'(?m)^status:\s*[\"\x27]?decided[\"\x27]?\s*$',s))
  checks['current_project_memory_updated']='SQLite' in (root/'work/windbell/.loci/memory.md').read_text() and '尚未确定' not in (root/'work/windbell/.loci/memory.md').read_text()
  checks['personal_decisions_unchanged']=not any(p.startswith('brain/decisions/') for p in changed)
 if case=='relationship':
  try: edges=json.loads((root/'brain/people/.connections.json').read_text())
  except Exception: edges=[]
  checks['edge_saved']=any(isinstance(e,list) and len(e)>=2 and set(e[:2])=={'林舟','周楠'} for e in edges)
 if changed:
  ledger=list((root/'brain/.loci/activity').glob('*.md'))
  lines=[l for p in ledger for l in p.read_text().splitlines() if l.startswith('- ')]
  checks['one_ledger_entry']=len(lines)==1
 return checks

def chat(payload):
 req=urllib.request.Request('http://127.0.0.1:11434/api/chat',data=json.dumps(payload).encode(),headers={'Content-Type':'application/json'})
 return json.load(urllib.request.urlopen(req,timeout=120))

def run(model, vname, variant, case, prompt, mode, rep, think=True, absolute_index=False):
 name=f'{model.replace(":","-")}{"-thinking" if think else ""}{"-absindex" if absolute_index else ""}-{vname}-{case}-{rep}'; root=HERE/'fixtures'/name
 fixture(root,variant,mode)
 if absolute_index: put(root,'brain/projects/index.md',f'# 项目索引\n- 风铃 · repo: {root}/work/windbell · 状态与指针在该仓库 .loci/memory.md\n')
 if case=='decision': put(root,'work/windbell/.loci/memory.md','# 风铃\n## Now\n正在比较 SQLite 与云数据库，尚未确定存储方案。\n## Next\n确定第一版存储方案。\n')
 before=snapshots(root)
 base='你是用户的个人助手，使用工具处理用户请求。当前时间是 2026-10-07 19:00，时区 Asia/Shanghai。文件路径相对隔离工作区。\n\n以下是宿主已提供的 AGENTS.md 内容：\n'+variant
 messages=[{'role':'system','content':base},{'role':'user','content':prompt}]
 trace=[]; usage=[]; reply=''; error=None; start=time.monotonic()
 try:
  for step in range(12):
   r=chat({'model':model,'messages':messages,'tools':TOOLS,'stream':False,'think':think,'options':{'temperature':0,'num_ctx':16384,'num_predict':1600,'seed':42+rep},'keep_alive':'30m'})
   m=r['message']; messages.append(m)
   usage.append({k:r.get(k) for k in ['prompt_eval_count','eval_count','total_duration','load_duration','prompt_eval_duration','eval_duration']})
   calls=m.get('tool_calls',[])
   if not calls:
    reply=m.get('content','')
    if not reply.strip(): error='empty model response without tool call'
    break
   for c in calls:
    f=c['function']; args=f['arguments']
    if isinstance(args,str): args=json.loads(args)
    try:
     result=execute(root,f['name'],args); failed=f['name']=='run_task_writer' and json.loads(result)['exit_code']!=0
    except Exception as e: result=f'Tool error: {type(e).__name__}: {e}'; failed=True
    trace.append({'step':step,'name':f['name'],'args':args,'result':result,'failed':failed})
    messages.append({'role':'tool','tool_name':f['name'],'content':result})
   print(json.dumps({'progress':name,'step':step,'tools':[c['function']['name'] for c in calls]},ensure_ascii=False),flush=True)
  else: error='step limit reached'
 except Exception as e: error=f'{type(e).__name__}: {e}'
 after=snapshots(root); changed=sorted(p for p in before.keys()|after.keys() if before.get(p)!=after.get(p))
 checks=grade(root,case,changed,trace,reply)
 result={'id':name,'model':model,'think':think,'absolute_index':absolute_index,'variant':vname,'case':case,'repeat':rep,'prompt':prompt,'mode':mode,'rule_bytes':len(variant.encode()),'rule_chars':len(variant),'seconds':round(time.monotonic()-start,2),'error':error,'reply':reply,'checks':checks,'passed':not error and bool(reply.strip()) and all(checks.values()),'changed':changed,'tool_calls':len(trace),'guide_reads':[t['args'].get('path') for t in trace if t['name']=='read_file' and '/rules/' in t['args'].get('path','')],'first_prompt_tokens':usage[0]['prompt_eval_count'] if usage else None,'summed_prompt_tokens':sum(u.get('prompt_eval_count') or 0 for u in usage),'output_tokens':sum(u.get('eval_count') or 0 for u in usage),'usage':usage,'trace':trace,'messages':messages}
 out=HERE/'results'; out.mkdir(exist_ok=True); (out/(name+'.json')).write_text(json.dumps(result,ensure_ascii=False,indent=2))
 print(json.dumps({k:result[k] for k in ['id','passed','checks','seconds','tool_calls','guide_reads','error']},ensure_ascii=False),flush=True)
 return result

def main():
 p=argparse.ArgumentParser(); p.add_argument('--model',default='qwen3:14b'); p.add_argument('--cases',default='all'); p.add_argument('--variants',default='full,compact,pointer'); p.add_argument('--repeat',type=int,default=1); p.add_argument('--no-think',action='store_true'); p.add_argument('--variant-file'); p.add_argument('--absolute-project-index',action='store_true'); args=p.parse_args()
 full=(REPO/'.loci/knowledge/drafts/LOCI.md').read_text().replace('<brain-path>','brain')+INDEX
 variants={'full':full,'compact':COMPACT,'pointer':POINTER}
 if args.variant_file:
  candidate=pathlib.Path(args.variant_file)
  variants[candidate.stem]=candidate.read_text().replace('<brain-path>','brain')
 for name,text in variants.items(): put(HERE,'variants/'+name+'.md',text)
 for rep in range(1,args.repeat+1):
  for case,prompt,mode in CASES:
   if (args.cases=='all' and case=='manual-statement') or (args.cases!='all' and case not in args.cases.split(',')): continue
   for vname in args.variants.split(','): run(args.model,vname,variants[vname],case,prompt,mode,rep,not args.no_think,args.absolute_project_index)

if __name__=='__main__': main()
