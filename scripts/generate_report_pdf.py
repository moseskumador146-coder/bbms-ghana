#!/usr/bin/env python3
"""Generate a BBMS report as PDF using ReportLab.

Usage: python3 generate_report_pdf.py <json_file> <output_pdf>
"""
import sys
import json
from pathlib import Path
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
    Image as RLImage,
)
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.piecharts import Pie as PieChart
from reportlab.graphics import renderPDF

# Color palette
ROSE = colors.HexColor('#e11d48')
DARK = colors.HexColor('#1e293b')
MUTED = colors.HexColor('#64748b')
LIGHT = colors.HexColor('#f1f5f9')
BORDER = colors.HexColor('#e2e8f0')
EMERALD = colors.HexColor('#10b981')
AMBER = colors.HexColor('#f59e0b')
SKY = colors.HexColor('#0ea5e9')
VIOLET = colors.HexColor('#8b5cf6')
WHITE = colors.white

BLOOD_GROUP_COLORS = {
    'O+': colors.HexColor('#ef4444'),
    'O-': colors.HexColor('#dc2626'),
    'A+': colors.HexColor('#10b981'),
    'A-': colors.HexColor('#059669'),
    'B+': colors.HexColor('#0ea5e9'),
    'B-': colors.HexColor('#0284c7'),
    'AB+': colors.HexColor('#8b5cf6'),
    'AB-': colors.HexColor('#7c3aed'),
}

STATUS_COLORS = {
    'Available': EMERALD,
    'Reserved': AMBER,
    'Issued': SKY,
    'Expired': ROSE,
    'Discarded': MUTED,
    'Pending': AMBER,
    'Approved': EMERALD,
    'Rejected': ROSE,
    'Cancelled': MUTED,
    'Open': EMERALD,
    'Partially Responded': AMBER,
    'Fulfilled': SKY,
    'Fulfilled ': SKY,
}


def build_styles():
    ss = getSampleStyleSheet()
    ss.add(ParagraphStyle(
        name='ReportTitle',
        parent=ss['Title'],
        fontSize=22,
        leading=26,
        textColor=DARK,
        spaceAfter=4,
        alignment=0,
    ))
    ss.add(ParagraphStyle(
        name='ReportSubtitle',
        parent=ss['Normal'],
        fontSize=11,
        leading=14,
        textColor=MUTED,
        spaceAfter=18,
    ))
    ss.add(ParagraphStyle(
        name='SectionHeading',
        parent=ss['Heading2'],
        fontSize=14,
        leading=18,
        textColor=ROSE,
        spaceBefore=14,
        spaceAfter=8,
    ))
    ss.add(ParagraphStyle(
        name='SubHeading',
        parent=ss['Heading3'],
        fontSize=11,
        leading=14,
        textColor=DARK,
        spaceBefore=8,
        spaceAfter=4,
    ))
    ss.add(ParagraphStyle(
        name='MetaLabel',
        parent=ss['Normal'],
        fontSize=9,
        leading=12,
        textColor=MUTED,
    ))
    ss.add(ParagraphStyle(
        name='SmallText',
        parent=ss['Normal'],
        fontSize=8,
        leading=11,
        textColor=DARK,
    ))
    return ss


def page_decorations(canvas, doc):
    canvas.saveState()
    # Header bar
    canvas.setFillColor(ROSE)
    canvas.rect(0, A4[1] - 12 * mm, A4[0], 12 * mm, fill=1, stroke=0)
    canvas.setFillColor(WHITE)
    canvas.setFont('Helvetica-Bold', 9)
    canvas.drawString(15 * mm, A4[1] - 8 * mm, 'BBMS Ghana')
    canvas.setFont('Helvetica', 8)
    canvas.drawRightString(A4[0] - 15 * mm, A4[1] - 8 * mm, 'Cloud-Based Blood Bank Management System')

    # Footer
    canvas.setFillColor(MUTED)
    canvas.setFont('Helvetica', 8)
    canvas.drawString(15 * mm, 10 * mm, f'Generated: {datetime.now().strftime("%d %B %Y, %H:%M")}')
    canvas.drawRightString(A4[0] - 15 * mm, 10 * mm, f'Page {doc.page}')
    # Footer line
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(15 * mm, 14 * mm, A4[0] - 15 * mm, 14 * mm)
    canvas.restoreState()


