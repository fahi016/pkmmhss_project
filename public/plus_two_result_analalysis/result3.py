# ═══════════════════════════════════════════════════════════════════════
#  PKMMHSS EDARIKODE — PLUS TWO RESULT ANALYSIS 2026
#  Run this file → PDF is saved in the same folder as this script
#  Required file : RESULT ANALYSIS 25.csv  (same folder as this script)
# ═══════════════════════════════════════════════════════════════════════

import subprocess, sys, os

def install(pkg):
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', pkg, '-q'])

try:
    import pandas as pd
except ImportError:
    print("Installing pandas..."); install('pandas'); import pandas as pd

try:
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib import colors
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas as rl_canvas
except ImportError:
    print("Installing reportlab..."); install('reportlab')
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib import colors
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas as rl_canvas

# ── Paths ────────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH   = os.path.join(SCRIPT_DIR, 'RESULT ANALYSIS 25.csv')
PDF_PATH   = os.path.join(SCRIPT_DIR, 'PKMMHSS_Result_2026.pdf')

if not os.path.exists(CSV_PATH):
    print(f"\n❌  ERROR: Could not find the CSV file at:\n   {CSV_PATH}")
    print("   Make sure 'RESULT ANALYSIS 25.csv' is in the same folder as this script.\n")
    sys.exit(1)

# ── Load & process data ──────────────────────────────────────────────────
print("Loading data...")
_df = pd.read_csv(CSV_PATH, header=None, dtype=str)
for _c in _df.columns:
    _df[_c] = _df[_c].str.strip()

_cols = [
    'RegNo','Group','Name',
    'S1_Sub','S1_Total','S1_Grace','S1_Written','S1_Grade',
    'S2_Sub','S2_Total','S2_Grace','S2_Written','S2_Grade',
    'S3_Sub','S3_Total','S3_Grace','S3_Written','S3_Grade',
    'S4_Sub','S4_Total','S4_Grace','S4_Written','S4_Grade',
    'S5_Sub','S5_Total','S5_Grace','S5_Written','S5_Grade',
    'S6_Sub','S6_Total','S6_Grace','S6_Written','S6_Grade',
    'EHS_NHS'
]
_df.columns = _cols

def _subgroup(row):
    if row['Group'] == 'SCIENCE':
        return 'COMPUTER SCIENCE' if row['S5_Sub'] == 'COMPUTER SCIENCE' else 'BIO SCIENCE'
    return row['Group']

_df['SubGroup'] = _df.apply(_subgroup, axis=1)

_GC = ['S1_Grade','S2_Grade','S3_Grade','S4_Grade','S5_Grade','S6_Grade']
_TC = ['S1_Total','S2_Total','S3_Total','S4_Total','S5_Total','S6_Total']
_FG = {'D', 'E', 'F'}

_df['Failed']      = _df.apply(lambda r: any(str(r[c]).strip() in _FG for c in _GC), axis=1)
_df['APlus_Count'] = _df[_GC].apply(lambda r: sum(1 for g in r if str(g).strip() == 'A+'), axis=1)
_df['TotalMarks']  = _df[_TC].apply(lambda r: sum(int(x) for x in r if str(x).isdigit()), axis=1)

total   = len(_df)
ehs     = int((_df['EHS_NHS'] == 'EHS').sum())
nhs     = int((_df['EHS_NHS'] == 'NHS').sum())
pct     = round(ehs / total * 100, 2)
full_ap = int((_df['APlus_Count'] == 6).sum())
five_ap = int((_df['APlus_Count'] == 5).sum())
four_ap = int((_df['APlus_Count'] == 4).sum())

