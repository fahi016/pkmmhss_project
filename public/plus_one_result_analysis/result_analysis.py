# ═══════════════════════════════════════════════════════════════════════
#  PKMMHSS EDARIKODE — PLUS ONE RESULT ANALYSIS 2026
#  Run this file → PDF is saved in the same folder as this script
#  Required file : plus_one_result.xlsx  (same folder as this script)
#  Excel columns : school, regno, group, name,
#                  subject1, ce1, te1, total1, ... subject6, ce6, te6, total6
# ═══════════════════════════════════════════════════════════════════════

import subprocess, sys, os

def install(pkg):
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', pkg, '-q'])

try:
    import pandas as pd
except ImportError:
    print("Installing pandas..."); install('pandas'); import pandas as pd

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas as rl_canvas
except ImportError:
    print("Installing reportlab..."); install('reportlab')
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas as rl_canvas

# ── Paths ─────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
XLSX_PATH  = os.path.join(SCRIPT_DIR,'result.xlsx')
if not os.path.exists(XLSX_PATH):
    print(f"\n❌  ERROR: Could not find the Excel file at:\n   {XLSX_PATH}")
    print("   Make sure 'plus_one_result.xlsx' is in the same folder as this script.\n")
    sys.exit(1)

# Division list (regno, name, division) — same folder as this script.
# Expected columns (case-insensitive): REG_NO, NAME, DIVISION
DIVISION_XLSX_PATH = os.path.join(SCRIPT_DIR, 'division.xlsx')

# ── Load data ─────────────────────────────────────────────────────────
print("Loading data...")
_df = pd.read_excel(XLSX_PATH, header=None, dtype=str, skiprows=1)

_cols = ['school', 'regno', 'group', 'name']
for _i in range(1, 7):
    _cols += [f's{_i}_sub', f's{_i}_ce', f's{_i}_te', f's{_i}_total']
_df.columns = _cols

for _c in _df.columns:
    _df[_c] = _df[_c].astype(str).str.strip()

# ── Load division list and merge into main data ────────────────────────
import re as _re

def _norm_name(n):
    n = str(n).upper()
    n = _re.sub(r'[.,]', ' ', n)
    n = _re.sub(r'\s+', ' ', n).strip()
    return n

_df['division'] = ''

if os.path.exists(DIVISION_XLSX_PATH):
    _div_df = pd.read_excel(DIVISION_XLSX_PATH, dtype=str)
    _div_df.columns = [str(c).strip().upper() for c in _div_df.columns]
    _regno_col = next((c for c in _div_df.columns if 'REG' in c), None)
    _name_col  = next((c for c in _div_df.columns if c == 'NAME'), None)
    _divn_col  = next((c for c in _div_df.columns if 'DIVISION' in c), None)

    if _divn_col is None:
        print("⚠️  WARNING: 'division.xlsx' found but no DIVISION column detected — skipping division merge.")
    else:
        _div_df[_divn_col] = _div_df[_divn_col].astype(str).str.strip()

        # Map by REG_NO first (preferred, exact key)
        _regno_map = {}
        if _regno_col is not None:
            _div_df['_regno_clean'] = _div_df[_regno_col].astype(str).str.strip()
            _regno_map = dict(zip(_div_df['_regno_clean'], _div_df[_divn_col]))

        # Fallback map by normalized name
        _name_map = {}
        if _name_col is not None:
            _div_df['_name_norm'] = _div_df[_name_col].apply(_norm_name)
            _name_map = dict(zip(_div_df['_name_norm'], _div_df[_divn_col]))

        def _lookup_division(row):
            regno = str(row['regno']).strip()
            if regno in _regno_map:
                return _regno_map[regno]
            nn = _norm_name(row['name'])
            if nn in _name_map:
                return _name_map[nn]
            return ''

        _df['division'] = _df.apply(_lookup_division, axis=1)

    _matched   = int((_df['division'] != '').sum())
    _unmatched = int((_df['division'] == '').sum())
    print(f"Division merge: {_matched} matched, {_unmatched} unmatched (of {len(_df)} students).")
else:
    print(f"⚠️  WARNING: Division file not found at {DIVISION_XLSX_PATH} — Division column will be blank.")

# ── Derive school name and exam year from data ────────────────────────
_raw_school = _df['school'].iloc[0]
_school_parts = [p.strip() for p in _raw_school.split(',')]
SCHOOL_NAME  = ', '.join(_school_parts[:2]) if len(_school_parts) >= 2 else _raw_school
SCHOOL_SHORT = _school_parts[0]   # e.g. "PKMM HSS"

EXAM_YEAR = '2026'

PDF_TITLE    = f'PLUS ONE RESULT-{EXAM_YEAR}'
PDF_SUBTITLE = f'{SCHOOL_NAME}  |  PLUS ONE RESULT {EXAM_YEAR}'
PDF_FOOTER   = f'{SCHOOL_SHORT} Result Analysis {EXAM_YEAR} — Plus One - By HB'
PDF_PATH     = os.path.join(SCRIPT_DIR, f'{SCHOOL_SHORT.replace(" ","_")}_PlusOne_Result_{EXAM_YEAR}.pdf')

# ── Max marks per subject ─────────────────────────────────────────────
# TE out of 60 (practical): Physics, Chemistry, Biology, Computer Science,
#                            Mathematics (Science), Computer Application,
#                            Accountancy with Computer Accounting
# TE out of 80 (theory):    English, Second Language, History, Economics,
#                            Political Science, Sociology, Business Studies
# CE is always 20 for all subjects.
# Total max = CE(20) + TE(60 or 80) = 80 or 100