def make_stat_grid(summary):
    """4-column summary table with colored cells."""
    cells = [
        ('Total Units', summary.get('totalUnits', 0), DARK),
        ('Available', summary.get('available', 0), EMERALD),
        ('Reserved', summary.get('reserved', 0), AMBER),
        ('Issued', summary.get('issued', 0), SKY),
        ('Expired', summary.get('expired', 0), ROSE),
        ('Discarded', summary.get('discarded', 0), MUTED),
        ('Expiring Soon', summary.get('nearExpiry', 0), AMBER),
        ('Storage Util.', '-', VIOLET),
    ]
    rows = []
    # 4 per row
    for i in range(0, len(cells), 4):
        row = []
        for j in range(4):
            if i + j < len(cells):
                label, value, color = cells[i + j]
                color_hex = '#' + color.hexval()[2:]
                dark_hex = '#' + DARK.hexval()[2:]
                row.append(Paragraph(
                    f'<font color="{color_hex}" size="9">{label}</font><br/>'
                    f'<font size="16" color="{dark_hex}"><b>{value}</b></font>',
                    build_styles()['SmallText'],
                ))
            else:
                row.append('')
        rows.append(row)
    col_w = (A4[0] - 30 * mm) / 4
    t = Table(rows, colWidths=[col_w] * 4, rowHeights=[22 * mm] * len(rows))
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    return t


def make_blood_group_chart(stock_by_group):
    """Bar chart of blood group stock."""
    groups = sorted(stock_by_group.keys())
    available = [stock_by_group[g].get('available', 0) for g in groups]
    expired = [stock_by_group[g].get('expired', 0) for g in groups]

    drawing = Drawing(460, 200)
    bc = VerticalBarChart()
    bc.x = 50
    bc.y = 30
    bc.height = 140
    bc.width = 380
    bc.data = [available, expired]
    bc.bars[0].fillColor = EMERALD
    bc.bars[1].fillColor = ROSE
    bc.barWidth = 8
    bc.groupSpacing = 12
    bc.categoryAxis.categoryNames = groups
    bc.categoryAxis.labels.fontSize = 9
    bc.categoryAxis.labels.fillColor = DARK
    bc.valueAxis.valueMin = 0
    bc.valueAxis.valueMax = max(max(available), max(expired), 5) + 2
    bc.valueAxis.labels.fontSize = 8
    bc.valueAxis.labels.fillColor = MUTED
    bc.valueAxis.visibleGrid = True
    bc.valueAxis.gridStrokeColor = BORDER
    bc.valueAxis.gridStrokeWidth = 0.25
    drawing.add(bc)

    # Legend
    drawing.add(String(50, 180, 'Blood Group Stock Distribution', fontName='Helvetica-Bold', fontSize=11, fillColor=DARK))
    drawing.add(Rect(280, 178, 8, 8, fillColor=EMERALD, strokeColor=None))
    drawing.add(String(292, 180, 'Available', fontName='Helvetica', fontSize=8, fillColor=DARK))
    drawing.add(Rect(360, 178, 8, 8, fillColor=ROSE, strokeColor=None))
    drawing.add(String(372, 180, 'Expired', fontName='Helvetica', fontSize=8, fillColor=DARK))

    return drawing


def make_component_pie(component_dist):
    """Pie chart of component distribution."""
    components = list(component_dist.keys())
    values = [component_dist[c] for c in components]
    if not components:
        return Paragraph('<i>No available units</i>', build_styles()['SmallText'])

    drawing = Drawing(460, 200)
    pie = PieChart()
    pie.x = 30
    pie.y = 20
    pie.width = 140
    pie.height = 140
    pie.data = values
    pie.labels = None
    pie.slices.strokeWidth = 1
    pie.slices.strokeColor = WHITE
    color_palette = [ROSE, EMERALD, SKY, VIOLET, AMBER, MUTED]
    for i, _ in enumerate(values):
        pie.slices[i].fillColor = color_palette[i % len(color_palette)]
    drawing.add(pie)

    # Legend
    lx = 220
    ly = 170
    drawing.add(String(30, 180, 'Component Distribution (Available)', fontName='Helvetica-Bold', fontSize=11, fillColor=DARK))
    for i, comp in enumerate(components):
        y = ly - i * 16
        drawing.add(Rect(lx, y, 8, 8, fillColor=color_palette[i % len(color_palette)], strokeColor=None))
        drawing.add(String(lx + 12, y, f'{comp} ({values[i]})', fontName='Helvetica', fontSize=9, fillColor=DARK))

    return drawing


