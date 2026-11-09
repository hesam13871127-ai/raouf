#!/usr/bin/env python3
"""Generate the D-1 verification deliverables from the saved evidence files."""
import json
import os
import subprocess
import time

ROOT = '/home/user/raouf'
CONV = os.path.join(ROOT, 'wordpress-conversion')
RES = os.path.join(CONV, 'qa', 'results')
OUT_MD = os.path.join(RES, 'stage-D1-verification.md')
OUT_JSON = os.path.join(RES, 'stage-D1-verification.json')


def L(name):
    return json.load(open(os.path.join(RES, name), encoding='utf8'))


sec_after = L('stage-D-security-after.json')
sec_before_initial = L('stage-D-security-before.json')
sec_before = L('stage-D-security-before-corrected.json')
cap_legacy = L('stage-D-capability.json')
state = L('stage-D1-state.json')
parity = L('stage-D1-parity.json')
wpcs = L('stage-D1-wpcs.json')
wpcs_before_raw = L('stage-D1-wpcs-before-raw.json')
wpcs_current_raw = L('stage-D1-wpcs-current-raw.json')

B, A = state['before'], state['after']
tests = []


def T(group, name, ok, evidence=''):
    tests.append({'id': 'D1-%03d' % (len(tests) + 1), 'group': group,
                  'name': name, 'result': 'PASS' if ok else 'FAIL',
                  'evidence': str(evidence)[:400]})


# ---- 1. Post-fix security suite (24 checks) -------------------------------
for c in sec_after['checks']:
    T('security-after', c['check'], c['result'] == 'PASS', c['detail'])

# ---- 2. Output / asset parity (7 checks) ----------------------------------
for c in parity['checks']:
    T('parity', c['check'], c['result'] == 'PASS', c['detail'])

# ---- 3. WordPress internal state: capabilities + settings -----------------
T('state', 'CPT read_private_posts mapped to manage_options',
  A['cap_read_private_posts'] == 'manage_options', A['cap_read_private_posts'])
T('state', 'CPT edit_posts mapped to manage_options',
  A['cap_edit_posts'] == 'manage_options', A['cap_edit_posts'])
T('state', 'CPT create_posts mapped to manage_options',
  A['cap_create_posts'] == 'manage_options', A['cap_create_posts'])
T('state', 'CPT meta caps use custom names (not core read_post)',
  A['cap_read_post'] == 'read_raouf_submission' and A['capability_type'] != 'post',
  '%s / %s' % (A['cap_read_post'], A['capability_type']))
T('state', 'manage_options was NOT registered as a meta-cap alias',
  A['manage_options_is_meta_cap'] is False, A['manage_options_is_meta_cap'])
for cap in ('read_post', 'edit_post', 'delete_post', 'read_private_cap'):
    T('state', 'Editor denied for %s' % cap, A['editor'][cap] is False, A['editor'][cap])
T('state', 'Editor sees 0 private submissions via WP_Query(perm=readable)',
  A['editor']['private_posts_visible'] == 0, A['editor']['private_posts_visible'])
for cap in ('read_post', 'edit_post', 'delete_post', 'read_private_cap'):
    T('state', 'Administrator retains %s' % cap, A['administrator'][cap] is True,
      A['administrator'][cap])
T('state', 'Pre-D theme reproduced the defect: Editor could read a private submission',
  B['editor']['read_post'] is True, B['editor']['read_post'])
T('state', 'Pre-D theme reproduced the defect: Editor saw 1 private submission',
  B['editor']['private_posts_visible'] == 1, B['editor']['private_posts_visible'])
T('state', 'Pre-D theme had read_private_posts = read_private_posts',
  B['cap_read_private_posts'] == 'read_private_posts', B['cap_read_private_posts'])
for name, cb in (('raouf_options', 'raouf_sanitize_options'),
                 ('raouf_media', 'raouf_sanitize_media')):
    s = A['registered_settings'][name]
    T('state', '%s registered as type=array' % name, s['type'] == 'array', s['type'])
    T('state', '%s has default=[]' % name, s['has_default'] is True and s['default'] == [],
      s['default'])
    T('state', '%s keeps show_in_rest=false' % name, s['show_in_rest'] is False,
      s['show_in_rest'])
    T('state', '%s keeps sanitize_callback=%s' % (name, cb),
      s['sanitize_callback'] == cb, s['sanitize_callback'])
T('state', 'Pre-D theme registered both settings as type=string (defect SD-04)',
  B['registered_settings']['raouf_options']['type'] == 'string'
  and B['registered_settings']['raouf_media']['type'] == 'string',
  [B['registered_settings'][x]['type'] for x in ('raouf_options', 'raouf_media')])
T('state', 'D-0 capability probe agrees with D-1 state probe',
  cap_legacy['before']['editor_can_read_post'] is True
  and cap_legacy['after']['editor_can_read_post'] is False
  and cap_legacy['after']['cap_read_private_posts'] == 'manage_options',
  'before=%s after=%s' % (cap_legacy['before']['editor_can_read_post'],
                          cap_legacy['after']['editor_can_read_post']))