_TE60_SUBS = {
    'PHYSICS', 'CHEMISTRY', 'BIOLOGY',
    'COMPUTER SCIENCE', 'MATHEMATICS',
    'COMPUTER APPLICATION',
    'ACCOUNTANCY',
}

def _te_max(sub_name):
    su = sub_name.upper().strip()
    return 60 if any(key in su for key in _TE60_SUBS) else 80

def _total_max(sub_name):
    su = sub_name.upper().strip()
    return 80 if any(key in su for key in _TE60_SUBS) else 100

# ── Grade based on total marks (including any grace) out of total max ─
# Fail criteria: (total - CE) < 30% of TE_max
#   → uses actual total from Excel so external grace marks are included
# Grade is determined by total / (CE_max + TE_max) * 100
# Grade bands: A+(≥90%), A(≥80%), B+(≥70%), B(≥60%), C+(≥50%),
#              C(≥40%), D+(≥30%), D(≥20%), E(<20%)

def _pct_to_grade(pct):
    if   pct >= 90: return 'A+'
    elif pct >= 80: return 'A'
    elif pct >= 70: return 'B+'
    elif pct >= 60: return 'B'
    elif pct >= 50: return 'C+'
    elif pct >= 40: return 'C'
    elif pct >= 30: return 'D+'
    elif pct >= 20: return 'D'
    else:           return 'E'

def _te_grade(te_val, sub_name):
    """NOT used for pass/fail anymore — kept for backward compatibility."""
    try:
        t  = int(float(te_val))
        mx = _te_max(sub_name)
        return _pct_to_grade(t / mx * 100)
    except:
        return 'E'

def _total_grade(total_val, sub_name):
    """Grade based on actual total (incl. grace) as % of total max."""
    try:
        t  = int(float(total_val))
        mx = _total_max(sub_name)
        return _pct_to_grade(t / mx * 100)
    except:
        return 'E'

def _is_failed_subject(ce_val, total_val, sub_name):
    """Fail if (total - CE) < 30% of TE_max. Handles grace marks correctly."""
    try:
        ce    = int(float(ce_val))
        total = int(float(total_val))
        te_obtained = total - ce          # effective TE (may include grace)
        te_max_val  = _te_max(sub_name)
        return te_obtained < 0.30 * te_max_val
    except:
        return True   # treat missing/invalid as fail

_FAIL_GRADES = {'D', 'E'}

for _i in range(1, 7):
    _df[f's{_i}_te_grade']    = _df.apply(lambda r, i=_i: _te_grade(r[f's{i}_te'], r[f's{i}_sub']), axis=1)
    _df[f's{_i}_total_grade'] = _df.apply(lambda r, i=_i: _total_grade(r[f's{i}_total'], r[f's{i}_sub']), axis=1)
    _df[f's{_i}_failed']      = _df.apply(lambda r, i=_i: _is_failed_subject(r[f's{i}_ce'], r[f's{i}_total'], r[f's{i}_sub']), axis=1)

_TE_GC    = [f's{i}_te_grade'    for i in range(1, 7)]
_TOT_GC   = [f's{i}_total_grade' for i in range(1, 7)]
_TC       = [f's{i}_total'       for i in range(1, 7)]
_FAIL_COL = [f's{i}_failed'      for i in range(1, 7)]

def _subgroup(row):
    if row['group'] == 'SCIENCE':
        return 'COMPUTER SCIENCE' if row['s5_sub'] == 'COMPUTER SCIENCE' else 'BIO SCIENCE'
    return row['group']

_df['SubGroup']    = _df.apply(_subgroup, axis=1)

# Fail = any subject where (total - CE) < 30% of TE_max
_df['Failed']      = _df[_FAIL_COL].any(axis=1)

# A+ count based on total marks grade
_df['APlus_Count'] = _df[_TOT_GC].apply(lambda r: sum(1 for g in r if g == 'A+'), axis=1)
_df['TotalMarks']  = _df[_TC].apply(
    lambda r: sum(int(float(x)) for x in r if str(x).replace('.','').isdigit()), axis=1
)

total   = len(_df)
ehs     = int((~_df['Failed']).sum())
nhs     = int(_df['Failed'].sum())
pct     = round(ehs / total * 100, 2)
full_ap = int((_df['APlus_Count'] == 6).sum())
five_ap = int((_df['APlus_Count'] == 5).sum())
four_ap = int((_df['APlus_Count'] == 4).sum())

_groups = ['BIO SCIENCE', 'COMPUTER SCIENCE', 'HUMANITIES', 'COMMERCE']
gw = []
for _g in _groups:
    _s   = _df[_df['SubGroup'] == _g]
    _att = len(_s)
    _e   = int((~_s['Failed']).sum())
    _n   = int(_s['Failed'].sum())
    _fa  = int((_s['APlus_Count'] == 6).sum())
    _5ap = int((_s['APlus_Count'] == 5).sum())
    _4ap = int((_s['APlus_Count'] == 4).sum())
    _p   = round(_e / _att * 100, 2) if _att > 0 else 0.0
    gw.append({'group': _g, 'attended': _att, 'ehs': _e, 'nhs': _n,
               'full_ap': _fa, 'five_ap': _5ap, 'four_ap': _4ap, 'pct': _p})

def short_group(g):
    return 'COMP SCIENCE' if g == 'COMPUTER SCIENCE' else g

def short_subject(s):
    su = s.upper()
    if 'BUSINESS STUDIES' in su:     return 'BUSINESS STUDIES'
    if 'ACCOUNTANCY' in su:           return 'ACCOUNTANCY'
    if 'COMPUTER APPLICATION' in su:  return 'COMPUTER APPLICATION'
    return s