def make_status_bar(status_dict, title):
    """Horizontal bar chart of statuses."""
    items = sorted(status_dict.items(), key=lambda x: -x[1])
    if not items:
        return Paragraph(f'<i>No data</i>', build_styles()['SmallText'])

    labels = [k for k, _ in items]
    values = [v for _, v in items]

    drawing = Drawing(460, max(140, 25 * len(items) + 30))
    bc = VerticalBarChart()
    bc.x = 130
    bc.y = 25
    bc.height = max(80, 18 * len(items))
    bc.width = 280
    bc.data = [values]
    bc.bars[0].fillColor = SKY
    bc.barWidth = 12
    bc.categoryAxis.categoryNames = labels
    bc.categoryAxis.labels.fontSize = 8
    bc.categoryAxis.labels.fillColor = DARK
    bc.categoryAxis.labels.angle = 0
    bc.valueAxis.valueMin = 0
    bc.valueAxis.valueMax = max(values) + 1
    bc.valueAxis.labels.fontSize = 8
    bc.valueAxis.labels.fillColor = MUTED
    bc.valueAxis.visibleGrid = True
    bc.valueAxis.gridStrokeColor = BORDER
    bc.valueAxis.gridStrokeWidth = 0.25
    drawing.add(bc)
    drawing.add(String(50, drawing.height - 12, title, fontName='Helvetica-Bold', fontSize=11, fillColor=DARK))

    return drawing


def make_storage_utilization_chart(storage_data):
    """Bar chart of storage utilization."""
    if not storage_data:
        return Paragraph('<i>No storage units</i>', build_styles()['SmallText'])

    names = [s['name'][:20] for s in storage_data]
    utils = [s.get('utilization', 0) for s in storage_data]

    drawing = Drawing(460, max(150, 25 * len(storage_data) + 30))
    bc = VerticalBarChart()
    bc.x = 60
    bc.y = 30
    bc.height = max(80, 18 * len(storage_data))
    bc.width = 360
    bc.data = [utils]
    bc.bars[0].fillColor = VIOLET
    bc.barWidth = 14
    bc.categoryAxis.categoryNames = names
    bc.categoryAxis.labels.fontSize = 7
    bc.categoryAxis.labels.fillColor = DARK
    bc.categoryAxis.labels.angle = 30
    bc.valueAxis.valueMin = 0
    bc.valueAxis.valueMax = 100
    bc.valueAxis.labels.fontSize = 8
    bc.valueAxis.labels.fillColor = MUTED
    bc.valueAxis.visibleGrid = True
    bc.valueAxis.gridStrokeColor = BORDER
    bc.valueAxis.gridStrokeWidth = 0.25
    drawing.add(bc)
    drawing.add(String(60, drawing.height - 12, 'Storage Unit Utilization (%)', fontName='Helvetica-Bold', fontSize=11, fillColor=DARK))

    return drawing


def make_blood_group_table(stock_by_group):
    """Detailed blood group stock table."""
    header = ['Blood Group', 'Available', 'Total', 'Expired', 'Reserved', 'Issued']
    rows = [header]
    for g in sorted(stock_by_group.keys()):
        v = stock_by_group[g]
        rows.append([
            g,
            str(v.get('available', 0)),
            str(v.get('total', 0)),
            str(v.get('expired', 0)),
            str(v.get('reserved', 0)),
            str(v.get('issued', 0)),
        ])

    col_w = (A4[0] - 30 * mm) / 6
    t = Table(rows, colWidths=[col_w] * 6)
    style = [
        ('BACKGROUND', (0, 0), (-1, 0), ROSE),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, LIGHT]),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]
    # Highlight first column with blood group color
    for i, g in enumerate(sorted(stock_by_group.keys())):
        if g in BLOOD_GROUP_COLORS:
            style.append(('BACKGROUND', (0, i + 1), (0, i + 1), BLOOD_GROUP_COLORS[g]))
            style.append(('TEXTCOLOR', (0, i + 1), (0, i + 1), WHITE))
            style.append(('FONTNAME', (0, i + 1), (0, i + 1), 'Helvetica-Bold'))
    t.setStyle(TableStyle(style))
    return t


def make_recent_activity_table(activity):
    """Recent activity table."""
    if not activity:
        return Paragraph('<i>No recent activity</i>', build_styles()['SmallText'])
    header = ['Timestamp', 'Action', 'Description', 'User']
    rows = [header]
    for a in activity[:15]:
        ts = a.get('createdAt', '')[:16].replace('T', ' ')
        rows.append([ts, a.get('action', ''), a.get('description', '')[:60], a.get('user', '')[:25]])

    col_w = [(A4[0] - 30 * mm) * x for x in [0.18, 0.15, 0.45, 0.22]]
    t = Table(rows, colWidths=col_w)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), DARK),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, LIGHT]),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    return t


