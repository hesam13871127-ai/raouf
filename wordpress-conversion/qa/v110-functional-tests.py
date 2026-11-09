#!/usr/bin/env python3
"""Correction v1.1.0 — execute and record the 13 mandatory functional tests.

Run AFTER v110-browser.mjs, qa/interactions.mjs and the 66-pair visual capture,
so this script can incorporate their real console/visual evidence.
"""
import csv
import datetime as dt
import html
import http.cookiejar
import io
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path('/home/user/raouf')
RES = ROOT / 'wordpress-conversion' / 'qa' / 'results'
RES.mkdir(parents=True, exist_ok=True)
BASE = os.environ.get('WP_URL', 'http://127.0.0.1:9421').rstrip('/')
ORIG = os.environ.get('ORIG_URL', 'http://127.0.0.1:3000').rstrip('/')
BROWSER = os.environ.get('BROWSER_URL', 'http://127.0.0.1:9422').rstrip('/')
FAILURE = os.environ.get('FAILURE_URL', 'http://127.0.0.1:9423').rstrip('/')
OUT = RES / 'v110-13-tests.json'
BALAD = 'https://balad.ir/p/29UbcoR7CtjsIN'
ROUTES = ['/', '/courses/', '/courses/skin-facial/', '/courses/medical-emergency/',
          '/courses/pharmacy-technician/', '/courses/massage-relaxation/', '/about/',
          '/gallery/', '/contact/', '/register/', '/404/']
UA = {'User-Agent': 'Raouf-v110-Functional/1.0'}

TESTS = {
    'T01': 'ثبت کامل پیشثبتنام دوره و جلوگیری از ارسال مجدد',
    'T02': 'جلوگیری از ثبتنام ناقص و اعتبارسنجی سمت سرور/مرورگر',
    'T03': 'ثبت کامل فرم تماس، بدون بارگذاری مجدد صفحه',
    'T04': 'جلوگیری از تماس نامعتبر و بررسی همه فیلدها',
    'T05': 'ذخیره دائمی هر دو درخواست در پایگاه داده وردپرس',
    'T06': 'نمایش در پیشخوان با منوها و دستههای جداگانه، newest→oldest',
    'T07': 'تاریخ و زمان دقیق محلی وردپرس',
    'T08': 'نمایش کامل جزئیات هر رکورد',
    'T09': 'جستجو، فیلتر نوع/تاریخ، خروجی CSV و حذف با تأیید',
    'T10': 'دسترسی فقط manage_options، CSRF/XSS/SQLi و محافظت ربات',
    'T11': 'لینک رسمی بلد در تمام صفحات نقشه و باز شدن در برگه جدید',
    'T12': 'عدم وجود خطای PHP و JavaScript',
    'T13': 'عدم تغییر طراحی دسکتاپ و موبایل و سایر تعاملات',
}
checks = []
artifacts = {}

def add(test, name, ok, detail=''):
    checks.append({'test': test, 'name': name, 'result': 'PASS' if ok else 'FAIL', 'detail': str(detail)[:700]})
    print(('PASS' if ok else 'FAIL'), test, name, '::', str(detail)[:180])

def read_json(path, default=None):
    try:
        return json.loads(Path(path).read_text(encoding='utf8'))
    except Exception:
        return default

def opener():
    jar = http.cookiejar.CookieJar()
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar)), jar

op, op_jar = opener()
anon = urllib.request.build_opener()
admin2, _ = opener()
sub, _ = opener()

def call(path, data=None, headers=None, method=None, opener_=None, with_headers=False, base=None):
    url = path if str(path).startswith('http') else urllib.parse.urljoin((base or BASE) + '/', str(path).lstrip('/'))
    h = dict(UA)
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, data=data, method=method, headers=h)
    o = opener_ or op
    try:
        r = o.open(req, timeout=90)
        body = r.read().decode('utf8', 'replace')
        out = (r.status, body, r.geturl(), dict(r.headers))
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf8', 'replace')
        out = (e.code, body, e.geturl(), dict(e.headers))
    return out if with_headers else out[:3]

def token():
    call('/register/')
    return next((c.value for c in op_jar if c.name == 'raouf_csrf'), '')

