#!/usr/bin/env python3
# Crops the captures into the webp files the home page shows.
import os,sys
from PIL import Image
S,out=sys.argv[1:3]
tot=0;miss=[]
for l in "en fr es pt it zh de ja ko nl ru".split():
  os.makedirs(f'{out}/{l}',exist_ok=True)
  for th in ('light','dark'):
    d=f'{S}/cap/{l}-{th}'
    try:
      m=Image.open(f'{d}/map.png').convert('RGB'); c=Image.open(f'{d}/catalog.png').convert('RGB'); k=Image.open(f'{d}/calendar.png').convert('RGB')
    except OSError: miss.append(f'{l}-{th}'); continue
    f=m.width/1440
    box=lambda x0,y0,x1,y1:(int(x0*f),int(y0*f),int(x1*f),int(y1*f))
    m.resize((1440,900),Image.LANCZOS).save(f'{out}/{l}/map-{th}.webp',quality=70,method=6)
    m.crop(box(430,60,1030,890)).resize((720,996),Image.LANCZOS).save(f'{out}/{l}/map-phone-{th}.webp',quality=70,method=6)
    for name,im in (('catalog',c),('calendar',k)):
      im.crop(box(983,72,1366,600)).resize((580,800),Image.LANCZOS).save(f'{out}/{l}/{name}-{th}.webp',quality=72,method=6)
for r,_,fs in os.walk(out):
  tot+=sum(os.path.getsize(os.path.join(r,x)) for x in fs)
print('total MB',round(tot/1e6,1),'missing',miss)