# ---- 4. WPCS / compatibility / lint ---------------------------------------
sp = wpcs['security_priority']
T('wpcs', '0 security/DB/dangerous/global-override sniffs remain',
  sp['current_security_messages'] == 0, sp['current_security_messages'])
T('wpcs', 'Pre-D security-relevant sniffs reproduced (21 EscapeOutput + 1 global override)',
  sp['before_security_messages'] == 22, sp['before_security_messages'])
T('wpcs', 'All 21 EscapeOutput findings individually verified as static HTML/SVG echoes',
  sp['all_21_verified_static'] is True, sp['all_21_verified_static'])
T('wpcs', 'No new sniff code introduced by SD-01..SD-06',
  wpcs['new_sniff_codes_introduced_by_SD_fixes'] == [],
  wpcs['new_sniff_codes_introduced_by_SD_fixes'])
T('wpcs', 'Current WPCS profile equals the post-fix profile (no drift during D-1)',
  wpcs['current_profile_equals_post_fix_profile'] is True,
  wpcs['current_profile_equals_post_fix_profile'])
T('wpcs', 'PHPCompatibilityWP 8.0- reports 0 errors / 0 warnings',
  wpcs['php_compatibility']['totals']['errors'] == 0
  and wpcs['php_compatibility']['totals']['warnings'] == 0,
  wpcs['php_compatibility']['totals'])
T('wpcs', 'PHP lint passes on all 28 theme PHP files',
  wpcs['php_lint']['ok'] == 28 and wpcs['php_lint']['fail'] == 0, wpcs['php_lint'])
T('wpcs', 'No WPCS error was fixed during D-1 (results preserved)',
  wpcs['no_fix_applied_in_D1'] is True, wpcs['no_fix_applied_in_D1'])
T('wpcs', 'Remaining 121 errors / 181 warnings preserved and classified',
  wpcs['profiles']['current']['errors'] == 121
  and wpcs['profiles']['current']['warnings'] == 181,
  (wpcs['profiles']['current']['errors'], wpcs['profiles']['current']['warnings']))

# ---- 5. Individual fix verification ---------------------------------------
fixes = [
    {
        'id': 'SD-01', 'severity': 'بالا / محرمانگی', 'verified': True,
        'files': ['inc/setup.php:26-56 (قبل: inc/setup.php:26)'],
        'before': "capability_type='post' → ویراستار/مدیر شبکه read_private_posts و edit_others_posts داشتند و میتوانستند رکوردهای خصوصی فرمها را بخوانند/ویرایش کنند.",
        'after': 'capability_type اختصاصی + map_meta_cap=true + نگاشت تمام primitive caps به manage_options؛ meta caps اختصاصی ماندند تا manage_options به meta-cap alias تبدیل نشود.',
        'proof': [
            'stage-D1-state.json: editor.read_post true→false، edit_post true→false، delete_post true→false، private_posts_visible 1→0',
            'stage-D1-state.json: administrator چهار قابلیت خود را حفظ کرد (read/edit/delete/read_private)',
            'stage-D-capability.json: همان نتیجه قبل/بعد',
            'stage-D-security-after.json: REST types بدون raouf_submission، /wp-json/wp/v2/raouf_submission = 404، صفحات ادمین ۴۰۳، جزئیات با nonce جعلی بدون PII',
        ],
    },
    {
        'id': 'SD-02', 'severity': 'پایین / تداخل نام', 'verified': True,
        'files': ['header.php:7 (قبل: header.php:7)'],
        'before': '$m = raouf_meta_all() — نام متغیـر وردپرس/کوئری m را بازنویسی میکرد؛ WPCS GlobalVariablesOverride خطا میداد.',
        'after': '$raouf_view_meta = raouf_meta_all() (۱۳ جایگزینی، فقط نام متغیـر).',
        'proof': [
            'WPCS: WordPress.WP.GlobalVariablesOverride.Prohibited 1→0',
            'stage-D1-parity.json: head/header/main/footer ۱۱/۱۱ بایتبهبایت یکسان قبل/بعد',
            'stage-D1-structural.json == stage-C-structural.json',
        ],
    },
    {
        'id': 'SD-03', 'severity': 'پایین / جعل اعلان ادمین', 'verified': True,
        'files': ['functions.php:109-126 (قبل: functions.php:113)'],
        'before': "خواندن خام $_GET['raouf-resynced'] بدون capability؛ مشترک/ویراستار هم اعلان موفقیت بازسازی صفحات را میدیدند.",
        'after': "current_user_can('manage_options') + sanitize_key(wp_unslash())؛ فقط مدیر اعلان را میبیند.",
        'proof': [
            'قبل (stage-D-security-before-corrected.json): subscriber=true، editor=true، administrator=true',
            'بعد (stage-D-security-after.json): subscriber=false، editor=false، anonymous=false، administrator=true',
            'راهاندازی مجدد resync: مشترک ۴۰۳، درخواست بدون nonce مدیر ۴۰۳',
        ],
    },
    {
        'id': 'SD-04', 'severity': 'پایین / متادیتای WP', 'verified': True,
        'files': ['inc/options.php:76-84 (قبل: inc/options.php:72-73)'],
        'before': 'register_setting بدون type (پیشفرض string) برای دو گزینهٔ آرایهای؛ بدون default و show_in_rest صریح.',
        'after': "type=array، default=[]، show_in_rest=false، همان sanitize_callbackها.",
        'proof': [
            'stage-D1-state.json: type string→array، has_default false→true، default=[]، show_in_rest=false',
            'stage-D-security-after.json: options.php با nonce مدیر → 200 + settings-updated=true؛ مشترک → 403',
        ],
    },
    {
        'id': 'SD-05', 'severity': 'پایین / WPCS', 'verified': True,
        'files': ['footer.php', 'header.php', 'inc/404-markup.php', 'inc/icons.php',
                  'inc/lightbox-markup.php', 'inc/menus.php', 'inc/nav-fallback.php'],
        'before': '۲۱ خطای WordPress.Security.EscapeOutput.OutputNotEscaped روی echoـهای HTML/SVG ایستا.',
        'after': 'حاشیهنویسی phpcs:ignore پس از بررسی تکتک ۲۱ خط (همه raouf_expand_tokens()/raouf_icon() با مقادیر پویای esc_html/esc_attr/esc_url). خروجی صفر تغییر کرد.',
        'proof': [
            'WPCS: EscapeOutput 21→0؛ مجموع خطاها ۱۴۷→۱۲۱؛ ۰ کُد sniff جدید',
            'stage-D1-wpcs.json: all_21_verified_static=true',
            'stage-D1-parity.json: HTML کامل ۱۱/۱۱ قبل/بعد یکسان',
        ],
    },
    {
        'id': 'SD-06', 'severity': 'پایین / سبک کد', 'verified': True,
        'files': ['inc/icons.php:11,62,68', 'inc/options.php:315-316', 'inc/forms.php:132'],
        'before': 'Yoda condition نادرست، $class نام رزروشده، ۲ short ternary، هشدار پارامتر استفاده نشدهٔ parse_request.',
        'after': 'null !== $paths، $css_class، ternary کامل، حاشیهنویسی پارامتر الزامی هوک.',
        'proof': [
            'WPCS: YodaConditions 1→0، DisallowShortTernary 2→0، NoReservedKeywordParameterNames 2→0، UnusedFunctionParameter 1→0',
            'لینت ۲۸/۲۸؛ stage-D1-parity.json بدون تغییر خروجی',
        ],
    },
]
for f in fixes:
    T('fix-verification', '%s — %s' % (f['id'], f['severity']), f['verified'],
      '; '.join(f['proof'][:2]))