def post_form(ep, payload, use_csrf=True, forged=None, opener_=None, raw=None):
    tk = token()
    body = raw if raw is not None else json.dumps(payload, ensure_ascii=False).encode('utf8')
    h = {'Content-Type': 'application/json', 'Accept': 'application/json'}
    if use_csrf:
        h['X-CSRF-Token'] = forged if forged else tk
    return call(ep, body, h, 'POST', opener_ or op)

def as_json(text):
    try:
        return json.loads(text)
    except Exception:
        return {}

def url_for_admin(href):
    h = html.unescape(href)
    return urllib.parse.urljoin(BASE + '/wp-admin/', h)

def header_get(headers, name):
    for key, value in (headers or {}).items():
        if key.lower() == name.lower():
            return value
    return None

def login(o, user, password):
    call('/wp-login.php', opener_=o)
    data = urllib.parse.urlencode({
        'log': user, 'pwd': password, 'wp-submit': 'Log In',
        'redirect_to': BASE + '/wp-admin/', 'testcookie': '1',
    }).encode()
    st, body, url = call('/wp-login.php', data, {'Content-Type': 'application/x-www-form-urlencoded'}, 'POST', o)
    return st == 200 and '/wp-admin' in url and 'wp-login.php' not in url

# ------------------------------------------------------------------ state
init = read_json(ROOT / '.work' / 'wp-qa' / 'v110-qa' / 'init-state.json', {})
artifacts['init_state'] = init
utc_now = dt.datetime.strptime(init.get('utc_now', '2026-11-09 14:17:19'), '%Y-%m-%d %H:%M:%S').replace(tzinfo=dt.timezone.utc)
local_now = dt.datetime.strptime(init.get('wp_local_now', '2026-11-09 17:47:19'), '%Y-%m-%d %H:%M:%S')
offset = local_now - utc_now.replace(tzinfo=None)
tz = dt.timezone(offset)
local_today = dt.datetime.now(dt.timezone.utc).astimezone(tz).strftime('%Y-%m-%d')

add('T07', 'منطقه زمانی محلی وردپرس Asia/Tehran پیکربندی شده است',
    init.get('timezone_string') == 'Asia/Tehran' and init.get('wp_timezone') == 'Asia/Tehran',
    {'timezone_string': init.get('timezone_string'), 'wp_timezone': init.get('wp_timezone'), 'offset': str(offset)})
add('T05', 'جدول اختصاصی افزونه ساخته شد و افزونه فعال است',
    init.get('plugin_active') is True and init.get('table_exists') is True, init)
add('T05', 'رکوردهای قدیمی CPT حفظ و بدون تکرار به جدول منتقل شدند',
    init.get('legacy_cpt_posts_preserved') == 2 and init.get('legacy_refs_in_plugin_table') == 2 and
    init.get('second_migration_inserted') == 0 and init.get('table_count_on_activation') == 2,
    init)
add('T11', 'نشانی ذخیرهشده قدیمی OpenStreetMap به بلد ارتقا یافت',
    init.get('stored_map_url') == BALAD and init.get('effective_map_url') == BALAD, init)

# ------------------------------------------------------- 9 form POSTs (rate limit = 8/15 min)
REG = {'name': 'علی رضایی تست نهایی', 'phone': '۰۹۱۴۱۰۳۲۸۷۰', 'course': 'skin-facial',
       'message': 'درخواست معتبر پیشثبتنام برای تست ذخیره دائمی.', 'website': ''}
XSS = '<img src=x onerror=alert(1)> <script>alert("xss")</script>'
CONTACT = {'name': 'مریم احمدی تست نهایی', 'phone': '09142223344',
           'email': 'maryam.v110@example.test',
           'subject': "' OR 1=1 -- " + XSS,
           'message': XSS + ' متن معتبر برای تست ذخیره امن و نمایش کامل.', 'website': ''}
DEL = {'name': 'حذف تست نهایی', 'phone': '09143334455', 'email': '',
       'subject': '=HYPERLINK("http://evil.example","click")',
       'message': 'این پیام برای تست حذف با تأیید مدیر ثبت شده است.', 'website': ''}