_groups = ['BIO SCIENCE', 'COMPUTER SCIENCE', 'HUMANITIES', 'COMMERCE']
gw = []
for _g in _groups:
    _s   = _df[_df['SubGroup'] == _g]
    _att = len(_s)
    _e   = int((_s['EHS_NHS'] == 'EHS').sum())
    _n   = int((_s['EHS_NHS'] == 'NHS').sum())
    _fa  = int((_s['APlus_Count'] == 6).sum())
    _5ap = int((_s['APlus_Count'] == 5).sum())
    _p   = round(_e / _att * 100, 2) if _att > 0 else 0.0
    gw.append({'group': _g, 'attended': _att, 'ehs': _e, 'nhs': _n,
               'full_ap': _fa, 'five_ap': _5ap, 'pct': _p})

def short_group(g):
    return 'COMP SCIENCE' if g == 'COMPUTER SCIENCE' else g

def short_subject(s):
    return 'BUSINESS STUDIES' if 'BUSINESS STUDIES' in s.upper() else s

failed_list = []
for _, _r in _df[_df['Failed']].iterrows():
    _fails = []
    for _s in ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']:
        if str(_r[f'{_s}_Grade']).strip() in _FG:
            _fails.append(short_subject(_r[f'{_s}_Sub']))
    failed_list.append({
        'regno':    _r['RegNo'],
        'name':     _r['Name'],
        'group':    short_group(_r['SubGroup']),
        'subjects': ', '.join(_fails)
    })

# ── Top 10 per group ──────────────────────────────────────────────────────
MAX_MARK = 1200

def get_top10(group_name):
    sub = _df[_df['SubGroup'] == group_name].copy()
    sub = sub.sort_values('TotalMarks', ascending=False).head(10).reset_index(drop=True)
    return sub

# ── PDF canvas setup ──────────────────────────────────────────────────────
W, H = A4
M    = 18 * mm
cv   = rl_canvas.Canvas(PDF_PATH, pagesize=A4)

# ── Common drawing helpers ─────────────────────────────────────────────────
def hline(y, x1=M, x2=W-M, lw=0.5):
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
    """Draw school title block, return y after header."""
    y = H - M
    y -= 12*mm; centered('PLUS TWO RESULT-2026', y, size=16, bold=True)
    y -= 7*mm;  centered('PKMMHSS EDARIKODE', y, size=11)
    if subtitle:
        y -= 6*mm; centered(subtitle, y, size=12, bold=True)
    y -= 5*mm;  hline(y, lw=1.2)
    return y

def page_footer():
    cv.setFont('Helvetica', 7)
    cv.setFillColor(colors.grey)
    cv.drawCentredString(W / 2, M - 5*mm, 'PKMMHSS Result Analysis 2026')
    cv.setFillColor(colors.black)


# ════════════════════════════════════════════════════════════════════════
# PAGE 1 — ANALYSIS
# ════════════════════════════════════════════════════════════════════════
page_border()
y = page_header()

# ── TOTAL RESULT BLOCK ────────────────────────────────────────────────────
y -= 9*mm
centered('Total Result of the School', y, size=13, bold=True)
tw = cv.stringWidth('Total Result of the School', 'Helvetica-Bold', 13)
cv.setLineWidth(0.8)
cv.line(W/2 - tw/2, y - 1*mm, W/2 + tw/2, y - 1*mm)

def stat_row(label, value, ypos, bold_label=False):
    max_label_w = (W - 2*M) * 0.78
    fit_text(label, M + 5*mm, ypos, max_label_w, size=10, bold=bold_label)
    right(str(value), W - M - 5*mm, ypos, size=10, bold=True)

y -= 11*mm; stat_row('Total Students Registered for HSE Exam', total, y)
y -= 8*mm;  stat_row('No. of Students Eligible For Higher Studies', ehs, y)
y -= 8*mm;  stat_row('No. of Students Not Eligible For Higher Studies', nhs, y)
y -= 8*mm;  stat_row('Percentage of Eligible Students', f'{pct}%', y)
y -= 9*mm;  stat_row('Number of Full A+ Students', full_ap, y, bold_label=True)
y -= 7*mm;  stat_row('Number of 5 A+ Students', five_ap, y)
y -= 7*mm;  stat_row('No. of 4 A+ Students', four_ap, y)