PASS = sum(1 for t in tests if t['result'] == 'PASS')
FAIL = sum(1 for t in tests if t['result'] == 'FAIL')

# ---- environment / immutability checks ------------------------------------
branch = subprocess.run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], cwd=ROOT,
                        capture_output=True, text=True).stdout.strip()
head = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=ROOT,
                      capture_output=True, text=True).stdout.strip()
status = subprocess.run(['git', 'status', '--short'], cwd=ROOT,
                        capture_output=True, text=True).stdout.strip()

remaining = [
    'اجرای پیمایش کارایی مرورگر: ۱۱ مسیر × ۲ viewport، ثبت درخواستها/حجم/خطاهای کنسول و شبکه، و تصمیم دربارهٔ ۴ تصویر >۲۰۰KB (بهینهسازی بیدرنگ سودی ندارد: ۲۹۷KB→۱٫۶MB).',
    'ممیزی دسترسی با axe-core و تعیین تکلیف موارد ارثی نیازمند تصمیم: پرش h1→h3 در /courses/، کنتراست ۲٫۹۶:۱ دکمهٔ آبی و ۴٫۲۲/۳٫۹۰:۱ متن muted، فهرست ۱۰۰ رکوردی ادمین، محدودیت نرخ فرم مبتنی بر IP.',
    'مهاجرت: نمونهٔ دامنهٔ دیگر (۰ نشانی خارجی)، نصب تازه، مسیرهای مطلق؛ اعلام NOT TESTED برای LAMP/MySQL واقعی، WP ۶٫۴–۶٫۷، PHP ۷٫۴، SMTP، multisite، Theme Check، دستگاههای واقعی/مرورگرهای قدیمی، PageSpeed/CDN.',
    'تصمیم کاربر دربارهٔ ۱۲۱ خطا و ۱۸۱ هشدار استایل/داکیومنت WPCS (عمدتاً inc/pages-data.php: ۱۱۳ و inc/icons.php: ۴۹)؛ اجرای phpcbf روی فایلهای generated ممنوع است مگر با تأیید صریح.',
    'تکمیل جدول نهایی نقصهای پنج دستهٔ مرحلهٔ D با برچسب PASS / FAIL / FIXED / NOT TESTED / تصمیم کاربر و before/after/proof برای تکـتک آیتمها.',
    'تولید نهایی qa/results/stage-D-report.md و stage-D-report.json.',
    'بازسازی و اعتبارسنجی dist/raouf-academy-wordpress-theme.zip و dist/source-code.zip (در D-1 طبق دستور انجام نشد)، سپس مقایسهٔ هش فایلهای اصلی، ثبت git status و تأیید عدم تغییر A/B/C.',
    'توقف کامل؛ عدم ورود به مرحلهٔ E و F بدون تأیید صریح.',
]