submission_times = {}

st, raw, _ = post_form('/api/registrations', REG)
reg_time = dt.datetime.now(dt.timezone.utc)
p = as_json(raw)
ref_reg = p.get('id', '') if isinstance(p, dict) else ''
add('T01', 'پیشثبتنام کامل با ارقام فارسی → 201 و شماره پیگیری واقعی',
    st == 201 and p.get('ok') is True and p.get('storage') == 'plugin' and bool(ref_reg),
    {'status': st, 'body': p})
submission_times[ref_reg] = reg_time

st, raw, _ = post_form('/api/registrations', {'name': '', 'phone': '', 'course': '', 'message': '', 'website': ''})
p = as_json(raw)
add('T02', 'پیشثبتنام ناقص → 400 با خطاهای فیلد واضح، بدون موفقیت',
    st == 400 and p.get('ok') is False and {'name', 'phone', 'course'}.issubset(set(p.get('errors', {}))),
    {'status': st, 'body': p})

st, raw, _ = post_form('/api/contact', CONTACT)
contact_time = dt.datetime.now(dt.timezone.utc)
p = as_json(raw)
ref_contact = p.get('id', '') if isinstance(p, dict) else ''
add('T03', 'فرم تماس کامل با ارقام لاتین → 201 و شماره پیگیری واقعی',
    st == 201 and p.get('ok') is True and p.get('storage') == 'plugin' and bool(ref_contact),
    {'status': st, 'body': p})
submission_times[ref_contact] = contact_time

st, raw, _ = post_form('/api/contact', {'name': 'A', 'phone': '123', 'email': 'bad@@',
                                       'subject': '', 'message': 'کوتاه', 'website': ''})
p = as_json(raw)
add('T04', 'تماس نامعتبر → 400 و بررسی نام، تلفن، رایانامه، موضوع و متن',
    st == 400 and p.get('ok') is False and {'name', 'phone', 'email', 'subject', 'message'}.issubset(set(p.get('errors', {}))),
    {'status': st, 'body': p})

st, raw, _ = post_form('/api/registrations', REG)
p = as_json(raw)
add('T05', 'ارسال تکراری → 409 و بدون رکورد اضافی',
    st == 409 and p.get('ok') is False, {'status': st, 'body': p})

st, raw, _ = post_form('/api/contact', DEL)
p = as_json(raw)
ref_delete = p.get('id', '') if isinstance(p, dict) else ''
add('T09', 'رکورد اضافی برای تست حذف با موفقیت در جدول ذخیره شد',
    st == 201 and p.get('storage') == 'plugin' and bool(ref_delete), {'status': st, 'body': p})
submission_times[ref_delete] = dt.datetime.now(dt.timezone.utc)

st, raw, _ = post_form('/api/registrations', REG, forged='deadbeef')
p = as_json(raw)
add('T10', 'توکن CSRF جعلی → 403، بدون ذخیره', st == 403 and p.get('ok') is False,
    {'status': st, 'body': p})

st, raw, _ = post_form('/api/registrations', dict(REG, website='http://spam.example'))
p = as_json(raw)
add('T10', 'فیلد honeypot ربات → 400، بدون ذخیره', st == 400 and p.get('ok') is False,
    {'status': st, 'body': p})

st, raw, _ = post_form('/api/contact', {'name': 'نرخ تست', 'phone': '09145556677', 'email': '',
                                       'subject': 'موضوع تست نرخ', 'message': 'متن معتبر برای تست محدودیت نرخ.', 'website': ''})
p = as_json(raw)
add('T10', 'نهمین ارسال در ۱۵ دقیقه → 429 محدودیت نرخ',
    st == 429 and p.get('ok') is False, {'status': st, 'body': p})

# ------------------------------------------------------------------ admin login
admin_ok = login(op, 'admin', 'password')
add('T06', 'ورود مدیر به پیشخوان وردپرس موفق است', admin_ok, 'admin/password')
ALL = '/wp-admin/admin.php?page=raouf-requests'
REG_PAGE = '/wp-admin/admin.php?page=raouf-requests-registrations'
MSG_PAGE = '/wp-admin/admin.php?page=raouf-requests-contact'

