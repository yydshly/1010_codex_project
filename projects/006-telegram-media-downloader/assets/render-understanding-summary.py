"""用精确中文排版生成独立 PNG 理解总图；没有处理或修改已有图片。"""
from pathlib import Path
import json
import math
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
W, H = 3840, 2880
BG = '#F5F7F5'
INK, MUTED = '#18364B', '#57717E'
BLUE, PALE_BLUE = '#227DB0', '#E9F3F9'
TEAL, PALE_TEAL = '#277F73', '#EAF4F0'
AMBER, PALE_AMBER = '#A56C23', '#FAF0DD'
LINE = '#D1DFE3'
image = Image.new('RGB', (W, H), BG)
draw = ImageDraw.Draw(image)
fonts = {}
text_bounds = []

def font(size=34, bold=False):
    key = (size, bold)
    if key not in fonts:
        fonts[key] = ImageFont.truetype('C:/Windows/Fonts/msyhbd.ttc' if bold else 'C:/Windows/Fonts/msyh.ttc', size)
    return fonts[key]

def wrap(value, width, size=34, bold=False):
    result = []
    for paragraph in value.split('\n'):
        line = ''
        for char in paragraph:
            if line and draw.textlength(line + char, font=font(size, bold)) > width:
                result.append(line)
                line = char
            else:
                line += char
        result.append(line)
    return result

def text(x, y, value, size=34, color=INK, bold=False, width=None, gap=11):
    lines = wrap(value, width, size, bold) if width else value.split('\n')
    for line in lines:
        draw.text((x, y), line, font=font(size, bold), fill=color, anchor='lt')
        bounds = draw.textbbox((x, y), line, font=font(size, bold), anchor='lt')
        text_bounds.append(bounds)
        y += size + gap
    return y

def panel(x, y, width, height, fill='white', border=LINE, radius=28):
    draw.rounded_rectangle((x, y, x+width, y+height), radius=radius, fill=fill, outline=border, width=2)

def chip(x, y, value, color=BLUE, fill=PALE_BLUE, size=28):
    width = draw.textlength(value, font=font(size, True)) + 36
    panel(x, y, width, size+28, fill, fill, 13)
    text(x+18, y+12, value, size, color, True)
    return width

def arrow(points, color=BLUE, width=5):
    draw.line(points, fill=color, width=width, joint='curve')
    x, y = points[-1]
    px, py = points[-2]
    angle = math.atan2(y-py, x-px)
    head = 19
    draw.polygon([(x,y),(x-head*math.cos(angle-.47),y-head*math.sin(angle-.47)),(x-head*math.cos(angle+.47),y-head*math.sin(angle+.47))], fill=color)

def section_title(x, y, number, title, color=BLUE):
    chip(x, y, number, color, PALE_AMBER if color==AMBER else PALE_TEAL if color==TEAL else PALE_BLUE, 27)
    text(x+84, y+4, title, 44, INK, True)

def landscape(x, y, width, height, muted=False):
    # 自绘媒体缩略图；不是 Telegram 下载文件或真实截图。
    draw.rectangle((x,y,x+width,y+height), fill='#EEDCCC' if muted else '#E5E8DF')
    draw.ellipse((x+width*.64,y+height*.12,x+width*.81,y+height*.59), fill='#EEB25D')
    draw.polygon([(x,y+height*.68),(x+width*.27,y+height*.27),(x+width*.48,y+height*.68),(x+width*.7,y+height*.48),(x+width,y+height*.78),(x+width,y+height),(x,y+height)], fill='#7191A9')
    draw.polygon([(x,y+height*.86),(x+width*.32,y+height*.58),(x+width*.57,y+height*.83),(x+width*.8,y+height*.68),(x+width,y+height*.87),(x+width,y+height),(x,y+height)], fill='#446879')

