#!/usr/bin/env python3
"""Stage F — final delivery validation, based ONLY on real executed checks.

Validates the exact untouched theme ZIP, the rebuilt source ZIP, the real
admin install evidence, the live post-activation smoke test and the saved
Stage F result files. It does NOT re-run any visual/interaction/security
suite; those results are read from their own real reports.
"""
import glob
import hashlib
import json
import os
import re
import time
import zipfile

ROOT = '/home/user/raouf'
CONV = os.path.join(ROOT, 'wordpress-conversion')
DIST = os.path.join(CONV, 'dist')
THEME = os.path.join(CONV, 'theme', 'raouf-academy')
QA = os.path.join(CONV, 'qa')
RESULTS = os.path.join(QA, 'results')
DOCS = os.path.join(CONV, 'docs')
TESTED_BACKUP = os.path.join(ROOT, '.work', 'wp-qa', 'stage-F-tested-theme.zip')
THEME_ZIP = os.path.join(DIST, 'raouf-academy-wordpress-theme.zip')
SOURCE_ZIP = os.path.join(DIST, 'source-code.zip')
OUT = os.environ.get('VALIDATION_REPORT', os.path.join(RESULTS, 'stage-F-final-validation.json'))

def sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()

def load(name):
    with open(os.path.join(RESULTS, name), encoding='utf8') as f:
        return json.load(f)