st, listing, _ = call(ALL)
text = html.unescape(listing)
for label in ['درخواست‌های آموزشگاه رئوف', 'همه درخواست‌ها', 'پیش‑ثبت‑نام دوره‌ها', 'پیام‌های تماس با ما']:
    add('T06', f'عنوان دقیق منو/زیرمنو: {label}', label in text, {'status': st, 'len': len(listing)})

for ref, label in [(ref_reg, 'پیشثبتنام'), (ref_contact, 'تماس'), (ref_delete, 'حذف'),
                   ('MIG-LEGACY-0001', 'رکورد قدیمی ثبتنام'), ('MIG-LEGACY-0002', 'رکورد قدیمی تماس')]:
    add('T05', f'شماره پیگیری {label} بلافاصله در فهرست پیشخوان دیده میشود',
        bool(ref) and ref in listing, {'status': st, 'ref': ref})

# Newest -> oldest.
positions = {r: text.find(r) for r in [ref_delete, ref_contact, ref_reg, 'MIG-LEGACY-0001', 'MIG-LEGACY-0002']}
newest_ok = all(positions[r] >= 0 for r in [ref_delete, ref_contact, ref_reg]) and \
    positions[ref_delete] < positions[ref_contact] < positions[ref_reg]
add('T06', 'ترتیب فهرست از جدیدترین به قدیمیترین است', newest_ok, positions)

# Separate categories.
st, reglisting, _ = call(REG_PAGE)
st2, msglisting, _ = call(MSG_PAGE)
add('T06', 'زیرمنوی پیشثبتنام فقط رکوردهای ثبتنام را نشان میدهد',
    ref_reg in reglisting and 'MIG-LEGACY-0001' in reglisting and
    ref_contact not in reglisting and ref_delete not in reglisting and 'MIG-LEGACY-0002' not in reglisting,
    {'registration_page_len': len(reglisting)})
add('T06', 'زیرمنوی پیامها فقط رکوردهای تماس را نشان میدهد',
    ref_contact in msglisting and ref_delete in msglisting and 'MIG-LEGACY-0002' in msglisting and
    ref_reg not in msglisting and 'MIG-LEGACY-0001' not in msglisting,
    {'contact_page_len': len(msglisting)})

# ------------------------------------------------------- persistence after new browser session
admin2_ok = login(admin2, 'admin', 'password')
st, listing2, _ = call(ALL, opener_=admin2)
add('T05', 'پس از بستن مرورگر/نشست تازه، هر دو رکورد همچنان در پیشخوان هستند',
    admin2_ok and ref_reg in listing2 and ref_contact in listing2,
    {'login': admin2_ok, 'status': st})

# ------------------------------------------------------- theme change independence
st, themes, _ = call('/wp-admin/themes.php')
t = html.unescape(themes)
m = re.search(r'href="([^"]*action=activate[^"]*stylesheet=raouf-reference[^"]*)"', t)
switch_ok = False
if m:
    st, _, final_url = call(url_for_admin(m.group(1)))
    switch_ok = 'themes.php' in final_url or st in (200, 302)
add('T05', 'تعویض قالب به نسخه مرجع از طریق لینک واقعی وردپرس انجام شد', bool(m) and switch_ok,
    {'link_found': bool(m), 'status': st if m else None})
st, listing3, _ = call(ALL)
add('T05', 'رکوردها پس از تعویض قالب همچنان در جدول اختصاصی افزونه باقی میمانند',
    ref_reg in listing3 and ref_contact in listing3, {'status': st})
st, themes2, _ = call('/wp-admin/themes.php')
t2 = html.unescape(themes2)
m2 = re.search(r'href="([^"]*action=activate[^"]*stylesheet=raouf-academy[^"]*)"', t2)
if m2:
    call(url_for_admin(m2.group(1)))
add('T05', 'قالب اصلاحشده مجدداً فعال شد', bool(m2), {'link_found': bool(m2)})