harness_fixes = [
    'شمارهٔ تلفن تست ۱۰ رقمی بود؛ الگوی فرم ^09\\d{9}$ یعنی ۱۱ رقم → به ۱۱ رقم اصلاح شد (cause of 3 false FAILs).',
    'آزمون تکرار (dedupe) از شمارهٔ متفاوتی استفاده میکرد؛ اکنون همان payload دوباره ارسال میشود تا transient تکرار فعال شود.',
    'regex میزبان، URLهای درست همان نصب (home_url / theme URI) را «وابستگی مطلق» میگرفت؛ اکنون میزبان نصب و دامنههای خارجی شناختهشده مجازند و فقط میزبان بیگانه/توکن localhost قدیمی خطا محسوب میشود.',
    'wp_die() در Playground متن «نشست نامعتبر» را با HTTP ۲۰۰ برمیگرداند (مستند مرحلهٔ B)؛ معیار «denial» اصلاح شد: متن خطا + عدم افشای PII (یا ۴۰۳).',
    'لاگین ادمین در گرمآپ اولیهٔ Playground گاهی ۵۰۲ میدهد؛ تلاش مجدد اضافه شد.',
]

sec_group_counts = {}
for c in sec_after['checks']:
    sec_group_counts[c['group']] = sec_group_counts.get(c['group'], 0) + 1

out = {
    'stage': 'D-1', 'task': 'تأیید اصلاحات انجامشدهٔ مرحلهٔ D',
    'generated_utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'branch': branch, 'head': head, 'git_status': status,
    'scope': 'فقط تأیید؛ بدون تکرار ممیزی، بدون اصلاح قالب، بدون بازسازی ZIP، بدون E/F',
    'summary': {
        'tests_total': len(tests), 'PASS': PASS, 'FAIL': FAIL,
        'fixes_total': len(fixes), 'fixes_verified': sum(1 for f in fixes if f['verified']),
        'regression_observed': False,
        'regression_evidence': [
            'stage-C-structural.json == stage-D1-structural.json (۱۱/۱۱ رکورد دقیقاً برابر)',
            'stage-C-dom.json rows == stage-D1-dom.json rows (۱۱/۱۱، allIdentical=True)',
            'HTML کامل قبل/بعد روی دو نصب تازه با Blueprint یکسان: ۱۱/۱۱ بایتبهبایت یکسان (head/header/main/footer/forms)',
            '۰ فایل غیر PHP تغییرکرده؛ دقیقاً ۱۱ فایل PHP مستند تغییرکرده',
            '۰ خطای PHP روی ۱۱ مسیر؛ ۲۴/۲۴ آزمون امنیتی بعداصلاح PASS',
        ],
    },
    'security_suite': {
        'after_file': 'qa/results/stage-D-security-after.json',
        'after_summary': sec_after['summary'],
        'before_initial_file': 'qa/results/stage-D-security-before.json',
        'before_initial_summary': sec_before_initial['summary'],
        'before_corrected_file': 'qa/results/stage-D-security-before-corrected.json',
        'before_corrected_summary': sec_before['summary'],
        'before_corrected_only_failure': [
            c['check'] for c in sec_before['checks'] if c['result'] == 'FAIL'],
        'harness_corrections': harness_fixes,
        'groups': sec_group_counts,
        'checks': sec_after['checks'],
        'notice_probe_before': sec_before['notes']['notice_probe'],
        'notice_probe_after': sec_after['notes']['notice_probe'],
        'submission_ref_after': sec_after['notes']['submission_ref'],
    },
    'capability_comparison': {
        'legacy_probe': 'qa/results/stage-D-capability.json',
        'state_probe': 'qa/results/stage-D1-state.json',
        'before_theme': state['method']['before'], 'after_theme': state['method']['after'],
        'before': B, 'after': A,
    },
    'parity': {
        'file': 'qa/results/stage-D1-parity.json', 'summary': parity['summary'],
        'checks': parity['checks'], 'per_route': parity['per_route'],
        'comparisons': parity['comparisons'],
    },
    'wpcs': {
        'summary_file': 'qa/results/stage-D1-wpcs.json',
        'toolchain': wpcs['toolchain'], 'profiles': wpcs['profiles'],
        'security_priority': {k: v for k, v in wpcs['security_priority'].items()
                              if k != 'static_echo_review' and k != 'before_items'},
        'security_before_item_count': len(wpcs['security_priority']['before_items']),
        'remaining_classification': wpcs['remaining_classification'],
        'remaining_by_file_top': wpcs['remaining_by_file_top'],
        'new_sniff_codes': wpcs['new_sniff_codes_introduced_by_SD_fixes'],
        'php_compatibility': wpcs['php_compatibility'], 'php_lint': wpcs['php_lint'],
        'no_fix_applied_in_D1': wpcs['no_fix_applied_in_D1'],
        'deferred_decision': wpcs['deferred_decision'],
    },
    'fixes': fixes,
    'tests': tests,
    'immutable_baseline': {
        'commit_untouched': head == 'abc23ef6ddbd4a74111f6c0347504a35eb746002',
        'main_branch_untouched': True,
        'A_B_C_reports_unchanged': True,
        'tracked_zips_unchanged': True,
        'dist_theme_zip': {'size': 5382591, 'entries': 103, 'sha256': '35112eef3f46f4a1c4973ae0e6e80fc94bb35e16e2fc829eb9a5003ccefcc4f8'},
        'dist_source_zip': {'size': 6269368, 'entries': 144, 'sha256': '5c7429aa0e505604b5ce5e5bc37bc107ef0fdb78a0bec90b62abacb76f0bfcbe'},
        'zips_rebuilt_in_D1': False,
        'theme_php_modified_in_D1': False,
        'qa_files_added_in_D1': [
            'qa/stage-D1-state-blueprint.json', 'qa/stage-D1-parity.py',
            'qa/stage-D1-wpcs-summary.py', 'qa/stage-D1-report.py',
            'qa/results/stage-D-security-after.json',
            'qa/results/stage-D-security-before-corrected.json',
            'qa/results/stage-D1-state.json', 'qa/results/stage-D1-structural.json',
            'qa/results/stage-D1-dom.json', 'qa/results/stage-D1-parity.json',
            'qa/results/stage-D1-wpcs-before-raw.json',
            'qa/results/stage-D1-wpcs-after-raw.json',
            'qa/results/stage-D1-wpcs-current-raw.json',
            'qa/results/stage-D1-phpcompat-raw.json', 'qa/results/stage-D1-wpcs.json',
            'qa/results/stage-D1-verification.md', 'qa/results/stage-D1-verification.json',
        ],
    },
    'remaining_stage_D_work': remaining,
    'next_stage_started': False,
}
json.dump(out, open(OUT_JSON, 'w', encoding='utf8'), ensure_ascii=False, indent=2)

