#!/usr/bin/env python3
# A fictional food forest on the Great Lawn, Central Park, for the home page's captures: no real site,
# no personal data. usage: make-example.py <out.canopi> <lang>
import json,math,uuid,random,sys
random.seed(7)
LON,LAT=-73.96650,40.78120          # the Great Lawn, Central Park
BEAR=math.radians(29)                # the park's grid
def g(x,y):                          # x along the lawn's long axis, y across it, metres
    e=x*math.sin(BEAR)-y*math.cos(BEAR); n=x*math.cos(BEAR)+y*math.sin(BEAR)
    return {"lon":round(LON+e/(111320*math.cos(math.radians(LAT))),9),"lat":round(LAT+n/110950,9)}
S={ # canonical: (common, symbol, colour, stratum, start, end, cost)
"Carya illinoinensis":("Pecan","nut","#8A5A2B","emergent",2,3,48),
"Castanea sativa":("European chestnut","nut","#A0522D","emergent",2,3,42),
"Diospyros virginiana":("American persimmon","apple","#D9772B","high",1,3,36),
"Malus domestica":("Apple","apple","#C8402F","high",1,3,32),
"Pyrus communis":("Pear","apple","#A9A632","high",1,3,32),
"Asimina triloba":("Pawpaw","apple","#6E8F3A","medium",1,3,28),
"Corylus avellana":("European hazelnut","nut","#B5793A","medium",1,3,14),
"Amelanchier canadensis":("Canadian serviceberry","berry","#7A4E9C","medium",1,2,18),
"Sambucus nigra":("European elder","berry","#4B3A78","medium",1,2,12),
"Vaccinium corymbosum":("Highbush blueberry","berry","#3F5FA8","low",0,3,11),
"Aronia melanocarpa":("Black chokeberry","berry","#2F2A5A","low",0,3,9),
"Ribes nigrum":("Black currant","berry","#5B2C6F","low",0,2,8),
"Symphytum officinale":("Comfrey","medicinal","#8E6BB5","low",0,3,4),
"Monarda didyma":("Bee-balm","bee","#D43F6A","low",0,2,4),
"Echinacea purpurea":("Purple coneflower","medicinal","#C2559C","low",0,2,4),
"Achillea millefolium":("Common yarrow","bee","#C9A227","low",0,2,3),
"Lupinus perennis":("Wild lupine","pod","#3E8E4E","low",0,1,3),
"Allium schoenoprasum":("Chives","carrot","#E08A2E","low",0,2,2),
"Fragaria vesca":("Alpine strawberry","berry","#D2363C","low",0,2,3),
}
plants=[]
def put(sp,x,y):
    plants.append({"id":str(uuid.uuid4()),"locked":False,"canonical_name":sp,"common_name":S[sp][0],"color":S[sp][2],"symbol":S[sp][1],"pinned_name":False,"position":g(x,y),"rotation":None,"scale":None,"notes":None,"planted_date":None,"quantity":None})
def ring(a,b,step,seq,jit=0.0,arc=None):
    n=int(2*math.pi*math.sqrt((a*a+b*b)/2)/step)
    for i in range(n):
        t=2*math.pi*i/n
        if arc and arc[0]<=math.degrees(t)<=arc[1]: continue
        put(seq[i%len(seq)],a*math.cos(t)+random.uniform(-jit,jit),b*math.sin(t)+random.uniform(-jit,jit))
GAP=(70,110)                          # the north path through every ring
tree=["Carya illinoinensis","Malus domestica","Castanea sativa","Pyrus communis","Diospyros virginiana","Malus domestica"]
mid=["Corylus avellana","Asimina triloba","Amelanchier canadensis","Sambucus nigra"]
shr=["Vaccinium corymbosum","Ribes nigrum","Aronia melanocarpa","Vaccinium corymbosum"]
low=["Symphytum officinale","Monarda didyma","Allium schoenoprasum","Echinacea purpurea","Fragaria vesca","Achillea millefolium","Lupinus perennis"]
ring(118,78,9,["Corylus avellana","Sambucus nigra"],arc=GAP)      # hedge
for a,b,seq,step in [(110,72,low,1.8),(104,67,tree,8.5),(98,62,low,1.8),(93,58,shr,2.6),(87,53,mid,4.2),(81,48,low,1.8),
                     (75,43,tree,8.5),(69,38,low,1.8),(64,34,shr,2.6),(58,29,mid,4.2),(52,24,low,1.8),(46,20,shr,2.6)]:
    ring(a,b,step,seq,arc=GAP)
def ell(a,b,n=72): return [g(a*math.cos(2*math.pi*i/n),b*math.sin(2*math.pi*i/n)) for i in range(n)]
def band(a1,b1,a2,b2,arc=GAP,n=90):
    ts=[math.radians(arc[1]+(360-(arc[1]-arc[0]))*i/n) for i in range(n+1)]
    return [g(a1*math.cos(t),b1*math.sin(t)) for t in ts]+[g(a2*math.cos(t),b2*math.sin(t)) for t in reversed(ts)]
zones=[{"id":"site","name":"Site","locked":False,"zone_type":"polygon","points":ell(124,84),"rotation":0,"fill_color":"#E7DFC0","notes":None}]
for i,(a1,b1,a2,b2,col) in enumerate([(114,75,94,59,"#CFE0A8"),(84,50,66,36,"#D8E3A6"),(55,27,42,16,"#E2E5AC")]):
    zones.append({"id":f"bed{i+1}","name":f"Planting belt {i+1}","locked":False,"zone_type":"polygon","points":band(a1,b1,a2,b2),"rotation":0,"fill_color":col,"notes":None})
