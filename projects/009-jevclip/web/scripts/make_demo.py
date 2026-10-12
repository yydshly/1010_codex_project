"""Generate the project's own silent demonstration video (requires Pillow + ffmpeg)."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from PIL import Image, ImageDraw, ImageFont

data = json.loads(sys.stdin.buffer.read().decode('utf-8'))
assets = Path(__file__).resolve().parents[2] / 'assets'
assets.mkdir(exist_ok=True)
font_path = os.environ.get('JEVCLIP_DEMO_FONT', 'C:/Windows/Fonts/msyh.ttc')
if not Path(font_path).is_file():
    raise RuntimeError('Set JEVCLIP_DEMO_FONT to a font with Chinese glyphs')

def font(size):
    return ImageFont.truetype(font_path, size)

def wrap(text, size, width):
    lines, line = [], ''
    for char in text:
        if font(size).getlength(line + char) > width:
            lines.append(line)
            line = char
        else:
            line += char
    if line:
        lines.append(line)
    return lines

with tempfile.TemporaryDirectory(prefix='.jevclip-demo-', dir=assets) as temporary:
    folder = Path(temporary)
    listing = []
    for index, cue in enumerate(data['cues']):
        image = Image.new('RGB', (1280, 720), '#1b3028')
        draw = ImageDraw.Draw(image)
        for radius in (185, 238, 291):
            draw.ellipse((1060-radius, 250-radius, 1060+radius, 250+radius), outline='#2a4335', width=1)
        draw.line((65, 89, 1215, 89), fill='#3b5140', width=1)
        draw.text((65, 44), 'FRAME NOTES  /  RESEARCH PROCESS', font=font(16), fill='#a9bf8c')
        draw.text((1035, 44), '原创合成示例', font=font(16), fill='#a9bf8c')
        draw.rounded_rectangle((65, 137, 186, 173), radius=5, fill='#344b34')
        draw.text((80, 143), f'CHAPTER {index+1:02}', font=font(15), fill='#c2d6a8')
        draw.text((60, 207), cue['title'], font=font(55), fill='#eff3e5')
        draw.text((1010, 159), f'{index+1:02}', font=font(108), fill='#344c36')
        for number, line in enumerate(wrap(cue['text'], 26, 1000)):
            draw.text((65, 313 + number * 48), line, font=font(26), fill='#bdcbb0')
        for n, (label, desc) in enumerate([('01', '读取原文'), ('02', '明确取舍'), ('03', '回查依据')]):
            left = 65 + n * 383
            draw.rounded_rectangle((left, 555, left + 350, 636), radius=8, fill='#223a2e', outline='#3b523b', width=1)
            draw.text((left + 23, 578), label, font=font(19), fill='#93ac75')
            draw.text((left + 71, 576), desc, font=font(24), fill='#d7e0cb')
        draw.text((65, 675), 'JEVCLIP LAB  /  009', font=font(12), fill='#839775')
        draw.text((1080, 674), f'{int(cue["start"]):03}s — {int(cue["end"]):03}s', font=font(12), fill='#839775')
        frame = folder / f'chapter-{index}.png'
        image.save(frame)
        listing.extend([f"file '{frame.as_posix()}'", f'duration {cue["end"]-cue["start"]}'])
    listing.append(f"file '{frame.as_posix()}'")
    list_file = folder / 'frames.txt'
    list_file.write_text('\n'.join(listing), encoding='utf-8')
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(list_file), '-t', '200', '-vf', 'fps=6', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(assets / 'demo.mp4')], check=True)

def stamp(seconds):
    return f'{int(seconds)//3600:02}:{int(seconds)//60%60:02}:{int(seconds)%60:02},000'

(assets / 'demo.srt').write_text('\n'.join(f'{i+1}\n{stamp(c["start"])} --> {stamp(c["end"])}\n{c["text"]}\n' for i, c in enumerate(data['cues'])), encoding='utf-8')
print('Generated original 200-second silent sample: assets/demo.mp4 + demo.srt')
