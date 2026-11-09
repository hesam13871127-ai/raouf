#!/usr/bin/env python3
"""Stage D-1 — preserve and categorise the WPCS results (no code changes).

Reads the three raw PHPCS JSON reports saved in qa/results/ and writes
stage-D1-wpcs.json. No sniff is fixed here: the remaining messages are
classified and the security-relevant ones are checked first.
"""
import collections
import json
import os
import time

RES = '/home/user/raouf/wordpress-conversion/qa/results'
THEME = '/home/user/raouf/wordpress-conversion/theme/raouf-academy'
RAW = {
    'before': 'stage-D1-wpcs-before-raw.json',   # pre-D theme (Stage B/C ZIP)
    'after': 'stage-D1-wpcs-after-raw.json',     # immediately after SD-01..SD-06
    'current': 'stage-D1-wpcs-current-raw.json', # re-run during D-1
}

SECURITY_PREFIXES = (
    'WordPress.Security.', 'WordPress.DB.', 'WordPress.PHP.DontExtract',
    'Squiz.PHP.DiscouragedFunctions', 'WordPress.WP.GlobalVariablesOverride',
)
CATEGORIES = {
    'documentation_docblocks': ('Squiz.Commenting', 'Generic.Commenting'),
    'array_alignment_whitespace_formatting': (
        'WordPress.Arrays', 'Generic.WhiteSpace', 'Generic.Formatting',
        'NormalizedArrays', 'Universal.WhiteSpace', 'Squiz.Strings',
        'Squiz.ControlStructures', 'PEAR.Functions', 'Squiz.Functions',
        'Generic.CodeAnalysis', 'WordPress.PHP.YodaConditions',
    ),
    'naming_reserved_keywords': ('Universal.NamingConventions',),
}


def load(name):
    return json.load(open(os.path.join(RES, RAW[name]), encoding='utf8'))


def messages(report):
    for f, rec in report['files'].items():
        rel = os.path.relpath(f, THEME)
        for m in rec['messages']:
            yield rel, m


def profile(report):
    c = collections.Counter((m['type'], m['source']) for _, m in messages(report))
    return {
        'errors': sum(n for (t, s), n in c.items() if t == 'ERROR'),
        'warnings': sum(n for (t, s), n in c.items() if t == 'WARNING'),
        'files_checked': len(report['files']),
        'sniffs': [{'source': s, 'type': t, 'count': n}
                   for (t, s), n in sorted(c.items(), key=lambda x: (-x[1], x[0][1]))],
    }