def main():
    if len(sys.argv) < 3:
        print('Usage: generate_report_pdf.py <json_file> <output_pdf>', file=sys.stderr)
        sys.exit(1)

    json_file = sys.argv[1]
    output_pdf = sys.argv[2]

    with open(json_file) as f:
        data = json.load(f)

    styles = build_styles()
    doc = SimpleDocTemplate(
        output_pdf,
        pagesize=A4,
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        topMargin=22 * mm,
        bottomMargin=20 * mm,
        title='BBMS Ghana - Inventory & Activity Report',
        author='BBMS Ghana',
        subject='Blood Bank Management Report',
    )

    story = []

    # Title block
    story.append(Paragraph('Blood Bank Management Report', styles['ReportTitle']))
    facility = data.get('facility') or {}
    facility_name = facility.get('name', 'All Facilities') if isinstance(facility, dict) else 'All Facilities'
    facility_type = facility.get('type', '') if isinstance(facility, dict) else ''
    facility_region = facility.get('region', '') if isinstance(facility, dict) else ''
    period = data.get('period') or {}
    period_str = ''
    if period.get('from') or period.get('to'):
        period_str = f"Period: {period.get('from', 'start')} to {period.get('to', 'now')}"
    else:
        period_str = 'Period: All time'
    subtitle = f"{facility_name}"
    if facility_type:
        subtitle += f" · {facility_type}"
    if facility_region:
        subtitle += f" · {facility_region} Region"
    subtitle += f" · {period_str}"
    story.append(Paragraph(subtitle, styles['ReportSubtitle']))

    # Summary grid
    story.append(Paragraph('Inventory Summary', styles['SectionHeading']))
    story.append(make_stat_grid(data.get('summary', {})))
    story.append(Spacer(1, 10))

    # Blood group chart + table
    story.append(Paragraph('Stock by Blood Group', styles['SectionHeading']))
    stock = data.get('stockByGroup', {})
    if stock:
        story.append(make_blood_group_chart(stock))
        story.append(Spacer(1, 8))
        story.append(make_blood_group_table(stock))
    else:
        story.append(Paragraph('<i>No blood unit data</i>', styles['SmallText']))
    story.append(Spacer(1, 12))

    # Component pie
    story.append(Paragraph('Component Distribution', styles['SectionHeading']))
    story.append(make_component_pie(data.get('componentDist', {})))
    story.append(Spacer(1, 12))

    # Internal requests
    story.append(PageBreak())
    ir = data.get('internalRequests', {})
    story.append(Paragraph('Internal Blood Requests', styles['SectionHeading']))
    story.append(Paragraph(f"<b>Total:</b> {ir.get('total', 0)}", styles['SmallText']))
    story.append(Spacer(1, 6))
    if ir.get('byStatus'):
        story.append(make_status_bar(ir['byStatus'], 'Requests by Status'))
        story.append(Spacer(1, 10))
    if ir.get('byUrgency'):
        story.append(make_status_bar(ir['byUrgency'], 'Requests by Urgency'))
        story.append(Spacer(1, 10))

    # Network requests
    nr = data.get('networkRequests', {})
    story.append(Paragraph('Network Blood Requests (Broadcast)', styles['SectionHeading']))
    story.append(Paragraph(f"<b>Total:</b> {nr.get('total', 0)}", styles['SmallText']))
    story.append(Spacer(1, 6))
    if nr.get('byStatus'):
        story.append(make_status_bar(nr['byStatus'], 'Network Requests by Status'))
        story.append(Spacer(1, 10))
    if nr.get('byGroup'):
        story.append(make_status_bar(nr['byGroup'], 'Network Requests by Blood Group'))
        story.append(Spacer(1, 10))

    # Storage utilization
    story.append(PageBreak())
    story.append(Paragraph('Storage Utilization', styles['SectionHeading']))
    story.append(make_storage_utilization_chart(data.get('storageUtilization', [])))
    story.append(Spacer(1, 12))

    # Recent activity
    story.append(Paragraph('Recent Activity (Audit Log)', styles['SectionHeading']))
    story.append(make_recent_activity_table(data.get('recentActivity', [])))

    doc.build(story, onFirstPage=page_decorations, onLaterPages=page_decorations)
    print(f'PDF generated: {output_pdf}')


if __name__ == '__main__':
    main()
