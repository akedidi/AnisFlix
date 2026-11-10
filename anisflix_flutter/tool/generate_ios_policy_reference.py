from pathlib import Path
import subprocess
import re
import sys
import tempfile
project=Path(__file__).resolve().parents[1]
root=Path(sys.argv[1]) if len(sys.argv)>1 else project.parent/'ios-natve/anisflix/anisflix'
s=(root/'Services/StreamingService.swift').read_text();ordering=s[s.index('enum StreamingSourceListOrdering {'):s.index('\nclass StreamingService {')]
v=(root/'Views/MovieDetailView.swift').read_text()
funcs=[]
for start,end in [('    private func languageCategory(', '    // Helper to format quality'),('    private func formatQualityDisplay(', '    // Helper to build source display'),('    private func getSourceDisplayText(',None)]:
 a=v.index(start)
 if end: b=v.index(end,a); f=v[a:b]
 else:
  # The last helper is followed by the view's closing brace.
  f=v[a:v.rfind('\n}')]
 funcs.append(f.replace('    private func ','func '))
fixture='''
let input: [StreamingSource] = [
 StreamingSource(id:"vix",url:"vix",quality:"1080p",language:"VO",provider:"vixsrc"),
 StreamingSource(id:"movie-sub",url:"movie-sub",quality:"720p",language:"VO",provider:"moviebox"),
 StreamingSource(id:"fr-low",url:"fr-low",quality:"720p H.264 AAC",language:"VF",provider:"frenchstream"),
 StreamingSource(id:"vid",url:"vid",quality:"HD",language:"VF",provider:"vidzy"),
 StreamingSource(id:"fr-high",url:"fr-high",quality:"1080p H.264 AAC",language:"VF",provider:"frenchstream"),
 StreamingSource(id:"mob",url:"mob",quality:"2160p",language:"VO",provider:"mob"),
 StreamingSource(id:"pahe",url:"pahe",quality:"720p",language:"VO - English Subbed",provider:"animepahe"),
 StreamingSource(id:"vm",url:"vm",quality:"720p",language:"VOSTFR",provider:"vidmoly"),
 StreamingSource(id:"lulu",url:"lulu",quality:"1080p",language:"VFQ",provider:"luluvid"),
 StreamingSource(id:"unknown",url:"unknown",quality:"Auto",language:"",provider:"unknown"),
]
let rows = input.sorted(by: StreamingSourceListOrdering.isSortedBefore)
let output: [[String:String]] = rows.map { s in
 let language = languageCategory(for:s)
 let visible = rows.filter { languageCategory(for:$0) == language }
 return ["id":s.id,"url":s.url,"quality":s.quality,"language":s.language,"provider":s.provider,"bucket":language,"display":getSourceDisplayText(source:s,filteredSources:visible)]
}
let json = try! JSONSerialization.data(withJSONObject:output,options:[.prettyPrinted,.sortedKeys])
print(String(data:json,encoding:.utf8)!)
'''
fixture=re.sub(r'url:"([^"]+)"', r'url:"https://example.com/\1"', fixture)
program='import Foundation\nstruct StreamingSource { let id:String; let url:String; let quality:String; let language:String; let provider:String }\n'+ordering+'\n'+'\n'.join(funcs)+'\n'+fixture
with tempfile.TemporaryDirectory(prefix='anisflix-ios-policy-') as temp:
 path=Path(temp)/'reference.swift';path.write_text(program)
 r=subprocess.run(['xcrun','swift',str(path)],capture_output=True,text=True)
if r.returncode: print(r.stderr);raise SystemExit(r.returncode)
(project/'recovery/ios-source-list-reference.json').write_text(r.stdout)
print('Reference generated directly from iOS Swift list helpers')