# Failed students list — show which subjects failed in TE
failed_list = []
for _, _r in _df[_df['Failed']].iterrows():
    _fails = []
    for _i in range(1, 7):
        if _r[f's{_i}_failed']:
            _fails.append(short_subject(_r[f's{_i}_sub']))
    failed_list.append({
        'regno':    _r['regno'],
        'name':     _r['name'],
        'division': _r['division'] or '-',
        'group':    short_group(_r['SubGroup']),
        'subjects': ', '.join(_fails)
    })

def _rank_sort(df):
    """Sort so passed students come first (by TotalMarks desc), then failed
    students at the bottom (also by TotalMarks desc among themselves)."""
    return df.sort_values(['Failed', 'TotalMarks'], ascending=[True, False])

def get_top10(group_name):
    sub = _df[_df['SubGroup'] == group_name].copy()
    return _rank_sort(sub).head(10).reset_index(drop=True)

def get_aplus_group(group_name, aplus_count):
    sub = _df[(_df['SubGroup'] == group_name) & (_df['APlus_Count'] == aplus_count)].copy()
    return _rank_sort(sub).reset_index(drop=True)

def get_ranklist(group_name):
    sub = _df[_df['SubGroup'] == group_name].copy()
    return _rank_sort(sub).reset_index(drop=True)

def get_class_ranklist(division_name):
    """All students in a given division (class), across all groups, ranked by total marks."""
    sub = _df[_df['division'] == division_name].copy()
    return _rank_sort(sub).reset_index(drop=True)

# Divisions present in the data, sorted naturally (S1, S2, ... S10, ...)
def _division_sort_key(d):
    m = _re.match(r'^([A-Za-z]*)(\d+)$', str(d))
    if m:
        return (m.group(1), int(m.group(2)))
    return (str(d), 0)

_DIVISIONS = sorted(
    [d for d in _df['division'].unique() if str(d).strip() != ''],
    key=_division_sort_key
)

# ── PDF canvas setup ──────────────────────────────────────────────────
W, H = A4
M    = 18 * mm
cv   = rl_canvas.Canvas(PDF_PATH, pagesize=A4)

# ── Drawing helpers ───────────────────────────────────────────────────
def hline(y, x1=M, x2=W - M, lw=0.5):
    cv.setLineWidth(lw)
    cv.line(x1, y, x2, y)

def centered(text, y, size=12, bold=False):
    cv.setFont('Helvetica-Bold' if bold else 'Helvetica', size)
    cv.drawCentredString(W / 2, y, text)

def left(text, x, y, size=10, bold=False):
    cv.setFont('Helvetica-Bold' if bold else 'Helvetica', size)
    cv.drawString(x, y, text)

def right(text, x, y, size=10, bold=False):
    cv.setFont('Helvetica-Bold' if bold else 'Helvetica', size)
    cv.drawRightString(x, y, text)

def fit_text(text, x, y, max_width, size=10, bold=False):
    font = 'Helvetica-Bold' if bold else 'Helvetica'
    while size >= 5:
        cv.setFont(font, size)
        if cv.stringWidth(text, font, size) <= max_width:
            break
        size -= 0.5
    cv.drawString(x, y, text)

def page_border():
    cv.setLineWidth(1.5)
    cv.rect(M - 2*mm, M - 2*mm, W - 2*(M - 2*mm), H - 2*(M - 2*mm))

def page_header(subtitle=None):
    y = H - M
    y -= 12*mm; centered(PDF_TITLE, y, size=16, bold=True)
    y -= 7*mm;  centered(SCHOOL_NAME, y, size=11)
    if subtitle:
        y -= 6*mm; centered(subtitle, y, size=12, bold=True)
    y -= 5*mm;  hline(y, lw=1.2)
    return y

def page_footer():
    cv.setFont('Helvetica', 7)
    cv.setFillColor(colors.grey)
    cv.drawCentredString(W / 2, M - 5*mm, PDF_FOOTER)
    cv.setFillColor(colors.black)

# ════════════════════════════════════════════════════════════════════
# PAGE 1 — ANALYSIS SUMMARY
# ════════════════════════════════════════════════════════════════════
page_border()
y = page_header()

y -= 9*mm
centered('Total Result of the School', y, size=13, bold=True)
tw = cv.stringWidth('Total Result of the School', 'Helvetica-Bold', 13)
cv.setLineWidth(0.8)
cv.line(W/2 - tw/2, y - 1*mm, W/2 + tw/2, y - 1*mm)

def stat_row(label, value, ypos, bold_label=False):
    max_label_w = (W - 2*M) * 0.78
    fit_text(label, M + 5*mm, ypos, max_label_w, size=10, bold=bold_label)
    right(str(value), W - M - 5*mm, ypos, size=10, bold=True)

y -= 11*mm; stat_row('Total Students Registered for HSE First Year Exam', total, y)
y -= 8*mm;  stat_row('No. of Students Eligible For Higher Studies (Pass)', ehs, y)
y -= 8*mm;  stat_row('No. of Students Not Eligible For Higher Studies (Fail)', nhs, y)
y -= 8*mm;  stat_row('Percentage of Pass', f'{pct}%', y)
y -= 9*mm;  stat_row('Number of Full A+ Students', full_ap, y, bold_label=True)
y -= 7*mm;  stat_row('Number of 5 A+ Students', five_ap, y)
y -= 7*mm;  stat_row('No. of 4 A+ Students', four_ap, y)

