"""Render the research infographic from editable text and vector primitives.

This is deterministic diagram layout, not an AI model invocation or image edit.
Requires Pillow and Microsoft YaHei (Windows system font; not redistributed).
"""
from pathlib import Path
from html import escape
import math
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets'
NAME = 'jevclip-overview-2026-10-12'
W, M, GAP = 2400, 90, 36
CW = W - 2 * M
HALF = (CW - GAP) / 2
C = dict(bg='#F5F7F4', paper='#FFFFFF', ink='#192B26', muted='#54675F',
         green='#236747', sage='#EAF3EC', blue='#EAF1F8', blueink='#365D7F',
         amber='#FBF1DC', amberink='#89602C', line='#D6E1D8', dark='#173F30')
FONTS = {
    'regular': Path('C:/Windows/Fonts/msyh.ttc'),
    'bold': Path('C:/Windows/Fonts/msyhbd.ttc'),
}
font_cache = {}
primitives = []


def font(size, bold=False):
    key = (size, bold)
    if key not in font_cache:
        font_cache[key] = ImageFont.truetype(str(FONTS['bold' if bold else 'regular']), size)
    return font_cache[key]


def wrap(text, width, size=38, bold=False):
    result = []
    for paragraph in text.split('\n'):
        line = ''
        for char in paragraph:
            if line and font(size, bold).getlength(line + char) > width:
                result.append(line)
                line = char
            else:
                line += char
        result.append(line)
    return result


def rect(x, y, width, height, fill, radius=26, stroke=None):
    primitives.append(('rect', x, y, width, height, fill, radius, stroke))


def line(x1, y1, x2, y2, fill, width=3):
    primitives.append(('line', x1, y1, x2, y2, fill, width))


def text(x, y, value, size=38, fill=None, bold=False):
    primitives.append(('text', x, y, value, size, fill or C['ink'], bold))


def block(x, y, value, width, size=38, fill=None, bold=False, leading=None):
    leading = leading or int(size * 1.55)
    lines = wrap(value, width, size, bold)
    for i, content in enumerate(lines):
        text(x, y + i * leading, content, size, fill, bold)
    return len(lines) * leading


def arrow(x1, y1, x2, y2, fill=None, width=6):
    fill = fill or C['green']
    line(x1, y1, x2, y2, fill, width)
    angle = math.atan2(y2 - y1, x2 - x1)
    points = [(x2, y2)]
    for direction in (-1, 1):
        a = angle + direction * 0.6
        points.append((x2 - 20 * math.cos(a), y2 - 20 * math.sin(a)))
    primitives.append(('poly', points, fill))


def heading(y, number, title):
    rect(M, y + 1, 85, 70, C['green'], 18)
    text(M + 14, y + 5, number, 44, '#FFFFFF', True)
    text(M + 110, y, title, 54, C['ink'], True)
    return y + 104


def card_height(title, paragraphs, width, size=38):
    height = 40 + len(wrap(title, width - 72, 44, True)) * 65 + 16
    for paragraph in paragraphs:
        height += len(wrap(paragraph, width - 72, size)) * int(size * 1.55) + 14
    return height + 24


def card(x, y, width, title, paragraphs, fill=None, height=None, size=38, title_fill=None):
    height = height or card_height(title, paragraphs, width, size)
    rect(x, y, width, height, fill or C['paper'], 28, C['line'])
    cursor = y + 32
    cursor += block(x + 36, cursor, title, width - 72, 44, title_fill or C['green'], True, 65)
    cursor += 16
    for paragraph in paragraphs:
        cursor += block(x + 36, cursor, paragraph, width - 72, size)
        cursor += 14
    assert cursor <= y + height - 12, (title, cursor, height)
    return height


def pair(y, left, right):
    heights = [card_height(c[0], c[1], HALF, 36) for c in (left, right)]
    height = max(heights)
    card(M, y, HALF, left[0], left[1], left[2], height, 36)
    card(M + HALF + GAP, y, HALF, right[0], right[1], right[2], height, 36)
    return y + height + 58


def strip(y, value, fill=None, size=35):
    h = len(wrap(value, CW - 64, size)) * int(size * 1.55) + 48
    rect(M, y, CW, h, fill or C['sage'], 20)
    block(M + 32, y + 22, value, CW - 64, size)
    return y + h + 24


