"""Signal Flow: original score selected for Blurb v6.
100 BPM / 29.4 seconds / 48 kHz stereo. No stock recordings or UI effects.
Run python audio.py [output-directory], then python export.py --audio-only.
The deterministic instrument seed preserves the approved audition exactly.
"""
from pathlib import Path
import json, sys, wave
import numpy as np

SR = 48000
BPM = 100
BEAT = 60 / BPM
DURATION = 29.4
N = round(SR * DURATION)
TIME = np.arange(N, dtype=np.float64) / SR
HERE = Path(__file__).resolve().parent
OUT = Path(sys.argv[1]).resolve() if len(sys.argv)>1 else HERE/'out'
OUT.mkdir(parents=True,exist_ok=True)
RNG = np.random.default_rng(20260927)
EVENTS = []

def hz(m): return 440 * 2**((m-69)/12)

def envelope(n, attack=.015, release=.12):
    a, r = min(n,round(attack*SR)), min(n,round(release*SR))
    e = np.ones(n)
    if a: e[:a] *= np.sin(np.linspace(0,np.pi/2,a))**2
    if r: e[-r:] *= np.sin(np.linspace(np.pi/2,0,r))**2
    return e

def put(bus, signal, beat, level=1, label=None, notes=None):
    start = round(beat*BEAT*SR)
    skip = max(0,-start)
    start = max(0,start)
    count = min(N-start,len(signal)-skip)
    if count>0: bus[start:start+count] += signal[skip:skip+count]*level
    if label: EVENTS.append({'instrument':label,'beat':round(float(beat),4),'seconds':round(beat*BEAT,6),'duration':round(len(signal)/SR,6),'notes':notes,'level':level})

def stereo(x, pan=0):
    if x.ndim==2: return x
    return np.column_stack([x*np.sqrt((1-pan)/2),x*np.sqrt((1+pan)/2)])

def colored_noise(seconds, low, high, seed):
    rng = np.random.default_rng(seed)
    n=round(seconds*SR)
    f=np.fft.rfftfreq(n,1/SR)
    response=(f/max(1,low))**2/(1+(f/max(1,low))**2)
    response*=np.exp(-(f/high)**4)/np.maximum(f,80)**.3
    x=np.fft.irfft(np.fft.rfft(rng.normal(size=n))*response,n)
    return x/max(np.sqrt(np.mean(x*x)),1e-9)

def lowpass(x, cutoff):
    n=len(x); f=np.fft.rfftfreq(n,1/SR)
    h=1/np.sqrt(1+(f/cutoff)**6)
    return np.fft.irfft(np.fft.rfft(x,axis=0)*h[:,None],n,axis=0)

def chord(notes, seconds, kind='warm', attack=.012, release=.18):
    t=np.arange(round(seconds*SR))/SR
    out=np.zeros((len(t),2))
    for midi in notes:
        phase=RNG.uniform(0,2*np.pi)
        for side, cents in enumerate((-.0022,.0022)):
            f=hz(midi)*(1+cents)
            voice=np.zeros(len(t))
            for h in range(1,15):
                if kind=='string':
                    amp=h**-1.65*np.exp(-t*(.55+h*.33))
                    wobble=.00022*np.sin(t*2*np.pi*4.2)
                elif kind=='velvet':
                    amp=(h**-1.8)*(1 if h%2 else .2)*np.exp(-t*(.3+h*.35))
                    wobble=.00035*np.sin(t*2*np.pi*.8)
                elif kind=='pad':
                    amp=h**-1.5*np.exp(-h*.34)*(.86+.14*np.sin(t*2*np.pi*.18+phase))
                    wobble=.0007*np.sin(t*2*np.pi*.34+side)
                else:
                    amp=h**-1.3*np.exp(-h*.24)*np.exp(-t*(.45+h*.16))
                    wobble=.0003*np.sin(t*2*np.pi*1.1)
                voice+=amp*np.sin(2*np.pi*f*h*t+phase+h*wobble)
            out[:,side]+=voice/len(notes)
    return out*envelope(len(t),attack,release)[:,None]

def bass(midi, beats, kind='warm'):
    t=np.arange(round((beats*BEAT+.045)*SR))/SR
    f=hz(midi)
    if kind=='warm':
        x=np.sin(2*np.pi*f*t)+.28*np.sin(4*np.pi*f*t)+.085*np.sin(6*np.pi*f*t)
    elif kind=='velvet':
        x=np.sin(2*np.pi*f*t)+.25*np.sin(6*np.pi*f*t)*np.exp(-t*3)+.10*np.sin(10*np.pi*f*t)*np.exp(-t*6)
    else:
        x=np.sin(2*np.pi*f*t)+.35*np.sin(4*np.pi*f*t)*np.exp(-t*4)+.12*np.sin(8*np.pi*f*t)*np.exp(-t*6)
    x=np.tanh(x*1.15)/1.15
    x*=envelope(len(t),.008,.08)*(.7+.3*np.exp(-t*8))
    return stereo(x)