# Groupwise table
y -= 10*mm
centered('Groupwise Result', y, size=13, bold=True)
tw2 = cv.stringWidth('Groupwise Result', 'Helvetica-Bold', 13)
cv.line(W/2 - tw2/2, y - 1*mm, W/2 + tw2/2, y - 1*mm)

y -= 7*mm
cx    = [M, M+52*mm, M+70*mm, M+86*mm, M+100*mm, M+114*mm, M+128*mm, M+143*mm, W-M]
row_h = 8*mm
tbl_top = y + row_h * 0.6

def draw_row(ypos, vals, col_xs, bg=None, bold=False):
    if bg:
        cv.setFillColor(bg)
        cv.rect(M, ypos - row_h*0.4, W - 2*M, row_h, fill=1, stroke=0)
        cv.setFillColor(colors.black)
    col0_max = col_xs[1] - col_xs[0] - 4*mm
    fit_text(str(vals[0]), col_xs[0] + 2*mm, ypos, col0_max, size=9, bold=bold)
    cv.setFont('Helvetica-Bold' if bold else 'Helvetica', 9)
    for i in range(1, len(vals)):
        xc = (col_xs[i] + col_xs[i+1]) / 2
        cv.drawCentredString(xc, ypos, str(vals[i]))
    hline(ypos - row_h*0.4, lw=0.3)

draw_row(y, ['Group','Attended','Pass','Fail','Full A+','5A+','4A+','Percentage'],
         cx, bg=colors.HexColor('#D0D0D0'), bold=True)
hline(y + row_h*0.6, lw=0.8)
y -= row_h

for i, row in enumerate(gw):
    bg = colors.HexColor('#F7F7F7') if i % 2 == 0 else colors.white
    draw_row(y, [short_group(row['group']), row['attended'], row['ehs'], row['nhs'],
                 row['full_ap'], row['five_ap'], row['four_ap'], f"{row['pct']}%"], cx, bg=bg)
    y -= row_h

draw_row(y, ['TOTAL', total, ehs, nhs, full_ap, five_ap, four_ap, f'{pct}%'],
         cx, bg=colors.HexColor('#D0D0D0'), bold=True)
tbl_bottom = y - row_h * 0.4
y -= row_h

cv.setLineWidth(0.8)
cv.rect(M, tbl_bottom, W - 2*M, tbl_top - tbl_bottom, stroke=1, fill=0)
for _x in cx:
    cv.line(_x, tbl_bottom, _x, tbl_top)

y -= 4*mm
right('*Absent treated as Fail.', W - M - 2*mm, y, size=7)

# Failed students table
y -= 9*mm
left('List of Failed Students :', M + 2*mm, y, size=10, bold=True)
y -= 7*mm

fl_cols  = [M, M+10*mm, M+38*mm, M+82*mm, M+96*mm, M+124*mm, W-M]
frow_h   = 7.5*mm
ftop     = y + frow_h * 0.6
first_pg = True

def _draw_failed_header(ypos):
    cv.setFillColor(colors.HexColor('#D0D0D0'))
    cv.rect(M, ypos - frow_h*0.4, W - 2*M, frow_h, fill=1, stroke=0)
    cv.setFillColor(colors.black)
    cv.setFont('Helvetica-Bold', 9)
    for ii, h in enumerate(['#', 'Reg No', 'Name', 'Div', 'Group', 'Subject(s) Failed']):
        cv.drawCentredString((fl_cols[ii]+fl_cols[ii+1])/2, ypos, h)
    hline(ypos + frow_h*0.6, lw=0.8)
    hline(ypos - frow_h*0.4, lw=0.5)

_draw_failed_header(y)
y -= frow_h

for i, f in enumerate(failed_list):
    if y - frow_h * 0.4 < M + 12*mm:
        fbottom = y + frow_h - frow_h*0.4
        cv.setLineWidth(0.8)
        cv.rect(M, fbottom, W - 2*M, ftop - fbottom, stroke=1, fill=0)
        for _x in fl_cols:
            cv.line(_x, fbottom, _x, ftop)
        page_footer()
        cv.showPage()
        page_border()
        y = page_header('List of Failed Students (contd.)')
        y -= 7*mm
        ftop = y + frow_h * 0.6
        _draw_failed_header(y)
        y -= frow_h

    bg = colors.HexColor('#FFF0F0') if i % 2 == 0 else colors.white
    cv.setFillColor(bg)
    cv.rect(M, y - frow_h*0.4, W - 2*M, frow_h, fill=1, stroke=0)
    cv.setFillColor(colors.black)
    cv.setFont('Helvetica', 9)
    cv.drawCentredString((fl_cols[0]+fl_cols[1])/2, y, str(i + 1))
    cv.drawString(fl_cols[1] + 2*mm, y, f['regno'])
    fit_text(f['name'], fl_cols[2] + 2*mm, y, fl_cols[3]-fl_cols[2]-4*mm, size=9)
    cv.drawCentredString((fl_cols[3]+fl_cols[4])/2, y, f['division'])
    cv.drawString(fl_cols[4] + 2*mm, y, f['group'])
    fit_text(f['subjects'], fl_cols[5] + 2*mm, y, fl_cols[6]-fl_cols[5]-4*mm, size=9)
    hline(y - frow_h*0.4, lw=0.3)
    y -= frow_h

fbottom = y + frow_h - frow_h*0.4
cv.setLineWidth(0.8)
cv.rect(M, fbottom, W - 2*M, ftop - fbottom, stroke=1, fill=0)
for _x in fl_cols:
    cv.line(_x, fbottom, _x, ftop)

page_footer()

