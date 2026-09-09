# Local authentication smoke check; test forwarded-header spoofing is rejected.
import json, urllib.request, urllib.error
url='http://localhost:3000/api/collaboration'
req=urllib.request.Request(url,data=json.dumps({'action':'claim','taskId':'lore'}).encode(),headers={'Content-Type':'application/json','Origin':'http://localhost:3000','oai-authenticated-user-id':'forged-test-id','oai-authenticated-user-email':'forged@example.test'})
try:
    urllib.request.urlopen(req)
    raise AssertionError('Forged identity unexpectedly accepted')
except urllib.error.HTTPError as e:
    assert e.code==401
print('PASS: local platform rejects forged identity headers.')