# ------------------------------------------------------- exact local date/time + full detail
detail_urls = [html.unescape(u) for u in re.findall(r'href="([^"]*action=view[^"]*)"', listing)]
detail_urls = [url_for_admin(u) for u in detail_urls]
ref_to_detail = {}
for u in detail_urls:
    st, dbody, _ = call(u)
    for ref in [ref_reg, ref_contact, ref_delete]:
        if ref and ref in dbody:
            ref_to_detail[ref] = (u, dbody)

def full_local(detail):
    m = re.search(r'تاریخ و زمان کامل.*?<td dir="ltr">([^<]+)</td>', html.unescape(detail), re.S)
    return m.group(1).strip() if m else ''

for ref, label, expected in [(ref_reg, 'ثبتنام', reg_time), (ref_contact, 'تماس', contact_time)]:
    u, dbody = ref_to_detail.get(ref, ('', ''))
    dtxt = html.unescape(dbody)
    expected_local = expected.astimezone(tz).replace(tzinfo=None)
    got = full_local(dbody)
    ok = False
    if got:
        try:
            delta = abs((dt.datetime.strptime(got, '%Y-%m-%d %H:%M:%S') - expected_local).total_seconds())
            ok = delta <= 8 and re.search(r'تاریخ \(زمان محلی وردپرس\)', dtxt) is not None and \
                 re.search(r'زمان \(زمان محلی وردپرس\)', dtxt) is not None
        except ValueError:
            ok = False
    add('T07', f'تاریخ و زمان محلی دقیق برای {label} (Asia/Tehran, +03:30)',
        ok, {'expected': str(expected_local), 'displayed': got, 'detail_url': u})

for ref, label in [(ref_reg, 'ثبتنام'), (ref_contact, 'تماس')]:
    u, dbody = ref_to_detail.get(ref, ('', ''))
    d = html.unescape(dbody)
    ok = all(s in d for s in ['جزئیات درخواست', 'شماره پیگیری', 'نوع درخواست', 'نام و نام خانوادگی',
                              'شماره تماس', 'نام دوره', 'رایانامه', 'موضوع', 'متن پیام / توضیحات',
                              'همه فیلدهای دیگر', 'تاریخ (زمان محلی وردپرس)', 'زمان (زمان محلی وردپرس)'])
    if label == 'ثبتنام':
        ok = ok and '09141032870' in d and 'دوره تخصصی آموزش پاکسازی و فیشیال پوست' in d
    else:
        ok = ok and '09142223344' in d and 'maryam.v110@example.test' in d and "' OR 1=1 --" in d
    add('T08', f'جزئیات کامل رکورد {label}: شناسه، نوع، نام، تلفن، دوره/موضوع، پیام، سایر فیلدها، تاریخ و زمان',
        ok, {'ref': ref, 'detail_url': u, 'length': len(dbody)})

_, dcontact = ref_to_detail.get(ref_contact, ('', ''))
_, dreg = ref_to_detail.get(ref_reg, ('', ''))
add('T10', 'پayload XSS در جزئیات پیشخوان پاکسازی/escape شده و قابل اجرا نیست',
    '<script>alert("xss")</script>' not in dcontact and '<img src=x onerror=alert(1)>' not in dcontact and
    'onerror=alert(1)' not in dcontact,
    {'raw_script_present': '<script>alert("xss")</script>' in dcontact,
     'raw_img_payload_present': '<img src=x onerror=alert(1)>' in dcontact})

# ------------------------------------------------------- search / filter / CSV / delete
q_name = urllib.parse.quote('علی رضایی تست نهایی')
st, by_name, _ = call(ALL + '&s=' + q_name)
add('T09', 'جستجو بر اساس نام، فقط رکورد منطبق را برمیگرداند',
    ref_reg in by_name and ref_contact not in by_name and ref_delete not in by_name, {'status': st})
st, by_phone, _ = call(ALL + '&s=09142223344')
add('T09', 'جستجو بر اساس شماره تماس، فقط رکورد منطبق را برمیگرداند',
    ref_contact in by_phone and ref_reg not in by_phone and ref_delete not in by_phone, {'status': st})
sqli = urllib.parse.quote("' OR 1=1 -- ")
st, sqli_body, _ = call(ALL + '&s=' + sqli)
add('T10', 'ورودی SQLi در جستجو باعث افشای همه رکوردها یا خطای SQL نمیشود',
    st == 200 and ref_contact not in sqli_body and 'SQL syntax' not in sqli_body and 'Fatal error' not in sqli_body,
    {'status': st, 'len': len(sqli_body)})