def main():
    checks = []
    def add(name, ok, detail):
        checks.append({'check': name, 'result': 'PASS' if ok else 'FAIL', 'detail': str(detail)[:500]})

    # ---------- 1. Theme ZIP: exact tested version, untouched ----------
    with zipfile.ZipFile(THEME_ZIP) as z:
        tnames = z.namelist()
        troot = sorted({n.split('/')[0] for n in tnames})
        tbad = z.testzip()
        tfiles = {n[len('raouf-academy/'):]: z.read(n) for n in tnames
                  if n.startswith('raouf-academy/') and not n.endswith('/')}
    add('theme ZIP testzip is None (healthy archive)', tbad is None, 'testzip=%s' % tbad)
    add('theme ZIP has exactly 103 entries and one raouf-academy/ root',
        len(tnames) == 103 and troot == ['raouf-academy'], 'entries=%s roots=%s' % (len(tnames), troot))
    add('theme ZIP SHA-256 equals the byte-identical tested backup',
        sha(THEME_ZIP) == sha(TESTED_BACKUP), 'theme=%s backup=%s' % (sha(THEME_ZIP)[:16], sha(TESTED_BACKUP)[:16]))
    add('theme ZIP SHA-256 equals the ZIP installed through the admin UI',
        sha(THEME_ZIP) == load('stage-F-install.json')['zip_sha256'],
        'install_zip_sha=%s' % load('stage-F-install.json')['zip_sha256'][:16])
    add('theme ZIP SHA-256 equals the ZIP used by the live post-activation smoke test',
        sha(THEME_ZIP) == load('stage-F-post-activation-smoke.json')['zip_sha256'],
        'smoke_zip_sha=%s' % load('stage-F-post-activation-smoke.json')['zip_sha256'][:16])

    runtime = {}
    for dp, dn, fn in os.walk(THEME):
        dn[:] = [d for d in dn if d not in {'__pycache__', '.git'} and not d.startswith('.')]
        for f in fn:
            rel = os.path.relpath(os.path.join(dp, f), THEME).replace(os.sep, '/')
            if rel == 'assets/css/style.css.source.css' or f.endswith('.pyc'):
                continue
            runtime[rel] = open(os.path.join(dp, f), 'rb').read()
    mismatches = [k for k in tfiles if k not in runtime or tfiles[k] != runtime.get(k)]
    add('all 103 theme ZIP files are byte-identical to the working theme folder',
        len(tfiles) == 103 and len(runtime) == 103 and not mismatches,
        'zip_files=%s work_files=%s mismatches=%s' % (len(tfiles), len(runtime), mismatches[:5]))
    for required in ['style.css', 'assets/js/app.js', 'screenshot.png', 'readme.txt',
                     'languages/raouf-academy.pot', '404.php', 'front-page.php']:
        add('theme ZIP contains essential file %s' % required, required in tfiles, required)
    forbidden = re.compile(r'(wp-config\.php|\.env|\.git-credentials|\.netrc|id_rsa|\.sql$|secret|credential|database)', re.I)
    bad_theme = [n for n in tnames if forbidden.search(n)]
    add('theme ZIP contains no config/credential/database/secret file', not bad_theme, 'matches=%s' % bad_theme[:5])

    # ---------- 2. Source ZIP: completeness after Stage F ----------
    with zipfile.ZipFile(SOURCE_ZIP) as z:
        snames = z.namelist()
        sroot = sorted({n.split('/')[0] for n in snames})
        sbad = z.testzip()
        sdata = {n: z.read(n) for n in snames if not n.endswith('/')}
    prefix = 'raouf-academy-wordpress-source/'
    add('source ZIP testzip is None (healthy archive)', sbad is None, 'testzip=%s' % sbad)
    add('source ZIP has one raouf-academy-wordpress-source/ root',
        sroot == ['raouf-academy-wordpress-source'], 'roots=%s' % sroot)
    add('source ZIP README.md equals SOURCE-README.md',
        sdata.get(prefix + 'README.md') == open(os.path.join(CONV, 'SOURCE-README.md'), 'rb').read(),
        'present=%s' % (prefix + 'README.md' in sdata))

    stageF_qa = sorted(glob.glob(os.path.join(QA, 'stage-F-*')))
    stageF_results = sorted(glob.glob(os.path.join(RESULTS, 'stage-F-*.json')))
    # The validation script/report itself is embedded by the FINAL source-only
    # rebuild, which runs immediately after this report is written.
    pending = {'stage-F-final-validation.py', 'stage-F-final-validation.json'}
    missing_qa = [os.path.basename(p) for p in stageF_qa
                  if os.path.basename(p) not in pending and prefix + 'qa/' + os.path.basename(p) not in sdata]
    missing_results = [os.path.basename(p) for p in stageF_results
                       if os.path.basename(p) not in pending and prefix + 'qa/results/' + os.path.basename(p) not in sdata]
    add('all Stage F harnesses are inside source ZIP (excluding this validation script)',
        not missing_qa, 'count=%s missing=%s' % (len(stageF_qa) - len(pending & {os.path.basename(p) for p in stageF_qa}), missing_qa[:6]))
    add('all Stage F result JSONs are inside source ZIP (excluding this validation report)',
        not missing_results, 'count=%s missing=%s' % (len([p for p in stageF_results if os.path.basename(p) not in pending]), missing_results[:6]))

    screenshots = sorted(glob.glob(os.path.join(RESULTS, 'screenshots', '*.png')))
    missing_shots = [os.path.basename(p) for p in screenshots
                     if prefix + 'qa/results/screenshots/' + os.path.basename(p) not in sdata]
    add('all 5 real install/activation screenshots are inside source ZIP',
        len(screenshots) == 5 and not missing_shots, 'count=%s missing=%s' % (len(screenshots), missing_shots))

    for doc in ['installation-guide-fa.md', 'installation-guide-fa.pdf',
                'conversion-report.md', 'conversion-report.pdf', 'final-test-report-fa.md']:
        add('source ZIP contains docs/%s' % doc, prefix + 'docs/' + doc in sdata, doc)
    for pdf in ['installation-guide-fa.pdf', 'conversion-report.pdf']:
        add('source ZIP docs/%s is byte-identical to dist/%s' % (pdf, pdf),
            sdata.get(prefix + 'docs/' + pdf) == open(os.path.join(DIST, pdf), 'rb').read(), pdf)
    add('source ZIP contains the source-only CSS reference',
        prefix + 'theme/raouf-academy/assets/css/style.css.source.css' in sdata, 'style.css.source.css')
    add('source ZIP contains the Persian final test report',
        prefix + 'docs/final-test-report-fa.md' in sdata, 'final-test-report-fa.md')
    add('source ZIP contains the resume/status file',
        prefix + 'qa/results/resume-status.md' in sdata, 'resume-status.md')
    bad_source = [n for n in snames if forbidden.search(n)]
    unwanted = [n for n in snames if '/dist/' in n or '/.work/' in n or '/node_modules/' in n or '/__pycache__/' in n or n.endswith('.pyc')]
    add('source ZIP contains no config/credential/secret or excluded dev artefact',
        not bad_source and not unwanted, 'forbidden=%s unwanted=%s' % (bad_source[:5], unwanted[:5]))

    # ---------- 3. Real install / activation / post-activation evidence ----------
    inst = load('stage-F-install.json')
    smoke = load('stage-F-post-activation-smoke.json')
    add('admin ZIP upload/activation suite is 24/24 PASS with 11/11 routes',
        inst['summary']['PASS'] == 24 and inst['summary']['FAIL'] == 0 and inst['summary']['routes_ok'] == 11,
        json.dumps(inst['summary'], ensure_ascii=False)[:220])
    shot_files = [s['file'] for s in inst['screenshots']]
    add('all 5 documented install screenshots exist on disk',
        len(shot_files) == 5 and all(os.path.isfile(p) for p in shot_files), 'files=%s' % len(shot_files))
    add('live post-activation smoke suite is 25/25 PASS with 11/11 routes',
        smoke['summary']['PASS'] == 25 and smoke['summary']['FAIL'] == 0 and smoke['summary']['routes_ok'] == 11,
        json.dumps(smoke['summary'], ensure_ascii=False)[:220])
    add('smoke test produced a real registration reference and admin detail URL',
        smoke['summary']['registration_reference'].startswith('REG-') and 'raouf_view=' in smoke['summary']['admin_detail_url'],
        'ref=%s' % smoke['summary']['registration_reference'])
    for rel in ['style.css', 'assets/js/app.js']:
        served = smoke['details'][rel]['served_sha256']
        local = smoke['details'][rel]['local_sha256']
        add('smoke confirms served %s equals delivered %s' % (rel, rel), served == local,
            'sha=%s' % served[:16])

    # ---------- 4. Existing real Stage F result summaries ----------
    visual = load('stage-F-visual.json')
    interactions = load('stage-F-interactions.json')
    dom = load('stage-F-dom.json')
    structural = load('stage-F-structural.json')
    forms = load('stage-F-forms.json')
    forms_http_a = load('stage-F-forms-http-a.json')
    security = load('stage-F-security.json')
    security_extra = load('stage-F-security-extra.json')
    links = load('stage-F-links.json')
    migration = load('stage-F-migration.json')
    wpcs = load('stage-F-wpcs-raw.json')
    compat = load('stage-F-phpcompat-raw.json')
    console = load('stage-F-console.json')
    d1 = load('stage-D1-verification.json')
    referenced = {
        'visual': {'pairs': visual['pairs_total'], 'strict_identical': visual['pairs_strict_identical'],
                   'mandated_60': visual['mandated_60_visually_identical']},
        'interactions': {'checks': len(interactions['checks']),
                         'passed': sum(1 for c in interactions['checks'] if c.get('ok') is True)},
        'dom': {'rows': len(dom['rows']), 'all_identical': dom['allIdentical']},
        'structural': {'rows': len(structural),
                       'main_identical': sum(1 for r in structural if r['main_identical'])},
        'forms': forms['summary'], 'forms_http_a_checks': len(forms_http_a),
        'security': security['summary'],
        'security_extra': security_extra['summary'], 'links': links['summary'],
        'migration': migration['summary'], 'wpcs_totals': wpcs['totals'],
        'phpcompat_totals': compat['totals'], 'console': console['summary'],
        'D1': d1['summary'],
    }
    ok = (visual['pairs_total'] == 66 and visual['pairs_strict_identical'] == 66
          and visual['mandated_60_visually_identical'] == 60
          and len(interactions['checks']) == 28 and referenced['interactions']['passed'] == 28
          and dom['allIdentical'] and len(dom['rows']) == 11
          and len(structural) == 11 and referenced['structural']['main_identical'] == 11
          and forms['summary']['PASS'] == 23 and len(forms_http_a) == 8
          and security['summary']['PASS'] == 24
          and security_extra['summary']['PASS'] == 10 and links['summary']['PASS'] == 7
          and migration['summary']['PASS'] == 10 and wpcs['totals']['errors'] == 121
          and wpcs['totals']['warnings'] == 181 and compat['totals']['errors'] == 0
          and console['summary']['php_error_strings'] == 0 and console['summary']['page_errors'] == 0
          and d1['summary']['PASS'] == 73 and d1['summary']['FAIL'] == 0)
    add('saved Stage F/D-1 result files show the documented PASS profile', ok,
        json.dumps(referenced, ensure_ascii=False)[:500])

    # ---------- Report ----------
    summary = {'checks': len(checks), 'PASS': sum(1 for c in checks if c['result'] == 'PASS'),
               'FAIL': sum(1 for c in checks if c['result'] == 'FAIL')}
    out = {
        'stage': 'F', 'test': 'final delivery validation',
        'generatedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'theme_zip': {'path': THEME_ZIP, 'bytes': os.path.getsize(THEME_ZIP),
                      'entries': len(tnames), 'testzip': tbad, 'sha256': sha(THEME_ZIP),
                      'mtime_ns': os.stat(THEME_ZIP).st_mtime_ns,
                      'rebuilt': False, 'note': 'Exact ZIP installed via admin UI on :9411; build_zip.py --source-only never touches it.'},
        'source_zip_at_validation_time': {'path': SOURCE_ZIP, 'bytes': os.path.getsize(SOURCE_ZIP),
                      'entries': len(snames), 'testzip': sbad, 'sha256': sha(SOURCE_ZIP),
                      'note': 'One final --source-only rebuild will embed this validation report; the definitive final SHA/size/entries are recorded in dist/final-delivery-manifest.json.'},
        'install_evidence': {'admin_ui': inst['summary'], 'smoke': smoke['summary']},
        'referenced_results': referenced,
        'summary': summary, 'checks': checks,
        'decisions_without_change': [
            'WPCS 121 errors / 181 warnings are style-only (0 security sniffs); no cosmetic count reduction.',
            'axe color-contrast finding is inherited from the authoritative source design; fixing it would change appearance.',
            '4 images >200KB, no CDN/cache headers, no fetchpriority hint: documented optimisation candidates only.',
        ],
        'not_tested': [
            'Real LAMP/LEMP with MySQL/MariaDB and system PHP (Playground PHP-WASM 8.3 + SQLite used)',
            'SMTP / wp_mail() end-to-end delivery',
            'WordPress multisite, WP 6.4-6.7 and >6.8.3, runtime PHP 7.4/8.0/8.1/8.2',
            'Physical devices, legacy browsers, assistive technology, Theme Check, PageSpeed/CDN/load',
            'Third-party plugins, page builders, WooCommerce, LMS',
            'Physical host-to-host database migration (domain exercise used update_option on one Playground install)',
        ],
        'note': 'Every check above was executed in this run or read from a real saved test report. No result was fabricated.',
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(json.dumps(summary, ensure_ascii=False))
    for c in checks:
        if c['result'] == 'FAIL':
            print('FAIL:', c['check'], c['detail'])
    return 0 if summary['FAIL'] == 0 else 1

if __name__ == '__main__':
    raise SystemExit(main())