# ── GROUPWISE TABLE ───────────────────────────────────────────────────────
y -= 10*mm
centered('Groupwise Result', y, size=13, bold=True)
tw2 = cv.stringWidth('Groupwise Result', 'Helvetica-Bold', 13)
cv.line(W/2 - tw2/2, y - 1*mm, W/2 + tw2/2, y - 1*mm)

y -= 7*mm
cx    = [M, M+56*mm, M+76*mm, M+92*mm, M+108*mm, M+124*mm, M+138*mm, W-M]
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

draw_row(y, ['Group', 'Attended', 'EHS', 'NHS', 'Full A+', '5A+', 'Percentage'],
         cx, bg=colors.HexColor('#D0D0D0'), bold=True)
hline(y + row_h*0.6, lw=0.8)
y -= row_h

for i, row in enumerate(gw):
    bg = colors.HexColor('#F7F7F7') if i % 2 == 0 else colors.white
    draw_row(y, [short_group(row['group']), row['attended'], row['ehs'], row['nhs'],
                 row['full_ap'], row['five_ap'], f"{row['pct']}%"], cx, bg=bg)
    y -= row_h

draw_row(y, ['TOTAL', total, ehs, nhs, full_ap, five_ap, f'{pct}%'],
         cx, bg=colors.HexColor('#D0D0D0'), bold=True)
tbl_bottom = y - row_h * 0.4
y -= row_h

cv.setLineWidth(0.8)
cv.rect(M, tbl_bottom, W - 2*M, tbl_top - tbl_bottom, stroke=1, fill=0)
for _x in cx:
    cv.line(_x, tbl_bottom, _x, tbl_top)

y -= 4*mm
right('* Absent students treated as NHS', W - M - 2*mm, y, size=7)

# ── FAILED STUDENTS TABLE ──────────────────────────────────────────────────
y -= 9*mm
left('List of Failed Students :', M + 2*mm, y, size=10, bold=True)
y -= 7*mm

fl_cols = [M, M+28*mm, M+90*mm, M+118*mm, W-M]
frow_h  = 7.5*mm
ftop    = y + frow_h * 0.6

cv.setFillColor(colors.HexColor('#D0D0D0'))
cv.rect(M, y - frow_h*0.4, W - 2*M, frow_h, fill=1, stroke=0)
cv.setFillColor(colors.black)
cv.setFont('Helvetica-Bold', 9)
for i, h in enumerate(['Reg No', 'Name', 'Group', 'Subject(s) Failed']):
    xc = (fl_cols[i] + fl_cols[i+1]) / 2
    cv.drawCentredString(xc, y, h)
hline(y + frow_h*0.6, lw=0.8)
hline(y - frow_h*0.4, lw=0.5)
y -= frow_h

for i, f in enumerate(failed_list):
    bg = colors.HexColor('#FFF0F0') if i % 2 == 0 else colors.white
    cv.setFillColor(bg)
    cv.rect(M, y - frow_h*0.4, W - 2*M, frow_h, fill=1, stroke=0)
    cv.setFillColor(colors.black)
    cv.setFont('Helvetica', 9)
    cv.drawString(fl_cols[0] + 2*mm, y, f['regno'])
    fit_text(f['name'], fl_cols[1] + 2*mm, y, fl_cols[2] - fl_cols[1] - 4*mm, size=9)
    cv.setFont('Helvetica', 9)
    cv.drawString(fl_cols[2] + 2*mm, y, f['group'])
    fit_text(f['subjects'], fl_cols[3] + 2*mm, y, fl_cols[4] - fl_cols[3] - 4*mm, size=9)
    hline(y - frow_h*0.4, lw=0.3)
    y -= frow_h

fbottom = y + frow_h - frow_h * 0.4
cv.setLineWidth(0.8)
cv.rect(M, fbottom, W - 2*M, ftop - fbottom, stroke=1, fill=0)
for _x in fl_cols:
    cv.line(_x, fbottom, _x, ftop)

page_footer()


# ════════════════════════════════════════════════════════════════════════
# PAGES 2–5 — TOP 10 STUDENTS PER GROUP
# ════════════════════════════════════════════════════════════════════════

