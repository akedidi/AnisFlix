#!/usr/bin/env python3
"""Local-only Android update integration fixtures. Use a dedicated emulator-5560.
See recovery/APP_UPDATES.md; no signing keys or APKs are bundled with this script.
"""
from http.server import BaseHTTPRequestHandler,HTTPServer
from pathlib import Path
import os,subprocess
root=Path(__file__).resolve().parents[1]
adb=Path(os.environ['ANDROID_HOME'])/'platform-tools/adb'
package='com.anisflix.reconstructed.anisflix_flutter.tv.debug'
class Handler(BaseHTTPRequestHandler):
 def do_GET(self):
  if self.path in ['/reset','/allow']:
   subprocess.run([str(adb),'-s','emulator-5560','shell','appops','set',package,'REQUEST_INSTALL_PACKAGES','allow' if self.path=='/allow' else 'default'],check=True,stdout=subprocess.DEVNULL)
   subprocess.run([str(adb),'-s','emulator-5560','shell','am','start','-n',package+'/com.anisflix.reconstructed.anisflix_flutter.MainActivity'],check=True,stdout=subprocess.DEVNULL)
   self.send_response(200);self.end_headers();self.wfile.write(b'OK');return
  names={'/compatible.apk':root/'work/update-fixtures/compatible.apk','/wrong-signer.apk':root/'work/update-fixtures/wrong-signer.apk','/incompatible.apk':root/'build/app/outputs/flutter-apk/app-mobile-release.apk','/same-build.apk':root/'build/app/outputs/flutter-apk/app-tv-debug.apk'}
  path=names.get(self.path)
  if path is None or not path.is_file():self.send_error(404);return
  self.send_response(200);self.send_header('Content-Length',str(path.stat().st_size));self.end_headers()
  with path.open('rb') as f:
   while chunk:=f.read(1024*1024):self.wfile.write(chunk)
 def log_message(self,format,*args):print(format%args,flush=True)
HTTPServer(('127.0.0.1',18765),Handler).serve_forever()