def kick(kind=0):
    t=np.arange(round(.34*SR))/SR
    base=[51,55,53][kind]
    f=base+(92-base)*np.exp(-t/.022)
    x=np.sin(2*np.pi*np.cumsum(f)/SR)
    x*=np.exp(-t/[.08,.064,.075][kind])*envelope(len(t),.005,.08)
    # Low mid body makes the beat audible on a phone without a bright click.
    x+=.13*np.sin(2*np.pi*base*2*t)*np.exp(-t/.027)*envelope(len(t),.004,.1)
    return stereo(x)

def brush(kind=0):
    t=np.arange(round(.21*SR))/SR
    n=colored_noise(.21,650,2900,390+kind)
    x=.42*n*np.exp(-t/.038)
    x+=.28*np.sin(2*np.pi*174*t)*np.exp(-t/.026)
    return stereo(x*envelope(len(t),.012,.11),-.08)

def shaker(kind=0):
    t=np.arange(round(.14*SR))/SR
    x=colored_noise(.14,2200,5200,740+kind)
    return x*np.exp(-t/.026)*envelope(len(t),.009,.07)

def reverb(x, seconds=1.25, level=.13):
    n=round(seconds*SR)
    t=np.arange(n)/SR
    out=np.zeros_like(x)
    size=1<<(N+n-2).bit_length()
    for side in range(2):
        ir=colored_noise(seconds,300,3300,892+side)*np.exp(-t*6.91/seconds)
        ir[:round(.023*SR)]=0
        ir/=max(np.sqrt(np.sum(ir*ir)),1e-9)
        ir*=level
        for delay,gain in [(.037,.04),(.059,.026),(.083,.016)]:
            ir[round((delay+side*.003)*SR)]+=gain
        out[:,side]=np.fft.irfft(np.fft.rfft(x[:,side],size)*np.fft.rfft(ir,size),size)[:N]
    return out

DESIGN = {'id': 'B', 'title': 'Signal Flow', 'slug': 'signal-flow', 'kind': 'velvet', 'root': [37, 33, 40, 35, 37, 33, 37], 'chords': [[56, 59, 63, 68], [56, 59, 61, 64], [54, 59, 63, 66], [54, 57, 61, 64], [56, 59, 63, 68], [56, 59, 61, 64], [56, 59, 63, 68]], 'description': 'A tighter, sparse rhythm with dry synth chords and a syncopated bass line.'}
SECTIONS=[0,8,16,23,28,33,42,49]