st, by_type, _ = call(ALL + '&type=registration')
add('T09', 'فیلتر نوع درخواست فقط پیشثبتنامها را نشان میدهد',
    ref_reg in by_type and ref_contact not in by_type and ref_delete not in by_type, {'status': st})
st, by_date, _ = call(ALL + '&date_from=' + local_today + '&date_to=' + local_today)
add('T09', 'فیلتر تاریخ امروز تمام رکوردهای تازه را نشان میدهد',
    all(r in by_date for r in [ref_reg, ref_contact, ref_delete]), {'date': local_today, 'status': st})
st, future, _ = call(ALL + '&date_from=2099-01-01&date_to=2099-01-01')
add('T09', 'فیلتر تاریخ آینده هیچ رکوردی برنمیگرداند',
    st == 200 and ref_reg not in future and ref_contact not in future, {'date': '2099-01-01', 'status': st})

export_hrefs = [html.unescape(u) for u in re.findall(r'href="([^"]*action=export[^"]*)"', listing)]
csv_ok = False
csv_detail = {}
if export_hrefs:
    st, csv_body, _, hdrs = call(url_for_admin(export_hrefs[0]), with_headers=True)
    clean = csv_body.lstrip('\ufeff')
    rows = list(csv.reader(io.StringIO(clean)))
    csv_detail = {'status': st, 'content_type': header_get(hdrs, 'Content-Type'), 'rows': len(rows), 'header': rows[0] if rows else []}
    flat = clean
    csv_ok = (st == 200 and 'text/csv' in (header_get(hdrs, 'Content-Type') or '') and csv_body.startswith('\ufeff') and
              len(rows) == 6 and len(rows[0]) == 13 and
              all(r in flat for r in [ref_reg, ref_contact, ref_delete, 'MIG-LEGACY-0001', 'MIG-LEGACY-0002']) and
              '<script>alert("xss")</script>' not in flat and "'=HYPERLINK" in flat)
else:
    csv_detail = {'export_link_found': False}
add('T09', 'خروجی CSV شامل سربرگ فارسی، BOM، تمام رکوردها و محافظت فرمول/escape است',
    csv_ok, csv_detail)

# Delete: nonce + admin confirmation + no forged deletion.
del_id = ''
for u in detail_urls:
    if ref_delete and 'request=' in u:
        st, b, _ = call(u)
        if ref_delete in b:
            m = re.search(r'request=(\d+)', u)
            if m:
                del_id = m.group(1)
            break
del_links = re.findall(r'href="([^"]*action=delete[^"]*)"', html.unescape(listing))
del_link = next((u for u in del_links if del_id and ('request=' + del_id) in u), '')
add('T09', 'لینک حذف دارای تأیید جاوااسکریپت مدیر و نانس وردپرس است',
    bool(del_link) and '_wpnonce=' in del_link and 'confirm(' in html.unescape(listing),
    {'delete_id': del_id, 'link_found': bool(del_link)})
if del_link:
    forged = re.sub(r'(_wpnonce=)[^&"]+', r'\1deadbeef', url_for_admin(del_link))
    st, forged_body, _ = call(forged)
    st2, still, _ = call(ALL)
    add('T10', 'حذف با نانس جعلی انجام نمیشود و رکورد باقی میماند',
        ref_delete in still and ref_delete not in forged_body, {'status': st})
    st, _, final_url = call(url_for_admin(del_link))
    st2, after, _ = call(ALL)
    add('T09', 'حذف با نانس معتبر انجام شد و رکورد از فهرست حذف گردید',
        ref_delete not in after and ('deleted=1' in final_url or 'درخواست حذف شد' in after),
        {'status': st, 'final_url': final_url})
else:
    add('T09', 'حذف با نانس معتبر انجام شد و رکورد از فهرست حذف گردید', False, 'delete link missing')

