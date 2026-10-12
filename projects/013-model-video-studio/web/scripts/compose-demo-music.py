"""原创演示配乐：程序合成的柔和和弦与琶音，没有调用音乐 AI 模型。"""
from pathlib import Path
import math, wave, struct

destination=Path(__file__).resolve().parents[2]/'assets'/'music'
destination.mkdir(parents=True,exist_ok=True)
rate=24000
chords=[[60,64,67,71],[57,60,64,67],[53,57,60,64],[55,59,62,67]]
samples=[]
def frequency(note):return 440*2**((note-69)/12)
for i in range(rate*16):
    t=i/rate;chord=chords[int(t//4)];local=t%4
    pad_envelope=min(1,local/.08,(4-local)/.15)
    pad=sum(math.sin(2*math.pi*frequency(n-12)*t) for n in chord)*.055*pad_envelope
    step=int(t/.5);note=chord[[0,2,1,3,2,1,3,2][step%8]]+12;elapsed=t%.5
    envelope=min(1,elapsed/.012)*math.exp(-elapsed*7)*min(1,(.5-elapsed)/.04)
    bell=(math.sin(2*math.pi*frequency(note)*elapsed)+.18*math.sin(4*math.pi*frequency(note)*elapsed))*.17*envelope
    soft_bass=math.sin(2*math.pi*frequency(chord[0]-24)*t)*.065*pad_envelope
    samples.extend([max(-32767,min(32767,round((pad+soft_bass+bell*.9)*32767))),max(-32767,min(32767,round((pad+soft_bass+bell*.7)*32767)))])
with wave.open(str(destination/'soft-studio-original.wav'),'wb') as out:
    out.setnchannels(2);out.setsampwidth(2);out.setframerate(rate);out.writeframes(struct.pack('<'+'h'*len(samples),*samples))
print('Created original 16-second instrumental WAV (programmatic synthesis, no AI music model).')