# ════════════════════════════════════════════════════════════════════
# SUBJECT ABBREVIATIONS
# ════════════════════════════════════════════════════════════════════
SUBJECT_SHORT = {
    'ENGLISH':                                       'ENG',
    'MALAYALAM':                                     'MAL',
    'ARABIC':                                        'ARB',
    'HINDI':                                         'HIN',
    'URUDU':                                         'URD',
    'PHYSICS':                                       'PHY',
    'CHEMISTRY':                                     'CHE',
    'BIOLOGY':                                       'BIO',
    'MATHEMATICS':                                   'MAT',
    'COMPUTER SCIENCE':                              'CS',
    'HISTORY':                                       'HIS',
    'ECONOMICS':                                     'ECO',
    'POLITICAL SCIENCE':                             'POL',
    'SOCIOLOGY':                                     'SOC',
    'COMPUTER APPLICATION':                          'CA',
    'ACCOUNTANCY':          'ACC',
    'ACCOUNTANCY' :                          'ACC',
    'BUSINESS STUDIES': 'BST',
    'BUSINESS STUDIES':  'BST',
    'ISLAMIC HISTORY':                               'ISH',
}

def shorten_subject(s):
    su = s.upper().strip()
    for key, abbr in SUBJECT_SHORT.items():
        if key in su:
            return abbr
    return su[:4]


# ════════════════════════════════════════════════════════════════════
# SHARED TABLE HELPERS
# ════════════════════════════════════════════════════════════════════
def _col_setup():
    usable_w   = W - 2*M
    # #, Reg No, Name, Div, sub1..sub6, Total, %
    col_widths = [10*mm, 20*mm, 44*mm, 13*mm, 14*mm, 14*mm, 14*mm, 14*mm, 14*mm, 14*mm, 16*mm, 14*mm]
    scale      = usable_w / sum(col_widths)
    col_widths = [w * scale for w in col_widths]
    col_x = [M]
    for w in col_widths:
        col_x.append(col_x[-1] + w)
    return col_x, usable_w

def _col_setup_class():
    """Column layout for division/class rank lists (no per-subject columns,
    since a division mixes students from different groups with different subjects)."""
    usable_w   = W - 2*M
    # #, Reg No, Name, Group, Total, %, Result
    col_widths = [10*mm, 22*mm, 66*mm, 30*mm, 18*mm, 16*mm, 18*mm]
    scale      = usable_w / sum(col_widths)
    col_widths = [w * scale for w in col_widths]
    col_x = [M]
    for w in col_widths:
        col_x.append(col_x[-1] + w)
    return col_x, usable_w

def _draw_table_row(cv, ypos, vals, col_x, row_h, usable_w,
                    bg=None, bold=False, text_color=colors.black):
    if bg:
        cv.setFillColor(bg)
        cv.rect(M, ypos - row_h*0.38, usable_w, row_h, fill=1, stroke=0)
    cv.setFillColor(text_color)
    for i, val in enumerate(vals):
        cell_center_x = (col_x[i] + col_x[i+1]) / 2
        cell_w        = col_x[i+1] - col_x[i] - 2*mm
        font = 'Helvetica-Bold' if bold else 'Helvetica'
        sz   = 8.5
        while sz >= 5:
            cv.setFont(font, sz)
            if cv.stringWidth(str(val), font, sz) <= cell_w:
                break
            sz -= 0.4
        if i == 2:
            cv.drawString(col_x[i] + 1.5*mm, ypos, str(val))
        else:
            cv.drawCentredString(cell_center_x, ypos, str(val))
    cv.setFillColor(colors.black)
    hline(ypos - row_h*0.38, lw=0.25)

def _close_table_box(col_x, usable_w, tbl_top, y, row_h):
    tbl_bottom = y + row_h - row_h*0.38
    cv.setLineWidth(0.8)
    cv.rect(M, tbl_bottom, usable_w, tbl_top - tbl_bottom, stroke=1, fill=0)
    for _x in col_x:
        cv.setLineWidth(0.4)
        cv.line(_x, tbl_bottom, _x, tbl_top)

def _start_student_page(title_line, subtitle_line, col_x, usable_w, row_h, headers):
    cv.showPage()
    page_border()
    y = H - M
    y -= 12*mm
    cv.setFont('Helvetica-Bold', 16)
    cv.drawCentredString(W / 2, y, title_line)
    y -= 6*mm
    cv.setFont('Helvetica', 11)
    cv.drawCentredString(W / 2, y, subtitle_line)
    y -= 5*mm
    hline(y, lw=1.2)
    y -= 10*mm
    tbl_top = y + row_h*0.65
    _draw_table_row(cv, y, headers, col_x, row_h, usable_w,
                    bg=colors.HexColor('#000000'), bold=True, text_color=colors.white)
    hline(y + row_h*0.65, lw=1.0)
    y -= row_h
    return y, tbl_top


# ════════════════════════════════════════════════════════════════════
# TOP 10 PAGE
# ════════════════════════════════════════════════════════════════════
def draw_top10_page(group_name):
    top10 = get_top10(group_name)
    if top10.empty:
        return
    col_x, usable_w = _col_setup()
    row_h   = 8.5*mm
    sub_abbrs = [shorten_subject(str(top10.iloc[0][f's{i}_sub'])) for i in range(1, 7)]; sub_abbrs[1] = 'SL'
    headers   = ['#', 'Reg No', 'Name', 'Div'] + sub_abbrs + ['Total', '%']
    title     = f'TOP 10 STUDENTS — {group_name}'
    subtitle  = PDF_SUBTITLE
    y, tbl_top = _start_student_page(title, subtitle, col_x, usable_w, row_h, headers)

    for rank, (_, row) in enumerate(top10.iterrows(), start=1):
        bg    = colors.HexColor('#F7F7F7') if rank % 2 == 1 else colors.white
        marks   = [int(float(row[f's{j}_total'])) if str(row[f's{j}_total']).replace('.','').isdigit() else 0
                   for j in range(1, 7)]
        max_tot = sum(_total_max(row[f's{j}_sub']) for j in range(1, 7))
        tot     = sum(marks)
        pct_val = round(tot / max_tot * 100, 2)
        vals    = [rank, row['regno'], row['name'].title(), row['division'] or '-'] + marks + [tot, f'{pct_val}%']
        _draw_table_row(cv, y, vals, col_x, row_h, usable_w, bg=bg)
        y -= row_h

    _close_table_box(col_x, usable_w, tbl_top, y, row_h)
    page_footer()