def browser(x, y, width, height, enhanced=False):
    panel(x, y, width, height, '#FFFFFF', '#BED2DD', 16)
    draw.rounded_rectangle((x,y,x+width,y+48), radius=16, fill='#E6EEF2')
    draw.rectangle((x,y+25,x+width,y+48), fill='#E6EEF2')
    for i, c in enumerate(['#CFB0A6','#DDC693','#ABC4B6']):
        draw.ellipse((x+18+i*23,y+17,x+30+i*23,y+29), fill=c)
    text(x+104,y+11,'Telegram Web · 示意',23,MUTED)
    landscape(x+18,y+65,width-36,140)
    for i in range(21):
        h = 8+int(12*abs(math.sin(i*.85)))
        draw.rounded_rectangle((x+20+i*14,y+222-h/2,x+26+i*14,y+222+h/2), radius=3, fill='#78A0B0')
    if enhanced:
        panel(x+width-164,y+215,144,49,BLUE,BLUE,10)
        text(x+width-143,y+225,'↓ 保存',25,'white',True)
    else:
        panel(x+width-164,y+215,144,49,'#F0F2F0','#E2E8E6',10)
        text(x+width-144,y+225,'入口隐藏',23,'#93A5AA')

# 标题与证据图例。
text(112,75,'Telegram 媒体下载器 · 理解总图',84,INK,True)
text(115,186,'复用已登录网页能力，补充保存入口与下载流程',40,MUTED)
chip(2800,86,'源码确认',BLUE,PALE_BLUE,29)
chip(3125,86,'受控实验',TEAL,PALE_TEAL,29)
chip(3450,86,'扩展设想',AMBER,PALE_AMBER,29)
panel(2780,172,940,74,'#ECF1ED','#ECF1ED',16)
text(2800,191,'定位：浏览器增强封装，含自有下载实现',31,INK,True)

# 第一行：原有效果与能力矩阵。
panel(112,290,2310,560)
section_title(154,321,'01','源库效果：从查看媒体到保存文件')
chip(1645,325,'效果示意 · 账号下载未实测',AMBER,PALE_AMBER,25)
browser(170,418,584,280)
browser(925,418,584,280,True)
arrow([(774,558),(895,558)])
arrow([(1530,558),(1650,558)])
panel(1680,418,678,280,PALE_TEAL,'#C6DDD5',16)
text(1710,440,'本地媒体副本',30,TEAL,True)
for i, (extension, desc) in enumerate([('JPEG','图片'),('MP4','视频 / GIF'),('OGG','语音')]):
    xx = 1710+i*211
    panel(xx,503,188,148,'white','#CCE0D8',13)
    text(xx+31,526,extension,34,TEAL,True)
    text(xx+20,584,desc,27,MUTED)
text(170,723,'查看已获权限的媒体',33,INK,True)
text(925,723,'恢复 / 新增下载按钮',33,INK,True)
text(1710,723,'浏览器保存到本地',33,INK,True)
text(170,783,'Telegram 原生支持下载；本库补充入口与流程。没有画质增强或转码。',31,MUTED)

panel(2460,290,1268,560)
section_title(2504,321,'02','能力范围 · 固定源码入口')
table_x, table_y = 2504, 414
draw.rounded_rectangle((table_x,table_y,3684,table_y+59), radius=10, fill=PALE_BLUE)
text(table_x+20,table_y+14,'媒体类型',30,BLUE,True)
text(table_x+640,table_y+14,'WebK',30,BLUE,True)
text(table_x+925,table_y+14,'WebA',30,BLUE,True)
for i, row in enumerate([('图片','有入口','有入口'),('视频 / GIF','有入口','有入口'),('语音','有入口','未覆盖'),('Stories','有入口','有入口')]):
    yy = table_y+70+i*60
    text(table_x+20,yy,row[0],31,INK,True)
    text(table_x+640,yy,row[1],30,BLUE)
    text(table_x+925,yy,row[2],30,AMBER if i==2 else BLUE)
    draw.line((table_x,yy+48,3684,yy+48),fill=LINE,width=2)
text(table_x+20,747,'Stories 按图片 / 视频分流；GIF 可能保存为视频。',28,MUTED)
text(table_x+20,793,'入口存在不代表当前网站一定兼容。',28,AMBER)

# 中间大图：四层职责及两条保存路径。
panel(112,890,3616,850,'#FDFEFE','#C5DAE3')
section_title(154,922,'03','底层原理：账号、网页、脚本、浏览器各做什么？')
roles = [
    ('账号','决定能访问哪些聊天与媒体'),
    ('Telegram 网页','登录会话、协议通信与媒体取数'),
    ('用户脚本','识别入口、恢复按钮、组织保存'),
    ('浏览器','运行网页与脚本、提供文件保存环境')
]
for i,(title,desc) in enumerate(roles):
    xx = 170+i*902
    panel(xx,1015,816,126,PALE_BLUE,'#CBDFEA',18)
    text(xx+25,1033,title,38,BLUE,True)
    text(xx+25,1090,desc,29,MUTED)
    if i<3: arrow([(xx+831,1078),(xx+883,1078)],'#89A7B8',4)