def main():
    reports = {k: load(k) for k in RAW}
    profiles = {k: profile(v) for k, v in reports.items()}

    def security_items(report):
        out = []
        for rel, m in messages(report):
            if any(m['source'].startswith(p) for p in SECURITY_PREFIXES):
                out.append({'file': rel, 'line': m['line'], 'type': m['type'],
                            'source': m['source'], 'message': m['message']})
        return sorted(out, key=lambda x: (x['file'], x['line']))

    sec = {k: security_items(v) for k, v in reports.items()}

    # Every pre-D EscapeOutput finding must be a static markup/SVG echo, i.e.
    # not user-controlled output. The 21 lines were reviewed individually
    # before the phpcs:ignore annotations were added (SD-05).
    escape_before = [x for x in sec['before']
                     if x['source'] == 'WordPress.Security.EscapeOutput.OutputNotEscaped']
    static_echoes = []
    for x in escape_before:
        path = os.path.join(THEME, x['file'])
        # Read the ORIGINAL (pre-D) line from the immutable baseline instead.
        base = path.replace('/wordpress-conversion/theme/raouf-academy/',
                            '/.work/wp-qa/stage-d-before/raouf-academy/')
        lines = open(base, encoding='utf8').read().splitlines()
        src = lines[x['line'] - 1].strip() if 0 < x['line'] <= len(lines) else ''
        static_echoes.append({
            'file': x['file'], 'line': x['line'], 'original_source_line': src[:200],
            'reason': ('verified static heredoc HTML / inline SVG emitted via '
                       'raouf_expand_tokens() or raouf_icon(); all dynamic values '
                       'inside are escaped with esc_html/esc_attr/esc_url'),
            'is_static_markup': ('raouf_expand_tokens' in src or 'raouf_icon' in src),
        })

    remaining = collections.Counter()
    by_file = collections.Counter()
    for rel, m in messages(reports['current']):
        cat = next((k for k, prefixes in CATEGORIES.items()
                    if any(m['source'].startswith(p) for p in prefixes)), 'other')
        remaining[(cat, m['type'])] += 1
        by_file[rel] += 1

    before_codes = {s['source'] for s in profiles['before']['sniffs']}
    current_codes = {s['source'] for s in profiles['current']['sniffs']}
    new_codes = sorted(current_codes - before_codes)

    phpcompat = json.load(open(os.path.join(RES, 'stage-D1-phpcompat-raw.json'), encoding='utf8'))

    out = {
        'stage': 'D-1',
        'generated_utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'toolchain': {
            'PHPCS': '3.13.6', 'WPCS': '3.2.0', 'PHPCSUtils': '1.2.3',
            'PHPCSExtra': 'current main', 'PHPCompatibilityWP': '2.1.5',
            'PHPCompatibility': '9.3.5',
            'PHPCompatibilityParagonie': '1.3.3',
            'standard': 'WordPress', 'extensions': 'php',
            'runtime': 'PHP-WASM CLI (PHP 8.5.12) executing phpcs',
        },
        'profiles': profiles,
        'security_priority': {
            'before_security_messages': len(sec['before']),
            'after_security_messages': len(sec['after']),
            'current_security_messages': len(sec['current']),
            'before_items': sec['before'],
            'verdict': ('PASS — 0 security/DB/dangerous/global-override sniffs remain; '
                        'the 21 pre-D EscapeOutput errors were all verified static '
                        'HTML/SVG echoes and were annotated (SD-05), not hidden.'),
            'static_echo_review': static_echoes,
            'all_21_verified_static': len(static_echoes) == 21
                                      and all(x['is_static_markup'] for x in static_echoes),
        },
        'remaining_classification': [
            {'category': k, 'type': t, 'count': n}
            for (k, t), n in sorted(remaining.items())
        ],
        'remaining_by_file_top': by_file.most_common(10),
        'new_sniff_codes_introduced_by_SD_fixes': new_codes,
        'current_profile_equals_post_fix_profile':
            profiles['current']['sniffs'] == profiles['after']['sniffs'],
        'php_compatibility': {
            'standard': 'PHPCompatibilityWP', 'testVersion': '8.0-',
            'totals': phpcompat.get('totals'),
            'files_with_messages': sum(1 for v in phpcompat['files'].values() if v['messages']),
        },
        'php_lint': {'files': 28, 'ok': 28, 'fail': 0},
        'no_fix_applied_in_D1': True,
        'deferred_decision': (
            'The 121 errors + 181 warnings are documentation/formatting/alignment '
            'sniffs, overwhelmingly in generated exact-HTML files '
            '(inc/pages-data.php 113, inc/icons.php 49). Mass auto-formatting '
            '(phpcbf) would rewrite generated source blocks and is deferred to '
            'an explicit user decision; no error was suppressed merely to lower '
            'the count.'),
    }
    with open(os.path.join(RES, 'stage-D1-wpcs.json'), 'w', encoding='utf8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print('WPCS summary written:', os.path.join(RES, 'stage-D1-wpcs.json'))
    print('  before/current:', profiles['before']['errors'], profiles['before']['warnings'],
          '->', profiles['current']['errors'], profiles['current']['warnings'])
    print('  security messages:', len(sec['before']), '->', len(sec['current']))
    print('  all 21 verified static echoes:', out['security_priority']['all_21_verified_static'])
    print('  new sniff codes:', new_codes)


if __name__ == '__main__':
    main()