# ════════════════════════════════════════════════════════════════════
# A+ STUDENTS PAGINATED PAGE
# ════════════════════════════════════════════════════════════════════
def draw_aplus_page(group_name, aplus_count):
    grp_df = get_aplus_group(group_name, aplus_count)
    if grp_df.empty:
        return
    col_x, usable_w = _col_setup()
    row_h   = 8.5*mm
    Y_LIMIT = M + 12*mm
    sub_abbrs = [shorten_subject(str(grp_df.iloc[0][f's{i}_sub'])) for i in range(1, 7)]; sub_abbrs[1] = 'SL'
    headers   = ['#', 'Reg No', 'Name', 'Div'] + sub_abbrs + ['Total', '%']
    page_title = f'FULL A+ STUDENTS — {group_name}' if aplus_count == 6 else f'{aplus_count} A+ STUDENTS — {group_name}'
    subtitle   = PDF_SUBTITLE

    y, tbl_top = _start_student_page(page_title, subtitle, col_x, usable_w, row_h, headers)

    for rank, (_, row) in enumerate(grp_df.iterrows(), start=1):
        if y - row_h*0.38 < Y_LIMIT:
            _close_table_box(col_x, usable_w, tbl_top, y, row_h)
            page_footer()
            y, tbl_top = _start_student_page(
                page_title + ' (contd.)', subtitle, col_x, usable_w, row_h, headers)

        bg    = colors.HexColor('#F7F7F7') if rank % 2 == 1 else colors.white
        marks   = [int(float(row[f's{j}_total'])) if str(row[f's{j}_total']).replace('.','').isdigit() else 0
                   for j in range(1, 7)]
        max_tot = sum(_total_max(row[f's{j}_sub']) for j in range(1, 7))
        tot     = sum(marks)
        pct_val = round(tot / max_tot * 100, 2)
        vals    = [rank, row['regno'], row['name'].title(), row['division'] or '-'] + marks + [tot, f'{pct_val}%']
        _draw_table_row(cv, y, vals, col_x, row_h, usable_w, bg=bg)
        y -= row_h

    _close_table_box(col_x, usable_w, tbl_top, y, row_h)
    page_footer()


# ════════════════════════════════════════════════════════════════════
# RANKLIST PAGE (all students, sorted by total marks)
# ════════════════════════════════════════════════════════════════════
def draw_ranklist_page(group_name):
    rl_df = get_ranklist(group_name)
    if rl_df.empty:
        return
    col_x, usable_w = _col_setup()
    row_h   = 7.5*mm   # slightly smaller to fit more rows per page
    Y_LIMIT = M + 12*mm
    sub_abbrs = [shorten_subject(str(rl_df.iloc[0][f's{i}_sub'])) for i in range(1, 7)]; sub_abbrs[1] = 'SL'
    headers   = ['#', 'Reg No', 'Name', 'Div'] + sub_abbrs + ['Total', '%']
    page_title = f'RANK LIST — {group_name}'
    subtitle   = PDF_SUBTITLE

    y, tbl_top = _start_student_page(page_title, subtitle, col_x, usable_w, row_h, headers)

    for rank, (_, row) in enumerate(rl_df.iterrows(), start=1):
        if y - row_h*0.38 < Y_LIMIT:
            _close_table_box(col_x, usable_w, tbl_top, y, row_h)
            page_footer()
            y, tbl_top = _start_student_page(
                page_title + ' (contd.)', subtitle, col_x, usable_w, row_h, headers)

        # Row background — red tint for failed students, alternating grey otherwise
        if row['Failed']:
            bg = colors.HexColor('#FFE8E8') if rank % 2 == 1 else colors.HexColor('#FFF0F0')
        else:
            bg = colors.HexColor('#F7F7F7') if rank % 2 == 1 else colors.white

        marks   = [int(float(row[f's{j}_total'])) if str(row[f's{j}_total']).replace('.','').isdigit() else 0
                   for j in range(1, 7)]
        max_tot = sum(_total_max(row[f's{j}_sub']) for j in range(1, 7))
        tot     = sum(marks)
        pct_val = round(tot / max_tot * 100, 2)
        vals    = [rank, row['regno'], row['name'].title(), row['division'] or '-'] + marks + [tot, f'{pct_val}%']

        # Draw row background
        cv.setFillColor(bg)
        cv.rect(M, y - row_h*0.38, usable_w, row_h, fill=1, stroke=0)

        # Highlight each failed subject cell in red
        failed_sub_indices = [j - 1 for j in range(1, 7)
                              if row[f's{j}_failed']]
        for fsi in failed_sub_indices:
            cell_col = 4 + fsi   # cols: 0=#, 1=regno, 2=name, 3=div, 4..9=subjects
            cv.setFillColor(colors.HexColor('#FF4444'))
            cv.rect(col_x[cell_col], y - row_h*0.38,
                    col_x[cell_col+1] - col_x[cell_col], row_h, fill=1, stroke=0)

        # Draw text for all cells
        cv.setFillColor(colors.black)
        for i, val in enumerate(vals):
            # Use white text on red failed cells for readability
            if (i - 4) in failed_sub_indices:
                cv.setFillColor(colors.white)
            else:
                cv.setFillColor(colors.black)
            cell_center_x = (col_x[i] + col_x[i+1]) / 2
            cell_w        = col_x[i+1] - col_x[i] - 2*mm
            sz = 8.5
            while sz >= 5:
                cv.setFont('Helvetica', sz)
                if cv.stringWidth(str(val), 'Helvetica', sz) <= cell_w:
                    break
                sz -= 0.4
            if i == 2:
                cv.drawString(col_x[i] + 1.5*mm, y, str(val))
            else:
                cv.drawCentredString(cell_center_x, y, str(val))

        cv.setFillColor(colors.black)
        hline(y - row_h*0.38, lw=0.25)
        y -= row_h

    _close_table_box(col_x, usable_w, tbl_top, y, row_h)
    page_footer()


