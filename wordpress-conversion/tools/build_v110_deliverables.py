#!/usr/bin/env python3
"""Build the separate v1.1.0 theme ZIP and v1.0.0 plugin ZIP.

Never touches the reference v1.0.0 theme ZIP or the old source-code ZIP.
"""
import hashlib
import json
import os
import zipfile
from pathlib import Path

ROOT = Path('/home/user/raouf')
CONV = ROOT / 'wordpress-conversion'
DIST = CONV / 'dist'
THEME = CONV / 'theme-v1.1.0' / 'raouf-academy'
PLUGIN = CONV / 'plugin' / 'raouf-academy-requests'
OLD_THEME = DIST / 'raouf-academy-wordpress-theme.zip'
OLD_SOURCE = DIST / 'source-code.zip'
NEW_THEME = DIST / 'raouf-academy-wordpress-theme-v1.1.0.zip'
NEW_PLUGIN = DIST / 'raouf-academy-requests-plugin-v1.0.0.zip'

SKIP_NAMES = {'.DS_Store', 'Thumbs.db'}
SKIP_DIRS = {'__pycache__', '.git', '.work', 'node_modules', 'dist', '.cache'}
SKIP_EXT = {'.pyc', '.pyo', '.log', '.tmp'}
THEME_EXCLUDE = {'assets/css/style.css.source.css'}

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

before = {str(OLD_THEME): sha(OLD_THEME), str(OLD_SOURCE): sha(OLD_SOURCE)}

def collect(base, exclude=()):
    out = []
    for path in sorted(base.rglob('*')):
        if not path.is_file():
            continue
        rel = path.relative_to(base).as_posix()
        if any(part in SKIP_DIRS or part.startswith('.') for part in path.relative_to(base).parts):
            continue
        if path.name in SKIP_NAMES or path.suffix.lower() in SKIP_EXT or rel in exclude:
            continue
        out.append((rel, path))
    return out

def build(path, prefix, entries):
    if path.exists():
        path.unlink()
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for rel, src in entries:
            z.write(src, prefix + rel)
    with zipfile.ZipFile(path) as z:
        assert z.testzip() is None, f'corrupt ZIP: {path}'
        return len(z.namelist()), path.stat().st_size

theme_entries = collect(THEME, THEME_EXCLUDE)
plugin_entries = collect(PLUGIN)
n_theme, s_theme = build(NEW_THEME, 'raouf-academy/', theme_entries)
n_plugin, s_plugin = build(NEW_PLUGIN, 'raouf-academy-requests/', plugin_entries)

after = {str(OLD_THEME): sha(OLD_THEME), str(OLD_SOURCE): sha(OLD_SOURCE)}
assert before == after, 'reference ZIPs were modified!'

manifest = {
    'stage': 'v1.1.0-zip-build',
    'reference_theme_zip': {
        'path': str(OLD_THEME), 'size': OLD_THEME.stat().st_size, 'sha256': after[str(OLD_THEME)],
        'status': 'UNCHANGED',
    },
    'reference_source_zip': {
        'path': str(OLD_SOURCE), 'size': OLD_SOURCE.stat().st_size, 'sha256': after[str(OLD_SOURCE)],
        'status': 'UNCHANGED',
    },
    'revised_theme_zip': {
        'path': str(NEW_THEME), 'size': s_theme, 'sha256': sha(NEW_THEME),
        'entries': n_theme, 'version': '1.1.0', 'top_level': 'raouf-academy/',
    },
    'plugin_zip': {
        'path': str(NEW_PLUGIN), 'size': s_plugin, 'sha256': sha(NEW_PLUGIN),
        'entries': n_plugin, 'version': '1.0.0', 'top_level': 'raouf-academy-requests/',
    },
}
(DIST / 'v110-zip-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf8')
print('reference theme ZIP unchanged:', after[str(OLD_THEME)])
print('reference source ZIP unchanged:', after[str(OLD_SOURCE)])
print('revised theme ZIP:', NEW_THEME, s_theme, 'bytes,', n_theme, 'entries, sha256', sha(NEW_THEME))
print('plugin ZIP:', NEW_PLUGIN, s_plugin, 'bytes,', n_plugin, 'entries, sha256', sha(NEW_PLUGIN))