# Short subject labels for column headers
SUBJECT_SHORT = {
    'ENGLISH':                          'ENG',
    'MALAYALAM':                        'MAL',
    'ARABIC':                           'ARB',
    'HINDI':                            'HIN',
    'PHYSICS':                          'PHY',
    'CHEMISTRY':                        'CHE',
    'BIOLOGY':                          'BIO',
    'MATHEMATICS':                      'MAT',
    'COMPUTER SCIENCE':                 'CS',
    'HISTORY':                          'HIS',
    'ECONOMICS':                        'ECO',
    'POLITICAL SCIENCE':                'POL',
    'SOCIOLOGY':                        'SOC',
    'COMPUTER APPLICATION':             'CA',
    'ACCOUNTANCY WITH COMPUTER ACCOUNTING': 'ACC',
}

def shorten_subject(s):
    su = s.upper().strip()
    for key, abbr in SUBJECT_SHORT.items():
        if key in su:
            return abbr
    # Fallback: first 4 chars
    return su[:4]

# Black & white palette — same style as analysis page
GROUP_COLORS = {
    'BIO SCIENCE':      ('#000000', '#F7F7F7', '#D0D0D0'),
    'COMPUTER SCIENCE': ('#000000', '#F7F7F7', '#D0D0D0'),
    'COMMERCE':         ('#000000', '#F7F7F7', '#D0D0D0'),
    'HUMANITIES':       ('#000000', '#F7F7F7', '#D0D0D0'),
}

def draw_top10_page(group_name):
    top10 = get_top10(group_name)
    if top10.empty:
        return

    dark, light, mid = [colors.HexColor(c) for c in GROUP_COLORS.get(group_name, ('#333333','#F5F5F5','#E0E0E0'))]

    cv.showPage()
    page_border()

    # ── Page header ──────────────────────────────────────────────────────
    y = H - M
    y -= 12*mm
    cv.setFont('Helvetica-Bold', 16)
    cv.drawCentredString(W / 2, y, f'TOP 10 STUDENTS — {group_name}')

    y -= 6*mm
    cv.setFont('Helvetica', 11)
    cv.drawCentredString(W / 2, y, 'PKMMHSS EDARIKODE  |  PLUS TWO RESULT 2026')
    y -= 5*mm
    hline(y, lw=1.2)

    # ── Determine subject names from data (row 0) ─────────────────────────
    sub_keys = ['S1_Sub','S2_Sub','S3_Sub','S4_Sub','S5_Sub','S6_Sub']
    sub_names = [str(top10.iloc[0][k]).strip() for k in sub_keys]
    sub_abbrs = [shorten_subject(s) for s in sub_names]
    sub_abbrs[1] = 'SL'   # S2 is always Second Language (Malayalam/Hindi/Urdu etc.)

    # ── Table layout ──────────────────────────────────────────────────────
    # Columns: Rank | Reg No | Name | S1 | S2 | S3 | S4 | S5 | S6 | Total | %
    usable_w  = W - 2*M
    col_widths = [
        10*mm,   # Rank
        20*mm,   # Reg No
        50*mm,   # Name
        14*mm,   # S1
        14*mm,   # S2
        14*mm,   # S3
        14*mm,   # S4
        14*mm,   # S5
        14*mm,   # S6
        16*mm,   # Total
        14*mm,   # %
    ]
    # Scale to fit usable width
    total_w = sum(col_widths)
    scale   = usable_w / total_w
    col_widths = [w * scale for w in col_widths]

    # Build x positions
    col_x = [M]
    for w in col_widths:
        col_x.append(col_x[-1] + w)

    row_h  = 8.5*mm
    y     -= 10*mm
    tbl_top = y + row_h * 0.65

    headers = ['#', 'Reg No', 'Name'] + sub_abbrs + ['Total', '%']

    def tbl_row(ypos, vals, bg=None, bold=False, text_color=colors.black):
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
            if i == 2:   # Name — left-align
                cv.drawString(col_x[i] + 1.5*mm, ypos, str(val))
            else:
                cv.drawCentredString(cell_center_x, ypos, str(val))
        cv.setFillColor(colors.black)
        hline(ypos - row_h*0.38, lw=0.25)

    # Header row
    tbl_row(y, headers, bg=dark, bold=True, text_color=colors.white)
    hline(y + row_h*0.65, lw=1.0)
    y -= row_h

    # Data rows
    for rank, (_, row) in enumerate(top10.iterrows(), start=1):
        bg = light if rank % 2 == 1 else colors.white
        marks = [int(row[f'S{j}_Total']) if str(row[f'S{j}_Total']).isdigit() else 0
                 for j in range(1, 7)]
        tot  = sum(marks)
        pct_val = round(tot / MAX_MARK * 100, 2)
        vals = [rank, row['RegNo'], row['Name'].title()] + marks + [tot, f'{pct_val}%']
        tbl_row(y, vals, bg=bg)
        y -= row_h

    # Table border + column verticals
    tbl_bottom = y + row_h - row_h*0.38
    cv.setLineWidth(0.8)
    cv.rect(M, tbl_bottom, usable_w, tbl_top - tbl_bottom, stroke=1, fill=0)
    for _x in col_x:
        cv.setLineWidth(0.4)
        cv.line(_x, tbl_bottom, _x, tbl_top)

    # ── Note below table ──────────────────────────────────────────────────
    y -= 4*mm
    cv.setFont('Helvetica-Oblique', 7.5)
    cv.setFillColor(colors.grey)
    cv.setFillColor(colors.black)

    page_footer()


