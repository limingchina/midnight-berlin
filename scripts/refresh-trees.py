"""Build a compact, reproducible Berlin tree snapshot from official public WFS data.
Run python3 scripts/refresh-trees.py. Source files may be reused with --input-dir PATH.
"""
import argparse,datetime,json,math,pathlib,urllib.parse,urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[1]
CENTER=(13.39058,52.516977);RADIUS=2000
ENDPOINT='https://gdi.berlin.de/services/wfs/baumbestand'
TYPES=('strassenbaeume','anlagenbaeume')

def fetch(layer):
 x=6378137*math.radians(CENTER[0]);y=6378137*math.log(math.tan(math.pi/4+math.radians(CENTER[1])/2));d=RADIUS/math.cos(math.radians(CENTER[1]))
 bbox=','.join(map(str,[x-d,y-d,x+d,y+d]))+',urn:ogc:def:crs:EPSG::3857'
 p={'service':'WFS','version':'2.0.0','request':'GetFeature','typeNames':'baumbestand:'+layer,'outputFormat':'application/json','srsName':'EPSG:4326','bbox':bbox,'count':30000}
 with urllib.request.urlopen(ENDPOINT+'?'+urllib.parse.urlencode(p),timeout=90) as r:s=json.load(r)
 if len(s.get('features',[]))<int(s.get('numberMatched',0)):raise ValueError('WFS response is incomplete; add pagination before enlarging the area')
 return s

def number(v):
 try:
  n=float(v)
  return round(n,2) if math.isfinite(n) and n>0 else 0
 except (ValueError,TypeError):return 0

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--input-dir');args=ap.parse_args()
 records=[];seen=set();lon0,lat0=CENTER;meters=111195.08;cos=math.cos(math.radians(lat0))
 for layer in TYPES:
  s=json.loads((pathlib.Path(args.input_dir)/(layer+'.json')).read_text()) if args.input_dir else fetch(layer)
  if len(s.get('features',[]))<int(s.get('numberMatched',0)):raise ValueError('Truncated source data')
  for f in s['features']:
   if not f.get('geometry') or f['geometry']['type']!='Point':continue
   lon,lat=f['geometry']['coordinates'][:2]
   if not (13<lon<14 and 52<lat<53):raise ValueError('Unexpected CRS/axis order')
   if math.hypot((lon-lon0)*meters*cos,(lat-lat0)*meters)>RADIUS:continue
   key=(round(lon,6),round(lat,6))
   if key in seen:continue
   seen.add(key);p=f['properties'];genus=str(p.get('gattung') or '').upper();group=str(p.get('art_gruppe') or '').lower()
   conifer=int('nadel' in group or genus in ('PINUS','PICEA','ABIES','LARIX','PSEUDOTSUGA','THUJA','TAXUS','CEDRUS','SEQUOIA','METASEQUOIA'))
   records.append([f['id'],round(lon,8),round(lat,8),number(p.get('baumhoehe')),number(p.get('kronedurch')),number(p.get('stammumfg')),conifer])
 records.sort(key=lambda r:r[0])
 data={'version':1,'source':'Geoportal Berlin / GRIS — Baumbestand Berlin','sourceUrl':'https://daten.berlin.de/datensaetze/baumbestand-berlin-wfs-48ad3a23','endpoint':ENDPOINT,'license':'dl-de-zero-2.0','licenseUrl':'https://www.govdata.de/dl-de/zero-2-0','retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'center':list(CENTER),'radiusMeters':RADIUS,'columns':['id','longitude','latitude','heightMeters','crownDiameterMeters','trunkCircumferenceCm','conifer'],'trees':records}
 target=ROOT/'dist/data/berlin-trees.json';target.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
 print(f'{len(records)} real tree locations saved; {target.stat().st_size} bytes')
 print('Within 150m of spawn:',sum(math.hypot((r[1]-lon0)*meters*cos,(r[2]-lat0)*meters)<150 for r in records))
if __name__=='__main__':main()