text(175,1170,'登录是访问前提；脚本需要在同一个 Telegram 页面运行。内置浏览器不会因登录而自动启用下载器。',31,MUTED)

panel(170,1312,427,272,'#EDF3F5','#C8D9E0',18)
text(200,1340,'识别当前页面',36,INK,True)
text(200,1407,'WebK / WebA 适配\n约 500 ms 扫描 DOM\n寻找媒体与按钮',29,MUTED,gap=20)
arrow([(603,1410),(652,1410),(652,1338),(708,1338)],BLUE)
arrow([(603,1496),(652,1496),(652,1549),(708,1549)],TEAL)
chip(731,1241,'A / 复用官方路径 · WebK',BLUE,PALE_BLUE,29)
chip(731,1452,'B / 自有保存路径',TEAL,PALE_TEAL,29)
for xx, value in [(731,'找到隐藏的\n官方下载按钮'),(1474,'恢复显示\n并调用按钮'),(2217,'Telegram 原有\n下载逻辑')]:
    panel(xx,1317,636,114,PALE_BLUE,'#BBD6E6',17)
    text(xx+24,1335,value,31,BLUE,True,gap=12)
for xx, value in [(731,'读取当前媒体地址\nimg / video / audio'),(1474,'图片：下载链接\n视频 / 语音：Range 读取'),(2217,'视频 / 语音保存\n文件系统分段写入 / Blob 回退')]:
    panel(xx,1528,636,121,PALE_TEAL,'#BBD7CE',17)
    text(xx+24,1548,value,30,TEAL,True,gap=13)
for yy,col in [(1374,BLUE),(1588,TEAL)]:
    arrow([(1384,yy),(1454,yy)],col)
    arrow([(2127,yy),(2197,yy)],col)
panel(3066,1339,600,282,'#F1F5F2','#C2D7CB',22)
text(3094,1374,'本地文件',43,TEAL,True)
text(3094,1445,'浏览器下载 / 文件写入\n保存后核对格式与大小\n可得原文件时比对哈希',30,MUTED,gap=21)
arrow([(2869,1374),(2952,1374),(2952,1412),(3046,1412)],BLUE)
arrow([(2869,1588),(2952,1588),(2952,1547),(3046,1547)],TEAL)
arrow([(1810,1523),(1810,1484),(3046,1484)],TEAL,4)
text(1900,1443,'图片直接触发保存',25,TEAL,True)
text(731,1674,'Range: bytes=offset-  →  检查 Content-Range  →  下一偏移 = end + 1',28,TEAL)
text(170,1674,'登录与协议由网页复用',27,MUTED)

# 底部三栏。
Y, CW, CH = 1780, 1180, 820
for x in [112,1330,2548]: panel(x,Y,CW,CH)
section_title(154,1812,'04','使用场景与价值')
uses = [
    ('个人备份 / 离线学习','保存自有或获授权的图片、视频、语音。'),
    ('持续研究 / 创作参考','把媒体与来源、标签、项目笔记关联。'),
    ('浏览器工具开发','学习 DOM 适配、异步错误、Range 与文件写入。')
]
for i,(title,desc) in enumerate(uses):
    yy = 1910+i*136
    draw.rounded_rectangle((159,yy+4,169,yy+95), radius=4, fill=BLUE)
    text(197,yy,title,34,INK,True)
    text(197,yy+55,desc,30,MUTED,width=1010,gap=12)
panel(156,2331,1091,186,PALE_BLUE,PALE_BLUE,17)
text(183,2355,'原生下载已够用时，额外价值有限。',33,BLUE,True)
text(183,2419,'持续整理资料时，来源与检索\n比增加文件数量更有价值。',31,INK,gap=16)
text(159,2544,'节省时间、效率与商业收益尚未测量。',29,MUTED)

section_title(1372,1812,'05','已知限制与证据',TEAL)
chip(1375,1906,'12 项受控源码实验',TEAL,PALE_TEAL,30)
for i,(big,small,c) in enumerate([('9','完整输出',TEAL),('2','中止',MUTED),('1','截断',AMBER)]):
    xx = 1390+i*358
    text(xx,1998,big,65,c,True)
    text(xx+76,2024,small,30,c,True)
