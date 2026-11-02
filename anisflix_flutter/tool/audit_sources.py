#!/usr/bin/env python3
"""Read-only provider probe. Saves counts/status, never signed URLs or credentials."""
import concurrent.futures
import datetime
import json
import sys
import urllib.parse
import urllib.request

BACKEND = 'https://anisflix.vercel.app'
CASES = [('film', 'movie', 969681, 'Spider-Man : Brand New Day', None, None),
         ('episode', 'tv', 1396, 'Breaking Bad', 1, 1),
         ('anime', 'tv', 1429, 'Attack on Titan', 1, 1)]

def requests(case):
    name, kind, mid, title, season, episode = case
    params = {'type': kind, 'tmdbId': str(mid)}
    if season is not None:
        params.update(season=str(season), episode=str(episode))
    jobs = [(p, {'path': p, **params}) for p in ['vixsrc','moviebox','vaplayer','yflix','afterdark']]
    jobs[-1][1]['title'] = title
    jobs.append(('fstream', {'path': f'fstream/tv/{mid}/season/{season}' if kind == 'tv' else f'fstream/movie/{mid}'}))
    for p in ['frenchstream','streamzo'] + (['animesama','frenchanime'] if name == 'anime' else []):
        jobs.append((p, {'path':'french-provider','provider':p, **params}))
    if name == 'anime':
        jobs.extend((p, {'path':p, **params}) for p in ['animepahe','hianime'])
        jobs.append(('anime-api', {'path':'anime-api', **params, 'title':title}))
        jobs.append(('movix-anime', {'path':'anime/search/L’Attaque des Titans','includeSeasons':'true','includeEpisodes':'true'}))
    return [(name, provider, query, episode) for provider, query in jobs]

def probe(job):
    name, provider, query, episode = job
    result = {'case':name, 'provider':provider}
    try:
        req = urllib.request.Request(BACKEND+'/api/movix-proxy?'+urllib.parse.urlencode(query),headers={'User-Agent':'AnisFlix-SourceAudit/1.0'})
        with urllib.request.urlopen(req, timeout=45) as response:
            data=json.load(response)
            result['http']=response.status
        if provider == 'movix-anime':
            result['candidates']=len(data) if isinstance(data,list) else 0
            result['status']='catalogue' if result['candidates'] else 'empty'
            return result
        if not isinstance(data,dict):
            result['status']='unexpected-shape'
            return result
        rows=data.get('streams',data.get('sources',data.get('results',[])))
        if not isinstance(rows,list): rows=[]
        if provider == 'fstream':
            groups=data.get('players',{}) if name=='film' else data.get('episodes',{}).get(str(episode),{}).get('languages',{})
            if isinstance(groups,dict):
                rows += [r for values in groups.values() if isinstance(values,list) for r in values]
        rows=[r for r in rows if isinstance(r,dict) and str(r.get('provider','')).lower()!='debug' and any(r.get(k) for k in ['url','decoded_url','file','link'])]
        result['links']=len(rows)
        result['status']='provider-error' if data.get('success') is False or data.get('error') else ('links' if rows else 'empty')
    except Exception as exc:
        result.update(status='unavailable', error=type(exc).__name__)
        if hasattr(exc,'code'): result['http']=exc.code
    return result

if __name__ == '__main__':
    jobs=[j for case in CASES for j in requests(case)]
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
        results=list(pool.map(probe,jobs))
    report={'date':datetime.datetime.now(datetime.timezone.utc).isoformat(),'backend':BACKEND,'note':'API links/counts only; does not establish playback parity or device-side fallback parity.','results':results}
    output=sys.argv[1] if len(sys.argv)>1 else 'source-audit.json'
    with open(output,'w') as f: json.dump(report,f,indent=2,ensure_ascii=False)
    for row in results: print(row['case'],row['provider'],row['status'],row.get('links',row.get('candidates',0)))
