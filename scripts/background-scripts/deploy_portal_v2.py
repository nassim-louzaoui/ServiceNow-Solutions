#!/usr/bin/env python3
"""
Operations Intelligence Portal — v2 Deployment
Steps:
  1. Verify engine reachable
  2. Create 4 access roles (Leadership, Administrator, Developer, Creator)
  3. Create Operations Intelligence Theme (dark, no fixed header)
  4. Deploy oi-portal-app widget
  5. Update portal to use dark theme + chrome-hiding CSS
  6. Swap widget instance on oi_home page to the new widget
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error

# ── Config ────────────────────────────────────────────────────────────────────

def load_env():
    env_path = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
    if not os.path.exists(env_path):
        print('[FATAL] .env not found at', env_path)
        sys.exit(1)
    cfg = {}
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            k, v = line.split('=', 1)
            cfg[k.strip()] = v.strip().strip('"').strip("'")
    return cfg

env    = load_env()
HOST   = env.get('SNOW_INSTANCE', '').rstrip('/')
KEY    = env.get('ENGINE_KEY', '')
ENGINE = HOST + '/api/x_infte_ops_int/operations_intelligence_engine/v1'

HERE  = os.path.dirname(os.path.abspath(__file__))
REPO  = os.path.normpath(os.path.join(HERE, '..', '..'))
BUILD = os.path.join(REPO, 'build')

if not HOST or not KEY:
    print('[FATAL] SNOW_INSTANCE or ENGINE_KEY missing from .env')
    sys.exit(1)

# ── Engine helper ─────────────────────────────────────────────────────────────

def engine(payload):
    body = json.dumps(payload).encode()
    req  = urllib.request.Request(ENGINE, data=body, method='POST')
    req.add_header('Content-Type', 'application/json')
    req.add_header('X-Engine-Key', KEY)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            raw = json.loads(r.read())
            return raw.get('result', raw)
    except urllib.error.HTTPError as e:
        return {'ok': False, 'error': 'HTTP ' + str(e.code), 'body': e.read().decode(errors='replace')}
    except Exception as ex:
        return {'ok': False, 'error': str(ex)}

def ok(label, result, required=True):
    passed = bool(result.get('ok'))
    status = 'PASS' if passed else ('FAIL' if required else 'WARN')
    print(f'  [{status}] {label}')
    if not passed:
        err = result.get('error', '')
        if err:
            print(f'         {err}')
        bdy = result.get('body', '')
        if bdy:
            print(f'         {str(bdy)[:240]}')
    return passed

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

# ── STEP 1: Verify engine ──────────────────────────────────────────────────────

def verify_engine():
    print('\n[1] Verifying engine...')
    r = engine({'op': 'ping'})
    if not r.get('ok'):
        print('[FATAL] Engine unreachable — check SNOW_INSTANCE and ENGINE_KEY')
        sys.exit(1)
    print(f'  [PASS] Engine online ({r.get("instance", HOST)})')

# ── STEP 2: Create roles ──────────────────────────────────────────────────────

ROLES = [
    { 'name': 'x_infte_ops_int.leadership',    'description': 'Operations Intelligence — Leadership access for executive insights and KPI dashboards' },
    { 'name': 'x_infte_ops_int.administrator', 'description': 'Operations Intelligence — Full administrator access to all modules and settings' },
    { 'name': 'x_infte_ops_int.developer',     'description': 'Operations Intelligence — Developer access to application inventory and artifact management' },
    { 'name': 'x_infte_ops_int.creator',       'description': 'Operations Intelligence — Creator access for building and managing application artifacts' },
]

def create_roles():
    print('\n[2] Creating access roles...')
    for role in ROLES:
        r = engine({'op': 'artifact.role', 'data': role})
        ok(role['name'], r)
        time.sleep(0.3)

# ── STEP 3: Create dark theme ─────────────────────────────────────────────────

def create_theme():
    print('\n[3] Creating Operations Intelligence Theme...')
    r = engine({
        'op': 'artifact.sp_theme',
        'data': {
            'name':          'Operations Intelligence Theme',
            'fixed_header':  False,
            'navbar_inverse': False,
            'css_variables': (
                '$navbar-height: 0px;\n'
                '$footer-height: 0px;\n'
                '$brand-primary: #00BF6F;\n'
                '$body-bg: #F0F2F5;\n'
            )
        }
    })
    ok('Operations Intelligence Theme', r)
    return r.get('sys_id', '')

# ── STEP 4: Deploy widget ─────────────────────────────────────────────────────

def deploy_widget():
    print('\n[4] Deploying Operations Intelligence Portal Application widget...')
    widget_dir = os.path.join(BUILD, 'widgets', 'oi-portal-app')

    template      = read_file(os.path.join(widget_dir, 'template.html'))
    css           = read_file(os.path.join(widget_dir, 'css.css'))
    server_script = read_file(os.path.join(widget_dir, 'server-script.js'))
    client_script = read_file(os.path.join(widget_dir, 'client-script.js'))

    r = engine({
        'op': 'artifact.widget',
        'data': {
            'id':            'oi-portal-app',
            'name':          'Operations Intelligence Portal Application',
            'template':      template,
            'css':           css,
            'server_script': server_script,
            'client_script': client_script,
            'option_schema': json.dumps([
                {
                    'name':  'default_module',
                    'label': 'Default Module',
                    'hint':  'Starting module: operations|automations|agentic|creator|governance|leadership|developer|admin',
                    'type':  'string'
                }
            ])
        }
    })
    ok('oi-portal-app widget', r)
    return r.get('sys_id', '')

# ── STEP 5: Update portal theme ───────────────────────────────────────────────

PORTAL_CSS = (
    '.navbar.navbar-default,.navbar-fixed-top,header.navbar,#sp-nav,.sp-nav-v2,'
    '.sp-tabnav-root,footer.sp-footer,[id="sp-footer"],'
    '.sp-breadcrumb,.breadcrumb,.page-header,.nav-tabbar{display:none!important}'
    'body,body.sp-portal{padding-top:0!important;margin-top:0!important;background:#F0F2F5!important}'
)

def update_portal(theme_sys_id, page_sys_id=''):
    print('\n[5] Updating portal theme, CSS, and home page...')
    payload = {
        'op': 'artifact.sp_portal',
        'data': {
            'title':      'Operations Intelligence',
            'url_suffix': 'operations-intelligence',
            'css':        PORTAL_CSS
        }
    }
    if theme_sys_id:
        payload['data']['theme'] = theme_sys_id
    if page_sys_id:
        payload['data']['homepage'] = page_sys_id
    r = engine(payload)
    ok('Portal theme + CSS + homepage update', r)
    return r.get('sys_id', '')

# ── STEP 6: Swap widget instance on oi_home ───────────────────────────────────

def swap_widget_instance(new_widget_sys_id):
    print('\n[6] Swapping widget instance on oi_home page...')

    # 6a. Find operations_intelligence_home page
    r_page = engine({
        'op': 'artifact.sp_page',
        'data': {'id': 'operations_intelligence_home', 'title': 'Operations Intelligence Home', 'draft': False}
    })
    ok('sp_page operations_intelligence_home (locate/create)', r_page)
    page_sys_id = r_page.get('sys_id', '')
    if not page_sys_id:
        print('  [FAIL] Cannot proceed without page sys_id')
        return False

    # 6b. Find existing containers on this page
    r_con = engine({
        'op':            'record.query',
        'table':         'sp_container',
        'encoded_query': 'sp_page=' + page_sys_id,
        'fields':        ['sys_id', 'order'],
        'limit':         5,
        'platform':      True
    })
    con_records = r_con.get('records', [])
    col_sys_id  = ''

    if con_records:
        con_sys_id = con_records[0]['sys_id']
        print(f'    Found existing container: {con_sys_id}')

        r_row = engine({
            'op':            'record.query',
            'table':         'sp_row',
            'encoded_query': 'sp_container=' + con_sys_id,
            'fields':        ['sys_id'],
            'limit':         3,
            'platform':      True
        })
        row_records = r_row.get('records', [])
        if row_records:
            row_sys_id = row_records[0]['sys_id']
            print(f'    Found existing row: {row_sys_id}')

            r_col = engine({
                'op':            'record.query',
                'table':         'sp_column',
                'encoded_query': 'sp_row=' + row_sys_id,
                'fields':        ['sys_id'],
                'limit':         3,
                'platform':      True
            })
            col_records = r_col.get('records', [])
            if col_records:
                col_sys_id = col_records[0]['sys_id']
                print(f'    Found existing column: {col_sys_id}')

                # Delete existing sp_instance records on this column
                r_inst = engine({
                    'op':            'record.query',
                    'table':         'sp_instance',
                    'encoded_query': 'sp_column=' + col_sys_id,
                    'fields':        ['sys_id', 'sp_widget'],
                    'limit':         10,
                    'platform':      True
                })
                for inst in r_inst.get('records', []):
                    engine({
                        'op':      'record.delete',
                        'table':   'sp_instance',
                        'platform': True,
                        'data':    {'sys_id': inst['sys_id']}
                    })
                    print(f'    Removed old instance: {inst["sys_id"]}')

    # 6c. Create fresh structure if no column was found
    if not col_sys_id:
        print('    Creating new container/row/column structure...')

        r_c = engine({'op': 'artifact.sp_container', 'data': {'page_sys_id': page_sys_id, 'order': 100, 'width': 'container-fluid'}})
        if not ok('sp_container', r_c): return False
        new_con = r_c['sys_id']

        r_r = engine({'op': 'artifact.sp_row', 'data': {'container_sys_id': new_con, 'order': 100}})
        if not ok('sp_row', r_r): return False
        new_row = r_r['sys_id']

        r_col = engine({'op': 'artifact.sp_column', 'data': {'row_sys_id': new_row, 'order': 100, 'size_md': 12}})
        if not ok('sp_column', r_col): return False
        col_sys_id = r_col['sys_id']

    # 6d. Create new widget instance
    r_inst = engine({
        'op': 'artifact.sp_instance',
        'data': {
            'column_sys_id': col_sys_id,
            'widget_sys_id': new_widget_sys_id,
            'order':         100,
            'hide_title':    True
        }
    })
    ok('sp_instance (oi-portal-app on oi_home)', r_inst)
    return page_sys_id if r_inst.get('ok') else False

# ── MAIN ──────────────────────────────────────────────────────────────────────

def main():
    print('=' * 62)
    print('Operations Intelligence Portal — v2 Deployment')
    print(f'Instance: {HOST}')
    print('=' * 62)

    verify_engine()
    create_roles()

    theme_id  = create_theme()
    widget_id = deploy_widget()

    if not widget_id:
        print('\n[FATAL] Widget deploy failed — cannot wire up portal')
        sys.exit(1)

    page_id = swap_widget_instance(widget_id)
    update_portal(theme_id, page_id if isinstance(page_id, str) and len(page_id) == 32 else '')

    print('\n' + '=' * 62)
    print('Deployment complete.')
    print(f'Portal: {HOST}/operations-intelligence')
    print('=' * 62)

if __name__ == '__main__':
    main()