# Header and a quiet status legend.
rect(0, 0, W, 335, C['dark'], 0)
text(M, 52, 'Jevclip 一图读懂', 94, '#FFFFFF', True)
text(M, 170, '字幕驱动的内容粗剪 · 带出处的知识整理', 48, '#E1ECE4')
text(M, 259, 'cclank/jevclip  |  v0.1.1 · Alpha · MIT  |  研究版本 3d4b13f6ecbb', 32, '#CDDDD1')
y = 371
for x, fill, label in [(M, C['green'], '已验证的流程'), (M + 430, C['blueink'], '上游能力'), (M + 800, C['amberink'], '待验证 / 扩展')]:
    rect(x, y + 12, 20, 20, fill, 6)
    text(x + 36, y, label, 30, C['muted'])
y += 77

y = heading(y, '01', '它能带来什么效果？')
y += block(M, y, '把长视频中的有用讲解筛出来，再产出可回查的研究材料。', CW, 48, C['green'], True) + 26
third = (CW - 2 * GAP) / 3
results = [
    ('精选高亮', ['按时长预算挑选片段，保持原顺序。']),
    ('保守去水版', ['移除明确低价值内容，尽量保留完整讲解。']),
    ('带引用摘要', ['生成要点，回到源时间或段落核查。']),
]
h = max(card_height(t, p, third, 36) for t, p in results)
for i, (title, paragraphs) in enumerate(results):
    card(M + i * (third + GAP), y, third, title, paragraphs, C['paper'], h, 36)
y += h + 24
y = strip(y, '还可输出重对齐字幕、报告与 JSON。适合内容初筛与粗剪，之后仍需人工复核和精剪。') + 34

y = heading(y, '02', '底层如何实现？')
stage_gap = 46
stage_w = (CW - 3 * stage_gap) / 4
stages = [
    ('1  字幕 / 文字稿', ['SRT · VTT · JSON', '解析源位置，按停顿与句子切段，约 20 秒一段。'], C['paper']),
    ('2  远程 Jev 判断', ['发送标题 + 当前片段原文。', 'TypeSafe API', '默认 jev-1.13.0'], C['blue']),
    ('3  结构化答案', ['类别概率：Choice', '信息密度：Score（0–3）', '概率判断：Noul（0–1）', '夸大 / 独立性 / 相关性'], C['blue']),
    ('4  代码决定取舍', ['价值分 + 门槛', '时长预算选择 / 保守删除', '人工标注校准策略'], C['sage']),
]
h = max(card_height(t, p, stage_w, 34) for t, p, _ in stages)
for i, (title, paragraphs, fill) in enumerate(stages):
    x = M + i * (stage_w + stage_gap)
    card(x, y, stage_w, title, paragraphs, fill, h, 34)
    if i < 3:
        arrow(x + stage_w + 5, y + h / 2, x + stage_w + stage_gap - 9, y + h / 2)
stage_bottom = y + h
# Only the policy stage splits into editing and summary outputs.
source_x = M + 3 * (stage_w + stage_gap) + stage_w / 2
branch_y = stage_bottom + 55
line(source_x, stage_bottom, source_x, branch_y, C['green'], 6)
centers = [M + HALF / 2, M + HALF + GAP + HALF / 2]
line(centers[0], branch_y, source_x, branch_y, C['green'], 6)
for center in centers:
    arrow(center, branch_y, center, branch_y + 60)
y = branch_y + 69
branches = [
    ('A  FFmpeg 执行剪辑', ['精选 MP4 / 去水 MP4 / 对齐字幕。', '高亮按背包算法分配时长；去水采用更保守条件。未进高亮，不等于应删除。'], C['sage']),
    ('B  另一个生成式模型写摘要', ['保留段 → 摘要 + 片段编号。', '代码把编号映射为源时间 / 段落，检查引用与覆盖；仍需核查结论是否受原文支持。'], C['blue']),
]
y = pair(y, branches[0], branches[1]) - 26
y = strip(y, '价值分 = 信息密度 / 3 × (1 − 闲话概率) × 关注点相关度', C['sage'], 41)
y = strip(y, '闲话包括寒暄、推广、空话；未设关注点时相关度为 1。默认保留要求价值 ≥ 0.5、闲话 < 0.5、夸大 < 0.6；设关注点时相关度 ≥ 0.5。门槛需用自己的材料校准。', C['paper'])
y = strip(y, '每段窄问题合并请求，支持并发与重试。SQLite 缓存以模型、标题、原文、问题为依据；改门槛或时长预算可复用判断。请求失败应标记未判断。', C['paper']) + 32