text(1380,2084,'本机 HTTP + DOM / 保存适配器；\n不是 Telegram 账号实测。',29,MUTED,gap=13)
evidence = [
    '正常视频 / 语音：保存前后哈希一致。',
    '视频 200 无范围头会中止；\n语音起点错配后仍保存首段。',
    'Completed 可早于文件关闭；\n可播放不等于文件完整。',
    '进度框关闭只移除界面，不等于取消。'
]
yy = 2192
for value in evidence:
    draw.ellipse((1381,yy+8,1391,yy+18),fill=TEAL)
    yy = text(1410,yy,value,29,INK,width=1010,gap=11)+20
text(1380,2518,'页面改版、大文件内存、最高画质与\n跨浏览器表现仍需单独验证。',29,AMBER,gap=12)

section_title(2590,1812,'06','扩展路线与预期效果',AMBER)
chip(2590,1891,'扩展效果设想 · 尚未实现',AMBER,PALE_AMBER,28)
# 未来资料工作台示意，不是当前功能。
panel(2590,1973,1092,174,PALE_AMBER,'#E8D8BC',15)
landscape(2614,1995,206,104)
text(2841,1994,'来源卡：标题 · 日期 · 标签',29,AMBER,True)
text(2841,2043,'转写文本 / 搜索结果 → 回查原始媒体',27,MUTED)
text(2617,2111,'预期产物：媒体文件 + 来源卡 + 可检索文本',25,AMBER)
stages = [
    ('P0','可靠保存','等待写入 / 关闭，核验、取消、重试'),
    ('P1','任务队列','用户选择、并发限制、失败恢复'),
    ('P2','来源整理','命名、标签、哈希去重、本地索引'),
    ('P3','知识处理','OCR、转写、摘要、搜索与原文回查'),
    ('P4','平台适配','拆分 WebK / WebA，维护回归样例')
]
for i,(code,title,desc) in enumerate(stages):
    yy = 2182+i*67
    chip(2593,yy,code,AMBER,PALE_AMBER,24)
    text(2680,yy+5,title,29,INK,True)
    text(2827,yy+7,desc,26,MUTED)
text(2593,2544,'先保证可靠保存，再扩大采集与知识处理。',28,AMBER,True)

# 页脚限定与来源。
panel(112,2640,3616,116,'#E7EFEB','#E7EFEB',20)
text(148,2660,'边界：账号可访问 ≠ 保存入口可用。本库不扩大账号访问权限；登录本身也不会启用脚本。',34,INK,True)
text(148,2711,'真实 Telegram 下载未实测；整频道归档、持久队列、断点续传及 AI 均未形成现有能力。',31,MUTED)
text(116,2792,'上游：Neet-Nestor/Telegram-Media-Downloader  ·  1.212  ·  commit 169a6786  ·  GPL-3.0',29,MUTED)
text(116,2836,'理解汇总：2026-10-12  ·  所有界面与媒体缩略图均为说明示意  ·  源码分析与受控结果分层标注',26,MUTED)

outside = [b for b in text_bounds if min(b[0],b[1])<0 or b[2]>W or b[3]>H]
if outside: raise ValueError(f'文字超出画布：{outside}')
output = ROOT / 'understanding-summary-20261012.png'
image.save(output, optimize=True)
metadata = {
    'date': '2026-10-12', 'asset': output.name, 'size': [W,H],
    'renderer': 'Pillow + Microsoft YaHei; original deterministic diagram, not an edit of existing images',
    'generationAttempt': 'Built-in image_gen failed with a network error; no output was returned. No CLI/API fallback was used.',
    'upstream': 'https://github.com/Neet-Nestor/Telegram-Media-Downloader',
    'commit': '169a678627cec090ce1fa8b6eaac250547f0121a', 'scriptVersion': '1.212', 'upstreamLicense': 'GPL-3.0',
    'evidence': ['../notes/research.md','../notes/download-testing.md','../experiments/results/controlled-results.json'],
    'scope': '源库与扩展效果均为自绘界面示意；无用户聊天内容；受控实验不替代真实 Telegram 下载。',
    'textBoundsOutsideCanvas': len(outside)
}
(ROOT / 'understanding-summary-20261012.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps({'path':str(output),'size':[W,H],'bytes':output.stat().st_size},ensure_ascii=False))