# Draw pages 2–5
for grp in ['BIO SCIENCE', 'COMPUTER SCIENCE', 'COMMERCE', 'HUMANITIES']:
    draw_top10_page(grp)


# ════════════════════════════════════════════════════════════════════════
# PAGES 6–9  — FULL A+ STUDENTS PER GROUP
# PAGES 10+ — 5 A+ STUDENTS PER GROUP (same layout, continuation pages)
# ════════════════════════════════════════════════════════════════════════

def get_aplus_group(group_name, aplus_count):
    sub = _df[(_df['SubGroup'] == group_name) & (_df['APlus_Count'] == aplus_count)].copy()
    sub = sub.sort_values('TotalMarks', ascending=False).reset_index(drop=True)
    return sub

def draw_aplus_list_page(group_name, aplus_count, title_label):
    grp_df = get_aplus_group(group_name, aplus_count)
    if grp_df.empty:
        return

    dark  = colors.HexColor('#000000')
    light = colors.HexColor('#F7F7F7')

    # ── Subject abbrs from first row of this group ────────────────────────
    sub_keys  = ['S1_Sub','S2_Sub','S3_Sub','S4_Sub','S5_Sub','S6_Sub']
    sub_abbrs = [shorten_subject(str(grp_df.iloc[0][k]).strip()) for k in sub_keys]
    sub_abbrs[1] = 'SL'   # S2 is always Second Language (Malayalam/Hindi/Urdu etc.)

    # ── Table layout — identical to Top 10 pages ──────────────────────────
    usable_w   = W - 2 * M
    col_widths = [
        10*mm,   # #
        20*mm,   # Reg No
        50*mm,   # Name
        14*mm,   # S1
        14*mm,   # S2
        14*mm,   # S3
        14*mm,   # S4
        14*mm,   # S5
        14*mm,   # S6
        16*mm,   # Total
        14*mm,   # %
    ]
    total_w    = sum(col_widths)
    scale      = usable_w / total_w
    col_widths = [w * scale for w in col_widths]

    col_x = [M]
    for w in col_widths:
        col_x.append(col_x[-1] + w)

    row_h    = 8.5 * mm
    # Bottom limit: leave room for footer + a little margin
    Y_LIMIT  = M + 12 * mm

    headers = ['#', 'Reg No', 'Name'] + sub_abbrs + ['Total', '%']

    def tbl_row(ypos, vals, bg=None, bold=False, text_color=colors.black):
        if bg:
            cv.setFillColor(bg)
            cv.rect(M, ypos - row_h * 0.38, usable_w, row_h, fill=1, stroke=0)
        cv.setFillColor(text_color)
        for i, val in enumerate(vals):
            cell_center_x = (col_x[i] + col_x[i+1]) / 2
            cell_w        = col_x[i+1] - col_x[i] - 2 * mm
            font = 'Helvetica-Bold' if bold else 'Helvetica'
            sz   = 8.5
            while sz >= 5:
                cv.setFont(font, sz)
                if cv.stringWidth(str(val), font, sz) <= cell_w:
                    break
                sz -= 0.4
            if i == 2:   # Name — left-align
                cv.drawString(col_x[i] + 1.5 * mm, ypos, str(val))
            else:
                cv.drawCentredString(cell_center_x, ypos, str(val))
        cv.setFillColor(colors.black)
        hline(ypos - row_h * 0.38, lw=0.25)

    def close_table(tbl_top, y):
        """Draw outer border and column lines for the current page's table."""
        tbl_bottom = y + row_h - row_h * 0.38
        cv.setLineWidth(0.8)
        cv.rect(M, tbl_bottom, usable_w, tbl_top - tbl_bottom, stroke=1, fill=0)
        for _x in col_x:
            cv.setLineWidth(0.4)
            cv.line(_x, tbl_bottom, _x, tbl_top)

    def start_page(cont=False):
        """Open a new page, draw border + header, return (y, tbl_top)."""
        cv.showPage()
        page_border()
        y = H - M
        y -= 12 * mm
        cv.setFont('Helvetica-Bold', 16)
        title = f'{title_label} — {group_name}'
        if cont:
            title += ' (contd.)'
        cv.drawCentredString(W / 2, y, title)
        y -= 6 * mm
        cv.setFont('Helvetica', 11)
        cv.drawCentredString(W / 2, y, 'PKMMHSS EDARIKODE  |  PLUS TWO RESULT 2026')
        y -= 5 * mm
        hline(y, lw=1.2)
        y -= 10 * mm
        tbl_top = y + row_h * 0.65
        # Column header row
        tbl_row(y, headers, bg=dark, bold=True, text_color=colors.white)
        hline(y + row_h * 0.65, lw=1.0)
        y -= row_h
        return y, tbl_top

    # ── Draw pages ────────────────────────────────────────────────────────
    y, tbl_top = start_page(cont=False)

    for rank, (_, row) in enumerate(grp_df.iterrows(), start=1):
        # If next row would overflow, close current page and start a new one
        if y - row_h * 0.38 < Y_LIMIT:
            close_table(tbl_top, y)
            page_footer()
            y, tbl_top = start_page(cont=True)

        bg    = light if rank % 2 == 1 else colors.white
        marks = [int(row[f'S{j}_Total']) if str(row[f'S{j}_Total']).isdigit() else 0
                 for j in range(1, 7)]
        tot     = sum(marks)
        pct_val = round(tot / MAX_MARK * 100, 2)
        vals    = [rank, row['RegNo'], row['Name'].title()] + marks + [tot, f'{pct_val}%']
        tbl_row(y, vals, bg=bg)
        y -= row_h

    # Close the final page's table
    close_table(tbl_top, y)
    page_footer()


# Draw Full A+ pages (6–9)
for grp in ['BIO SCIENCE', 'COMPUTER SCIENCE', 'COMMERCE', 'HUMANITIES']:
    draw_aplus_list_page(grp, 6, 'FULL A+ STUDENTS')

# Draw 5 A+ pages (after Full A+)
for grp in ['BIO SCIENCE', 'COMPUTER SCIENCE', 'COMMERCE', 'HUMANITIES']:
    draw_aplus_list_page(grp, 5, '5 A+ STUDENTS')


# ── Save ──────────────────────────────────────────────────────────────────
cv.save()
print(f"\n✅  PDF saved successfully!")
print(f"   Location: {PDF_PATH}\n")