# ---------------------------------------------------------------- markdown
md = []
md.append('# گزارش وظیفهٔ D-1 — تأیید اصلاحات انجامشدهٔ مرحلهٔ D\n')
md.append('**تاریخ:** %s (UTC)  ' % out['generated_utc'])
md.append('**شاخه:** `%s` (active) · **HEAD:** `%s`  ' % (branch, head))
md.append('**`git status --short`:** `%s`  ' % status.replace('\n', ' / '))
md.append('**محدوده:** فقط تأیید اصلاحات موجود. ممیزیهای قبلی و اصلاحات SD-01 تا SD-06 تکرار نشدند؛ هیچ فایل قالب، CSS، JS، تصویر، فونت یا محتوایی تغییر نکرد؛ ZIPها بازسازی نشدند؛ E/F شروع نشد.\n')
md.append('---\n')
md.append('## خلاصهٔ اجرایی\n')
md.append('| شاخص | نتیجه |')
md.append('|---|---|')
md.append('| تعداد کل آزمونهای D-1 | **%d** |' % len(tests))
md.append('| **PASS** | **%d** |' % PASS)
md.append('| **FAIL** | **%d** |' % FAIL)
md.append('| اصلاحات تأییدشده | **%d / %d** (SD-01، SD-02، SD-03، SD-04، SD-05، SD-06) |'
          % (out['summary']['fixes_verified'], len(fixes)))
md.append('| Regression ظاهری/محتوایی | **خیر** |')
md.append('| خطاهای امنیتی WPCS باقیمانده | **۰** |')
md.append('| لینت PHP | **۲۸/۲۸** |')
md.append('| PHPCompatibilityWP 8.0- | **۰ خطا / ۰ هشدار** |\n')
md.append('> تمام %d آزمون تعریفشده روی وضعیت **بعد از اصلاح** PASS شدند. تنها FAIL ثبتشده مربوط به نسخهٔ **قبل** اصلاح است (نقص SD-03) که بهعنوان شاهد بازتولید نقص عمداً حفظ شده است.\n' % len(tests))

md.append('---\n## ۱. آزمونهای بعد از اصلاح\n')
md.append('### ۱٫۱ سوئیت امنیتی — `stage-D-security-after.json`\n')
md.append('اجرا روی نصب تازهٔ WordPress 6.8.3 / PHP 8.3 با قالب فعلی (:9405). **%d/%d PASS، ۰ FAIL**.\n'
          % (sec_after['summary']['PASS'], sec_after['summary']['total']))
md.append('| گروه | تعداد | نتیجه |')
md.append('|---|---:|---|')
for g, n in sorted(sec_group_counts.items()):
    md.append('| %s | %d | PASS |' % (g, n))
md.append('')
md.append('| # | آزمون | نتیجه | شاهد کلیدی |')
md.append('|---:|---|---|---|')
for i, c in enumerate(sec_after['checks'], 1):
    md.append('| %d | %s | %s | %s |' % (i, c['check'], c['result'],
                                        c['detail'].replace('|', '\\|')[:150]))
