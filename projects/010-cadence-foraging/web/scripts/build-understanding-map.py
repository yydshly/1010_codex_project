"""Compose a source-checked Chinese research figure (PNG + self-contained SVG).

Requires Pillow and a Chinese TrueType font. This assembles original screenshots
and controlled vector labels; it does not run a model or invent experiment data.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import html
import io
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

PROJECT = Path(__file__).resolve().parents[2]
ASSETS = PROJECT / "assets"
NOTES = PROJECT / "notes"
COMMIT = "19bee92756d1842176ad30b1cd01edbfbfa3f14c"
W, H = 3200, 6700
M, GAP = 80, 30
INNER = W - 2 * M
BG, INK, MUTED = "#f5f3ec", "#213e38", "#557069"
LINE, PAPER = "#d4dfd2", "#fffdf8"
TEAL, BLUE, PURPLE, AMBER = "#247d75", "#356b98", "#755b9e", "#9b681e"
SOFT, BLUE_SOFT, PURPLE_SOFT, AMBER_SOFT = "#e5efe4", "#e8f0f5", "#efe9f5", "#f7eedc"


def read(name):
    return json.loads((NOTES / name).read_text(encoding="utf-8"))


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


class Figure:
    def __init__(self, regular, bold):
        self.regular, self.bold = regular, bold
        self.fonts = {}
        self.im = Image.new("RGB", (W, H), BG)
        self.draw = ImageDraw.Draw(self.im)
        self.parts = [f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-labelledby="title desc">',
                      '<title id="title">Cadence 能力、算法与真实效果总图</title>',
                      '<desc id="desc">四类能力、两条已测学习链、十二组算法机制、九张已有网页实拍、EP 数字、十四个场景与扩展价值。绿色为本地实测，蓝紫为机制说明，黄色为尚未验证用途。完整结果与候选分开。</desc>',
                      f'<rect width="{W}" height="{H}" fill="{BG}"/>']
        self.text_boxes, self.media = [], []
        self.owner = (0, 0, W, H)

    def font(self, size, bold=False):
        key = (size, bold)
        if key not in self.fonts:
            self.fonts[key] = ImageFont.truetype(str(self.bold if bold else self.regular), size)
        return self.fonts[key]

    def rect(self, x, y, w, h, fill=PAPER, stroke=LINE, radius=18):
        self.draw.rounded_rectangle((x, y, x+w, y+h), radius=radius, fill=fill, outline=stroke, width=2)
        self.parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}" stroke="{stroke}" stroke-width="2"/>')

    def line(self, points, color=LINE, width=3, arrow=False):
        self.draw.line(points, fill=color, width=width, joint="curve")
        self.parts.append(f'<polyline points="{" ".join(f"{x},{y}" for x,y in points)}" fill="none" stroke="{color}" stroke-width="{width}" stroke-linejoin="round"/>')
        if arrow:
            x, y = points[-1]; px, py = points[-2]
            angle = math.atan2(y-py, x-px)
            tip = [(x, y), (x-15*math.cos(angle-.48), y-15*math.sin(angle-.48)), (x-15*math.cos(angle+.48), y-15*math.sin(angle+.48))]
            self.draw.polygon(tip, fill=color)
            self.parts.append(f'<polygon points="{" ".join(f"{a:.1f},{b:.1f}" for a,b in tip)}" fill="{color}"/>')

    def text(self, x, y, value, size=30, color=INK, bold=False):
        font = self.font(size, bold)
        bbox = self.draw.textbbox((x, y), value, font=font, anchor="lt")
        ox, oy, ow, oh = self.owner
        if bbox[0] < ox-2 or bbox[1] < oy-2 or bbox[2] > ox+ow+2 or bbox[3] > oy+oh+2:
            raise ValueError(f"Text outside owner {self.owner}: {value}, bbox={bbox}")
        self.draw.text((x, y), value, font=font, fill=color, anchor="lt")
        # SVG uses a top-of-em anchor so the same fixed layout remains portable.
        self.parts.append(f'<text x="{x}" y="{y+size*.84:.2f}" fill="{color}" font-family="Microsoft YaHei, Noto Sans CJK SC, sans-serif" font-size="{size}" font-weight="{700 if bold else 400}">{html.escape(value)}</text>')
        self.text_boxes.append({"text": value, "bbox": bbox, "owner": self.owner, "size": size})

    def para(self, x, y, value, width, size=30, color=MUTED, bold=False, spacing=1.45):
        font = self.font(size, bold)
        lines = []
        for paragraph in value.split("\n"):
            current = ""
            for char in paragraph:
                trial = current + char
                if current and font.getlength(trial) > width:
                    lines.append(current); current = char
                else:
                    current = trial
            lines.append(current)
        for i, text in enumerate(lines):
            if text: self.text(x, y+i*int(size*spacing), text, size, color, bold)
        return y + len(lines)*int(size*spacing)

    def pill(self, x, y, value, color=TEAL, fill=SOFT, size=25):
        width = int(self.font(size, True).getlength(value))+30
        self.rect(x, y, width, 43, fill, fill, 9)
        self.text(x+15, y+8, value, size, color, True)
        return width

    def heading(self, y, number, title, note=""):
        self.owner = (M, y, INNER, 100)
        self.pill(M, y+2, number)
        self.text(M+100, y, title, 45, INK, True)
        if note: self.text(M+100, y+58, note, 27, MUTED)
        self.owner = (0, 0, W, H)

    def image(self, name, x, y, width, height, crop=None, href=None):
        source = ASSETS / name
        with Image.open(source) as original:
            img = original.convert("RGB")
            original_size = img.size
            if crop:
                assert 0 <= crop[0] < crop[2] <= img.width and 0 <= crop[1] < crop[3] <= img.height
                img = img.crop(crop)
        scale = min(width/img.width, height/img.height)
        nw, nh = round(img.width*scale), round(img.height*scale)
        px, py = round(x+(width-nw)/2), round(y+(height-nh)/2)
        resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
        self.im.paste(resized, (px, py))
        stream = io.BytesIO(); resized.save(stream, format="JPEG", quality=94, subsampling=0)
        data = base64.b64encode(stream.getvalue()).decode()
        if href: self.parts.append(f'<a xlink:href="{html.escape(href, quote=True)}" target="_blank" aria-label="{html.escape(name, quote=True)}：打开对应本机演示">')
        self.parts.append(f'<image x="{px}" y="{py}" width="{nw}" height="{nh}" xlink:href="data:image/jpeg;base64,{data}"/>')
        if href: self.parts.append('</a>')
        self.media.append({"path": "assets/"+name, "sha256": sha(source), "original_size": original_size, "crop": crop, "placement": [px, py, nw, nh], "link": href})

    def panel(self, x, y, w, h, fill=PAPER):
        self.rect(x,y,w,h,fill)
        self.owner=(x,y,w,h)

    def save(self):
        self.parts.append('</svg>')
        self.im.save(ASSETS/'cadence-understanding-map.png', optimize=True)
        (ASSETS/'cadence-understanding-map.svg').write_text('\n'.join(self.parts), encoding='utf-8')
        qa = ASSETS/'understanding-map-qa'; qa.mkdir(exist_ok=True)
        self.im.resize((1280,2680),Image.Resampling.LANCZOS).save(qa/'overview.png')
        for name, top, bottom in [('capabilities',0,1500),('algorithms',1480,2470),('evidence',2460,4210),('ep',4200,4840),('business',4820,5730),('value',5720,H)]:
            self.im.crop((0,top,W,bottom)).resize((1600,(bottom-top)//2),Image.Resampling.LANCZOS).save(qa/(name+'.png'))
        receipt={"date":"2026-10-12","scope":"Research figure composed from existing screenshots and frozen results; no new accuracy experiment.","upstream_commit":COMMIT,"dimensions":[W,H],"font":self.regular.name,"text_lines":len(self.text_boxes),"text_bounds":"all contained in declared layout region","media":self.media,"data_sources":[{"path":"notes/"+name,"sha256":sha(NOTES/name)} for name in ['evaluation-results.json','route-evaluation-results.json','fish-evaluation-results.json','fish-ep-sample.json','algorithm-browser-frames.json']],"outputs":[{"path":"assets/"+name,"sha256":sha(ASSETS/name)} for name in ['cadence-understanding-map.png','cadence-understanding-map.svg']]}
        (NOTES/'understanding-map-source.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print(f"Research map: {W}x{H}; {len(self.text_boxes)} checked text lines; {len(self.media)} actual screenshots; PNG + SVG.")


def build(f):
    npc, routes, fish, ep = [read(n) for n in ['evaluation-results.json','route-evaluation-results.json','fish-evaluation-results.json','fish-ep-sample.json']]
    npc_rates={key:sum(v['controllers'][key]['hits'] for v in npc['lives'])/2400*100 for key in ['cadence','rule','q']}
    route_rates={}
    for cue,reward in [('brief','sparse'),('visible','sparse'),('brief','waypoints'),('visible','waypoints')]:
        lives=[v for v in routes['lives'] if v['cue_mode']==cue and v['reward_mode']==reward and v['trace_amplitude']==.3]
        assert len(lives)==4
        route_rates[(cue,reward)]=sum(v['controllers']['cadence']['hits'] for v in lives)/1440*100
    a=fish['aggregate']; inertia=a['inertia']; random=a['independent']
    assert ep['update']['changed_count']==288 and ep['update']['updated']
    old=ep['parameters']['before']['C'][2][0]; new=ep['parameters']['after']['C'][2][0]
    gt=ep['parameter_probe']['exact_free_loss_gradient']; rate=ep['update']['accepted_rate']
    g=(old-new)/rate
    assert abs(g-gt)<2e-11

    # Main message and one closed loop.
    f.text(M,65,'CADENCE / 010 · 中文研究总图',32,TEAL,True)
    f.text(M,120,'能力、算法与真实效果：把经历变成下一次的改变',69,INK,True)
    f.para(M,214,'历史轨迹只是输入的一种。你提供观察、可执行动作和真实反馈；库计算回答、调整参数，并保留不同类型的状态。',INNER,35)
    f.text(M,274,'阅读顺序：能做什么 → 怎样学习 → 算法各管什么 → 实测效果 → 业务扩展 → 对你的意义',28,MUTED)
    labels=[('观察 / 编码','当时可知的数值'),('内部计算','模型 + 活动 + 记忆'),('输出 / 执行','预测，或选一个动作'),('真实反馈','答案，或实际奖励'),('学习 / 保留','参数与相关状态改变')]
    cw=(INNER-4*50)/5
    for i,(title,detail) in enumerate(labels):
        x=M+i*(cw+50);f.panel(x,340,cw,125,SOFT)
        f.text(x+24,365,title,34,INK,True);f.text(x+24,413,detail,28,MUTED)
        if i<4:f.line([(x+cw+8,402),(x+cw+42,402)],TEAL,4,True)
    f.owner=(0,0,W,H)
    f.line([(W-M-cw/2,470),(W-M-cw/2,497),(M+cw/2,497),(M+cw/2,470)],TEAL,3,True)
    f.text(950,514,'新的样本仍只给当时输入；教学答案不成为未来已知事实。',28,TEAL,True)
    x=M
    for label,color,fill in [('本地已测：真实运行与结果',TEAL,SOFT),('机制核对：固定源码与文档',BLUE,BLUE_SOFT),('候选用途：尚无业务验证',AMBER,AMBER_SOFT)]:
        x+=f.pill(x,566,label,color,fill)+25

    f.heading(646,'01','四类能力：轨迹预测只占其中一类','一个业务可以组合多种能力；模型存在、数值收敛、业务有效是三种不同的证据。')
    capabilities=[
        ('预测 / 判断',BLUE,BLUE_SOFT,'给输入，估计答案','历史位置 → 未来位移\n工况 → 下一段读数\n特征 → 类别 / 数值','真实答案修正预测误差','TemporalPatchNet + EP；Brain / PatchNet 监督'),
        ('动作 / 奖励',TEAL,SOFT,'选动作，按实际结果改','局势 → 去哪家店\n需求 → 宠物做什么\n游戏表现 → 难度档位','实际回报改变选择偏好','Brain：Actor–Critic / TD / 资格迹'),
        ('记忆 / 回查',PURPLE,PURPLE_SOFT,'保留线索，按线索再读','路牌消失 → 最近活动\n线索 + 结果 → 关联\n部分字段 → 补全估计','真实事件字段用于纠偏','Trace / 联想矩阵 / Records / RecordPatchNet'),
        ('学后果 / 规划',AMBER,AMBER_SOFT,'先学后果，再选控制','状态 + 动作 → 后续状态\n当前状态 + 目标 → 控制\n执行后测量 → 重新规划','先有可靠模型与明确目标','TemporalPatchNet.plan / BeliefPatch'),
    ]
    capw=(INNER-3*GAP)/4
    for i,(title,color,fill,plain,examples,feedback,module) in enumerate(capabilities):
        x=M+i*(capw+GAP);f.panel(x,755,capw,310,fill)
        f.text(x+23,775,title,36,color,True);f.text(x+23,824,plain,29,INK,True)
        y=f.para(x+23,870,examples,capw-46,28)
        f.text(x+23,y+8,feedback,26,color,True)
        f.para(x+23,y+48,module,capw-46,25,MUTED)

    f.heading(1100,'02','两条已验证的学习链：同样接反馈，学的对象不同')
    chainw=(INNER-GAP)/2
    chains=[(M,TEAL,SOFT,'NPC · 奖励学习','路牌 / 状态 → 神经图与记忆 → 动作概率 → 实际选择',
             '执行结果 → TD“比预期好 / 坏多少” → 资格迹分配信用 → 改策略 / 记忆',
             '资格迹留动作参与记录；Trace 留最近活动。两者解决不同问题。'),
            (M+chainw+GAP,BLUE,BLUE_SOFT,'捕鱼 · 监督时序预测','历史位置 → 差分特征 → Temporal 自由计算 → 未来位移',
             '旧训练鱼真实后续 → 预测误差 → EP 正负教学 → 更新 A / B / C',
             '未知鱼推理不带未来答案；射击与碰撞由游戏的几何算法计算。')]
    for x,color,fill,title,line1,line2,note in chains:
        f.panel(x,1172,chainw,270,fill)
        f.text(x+25,1195,title,37,color,True)
        y=f.para(x+25,1250,line1,chainw-50,29,INK)
        y=f.para(x+25,y+12,line2,chainw-50,29,INK)
        f.para(x+25,y+20,note,chainw-50,26,MUTED)

    f.heading(1480,'03','12 组核心算法与机制：各自承担哪一步','算法可以组合；有的算当前回答，有的找更新方向，有的保存历史或搜索控制。')
    modules=[
      ('01 · 反馈神经图','算回答 / 内部状态','输入与单元相互作用，反复调整到满足方程。','NeuralGraph / Brain / PatchNet；内部稳定不等于答对。',TEAL),
      ('02 · EP / 正负局部对比','找参数更新方向','同一输入和旧参数下，比较两侧教学响应。','监督目标是真实答案；奖励参与量的目标是刚选中的动作。',BLUE),
      ('03 · 时序残差 + Newton','让后续误差影响早先活动','自由计算向前；教学共同修复有限时间窗口。','TemporalPatchNet：块 Hessian 求解有成本，不只做局部乘法。',BLUE),
      ('04 · Actor–Critic','选动作 + 估计回报','Actor 给动作偏好，Critic 估计结果会有多好。','Softmax 探索与实际反馈；应用定义动作、奖励和执行。',TEAL),
      ('05 · TD 时序差分','判断结果好坏程度','实际奖励 + 下一估值 − 旧估值。','正奖励也可能低于预期；终止与回合边界必须处理。',TEAL),
      ('06 · 资格迹 Eligibility','给早先动作分配信用','留下连接参与记录，晚到奖励再调制。','E ← γλE + 参与量；奖励归属真实动作，不等于记住路牌。',TEAL),
      ('07 · Trace 工作活动轨迹','给下一观察保留上下文','平滑保留最近神经活动，再影响下一计算。','短期数值状态，不是可靠离散路牌变量；本地未证明其收益。',PURPLE),
      ('08 · 两速联想 + Delta','快适应 / 慢关联','读线索估计结果，再写入“真实 − 已有”的纠偏。','SynapticMemory；相同观察键可混合历史，有限容量会干扰。',PURPLE),
      ('09 · Records 稀疏线索码','事件关联与字段补全','以数值线索读写真实事件字段的关联。','局部 Delta 写入；近似补全不是数据库精确事实查询。',PURPLE),
      ('10 · 门控扫描 + Adjoint','慢参数学习 / 可选巩固','RecordPatchNet.observe 对计算路径反向求导。','默认不是 EP；记录写入另用 Delta，sleep 不验证补全真实性。',PURPLE),
      ('11 · 转移 + 有限证据修复','部分观测的状态推断','BeliefPatch 按动作推进，再用新证据纠偏。','用 adjoint 学有限迭代；不是已校准概率或 Kalman 协方差。',BLUE),
      ('12 · 可控输入优化 plan','从后果模型找控制序列','固定模型，在声明动作边界内调整候选输入。','预测成本下降需再执行验证；默认 Brain.imagine 不生成环境转移。',AMBER),
    ]
    colw=(INNER-2*GAP)/3
    for i,(name,job,principle,limit,color) in enumerate(modules):
        x=M+(i%3)*(colw+GAP);y=1588+(i//3)*213
        f.panel(x,y,colw,195)
        f.text(x+23,y+17,name,32,INK,True)
        f.text(x+23,y+61,'作用：'+job,27,color,True)
        ny=f.para(x+23,y+103,principle,colw-46,25,MUTED,spacing=1.2)
        f.para(x+23,ny+9,limit,colw-46,23,MUTED,spacing=1.25)
    f.owner=(0,0,W,H)

    f.text(M,2438,'研究对照（应用实现）：规则按反馈巡查；Q-learning 更新状态动作价值表；匀速 / 匀加速按运动假设外推；零位移保持当前位置。',26,MUTED)
    f.heading(2490,'04','从真实演示看：算法如何起作用，结果支持什么','画面是单种子 / 某帧；下方成绩是四种子汇总。截图裁取相关区域，未改结果；分母与指标分别标明。')
    photo_cards=[
      ('四店：奖励变化后再学习','cover.jpg',None,'画面：种子 7，第 416 轮；近期窗口值。',
       [f"总体找到食物（2400 轮）：Cadence {npc_rates['cadence']:.2f}%",f"规则 {npc_rates['rule']:.2f}%  /  Q-learning {npc_rates['q']:.2f}%",'Cadence 各阶段末 50 轮平均命中 100%。'],
       '算法作用：Actor–Critic 与关联写入改变下一次选店。','能再学习；小型可枚举任务中，强规则更快。','http://127.0.0.1:8190/index.html#experiment'),
      ('街区：线索消失、奖励晚到','route-cover.jpg',(0,0,767,665),'画面：种子 7，途中反馈，360 趟完成。',
       [f"Cadence 终点 / 途中反馈：",f"街口 {route_rates[('brief','sparse')]:.2f}% → {route_rates[('brief','waypoints')]:.2f}%",f"持续 {route_rates[('visible','sparse')]:.2f}% → {route_rates[('visible','waypoints')]:.2f}%；每条件 1440 趟"],
       '算法作用：Trace 留活动；资格迹把晚奖归属早先选择。','未测出总体优势；关闭 Trace 对照未证明收益。','http://127.0.0.1:8190/route.html#results'),
      ('内部帧：动作如何变成参数变化','algorithm-update.png',(40,326,1233,1163),'画面：一个真实更新帧，展示活动与连接。',
       ['街区：42 个单元、450 条有向连接。','逐帧查看观察、活动、选择、资格、奖励与更新。','本帧连接权重前后值、Δw 可回查原记录。'],
       '算法作用：TD 调制资格迹；学习掩码与约束安装变化。','这是机制证据；内部求解合格仍需实际任务评分。','http://127.0.0.1:8190/route.html#algorithm'),
      ('有惯性鱼：从历史学重复运动联系','fish-inertia-desktop.jpg',(25,318,1240,1090),'画面：种子 7，会话误差；下方为四种子。',
       [f"平均轨迹误差（px）：{inertia['cold_cadence']['ade']:.2f} → {inertia['cadence']['ade']:.2f}",f"匀速 {inertia['velocity']['ade']:.2f}  /  匀加速度 {inertia['acceleration']['ade']:.2f}",f"命中 Cadence {inertia['cadence']['hits']}/192；匀加速度 {inertia['acceleration']['hits']}/192"],
       '算法作用：Temporal 状态 + EP 修正位移预测。','留出误差降低；预测更准仍不保证命中更多。','http://127.0.0.1:8190/fishing.html'),
      ('独立随机鱼：学习不会产生缺失信息','fish-independent-desktop.jpg',(25,318,1240,1090),'画面：种子 7，独立随机会话。',
       [f"平均轨迹误差（px）：Cadence {random['cadence']['ade']:.2f}",f"无需训练的零位移 {random['stationary']['ade']:.2f}",f"命中 Cadence {random['cadence']['hits']}/192；零位移 {random['stationary']['hits']}/192"],
       '算法作用：学到少外推 / 均值收缩，减少失配。','不能知道下一次随机方向；简单参考仍更准。','http://127.0.0.1:8190/fishing.html#principle'),
      ('一条鱼的 EP：更新方向可独立核验','ep-weight-check.png',(142,171,1098,633),'画面：训练样本的独立权重探针；不是留出成绩。',
       [f"C[2,0]：{old:.10f} → {new:.10f}",'只改一项：该点误差 22.31 → 22.30 px。','全部 288 项一起：22.31 → 8.84 px。'],
       '算法作用：两侧导数对比估计斜率，再沿反方向改参数。','同一训练样本改善，只说明此次学习，不代表新鱼效果。','http://127.0.0.1:8190/fish-ep.html#ep-check'),
    ]
    for i,(title,name,crop,caption,values,job,conclusion,href) in enumerate(photo_cards):
        x=M+(i%3)*(colw+GAP);y=2578+(i//3)*815
        f.panel(x,y,colw,790)
        f.pill(x+22,y+18,'本地已测',TEAL,SOFT,23)
        f.text(x+22,y+76,title,31,INK,True)
        f.image(name,x+20,y+125,colw-40,370,crop,href)
        f.text(x+22,y+509,caption,23,MUTED)
        yy=y+550
        for value in values: yy=f.para(x+22,yy,value,colw-44,28,INK,bold=True,spacing=1.25)+9
        yy=f.para(x+22,yy+3,job,colw-44,25,TEAL,spacing=1.3)
        f.para(x+22,yy+10,conclusion,colw-44,25,AMBER,spacing=1.3)
    f.owner=(0,0,W,H)

    f.heading(4240,'05','EP 的数字桥：怎样从教学作用得到权重该改的方向','固定同一训练鱼：t=0.40 s → 未来 +0.20 s 的 x，C[2,0]；截图讲解可单步回看。')
    epw=(INNER-2*GAP)/3
    f.panel(M,4350,epw,410,BLUE_SOFT)
    f.text(M+24,4372,'同输入、旧参数、同自由起点',31,BLUE,True)
    f.para(M+24,4424,'自由态：模型自己的回答。\n+β：教学朝答案影响活动。\n−β：教学以相反符号影响活动。\n改变的是教学状态，参数暂时不变。',epw-48,28,INK)
    f.para(M+24,4620,'g⁺ = −0.0000009750494\ng⁻ = +0.0000009753703\nG_EP = (g⁺ − g⁻)/(2β) ≈ −0.00032506994',epw-48,27,BLUE)
    f.panel(M+epw+GAP,4350,epw,410)
    f.image('ep-beta-factor-desktop.png',M+epw+GAP+18,4366,epw-36,284,(49,492,1213,873),'http://127.0.0.1:8190/fish-ep.html#ep-beta-bridge')
    f.para(M+epw+GAP+24,4667,'局部导数先含误差，再除回 β 的尺度；只对这条 C 权重展示直接推导。',epw-48,27,MUTED)
    f.panel(M+2*(epw+GAP),4350,epw,410)
    f.image('ep-contrast-scale-desktop.png',M+2*(epw+GAP)+18,4366,epw-36,284,(46,310,1219,660),'http://127.0.0.1:8190/fish-ep.html#ep-contrast-animation')
    f.para(M+2*(epw+GAP)+24,4667,'两侧各除自己的有符号 β，再平均；等于中心对比，估计同一损失斜率。',epw-48,27,MUTED)
    f.owner=(0,0,W,H)
    f.text(M,4784,f'更新：w新 = w旧 − 5 × G_EP；整批训练损失 {ep["update"]["initial_loss"]:.6f} → {ep["update"]["final_loss"]:.6f}。',31,TEAL,True)
    f.text(M,4830,'条件：稳定光滑分支、小扰动、求解精度；有限 β 是近似。奖励图的活动对比和时序导数不是同一公式。',27,MUTED)

    f.heading(4910,'06','14 个场景与业务：把输入、输出、反馈设计好','除了本地 NPC / 街区 / 捕鱼，以下都需独立业务验证；个人历史可作输入，不等于能知道新意图。')
    business=[('预测 / 判断 · 5 项','已测：捕鱼短时轨迹\n候选：无人机操作响应、设备趋势\n上游机制：数值分类 / 回归\n候选：正常预测偏差 / 异常提示','位置 / 工况 / 操作 → 预测 → 真实后续',BLUE,BLUE_SOFT),
              ('动作 / 奖励 · 6 项','已测：NPC 选店、多步任务\n候选：虚拟宠物、动态难度\n候选：有限工具路由、个性化提示','数值情境 → 允许动作 → 可靠反馈',TEAL,SOFT),
              ('记忆 / 回查 · 1 项','候选：真实事件关联与补全\n机制：Records / RecordPatchNet\n要测干扰、纠错与旧事件保留','真实字段 → 写入 → 部分线索再读',PURPLE,PURPLE_SOFT)]
    for i,(title,content,flow,color,fill) in enumerate(business):
        x=M+i*(colw+GAP);f.panel(x,5020,colw,258,fill)
        f.text(x+24,5043,title,32,color,True)
        yy=f.para(x+24,5094,content,colw-48,28,INK,spacing=1.3)
        f.text(x+24,yy+10,flow,25,color,True)
    # A distinct, explicitly conceptual image is kept away from the evidence gallery.
    f.panel(M,5310,INNER,350,AMBER_SOFT)
    f.text(M+25,5333,'学后果 / 规划 · 2 项：模拟机器人、环境 / 温控调节',34,AMBER,True)
    f.para(M+25,5390,'先用“状态 + 已执行动作 → 真实后果”训练模型。\n再把目标与动作边界交给 plan，优化可控输入。\n执行第一段 → 实际测量 → 重新规划。预测成本下降需由现实结果核验。',1950,30,INK)
    f.para(M+25,5575,'上游有一维有界交互示例；本项目尚未运行规划业务。无人机无飞行日志 / 飞控验证，不能套用捕鱼精度。',1950,27,AMBER)
    f.image('capabilities-explorer-desktop.jpg',W-M-760,5380,720,226,(219,240,768,700),'http://127.0.0.1:8190/applications.html#scene-drone')
    f.text(W-M-760,5620,'网页说明截图 · 不是无人机实测',25,AMBER,True)
    f.owner=(0,0,W,H)

    f.heading(5710,'07','对你的意义与扩展顺序：以任务收益决定投入')
    values=[('游戏开发：让行为可适应','可接一个有限动作模块，研究宠物 / NPC 随实际经历改变。优先与规则、Q-learning 对照；复杂画面不能代替更强任务。'),
            ('预测与控制：检验可重复关系','可先导入历史日志，比较是否真有额外信息。无人机加已发操作；有物理模型先做强基线，再研究学习偏差或规划。'),
            ('研究复用：把学习过程看清','已有真实帧、数据、源码与对照。可问清哪步改了参数、何种记忆有贡献、代价多少，为是否采用提供可复查证据。')]
    for i,(title,content) in enumerate(values):
        x=M+i*(colw+GAP);f.panel(x,5793,colw,225,SOFT)
        f.text(x+24,5817,title,33,TEAL,True)
        f.para(x+24,5874,content,colw-48,29,INK)
    f.owner=(0,0,W,H)
    extensions=[('1 · 当前演示加条件','时长、线索、未见组合；测适应与旧条件保留。'),('2 · 信息 / 机制消融','加操作、关记忆；确认哪些输入与算法实际贡献。'),('3 · 物理 + 学习','物理基线与偏差修正；统一数据和计算预算。'),('4 · 多分支 / 范围','设计候选轨迹与校准；当前只有点预测。'),('5 · 模拟后果与规划','先验模型留出，再测真正执行后的目标达成。'),('6 · 长期状态 / 续跑','测干扰、恢复与完整存档；现有会话未做恢复导入。')]
    extw=(INNER-2*GAP)/3
    for i,(title,detail) in enumerate(extensions):
        x=M+(i%3)*(extw+GAP); y=6050+(i//3)*130
        f.panel(x,y,extw,112)
        f.text(x+20,y+15,title,29,INK,True)
        f.para(x+20,y+56,detail,extw-40,26,MUTED,spacing=1.3)
    f.owner=(0,0,W,H)
    f.text(M,6300,'库外候选路线：Kalman / IMM / 粒子滤波、GRU / LSTM、物理 + 学习等；需要另外接入、匹配数据与预算，不能宣称库已全部内置。',26,MUTED)
    f.rect(M,6335,INNER,123,AMBER_SOFT,AMBER_SOFT)
    f.text(M+24,6356,'何时更值得探索：变化有可观测规律，反馈可靠，简单方法不足，而且留出任务收益能覆盖计算成本。',32,AMBER,True)
    f.text(M+24,6410,'现有数据仍是固定配置的开发研究；无独立确认 / 显著性结论，未证明通用优势、低功耗或商业收益。',28,INK)
    f.line([(M,6496),(W-M,6496)],LINE,2)
    f.text(M,6520,'来源：Cadence 0.80.0 · GPL-3.0 · commit 19bee92756d1842176ad30b1cd01edbfbfa3f14c · 研究更新 2026-10-12',27,MUTED)
    f.text(M,6570,'算法：固定 contracts / learning / reward / temporal / memory / record-patch / belief / interaction 文档。效果：本项目原始 JSON。',25,MUTED)
    f.text(M,6616,'网页：http://127.0.0.1:8190/applications.html   ·   原图中截图可点入对应演示（SVG）   ·   当前仅本机运行，尚未公开部署',25,MUTED)
    f.save()


if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--font',type=Path,default=Path('C:/Windows/Fonts/msyh.ttc'))
    parser.add_argument('--font-bold',type=Path,default=Path('C:/Windows/Fonts/msyhbd.ttc'))
    args=parser.parse_args()
    if not args.font.exists() or not args.font_bold.exists(): parser.error('Provide installed Chinese fonts with --font and --font-bold')
    build(Figure(args.font,args.font_bold))
