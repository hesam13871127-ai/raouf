#!/usr/bin/env python3
"""Real HTTP tests of the two WordPress form endpoints (no simulation)."""
import urllib.request, urllib.error, http.cookiejar, json, sys, os

BASE = os.environ.get('WP_URL', 'http://127.0.0.1:9400')
OUT = '/home/user/raouf/.work/wp-qa/forms'
os.makedirs(OUT, exist_ok=True)

jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
results = []

def call(name, path, payload=None, csrf=True, method=None, hp=None, forged=None):
    try:
        opener.open(BASE + '/register/', timeout=30).read()
    except Exception:
        pass
    token = next((c.value for c in jar if c.name == 'raouf_csrf'), '')
    data = None
    headers = {'Accept': 'application/json'}
    if payload is not None:
        body = dict(payload)
        if hp is not None:
            body['website'] = hp
        data = json.dumps(body, ensure_ascii=False).encode('utf8')
        headers['Content-Type'] = 'application/json'
        if csrf:
            headers['X-CSRF-Token'] = forged if forged else token
    req = urllib.request.Request(BASE + path, data=data, headers=headers,
                                 method=method or ('POST' if data else 'GET'))
    try:
        r = opener.open(req, timeout=45)
        status, raw = r.status, r.read().decode('utf8')
    except urllib.error.HTTPError as e:
        status, raw = e.code, e.read().decode('utf8')
    try:
        parsed = json.loads(raw)
    except Exception:
        parsed = raw[:200]
    rec = {'name': name, 'status': status, 'body': parsed}
    results.append(rec)
    print(f'{name:38} {status} {json.dumps(parsed, ensure_ascii=False)[:175]}', flush=True)
    return rec

REG = {'name': 'علی رضایی', 'phone': '09141112233', 'course': 'skin-facial',
       'message': 'سلام، میخواهم در دوره شرکت کنم.'}
CON = {'name': 'مریم احمدی', 'phone': '09149998877', 'email': 'maryam@example.com',
       'subject': 'پرسش درباره دوره', 'message': 'لطفاً درباره زمان برگزاری دوره توضیح دهید.'}

GROUP = sys.argv[1] if len(sys.argv) > 1 else 'a'
if GROUP == 'a':
    call('GET /api/registrations -> 405', '/api/registrations', method='GET')
    call('registration missing CSRF -> 403', '/api/registrations', REG, csrf=False)
    call('registration forged CSRF -> 403', '/api/registrations', REG, forged='deadbeef')
    call('registration honeypot -> 400', '/api/registrations', REG, hp='http://spam.example')
    call('registration invalid phone -> 400', '/api/registrations', {**REG, 'phone': '12345'})
    call('registration invalid course -> 400', '/api/registrations', {**REG, 'course': 'not-a-course'})
    call('registration valid -> 201', '/api/registrations', REG)
    call('registration duplicate -> 409', '/api/registrations', REG)
elif GROUP == 'b':
    call('contact short message -> 400', '/api/contact', {**CON, 'message': 'کوتاه'})
    call('contact invalid email -> 400', '/api/contact', {**CON, 'email': 'bad@@'})
    call('contact valid -> 201', '/api/contact', CON)
    call('contact duplicate -> 409', '/api/contact', CON)
    call('Persian-digit phone -> 201', '/api/registrations',
         {**REG, 'phone': '۰۹۱۴۲۲۲۳۳۴۴', 'course': 'massage-relaxation'})
    call('contact optional empty email -> 201', '/api/contact',
         {**CON, 'phone': '09143334455', 'email': '', 'subject': 'سوال دیگر'})
    # 3 more POSTs: the 9th within the window must be rate limited.
    for i in range(3):
        call(f'rate-limit probe {i+1}', '/api/registrations', {**REG, 'phone': '123'}, )
else:
    raise SystemExit('unknown group')

with open(os.path.join(OUT, f'api-{GROUP}.json'), 'w', encoding='utf8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