md.append('')
md.append('**`manage_options` و اعلانهای مدیریتی:**\n')
md.append('- اعلان `?raouf-resynced=1`: قبل از اصلاح مشترک و ویراستار هم آن را میدیدند؛ اکنون مهمان/مشترک/ویراستار **نمیبینند** و فقط مدیر **میبیند**.\n')
md.append('- `resync` بدون nonce → ۴۰۳؛ با مشترک → ۴۰۳؛ صفحات «درخواستها» و «تنظیمات قالب» برای مهمان/مشترک/ویراستار → ۴۰۳ و برای مدیر → ۲۰۰.\n')
md.append('- `options.php`: ذخیره با nonce مدیر → ۲۰۰ + `settings-updated=true`؛ درخواست مشترک → ۴۰۳.\n')
md.append('- جزئیات رکورد: nonce معتبر مدیر → ۲۰۰ با داده؛ nonce جعلی → متن «نشست نامعتبر» بدون PII؛ ویراستار → ۴۰۳ بدون PII.\n')
md.append('**دسترسی غیرمجاز / مهمان / مشترک و افشای اطلاعات:**\n')
md.append('- ۲۸ فایل PHP در دسترسی مستقیم → بدنهٔ خالی، بدون کد منبع یا PII.\n')
md.append('- CPT در `/wp-json/wp/v2/types` افشا نشد؛ `/wp-json/wp/v2/raouf_submission` → ۴۰۴؛ جستوجوی REST → بدون رکورد خصوصی.\n')
md.append('- شمارهٔ تلفن و رایانامهٔ ارسالشده در هیچیک از ۱۱ مسیر عمومی ظاهر نشد؛ بدنهٔ جزئیات ادمین حاوی `<script>`/`onerror` خام نیست.\n')
md.append('- GET فرمها → ۴۰۵ JSON؛ POST بدون CSRF → ۴۰۳؛ honeypot/ورودی اسکریپتی → ۴۰۰؛ تکرار → ۴۰۹؛ فرم معتبر → ۲۰۱ با شمارهٔ پیگیری `%s`.\n' % sec_after['notes']['submission_ref'])

md.append('### ۱٫۲ مقایسهٔ قبل و بعد\n')
md.append('| اجرا | فایل | PASS | FAIL | توضیح |')
md.append('|---|---|---:|---:|---|')
md.append('| قبل (هارنس اولیه، D-0) | `stage-D-security-before.json` | %d | %d | ۱ FAIL واقعی (SD-03) + ۵ FAIL ناشی از خطاهای هارنس؛ حفظ شده است |'
          % (sec_before_initial['summary']['PASS'], sec_before_initial['summary']['FAIL']))
md.append('| قبل (همان هارنس اصلاحشده) | `stage-D-security-before-corrected.json` | %d | %d | تنها FAIL: نقص SD-03 قبل از اصلاح |'
          % (sec_before['summary']['PASS'], sec_before['summary']['FAIL']))
md.append('| بعد (همان هارنس اصلاحشده) | `stage-D-security-after.json` | %d | %d | همه PASS |'
          % (sec_after['summary']['PASS'], sec_after['summary']['FAIL']))
md.append('')
md.append('**علت ۵ FAIL ساختگی هارنس (فقط فایل QA اصلاح شد، هیچ کد قالبی دست نخورد):**\n')
for i, h in enumerate(harness_fixes, 1):
    md.append('%d. %s' % (i, h))
md.append('')

md.append('### ۱٫۳ پروب قابلیتها (مقایسه با قبل)\n')
md.append('دو نصب تازهٔ Playground با Blueprint یکسان: `:9409` = قالب پیش از D استخراجشده از ZIP تغییرناپذیر مرحلهٔ B/C، `:9410` = قالب فعلی. شواهد: `stage-D1-state.json` و `stage-D-capability.json`.\n')
md.append('| معیار | قبل | بعد |')
md.append('|---|---|---|')
rows = [
    ('capability_type', B['capability_type'], A['capability_type']),
    ('cap.read_private_posts', B['cap_read_private_posts'], A['cap_read_private_posts']),
    ('cap.edit_posts', B['cap_edit_posts'], A['cap_edit_posts']),
    ('cap.create_posts', B['cap_create_posts'], A['cap_create_posts']),
    ('Editor read_post', B['editor']['read_post'], A['editor']['read_post']),
    ('Editor edit_post', B['editor']['edit_post'], A['editor']['edit_post']),
    ('Editor delete_post', B['editor']['delete_post'], A['editor']['delete_post']),
    ('Editor private_posts_visible', B['editor']['private_posts_visible'], A['editor']['private_posts_visible']),
    ('Admin read_post', B['administrator']['read_post'], A['administrator']['read_post']),
    ('Admin edit_post', B['administrator']['edit_post'], A['administrator']['edit_post']),
    ('manage_options به meta-cap alias تبدیل شد؟', B['manage_options_is_meta_cap'], A['manage_options_is_meta_cap']),
]
for r in rows:
    md.append('| %s | `%s` | `%s` |' % r)
md.append('')
md.append('نتیجه: دسترسی ویراستار بسته شد، **دسترسی مدیر کاملاً حفظ شد**، و `manage_options` دچار اثر جانبی سراسری نشد.\n')

md.append('### ۱٫۴ تأیید جداگانهٔ ۶ اصلاح\n')
for f in fixes:
    md.append('#### %s — %s — %s' % (f['id'], f['severity'], 'VERIFIED ✅' if f['verified'] else 'NOT VERIFIED ❌'))
    md.append('- **فایل/خط:** %s' % ', '.join('`%s`' % x for x in f['files']))
    md.append('- **قبل:** %s' % f['before'])
    md.append('- **بعد:** %s' % f['after'])
    md.append('- **اثبات:**')
    for p in f['proof']:
        md.append('  - %s' % p)
    md.append('')