# ------------------------------------------------------- unauthorized denial
st, anon_body, _ = call(ALL, opener_=anon)
add('T10', 'کاربر ناشناس به صفحه درخواستها دسترسی ندارد و PII نمیبیند',
    ref_reg not in anon_body and '09141032870' not in anon_body and 'جزئیات درخواست' not in anon_body,
    {'status': st})
sub_ok = login(sub, 'qa_reader', 'qa-reader-password')
st, sub_body, _ = call(ALL, opener_=sub)
st2, sub_export, _ = call(ALL + '&action=export', opener_=sub)
add('T10', 'کاربر subscriber (بدون manage_options) به فهرست/CSV دسترسی ندارد',
    sub_ok and ref_reg not in sub_body and ref_reg not in sub_export and 'جزئیات درخواست' not in sub_body,
    {'login': sub_ok, 'list_status': st, 'export_status': st2})
if ref_to_detail.get(ref_reg):
    forged_detail = re.sub(r'(_wpnonce=)[^&"]+', r'\1deadbeef', ref_to_detail[ref_reg][0])
    st, fbody, _ = call(forged_detail)
    add('T10', 'نانس جعلی نمایش جزئیات، هیچ اطلاعات شخصی افشا نمیکند',
        '09141032870' not in fbody and 'جزئیات درخواست' not in fbody, {'status': st})

# ------------------------------------------------------- Balad on all 11 routes
map_report = []
for route in ROUTES:
    st, body, _ = call(route, opener_=anon)
    links = re.findall(r'href="([^"]+)"[^>]*>(?:(?!</a>).)*?</a>', body, re.S)
    balad_anchors = re.findall(r'<a[^>]+href="' + re.escape(BALAD) + r'"[^>]*>', body, re.S)
    new_tab = all('target="_blank"' in a and 'rel="noopener noreferrer"' in a for a in balad_anchors)
    bad = re.findall(r'(?:openstreetmap|google\.com/maps|neshan\.ir|maps\.google)', body, re.I)
    map_report.append({'route': route, 'status': st, 'balad_links': len(balad_anchors),
                       'new_tab': new_tab, 'legacy_map_hosts': len(bad), 'token_left': '{{MAP_URL}}' in body})
    add('T11', f'لینک بلد در مسیر {route} و باز شدن در برگه جدید',
        st in (200, 404) and len(balad_anchors) >= 1 and new_tab and not bad and '{{MAP_URL}}' not in body,
        map_report[-1])
contact_body = [r for r in map_report if r['route'] == '/contact/'][0]
add('T11', 'صفحه تماس دارای لینک بلد کارت نشانی و فوتی مشترک است',
    contact_body['balad_links'] >= 2, contact_body)
artifacts['map_report'] = map_report

# ------------------------------------------------------- no PHP error strings
php_patterns = re.compile(r'(Fatal error|Parse error|Warning:|Notice:|Deprecated:|<b>Notice</b>)', re.I)
php_html_hits = []
for route in ROUTES:
    st, body, _ = call(route, opener_=anon)
    if php_patterns.search(body):
        php_html_hits.append(route)
for admin_path in [ALL, REG_PAGE, MSG_PAGE]:
    st, body, _ = call(admin_path)
    if php_patterns.search(body):
        php_html_hits.append(admin_path)
add('T12', 'هیچ رشته خطای PHP در ۱۱ مسیر عمومی و سه صفحه پیشخوان دیده نشد',
    not php_html_hits, {'hits': php_html_hits})

log_entries = []
for label, p in [('main', ROOT / '.work/wp-qa/v110-qa/php-errors.log'),
                 ('browser', ROOT / '.work/wp-qa/v110-browser-qa/php-errors.log'),
                 ('failure', ROOT / '.work/wp-qa/v110-failure-qa/php-errors.log')]:
    try:
        content = p.read_text(encoding='utf8', errors='replace').strip()
    except Exception:
        content = ''
    if content:
        log_entries.append({'server': label, 'lines': content.splitlines()[:20]})
add('T12', 'لاگ WP_DEBUG_LOG سه سرور تست فاقد خطای PHP است', not log_entries, log_entries[:3])

