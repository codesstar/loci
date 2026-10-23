# 人物、关系与地点
人物记录 people/<slug>.md，YAML name 是匹配键；不要凭文件名猜名字。写关系须确认两端都有记录，不存在就先创建，再写 people/.connections.json。
连接文件为数组，元素 [a,b,"关系说明"]，a/b 必须与 name 完全相同，保留旧边，不重复。过往互动进入该人物 interactions。人物是联系人而非稳定用户身份。修改后活动记录一次。