zones.append({"id":"pond","name":"Pond","locked":False,"zone_type":"polygon","points":ell(30,12),"rotation":0,"fill_color":"#9CC6DE","notes":None})
counts={}
for p in plants: counts[p["canonical_name"]]=counts.get(p["canonical_name"],0)+1
sp=lambda n:{"kind":"species","canonical_name":n}
def act(i,typ,text,start,end=None,done=False,target=None):
    return {"id":f"a{i}","action_type":typ,"description":text,"start_date":start,"end_date":end,"recurrence":None,"targets":[target or {"kind":"manual"}],"depends_on":None,"completed":done,"order":i}
timeline=[act(1,"other","Mark out the planting belts","2026-11-03","2026-11-04",True),act(2,"fertilising","Sheet-mulch the belts","2026-11-05","2026-11-09",True),
 act(3,"planting","Plant bare-root trees","2026-11-10","2026-11-14",target=sp("Malus domestica")),act(4,"planting","Plant pecan and chestnut","2026-11-16","2026-11-18",target=sp("Carya illinoinensis")),
 act(5,"planting","Plant hazel and elder hedge","2026-11-19","2026-11-21",target=sp("Corylus avellana")),act(6,"watering","Water in new trees","2026-11-23"),
 act(7,"pruning","Formative prune of apples","2027-02-15",target=sp("Malus domestica")),act(8,"harvest","First comfrey cut for mulch","2027-06-01",target=sp("Symphytum officinale"))]
budget=[{"target":sp(n),"category":"plants","description":S[n][0],"quantity":counts[n],"unit_cost":S[n][6],"currency":"USD"} for n in S if n in counts]
T={
"en":["Example food forest","Mark out the planting belts","Sheet-mulch the belts","Plant bare-root trees","Plant pecan and chestnut","Plant hazel and elder hedge","Water in new trees"],
"fr":["Exemple de forêt-jardin","Tracer les bandes de plantation","Pailler les bandes","Planter les arbres à racines nues","Planter pacaniers et châtaigniers","Planter la haie de noisetiers et sureaux","Arroser les jeunes arbres"],
"es":["Bosque comestible de ejemplo","Marcar las franjas de plantación","Acolchar las franjas","Plantar árboles a raíz desnuda","Plantar pacanos y castaños","Plantar el seto de avellanos y saúcos","Regar los árboles nuevos"],
"pt":["Floresta comestível de exemplo","Marcar as faixas de plantio","Cobrir as faixas com mulch","Plantar árvores de raiz nua","Plantar nogueiras-pecã e castanheiros","Plantar a sebe de aveleiras e sabugueiros","Regar as árvores novas"],
"it":["Foresta commestibile di esempio","Tracciare le fasce di impianto","Pacciamare le fasce","Piantare alberi a radice nuda","Piantare pecan e castagni","Piantare la siepe di noccioli e sambuchi","Annaffiare i nuovi alberi"],
"zh":["食物森林示例","划出种植带","为种植带覆盖","种植裸根树苗","种植碧根果和栗树","种植榛树和接骨木绿篱","为新树浇水"],
"de":["Beispiel-Waldgarten","Pflanzstreifen abstecken","Pflanzstreifen mulchen","Wurzelnackte Bäume pflanzen","Pekannuss und Edelkastanie pflanzen","Hecke aus Hasel und Holunder pflanzen","Junge Bäume angießen"],
"ja":["フードフォレストの例","植栽帯の位置を決める","植栽帯をマルチングする","裸苗の木を植える","ペカンとクリを植える","ハシバミとニワトコの生垣を植える","若木に水をやる"],
"ko":["푸드 포레스트 예시","식재 구역 표시하기","식재 구역 멀칭하기","맨뿌리 묘목 심기","피칸과 밤나무 심기","개암나무와 딱총나무 생울타리 심기","어린 나무에 물 주기"],
"nl":["Voorbeeld van een voedselbos","Plantstroken uitzetten","Plantstroken mulchen","Wortelnaakte bomen planten","Pecan en tamme kastanje planten","Haag van hazelaar en vlier planten","Jonge bomen water geven"],
"ru":["Пример пищевого леса","Разметить полосы посадки","Замульчировать полосы","Посадить деревья с открытыми корнями","Посадить пекан и каштан","Посадить изгородь из лещины и бузины","Полить молодые деревья"],
}
L=sys.argv[2] if len(sys.argv)>2 else "en"
for a,txt in zip(timeline[:6],T[L][1:]): a["description"]=txt
now="2026-11-01T09:00:00.000Z"
d={"version":9,"name":T[L][0],"description":None,
"plant_species_colors":{n:S[n][2] for n in S},"plant_species_symbols":{n:S[n][1] for n in S},"plant_species_codes":{},
"layers":[{"name":x,"visible":x not in("contours","climate","water"),"locked":False,"opacity":1} for x in("base","contours","climate","zones","water","plants","measurement-guides","annotations")],
"plants":plants,"zones":zones,"annotations":[],"measurement_guides":[],
"consortiums":[{"target":sp(n),"stratum":S[n][3],"start_phase":S[n][4],"end_phase":S[n][5]} for n in S if n in counts],
"groups":[],"timeline":timeline,"budget":budget,"budget_currency":"USD",
"map_view":{"lon":LON,"lat":LAT,"zoom":17.62,"bearing":0,"ground_size_m":{"width":400,"height":300}},
"created_at":now,"updated_at":now}
json.dump(d,open(sys.argv[1],'w'))
print(len(plants),len(counts),len(zones),sum(b["quantity"]*b["unit_cost"] for b in budget))