y = heading(y, '03', 'Jev 是什么？需要真实调用吗？')
y = pair(y,
    ('Jevclip 是调用方', [
        'API：api.typesafe.ai/v1/systemone',
        '密钥：TYPESAFE_API_KEY',
        '库中没有 Jev 权重或训练代码。',
        'Jev 是文本结构化决策模型。官方描述采用 RLCD 后训练，提高决策校准；具体底座、参数与完整训练实现未核实。',
    ], C['blue']),
    ('按目的判断是否需要调用', [
        '体验网页交互：无需真实 Jev。',
        '复现语义筛选：真实 Jev 或已有判断缓存。',
        '验证模型效果：真实调用 + 人工标注。',
        '自动生成摘要：另配生成式模型。',
        '剪视频：FFmpeg 执行。未来可替换判断模型，但要重新评估。',
    ], C['paper'])) - 26
y = strip(y, '模型判断不等于事实核验；概率校准不保证每条答案正确。接 API 时字幕文本会发往外部服务，密钥应留在服务端。', C['amber']) + 32

y = heading(y, '04', '源库能力与当前演示的区别')
columns = [365, 895, CW - 1260]
headers = ['能力', '上游 Jevclip', '当前网页「片刻」']
rows = [
    ['导入与切段', '字幕、文字稿解析', '已实现，支持拖放'],
    ['关注点筛选', 'Jev 语义判断与概率', '本地关键词 + 人工取舍'],
    ['视频处理', 'FFmpeg 真正剪辑导出', '原视频定位与时间线预览'],
    ['摘要与出处', '模型生成，编号映射源位置', '原句摘录，点击回查与跳转'],
    ['研究保存', '报告、字幕与 JSON', 'Markdown 导出与本机恢复'],
    ['模型接入', '需要 API 配置', '未调用 Jev 或摘要模型'],
]
header_h = 93
rect(M, y, CW, header_h, C['green'], 18)
x = M
for width, value in zip(columns, headers):
    text(x + 27, y + 20, value, 38, '#FFFFFF', True)
    x += width
y += header_h
for i, row in enumerate(rows):
    row_h = max(len(wrap(value, width - 54, 36)) * 56 for value, width in zip(row, columns)) + 40
    rect(M, y, CW, row_h, '#FFFFFF' if i % 2 == 0 else '#EBF2EC', 0)
    x = M
    for j, (width, value) in enumerate(zip(columns, row)):
        block(x + 27, y + 17, value, width - 54, 36, bold=j == 0, leading=56)
        x += width
    y += row_h
y += 24
y = strip(y, '当前演示验证了研究流程；不能用来证明 Jev 的识别准确率，也不输出剪辑成品。', C['amber']) + 32

y = heading(y, '05', '适用场景与能力边界')
y = pair(y,
    ('适合', ['教程与课程、技术讲解、作者访谈。', '项目演示的有声讲解、长视频资料初筛。', '字幕中含有主要信息，且需要保留出处。'], C['sage']),
    ('目前不具备', ['无自动转写；不理解视频画面。', '无旁白操作、未读出的 PPT / 图表容易遗漏。', '无镜头节奏、配乐、调色、转场能力。', '字幕错误或缺少前文，会影响判断。'], C['amber'])) - 26
y = strip(y, '带时间引用 ≠ 摘要结论一定被原文支持；仍需检查语义、条件与上下文。', C['paper']) + 32

y = heading(y, '06', '对你的价值：把视频变成项目研究证据')
h = card(M, y, CW, '从观看素材到有依据的中文笔记', [
    '项目教程 / 作者讲解 → 按部署、原理、效果、局限筛选 → 形成中文 README 与研究笔记 → 点击出处回到原文和视频。',
    '减少反复拖动进度条；让研究结论有依据；保留人工纠正与可审计记录。',
    '可复用的工程思路：模型判断、代码策略、源位置绑定、缓存、失败状态、人工复核。',
    '如果很少研究长视频，直接收益有限；它补充源码阅读与测试，实际节省时间尚未测量。',
], C['sage'], size=38)
y += h + 58

