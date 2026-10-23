# 任务和日程
要完成的事情是任务，带日期时间仍是任务；会议、预约、占用时间块是日程。两者不自动复制。任务、日程只能通过 scripts/loci-task.js 写入，不直接改 tasks/*.json，不用 daily 文件代替。
先读相关数据去重；不认识参数时调用帮助。
任务：add --title 标题 --date YYYY-MM-DD --start HH:MM
日程：schedule --title 标题 --date YYYY-MM-DD --start HH:MM --end HH:MM
工具已写活动记录，不重复追加。提醒未验证送达不说已送达。