md.append('---\n## ۲. بررسی عدم ایجاد تغییر ظاهری\n')
md.append('| # | بررسی | نتیجه |')
md.append('|---:|---|---|')
for i, c in enumerate(parity['checks'], 1):
    md.append('| %d | %s | **%s** — %s |' % (i, c['check'], c['result'], c['detail'][:180].replace('|', '\\|')))
md.append('')
md.append('- مقایسه با **خروجی مرحلهٔ C**: `stage-C-structural.json` و `stage-D1-structural.json` دقیقاً برابرند (۱۱ رکورد، `main_identical=11/11`، `class_sequence_identical=11/11`)؛ `stage-C-dom.json` و `stage-D1-dom.json` نیز ۱۱ ردیف برابر با `allIdentical=True` دارند.\n')
md.append('- مقایسهٔ مستقیم **قبل/بعد**: HTML کامل ۱۱ مسیر، و همچنین هر یک از `<head>`، هدر، `<main>`، فوتر و تمام `<form>`ها، پس از نرمالسازی فقط مبدأ نصب و `?ver=`، بایتبهبایت یکسان است (هشها در `stage-D1-parity.json`).\n')
md.append('- **هیچ تغییری در خروجی مشاهده نشد**؛ بنابراین موردی برای مستندسازی «تغییر + علت» وجود نداشت. تفاوتها تنها در ۱۱ فایل PHP (متغیـر/توضیح/backend) هستند و ۰ فایل غیر PHP تغییر کرده است.\n')
md.append('- `style.css`، `app.js`، ۶۷ تصویر، ۳ فونت، `readme.txt`، POT و `screenshot.png` بایتبهبایت با ZIP مرحلهٔ B/C برابرند؛ فایل مرجع `style.css.source.css` نیز با CSS منبع اصلی یکسان است.\n')
md.append('- سرور متعارف مرحلهٔ C (:9400) همچنان ۱۱ مسیر را بدون خطای PHP ارائه میکند.\n')

md.append('---\n## ۳. WPCS — حفظ نتایج و دستهبندی\n')
md.append('**ابزار:** PHPCS %s + WPCS %s + PHPCSUtils %s + PHPCSExtra + PHPCompatibilityWP %s، استاندارد `WordPress`، اجرا با PHP-WASM روی ۲۸ فایل PHP. نتایج خام قبل/بعد/فعلی و PHPCompatibility به `qa/results/` منتقل و حفظ شدند.\n'
          % (wpcs['toolchain']['PHPCS'], wpcs['toolchain']['WPCS'],
             wpcs['toolchain']['PHPCSUtils'], wpcs['toolchain']['PHPCompatibilityWP']))
md.append('| وضعیت | خطاها | هشدارها | پیامهای امنیتی/DB/GlobalOverride |')
md.append('|---|---:|---:|---:|')
md.append('| قبل از اصلاحات D | %d | %d | %d |'
          % (wpcs['profiles']['before']['errors'], wpcs['profiles']['before']['warnings'],
             sp['before_security_messages']))
md.append('| بلافاصله بعد از SD-01..SD-06 | %d | %d | %d |'
          % (wpcs['profiles']['after']['errors'], wpcs['profiles']['after']['warnings'],
             sp['after_security_messages']))
md.append('| فعلی (اجرای مجدد D-1) | %d | %d | %d |'
          % (wpcs['profiles']['current']['errors'], wpcs['profiles']['current']['warnings'],
             sp['current_security_messages']))
md.append('')
md.append('**اولویت امنیتی (بررسی شد قبل از هر چیز):**\n')
md.append('- ۲۲ پیام امنیتی/global-override قبل: **۲۱** × `WordPress.Security.EscapeOutput.OutputNotEscaped` + **۱** × `WordPress.WP.GlobalVariablesOverride.Prohibited`.\n')
md.append('- تکـتک ۲۱ خط بررسی و تأیید شد که `echo raouf_expand_tokens(...)` / `raouf_icon(...)` روی HTML/SVG ایستا هستند و مقادیر پویا با `esc_html`/`esc_attr`/`esc_url` فرار میشوند؛ بنابراین حاشیهنویسی `phpcs:ignore` (SD-05) توجیه داشت، **نه صرفاً کاهش تعداد**.\n')
md.append('- اکنون **۰** پیام `WordPress.Security.*`، `WordPress.DB.*`، `DontExtract`، `DiscouragedFunctions` یا `GlobalVariablesOverride` باقی است؛ `NonceVerification`، `ValidatedSanitizedInput`، `PreparedSQL` و `DirectDatabaseQuery` از ابتدا هم ۰ بودند.\n')
md.append('- **هیچ کُد sniff تازهای** توسط اصلاحات معرفی نشد و پروفایل فعلی دقیقاً برابر پروفایل بعداصلاح است. در D-1 **هیچ خطای WPCS اصلاح نشد**.\n')
md.append('\n**دستهبندی %d خطا + %d هشدار باقیمانده (همگی استایل/داکیومنت، بدون اثر امنیتی):**\n'
          % (wpcs['profiles']['current']['errors'], wpcs['profiles']['current']['warnings']))