# ════════════════════════════════════════════════════════════════════
# CLASS (DIVISION) RANK LIST PAGE — S1, S2, S3 ... (all groups mixed)
# ════════════════════════════════════════════════════════════════════
def draw_class_ranklist_page(division_name):
    cl_df = get_class_ranklist(division_name)
    if cl_df.empty:
        return
    col_x, usable_w = _col_setup_class()
    row_h   = 7.5*mm
    Y_LIMIT = M + 12*mm
    headers    = ['#', 'Reg No', 'Name', 'Group', 'Total', '%', 'Result']
    page_title = f'CLASS RANK LIST — {division_name}'
    subtitle   = PDF_SUBTITLE

    y, tbl_top = _start_student_page(page_title, subtitle, col_x, usable_w, row_h, headers)

    for rank, (_, row) in enumerate(cl_df.iterrows(), start=1):
        if y - row_h*0.38 < Y_LIMIT:
            _close_table_box(col_x, usable_w, tbl_top, y, row_h)
            page_footer()
            y, tbl_top = _start_student_page(
                page_title + ' (contd.)', subtitle, col_x, usable_w, row_h, headers)

        if row['Failed']:
            bg = colors.HexColor('#FFE8E8') if rank % 2 == 1 else colors.HexColor('#FFF0F0')
        else:
            bg = colors.HexColor('#F7F7F7') if rank % 2 == 1 else colors.white

        marks   = [int(float(row[f's{j}_total'])) if str(row[f's{j}_total']).replace('.','').isdigit() else 0
                   for j in range(1, 7)]
        max_tot = sum(_total_max(row[f's{j}_sub']) for j in range(1, 7))
        tot     = sum(marks)
        pct_val = round(tot / max_tot * 100, 2)
        result  = 'FAIL' if row['Failed'] else 'PASS'
        vals    = [rank, row['regno'], row['name'].title(),
                   short_group(row['SubGroup']), tot, f'{pct_val}%', result]

        _draw_table_row(cv, y, vals, col_x, row_h, usable_w, bg=bg)
        y -= row_h

    _close_table_box(col_x, usable_w, tbl_top, y, row_h)
    page_footer()


# ════════════════════════════════════════════════════════════════════
# BUILD ALL PAGES
# ════════════════════════════════════════════════════════════════════

# Pages: Top 10 per group
for grp in ['BIO SCIENCE', 'COMPUTER SCIENCE', 'COMMERCE', 'HUMANITIES']:
    draw_top10_page(grp)

# Pages: Full A+ per group
for grp in ['BIO SCIENCE', 'COMPUTER SCIENCE', 'COMMERCE', 'HUMANITIES']:
    draw_aplus_page(grp, aplus_count=6)

# Pages: 5 A+ per group
for grp in ['BIO SCIENCE', 'COMPUTER SCIENCE', 'COMMERCE', 'HUMANITIES']:
    draw_aplus_page(grp, aplus_count=5)

# Pages: Rank list per group (all students)
for grp in ['BIO SCIENCE', 'COMPUTER SCIENCE', 'COMMERCE', 'HUMANITIES']:
    draw_ranklist_page(grp)

# Pages: Class (Division) rank list — S1, S2, S3 ... (mixed groups)
for _div in _DIVISIONS:
    draw_class_ranklist_page(_div)

# ════════════════════════════════════════════════════════════════════
# SUBJECT-BASED RANK LISTS — grouped Science, Commerce, Humanities
# ════════════════════════════════════════════════════════════════════
def subjects_for_stream(stream_name):
    """Distinct subjects for a stream, in a natural order: subject-1 column
    first, then subject-2 column variants, etc., alphabetically within a
    column, skipping subjects already seen."""
    stream_df = _df[_df['group'] == stream_name]
    seen, ordered = set(), []
    for _i in range(1, 7):
        for v in sorted(stream_df[f's{_i}_sub'].unique()):
            if v and v not in seen:
                seen.add(v)
                ordered.append(v)
    return ordered

def _subject_row_data(row, subject_name):
    for _i in range(1, 7):
        if row[f's{_i}_sub'] == subject_name:
            return {
                'ce':     row[f's{_i}_ce'],
                'te':     row[f's{_i}_te'],
                'total':  row[f's{_i}_total'],
                'grade':  row[f's{_i}_total_grade'],
                'failed': row[f's{_i}_failed'],
            }
    return None