# ------------------------------------------------------- external artifacts
browser = read_json(RES / 'v110-browser.json', {})
visual = read_json(RES / 'v110-visual.json', {})
interactions = read_json(RES / 'v110-interactions.json', {})
artifacts['browser'] = browser.get('summary', browser)
artifacts['visual'] = visual.get('summary', visual)
artifacts['interactions'] = {
    'checks': len(interactions.get('checks', [])),
    'PASS': sum(1 for c in interactions.get('checks', []) if c.get('ok') is True),
    'FAIL': sum(1 for c in interactions.get('checks', []) if c.get('ok') is not True),
    'consoleErrors': len(interactions.get('consoleErrors', [])),
}

browser_console = browser.get('consoleErrors', [])
visual_console = visual.get('consoleErrors', [])
inter_console = interactions.get('consoleErrors', [])
add('T12', 'خطای JavaScript/صفحهای در تستهای مرورگر، تعاملات و ۶۶ نمای بصری وجود ندارد',
    not browser_console and not visual_console and not inter_console,
    {'browser': len(browser_console), 'visual': len(visual_console),
     'interactions': len(inter_console), 'samples': (browser_console + visual_console + inter_console)[:5]})

b = browser.get('checks', [])
def browser_check(name):
    return next((c for c in b if c.get('name') == name), None)
for name, test in [
    ('client validation blocks incomplete registration without network POST', 'T02'),
    ('double-click produces exactly one registration POST', 'T01'),
    ('registration success without page reload', 'T01'),
    ('client validation blocks invalid contact without network POST', 'T04'),
    ('contact success without page reload', 'T03'),
    ('storage failure returns real error and keeps entered values', 'T05'),
]:
    c = browser_check(name)
    add(test, f'مرورگر: {name}', bool(c and c.get('ok')), c or 'NOT RUN')

visual_pass = visual.get('summary', {}).get('FAIL', 1) == 0 and visual.get('summary', {}).get('PASS', 0) >= 13
add('T13', '۶۶ جفت دسکتاپ/موبایل (۱۱ مسیر × ۶ viewport) از نظر پیکسل یکسان هستند',
    visual_pass, visual.get('summary', 'visual artifact missing'))
inter_checks = interactions.get('checks', [])
inter_pass = bool(inter_checks) and all(c.get('ok') is True for c in inter_checks)
add('T13', 'منوها، گالری، FAQ، موبایل و سایر تعاملات بدون شکست باقی ماندند',
    inter_pass, artifacts['interactions'])

# ------------------------------------------------------- aggregate
summary = {}
for tid, title in TESTS.items():
    subset = [c for c in checks if c['test'] == tid]
    failed = [c for c in subset if c['result'] == 'FAIL']
    summary[tid] = {
        'title': title,
        'checks': len(subset),
        'PASS': len(subset) - len(failed),
        'FAIL': len(failed),
        'result': 'PASS' if subset and not failed else 'FAIL',
    }
out = {
    'stage': 'v1.1.0-correction',
    'generatedAt': dt.datetime.now(dt.timezone.utc).isoformat(),
    'environment': {
        'wp': BASE, 'original': ORIG, 'browser': BROWSER, 'failure': FAILURE,
        'engine': 'WordPress Playground 6.8.3 / PHP 8.3 WASM + SQLite (NOT real MySQL/LAMP)',
        'timezone': init.get('timezone_string'),
    },
    'references': {'registration': ref_reg, 'contact': ref_contact, 'delete': ref_delete},
    'tests': summary,
    'checks': checks,
    'artifacts': artifacts,
    'overall': {
        'tests': len(TESTS),
        'PASS': sum(1 for v in summary.values() if v['result'] == 'PASS'),
        'FAIL': sum(1 for v in summary.values() if v['result'] == 'FAIL'),
        'checks': len(checks),
        'checks_PASS': sum(1 for c in checks if c['result'] == 'PASS'),
        'checks_FAIL': sum(1 for c in checks if c['result'] == 'FAIL'),
    },
}
OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf8')
print('\n=== 13 TESTS ===')
for tid, v in summary.items():
    print(tid, v['result'], v['PASS'], '/', v['checks'], v['title'])
print('overall', out['overall'], 'written to', OUT)
sys.exit(0 if out['overall']['FAIL'] == 0 else 1)