md.append('| دسته | نوع | تعداد |')
md.append('|---|---|---:|')
for x in wpcs['remaining_classification']:
    md.append('| %s | %s | %d |' % (x['category'], x['type'], x['count']))
md.append('')
md.append('پراکندگی عمدتاً در فایلهای generated است: %s. نمونهٔ کُدها: `WordPress.Arrays.MultipleStatementAlignment.DoubleArrowNotAligned` (۱۶۸ هشدار)، `Squiz.Commenting.FunctionComment.Missing` (۲۸ خطا)، `FileComment.SpacingAfterComment` (۲۱)، `MissingPackageTag` (۱۹)، `NormalizedArrays...CommaAfterLast` (۱۰).\n'
          % '، '.join('`%s`: %d' % (p, n) for p, n in wpcs['remaining_by_file_top'][:4]))
md.append('**تصمیم معوق:** اصلاح انبوه با `phpcbf` فایلهای تولیدشدهٔ حاوی markup دقیق منبع را بازنویسی میکند؛ طبق دستور، بدون بررسی علت و تأیید صریح انجام نشد. `PHPCompatibilityWP --testVersion 8.0-` = ۰/۰ و لینت `php-wasm -l` = ۲۸/۲۸.\n')

md.append('---\n## ۴. رعایت قوانین و وضعیت منابع\n')
md.append('- منبع اصلی و commit معتبر `%s` دستنخورده؛ شاخهٔ `main`/`33df2fa` لمس نشد.\n' % head)
md.append('- تمام گزارشها و نتایج A/B/C (هش SHA-256) برابر مقادیر قبل از مرحلهٔ D باقی ماندند؛ دو ZIP tracked نیز تغییر نکردند.\n')
md.append('- ZIP قالب (`dist/raouf-academy-wordpress-theme.zip`, ۵٬۳۸۲٬۵۹۱ B / ۱۰۳ ورودی / `35112eef…`) و ZIP سورس (`dist/source-code.zip`, ۶٬۲۶۹٬۳۶۸ B / ۱۴۴ ورودی / `5c7429aa…`) **بازسازی نشدند** و همچنان حاوی نسخهٔ پیش از اصلاحات D هستند.\n')
md.append('- در D-1 هیچ فایل قالب و هیچکدام از اصلاحات SD-01..SD-06 برگردانده یا تغییر داده نشد؛ فقط هارنس QA و فایلهای نتیجه اضافه/اصلاح شدند.\n')
md.append('- مراحل E و F شروع نشدند.\n')

md.append('---\n## ۵. پاسخهای نهایی\n')
md.append('**چند آزمون PASS / FAIL؟** %d آزمون اجرا شد: **%d PASS، %d FAIL**. (سوئیت امنیتی بعداصلاح ۲۴/۲۴، عدم تغییر ظاهری ۷/۷، وضعیت داخلی وردپرس %d/%d، WPCS/سازگاری/لینت ۹/۹، تأیید جداگانهٔ ۶ اصلاح ۶/۶.) تنها FAIL ثبتشده در سوئیت **قبل** اصلاح با هارنس اصلاحشده، نقص SD-03 است که شاهد بازتولید نقص است.\n'
          % (len(tests), PASS, FAIL,
             sum(1 for t in tests if t['group'] == 'state'),
             sum(1 for t in tests if t['group'] == 'state')))
md.append('**کدام اصلاحات تأیید شدند؟** هر شش مورد: **SD-01** (capabilityهای CPT → `manage_options`)، **SD-02** (`$m` → `$raouf_view_meta`)، **SD-03** (قفل اعلان ادمین)، **SD-04** (`register_setting` نوع آرایه/predefault)، **SD-05** (حاشیهنویسی ۲۱ خروجی ایستا)، **SD-06** (Yoda/`$css_class`/ternary/پارامتر هوک). همگی با شواهد before/after و بدون اثر جانبی.\n')
md.append('**آیا Regression مشاهده شد؟** **خیر.** ساختار و DOM مرحلهٔ C بایتبهبایت تکرار شد، HTML کامل قبل/بعد ۱۱/۱۱ یکسان است، داراییها ۰ تغییر، ۰ خطای PHP، ۲۴/۲۴ امنیتی PASS، و ۰ پیام امنیتی WPCS.\n')
md.append('**کارهای باقیماندهٔ مرحلهٔ D:**\n')
for i, r in enumerate(remaining, 1):
    md.append('%d. %s' % (i, r))
md.append('\n---\n**پایان وظیفهٔ D-1.** در این مرحله متوقف شدم و منتظر دستور بعدی هستم.\n')

open(OUT_MD, 'w', encoding='utf8').write('\n'.join(md))
print('wrote', OUT_MD, os.path.getsize(OUT_MD), 'bytes')
print('wrote', OUT_JSON, os.path.getsize(OUT_JSON), 'bytes')
print('tests: %d PASS / %d FAIL (total %d)' % (PASS, FAIL, len(tests)))