y = heading(y, '07', '已验证什么？怎样判断值不值得接？')
y = pair(y,
    ('已有证据', [
        '上游测试：101 项，99 通过。',
        '2 项失败与 Windows 路径 / CRLF 夹具有关。',
        '真实 FFmpeg 剪辑与字幕对齐已测试。',
        '网页：15 项数据测试通过，交互已验证。',
        '模型测试采用模拟；真实 Jev 效果未独立验证。作者效果记录仅是有限样本。',
    ], C['paper']),
    ('下一步：用真实材料验证', [
        '先标注约 50 个真实字幕片段。',
        '对比关键词规则与真实 Jev 判断。',
        '观察重点误删、漏选、无关保留与连贯性。',
        '核查摘要结论是否被引用原文支持。',
        '记录延迟、调用量、成本和缓存收益。小样本试验不能证明通用准确率。',
    ], C['amber']))

y = heading(y, '08', '可扩展路线（以下均为规划）')
roadmap = [
    ('1  真实判断与评估', ['接入 Jev / 摘要 API，领域标注与门槛校准。'], C['blue']),
    ('2  完整粗剪流程', ['服务端 FFmpeg 导出，人工审片，字幕与出处保留。'], C['sage']),
    ('3  补足多模态', ['ASR + 术语纠错，OCR / 关键帧，前后文复核。'], C['paper']),
    ('4  研究资料库', ['跨视频检索、来源版本、要点与证据关联。'], C['paper']),
]
y = pair(y, roadmap[0], roadmap[1]) - 30
y = pair(y, roadmap[2], roadmap[3]) - 10
rect(M, y, CW, 195, C['dark'], 28)
text(M + 38, y + 29, '近期价值：有依据的内容初筛与视频粗剪', 47, '#FFFFFF', True)
text(M + 38, y + 103, '长期方向：可回查、可纠正、可持续积累的视频研究助手', 40, '#E1ECE4')
y += 231
y += block(M, y, '来源：github.com/cclank/jevclip · TypeSafe 官方文档 · 本地研究与验证记录', CW, 29, C['muted'])
y += block(M, y, '整理日期：2026-10-12  |  基于固定版本研究  |  知识汇总，非模型效果截图', CW, 29, C['muted'])
H = math.ceil(y + 75)

# Render both formats from the same complete, editable diagram primitives.
image = Image.new('RGB', (W, H), C['bg'])
draw = ImageDraw.Draw(image)
svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
       '<title>Jevclip 一图读懂：字幕驱动的内容粗剪与视频研究价值</title>',
       '<desc>八部分中文研究总览，区分源库能力、当前网页演示、已验证事实与规划。</desc>',
       f'<rect width="100%" height="100%" fill="{C["bg"]}"/>']
for p in primitives:
    if p[0] == 'rect':
        _, x, sy, width, height, fill, radius, stroke = p
        draw.rounded_rectangle((x, sy, x + width, sy + height), radius, fill, outline=stroke, width=2)
        stroke_attr = f' stroke="{stroke}" stroke-width="2"' if stroke else ''
        svg.append(f'<rect x="{x}" y="{sy}" width="{width}" height="{height}" rx="{radius}" fill="{fill}"{stroke_attr}/>')
    elif p[0] == 'line':
        _, x1, y1, x2, y2, fill, width = p
        draw.line((x1, y1, x2, y2), fill, width)
        svg.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{fill}" stroke-width="{width}"/>')
    elif p[0] == 'poly':
        _, points, fill = p
        draw.polygon(points, fill)
        svg.append(f'<polygon points="{" ".join(f"{x},{sy}" for x,sy in points)}" fill="{fill}"/>')
    elif p[0] == 'text':
        _, x, sy, value, size, fill, bold = p
        f = font(size, bold)
        draw.text((x, sy), value, fill, font=f, anchor='lt')
        # Baseline at the ascent keeps SVG editable while closely matching Pillow.
        ascent, _ = f.getmetrics()
        weight = '700' if bold else '400'
        svg.append(f'<text x="{x}" y="{sy + ascent}" font-family="Microsoft YaHei, Noto Sans CJK SC, sans-serif" font-size="{size}" font-weight="{weight}" fill="{fill}">{escape(value)}</text>')
OUT.mkdir(parents=True, exist_ok=True)
png_path = OUT / f'{NAME}.png'
svg_path = OUT / f'{NAME}.svg'
image.save(png_path, optimize=True)
svg_path.write_text('\n'.join(svg + ['</svg>']), encoding='utf-8')
print(f'PNG: {png_path}\nSVG: {svg_path}\nDimensions: {W} x {H}\nText blocks: {sum(p[0] == "text" for p in primitives)}')