def compose(design,index):
    global EVENTS,RNG
    EVENTS=[]; RNG=np.random.default_rng(7128+index)
    harmony=np.zeros((N,2)); low=np.zeros_like(harmony); rhythm=np.zeros_like(harmony); atmosphere=np.zeros_like(harmony)
    drum=kick(index); snare=brush(index); hat=shaker(index)
    kicks=[]
    for b in range(46):
        if index==0: hit=(b%4 in (0,2)) or (b<8 and b%2==1)
        elif index==1: hit=b%4 in (0,2) and b%8!=6
        else: hit=True
        if 33<=b<41: hit=b%2==0
        if hit:
            put(rhythm,drum,b,.44 if b%4==0 else .33,label='kick');kicks.append(b)
        if b%4 in (1,3) and b>=8 and b<41:
            put(rhythm,snare,b,[.13,.15,.10][index],label='brush')
    if index in (0,1):
        for b in ([11.5,19.5,27.5,31.5] if index==0 else [7.5,15.25,22.5,27.5,31.25]):
            put(rhythm,drum,b,.22,label='kick pickup');kicks.append(b)
    for i,b in enumerate(np.arange(1,45.6,.5)):
        if 33<=b<41 and i%2==0: continue
        level=[.030,.023,.026][index]*(1 if i%2 else .48)
        put(rhythm,stereo(hat,(-.28 if i%2 else .28)),b,level,label='shaker')
    # Arrangement changes follow major scenes; micro-interactions get no cues.
    for s,(start,end) in enumerate(zip(SECTIONS,SECTIONS[1:])):
        notes=design['chords'][s]; root=design['root'][s]
        pad=chord(notes,(end-start)*BEAT+1.0,'pad',.21,.8)
        put(atmosphere,pad,start,.078 if index!=2 else .105,label='pad',notes=notes)
        if start==42:
            put(harmony,chord(notes,4.5,design['kind'],.026,1.5),start,.28,label='resolution',notes=notes)
            put(low,bass(root,3.8,design['kind']),start,.25,label='bass',notes=[root])
            continue
        for bar in np.arange(start,end,4):
            if index==0:
                chord_pattern=[(0,1.3,.25),(1.5,.75,.17),(3, .7,.19)]
                bass_pattern=[(0,.75,0,.25),(1.5,.42,7,.18),(2,.75,0,.23),(3.5,.4,12,.13)]
            elif index==1:
                chord_pattern=[(0,.55,.23),(1.75,.45,.15),(2.5,.8,.18)]
                bass_pattern=[(0,.58,0,.27),(.75,.3,0,.14),(2,.45,7,.20),(2.75,.40,0,.24),(3.5,.35,12,.12)]
            else:
                chord_pattern=[(0,1.8,.30),(2,1.6,.23)]
                bass_pattern=[(0,1.15,0,.23),(2,.8,7,.18),(3.5,.38,0,.17)]
            for pos,length,level in chord_pattern:
                at=bar+pos
                if at>=end:continue
                if 33<=at<41 and pos!=0: continue
                voice=notes if index!=2 or pos==0 else [notes[0],notes[1],notes[3]]
                put(harmony,chord(voice,length*BEAT+.2,design['kind'],.014 if index<2 else .008,.2),at,level,label='chords',notes=voice)
            for pos,length,interval,level in bass_pattern:
                at=bar+pos
                if at>=end or (33<=at<41 and pos not in (0,2)):continue
                put(low,bass(root+interval,min(length,end-at),design['kind']),at,level,label='bass',notes=[root+interval])
    # Small melodic phrases use long, warm notes, never a bright arpeggio.
    if index==0:
        phrases=[(8,66,1.7),(10,64,1.5),(12,61,1.6),(28,64,1.7),(30,66,2.1)]
    elif index==1:
        phrases=[]
    else:
        phrases=[(8,67,1.8),(10,64,1.7),(12,65,1.8),(28,67,1.8),(30,69,1.8)]
    for at,note,length in phrases:
        put(harmony,chord([note],length*BEAT,'velvet' if index==0 else 'string',.08,.22),at,.055,label='melody',notes=[note])
    # A little room and width; bass and kick stay centered and dry.
    wet=reverb(harmony+atmosphere,1.1 if index==1 else 1.4,.11 if index==1 else .15)
    delay=round((.30 if index==1 else .45)*SR)
    wet[delay:]+=lowpass(harmony,1800)[:-delay,::-1]*.07
    duck=np.ones(N)
    for b in kicks:
        offset=round(b*BEAT*SR); length=min(round(.16*SR),N-offset)
        if length>0:duck[offset:offset+length]*=1-.13*np.exp(-np.arange(length)/SR/.052)
    harmony*=duck[:,None];atmosphere*=duck[:,None]
    # The final morph starts at beat 41 and resolves at 42; no stinger or boom.
    finale=np.ones(N)
    end_start=round(27.6*SR)
    finale[end_start:]=np.cos(np.linspace(0,np.pi/2,N-end_start))**2
    fade=envelope(N,.05,.01)*finale
    stems={'harmony':harmony+wet,'bass':low,'rhythm':rhythm,'atmosphere':atmosphere}
    for name in stems:stems[name]*=fade[:,None]
    mix=sum(stems.values())
    scale=min(1,.85/max(np.max(np.abs(mix)),1e-9))
    target=OUT;target.mkdir(parents=True,exist_ok=True)
    for name,data in {**stems,'raw-score':mix}.items():
        assert np.isfinite(data).all()
        with wave.open(str(target/f'{name}.wav'),'wb') as f:
            f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR)
            f.writeframes((np.clip(data*scale,-1,1)*32767).astype('<i2').tobytes())
    score={'title':design['title'],'description':design['description'],'bpm':BPM,'duration':DURATION,'uiEffects':[], 'sectionsBeats':SECTIONS,'events':EVENTS}
    (target/'score.json').write_text(json.dumps(score,indent=2))
    return target,score


if __name__=='__main__':
    target,score=compose(DESIGN,1)
    notes={
        'title':'Signal Flow','selectedOption':'B','bpm':BPM,
        'duration':DURATION,'sampleRate':SR,'uiCues':[],
        'stems':['harmony.wav','bass.wav','rhythm.wav','atmosphere.wav'],
        'majorCuesSeconds':{'logoReveal':4.8,'apps':13.8,'onDevice':16.8,'privacy':19.8,'closingResolution':25.2},
        'masterTarget':{'integratedLufs':-20,'truePeakDbtp':-1.5},
        'scoreFile':'score.json'
    }
    (target/'audio-notes.json').write_text(json.dumps(notes,indent=2))
    print(f'Signal Flow and four stems: {target} ({DURATION}s, {BPM} BPM)')