def get_subject_ranklist(stream_name, subject_name):
    stream_df = _df[_df['group'] == stream_name]
    records = []
    for _, row in stream_df.iterrows():
        d = _subject_row_data(row, subject_name)
        if d is None:
            continue
        try:
            tot = int(float(d['total']))
        except (ValueError, TypeError):
            tot = 0
        records.append({
            'regno': row['regno'], 'name': row['name'],
            'division': row['division'] or '-',
            'ce': d['ce'], 'te': d['te'], 'total': tot,
            'grade': d['grade'], 'failed': bool(d['failed']),
        })
    records.sort(key=lambda r: (r['failed'], -r['total']))
    return records

def _col_setup_subject():
    usable_w   = W - 2*M
    # #, Reg No, Name, Div, CE, TE, Total, Grade
    col_widths = [10*mm, 24*mm, 70*mm, 16*mm, 18*mm, 18*mm, 20*mm, 18*mm]
    scale      = usable_w / sum(col_widths)
    col_widths = [w * scale for w in col_widths]
    col_x = [M]
    for w in col_widths:
        col_x.append(col_x[-1] + w)
    return col_x, usable_w

def draw_subject_list_page(stream_name, subject_name):
    records = get_subject_ranklist(stream_name, subject_name)
    if not records:
        return
    col_x, usable_w = _col_setup_subject()
    row_h   = 7.5*mm
    Y_LIMIT = M + 12*mm
    headers    = ['#', 'Reg No', 'Name', 'Div', 'CE', 'TE', 'Total', 'Grade']
    page_title = f'{short_subject(subject_name)} — {stream_name} (Subject Rank List)'
    subtitle   = PDF_SUBTITLE

    y, tbl_top = _start_student_page(page_title, subtitle, col_x, usable_w, row_h, headers)

    for rank, r in enumerate(records, start=1):
        if y - row_h*0.38 < Y_LIMIT:
            _close_table_box(col_x, usable_w, tbl_top, y, row_h)
            page_footer()
            y, tbl_top = _start_student_page(
                page_title + ' (contd.)', subtitle, col_x, usable_w, row_h, headers)

        if r['failed']:
            bg = colors.HexColor('#FFE8E8') if rank % 2 == 1 else colors.HexColor('#FFF0F0')
        else:
            bg = colors.HexColor('#F7F7F7') if rank % 2 == 1 else colors.white

        vals = [rank, r['regno'], r['name'].title(), r['division'],
                r['ce'], r['te'], r['total'], r['grade']]
        _draw_table_row(cv, y, vals, col_x, row_h, usable_w, bg=bg)
        y -= row_h

    _close_table_box(col_x, usable_w, tbl_top, y, row_h)
    page_footer()

for _stream in ['SCIENCE', 'COMMERCE', 'HUMANITIES']:
    for _subject in subjects_for_stream(_stream):
        draw_subject_list_page(_stream, _subject)

# ════════════════════════════════════════════════════════════════════
# SUBJECT-WISE A+ ACHIEVERS SUMMARY — last page(s) of the PDF
# ════════════════════════════════════════════════════════════════════
def get_subject_aplus_summary():
    """For every subject in every stream, count how many students who
    appeared for that subject scored an A+ grade (on total marks)."""
    rows = []
    for _stream in ['SCIENCE', 'COMMERCE', 'HUMANITIES']:
        for _subject in subjects_for_stream(_stream):
            records  = get_subject_ranklist(_stream, _subject)
            appeared = len(records)
            aplus    = sum(1 for r in records if r['grade'] == 'A+')
            pct      = round(aplus / appeared * 100, 2) if appeared > 0 else 0.0
            rows.append({
                'stream':   _stream.title(),
                'subject':  short_subject(_subject),
                'appeared': appeared,
                'aplus':    aplus,
                'pct':      pct,
            })
    return rows

def _col_setup_aplus_summary():
    usable_w   = W - 2*M
    # #, Stream, Subject, Appeared, A+ Count, A+ %
    col_widths = [10*mm, 28*mm, 62*mm, 24*mm, 24*mm, 24*mm]
    scale      = usable_w / sum(col_widths)
    col_widths = [w * scale for w in col_widths]
    col_x = [M]
    for w in col_widths:
        col_x.append(col_x[-1] + w)
    return col_x, usable_w

def draw_subject_aplus_summary_page():
    rows = get_subject_aplus_summary()
    if not rows:
        return
    col_x, usable_w = _col_setup_aplus_summary()
    row_h   = 8*mm
    Y_LIMIT = M + 12*mm
    headers    = ['#', 'Stream', 'Subject', 'Appeared', 'A+ Count', 'A+ %']
    page_title = 'Subject-wise A+ Achievers'
    subtitle   = PDF_SUBTITLE

    y, tbl_top = _start_student_page(page_title, subtitle, col_x, usable_w, row_h, headers)

    for idx, r in enumerate(rows, start=1):
        if y - row_h*0.38 < Y_LIMIT:
            _close_table_box(col_x, usable_w, tbl_top, y, row_h)
            page_footer()
            y, tbl_top = _start_student_page(
                page_title + ' (contd.)', subtitle, col_x, usable_w, row_h, headers)

        bg   = colors.HexColor('#F7F7F7') if idx % 2 == 1 else colors.white
        vals = [idx, r['stream'], r['subject'], r['appeared'], r['aplus'], f"{r['pct']}%"]
        _draw_table_row(cv, y, vals, col_x, row_h, usable_w, bg=bg)
        y -= row_h

    _close_table_box(col_x, usable_w, tbl_top, y, row_h)
    page_footer()

draw_subject_aplus_summary_page()

# ── Save ──────────────────────────────────────────────────────────
cv.save()
print(f"\n✅  PDF saved successfully!")
print(f"   Location: {PDF_PATH}\n")
