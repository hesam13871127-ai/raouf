#!/usr/bin/env python3
"""Build the installable theme ZIP and the developer source-code ZIP.

The theme ZIP contains only runtime files (no dev artefacts). The source ZIP
contains every source file, converter, QA script, QA result and document.
"""
import os, sys, zipfile

# `--source-only` rebuilds ONLY source-code.zip. It exists so the already
# installed/tested theme ZIP is never touched during final documentation updates.
SOURCE_ONLY = '--source-only' in sys.argv

ROOT = '/home/user/raouf'
CONV = os.path.join(ROOT, 'wordpress-conversion')
THEME = os.path.join(CONV, 'theme', 'raouf-academy')
DIST = os.path.join(CONV, 'dist')
DOCS = os.path.join(CONV, 'docs')
QA = os.path.join(CONV, 'qa')
RESULTS = os.path.join(QA, 'results')
TOOLS = os.path.join(CONV, 'tools')
os.makedirs(DIST, exist_ok=True)

SKIP_NAMES = {'.DS_Store', 'Thumbs.db'}
SKIP_DIRS = {'__pycache__', '.git', '.work', 'node_modules', 'dist'}
SKIP_EXT = {'.pyc', '.pyo', '.log', '.tmp'}
# Reference copy of the original CSS is source material, not a runtime asset.
THEME_RUNTIME_EXCLUDE = {'assets/css/style.css.source.css'}

def collect(base, include_all=False):
    out = []
    for dp, dn, fn in os.walk(base):
        dn[:] = sorted(d for d in dn if d not in SKIP_DIRS and not d.startswith('.'))
        for f in sorted(fn):
            if f in SKIP_NAMES or f.startswith('.') or os.path.splitext(f)[1].lower() in SKIP_EXT:
                continue
            rel = os.path.relpath(os.path.join(dp, f), base).replace(os.sep, '/')
            if not include_all and rel in THEME_RUNTIME_EXCLUDE:
                continue
            out.append((rel, os.path.join(dp, f)))
    return out

def make_zip(path, entries):
    if os.path.exists(path):
        os.remove(path)
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for rel, src in entries:
            z.write(src, rel)
    with zipfile.ZipFile(path) as z:
        assert z.testzip() is None, 'corrupt ZIP'
        return len(z.namelist()), os.path.getsize(path)

# ---- 1. Installable theme ZIP: only raouf-academy/ at the root ----
# Intentionally SKIPPED with --source-only: the delivered theme ZIP is the exact
# byte-identical version already uploaded/activated/tested on the fresh site.
theme_zip = os.path.join(DIST, 'raouf-academy-wordpress-theme.zip')
if SOURCE_ONLY:
    n1, s1 = 'unchanged', os.path.getsize(theme_zip)
else:
    theme_entries = [('raouf-academy/' + rel, src) for rel, src in collect(THEME)]
    n1, s1 = make_zip(theme_zip, theme_entries)

# ---- 2. Source-code ZIP ----
prefix = 'raouf-academy-wordpress-source/'
source = []
source.append((prefix + 'README.md', os.path.join(CONV, 'SOURCE-README.md')))
for rel, src in collect(THEME, include_all=True):
    source.append((prefix + 'theme/raouf-academy/' + rel, src))
for d, arc in [(TOOLS, 'tools'), (QA, 'qa'), (RESULTS, 'qa/results'), (DOCS, 'docs')]:
    for rel, src in collect(d):
        # qa/results is added separately with its own archive prefix.
        if arc == 'qa' and rel.startswith('results/'):
            continue
        source.append((prefix + arc + '/' + rel, src))
source.sort(key=lambda x: x[0])
source_zip = os.path.join(DIST, 'source-code.zip')
n2, s2 = make_zip(source_zip, source)

print('theme ZIP :', theme_zip, s1, 'bytes,', n1, 'entries, top-level =', ['raouf-academy'],
      '(NOT REBUILT, exact tested version preserved)' if SOURCE_ONLY else '')
print('source ZIP:', source_zip, s2, 'bytes,', n2, 'entries')
print('  tools  :', sorted(r.split('/')[-1] for r, _ in source if '/tools/' in r))
print('  qa     :', sorted(r.split('/')[-1] for r, _ in source if '/qa/' in r and '/results/' not in r))
print('  results:', sorted(r.split('/')[-1] for r, _ in source if '/results/' in r))
print('  docs   :', sorted(r.split('/')[-1] for r, _ in source if '/docs/' in r))
