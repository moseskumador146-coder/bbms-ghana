#!/usr/bin/env python3
"""Generate a professional BBMS report as PDF using ReportLab.

This is a complete rewrite focused on:
- Professional multi-page layout with cover page
- Explanatory narrative text for every chart and table
- Proper page breaks, no overlapping
- No browser URL, clean footer with page numbers
- Branded header bar on every page

Usage: python3 generate_report_pdf.py <json_file> <output_pdf>
"""
import sys
import json
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
    KeepTogether, Image as RLImage, Flowable,
)
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.piecharts import Pie as PieChart

# === COLOR PALETTE ===
ROSE = colors.HexColor('#e11d48')
DARK_ROSE = colors.HexColor('#9f1239')
DARK = colors.HexColor('#0f172a')
SLATE = colors.HexColor('#334155')
MUTED = colors.HexColor('#64748b')
LIGHT_MUTED = colors.HexColor('#94a3b8')
LIGHT = colors.HexColor('#f8fafc')
LIGHTER = colors.HexColor('#f1f5f9')
BORDER = colors.HexColor('#e2e8f0')
BORDER_DARK = colors.HexColor('#cbd5e1')
EMERALD = colors.HexColor('#059669')
AMBER = colors.HexColor('#d97706')
SKY = colors.HexColor('#0284c7')
VIOLET = colors.HexColor('#7c3aed')
WHITE = colors.white
CREAM = colors.HexColor('#fffbeb')

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

COMPONENT_COLORS = [colors.HexColor('#e11d48'), colors.HexColor('#059669'),
                    colors.HexColor('#0284c7'), colors.HexColor('#7c3aed'),
                    colors.HexColor('#d97706')]


# === STYLES ===
def build_styles():
    ss = getSampleStyleSheet()
    ss.add(ParagraphStyle(name='CoverTitle', parent=ss['Title'], fontSize=28, leading=34,
                          textColor=WHITE, alignment=TA_LEFT, spaceAfter=8))
    ss.add(ParagraphStyle(name='CoverSubtitle', parent=ss['Normal'], fontSize=14, leading=18,
                          textColor=colors.HexColor('#fecaca'), alignment=TA_LEFT, spaceAfter=4))
    ss.add(ParagraphStyle(name='CoverMeta', parent=ss['Normal'], fontSize=10, leading=14,
                          textColor=colors.HexColor('#fca5a5'), alignment=TA_LEFT))
    ss.add(ParagraphStyle(name='ReportH1', parent=ss['Heading1'], fontSize=18, leading=22,
                          textColor=DARK, spaceBefore=4, spaceAfter=6, alignment=TA_LEFT))
    ss.add(ParagraphStyle(name='ReportH2', parent=ss['Heading2'], fontSize=14, leading=18,
                          textColor=ROSE, spaceBefore=16, spaceAfter=8, alignment=TA_LEFT))
    ss.add(ParagraphStyle(name='ReportH3', parent=ss['Heading3'], fontSize=11, leading=14,
                          textColor=SLATE, spaceBefore=10, spaceAfter=4, alignment=TA_LEFT))
    ss.add(ParagraphStyle(name='Body', parent=ss['Normal'], fontSize=10, leading=15,
                          textColor=SLATE, alignment=TA_JUSTIFY, spaceAfter=8))
    ss.add(ParagraphStyle(name='BodyLeft', parent=ss['Normal'], fontSize=10, leading=15,
                          textColor=SLATE, alignment=TA_LEFT, spaceAfter=8))
    ss.add(ParagraphStyle(name='Caption', parent=ss['Normal'], fontSize=9, leading=12,
                          textColor=MUTED, alignment=TA_CENTER, spaceBefore=4, spaceAfter=12,
                          fontStyle='italic'))
    ss.add(ParagraphStyle(name='Small', parent=ss['Normal'], fontSize=9, leading=12,
                          textColor=SLATE, alignment=TA_LEFT))
    ss.add(ParagraphStyle(name='SmallCenter', parent=ss['Normal'], fontSize=9, leading=12,
                          textColor=SLATE, alignment=TA_CENTER))
    ss.add(ParagraphStyle(name='StatLabel', parent=ss['Normal'], fontSize=8, leading=10,
                          textColor=MUTED, alignment=TA_LEFT))
    ss.add(ParagraphStyle(name='StatValue', parent=ss['Normal'], fontSize=20, leading=24,
                          textColor=DARK, alignment=TA_LEFT, fontName='Helvetica-Bold'))
    ss.add(ParagraphStyle(name='Callout', parent=ss['Normal'], fontSize=9, leading=13,
                          textColor=SLATE, alignment=TA_LEFT, spaceAfter=6,
                          leftIndent=8, rightIndent=8))
    return ss


STYLES = build_styles()


# === PAGE DECORATIONS ===
def cover_page(canvas, doc):
    """Full-bleed gradient cover page."""
    canvas.saveState()
    w, h = A4
    # Background gradient (simulated with overlapping rects)
    canvas.setFillColor(colors.HexColor('#881337'))
    canvas.rect(0, 0, w, h, fill=1, stroke=0)
    canvas.setFillColor(colors.HexColor('#9f1239'))
    canvas.rect(0, h * 0.45, w, h * 0.55, fill=1, stroke=0)
    canvas.setFillColor(colors.HexColor('#be123c'))
    canvas.rect(0, h * 0.75, w, h * 0.25, fill=1, stroke=0)

    # Decorative circles (subtle)
    canvas.setFillColor(colors.HexColor('#fda4af'))
    canvas.setFillAlpha(0.08)
    canvas.circle(w - 40 * mm, h - 60 * mm, 80 * mm, fill=1, stroke=0)
    canvas.circle(20 * mm, 40 * mm, 60 * mm, fill=1, stroke=0)
    canvas.setFillAlpha(1)

    # Top brand bar
    canvas.setFillColor(WHITE)
    canvas.setFont('Helvetica-Bold', 11)
    canvas.drawString(20 * mm, h - 20 * mm, 'BBMS GHANA')
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(colors.HexColor('#fecaca'))
    canvas.drawString(20 * mm, h - 25 * mm, 'Cloud-Based Blood Bank Management System')

    # Bottom footer
    canvas.setStrokeColor(colors.HexColor('#fda4af'))
    canvas.setLineWidth(0.5)
    canvas.line(20 * mm, 18 * mm, w - 20 * mm, 18 * mm)
    canvas.setFillColor(colors.HexColor('#fecaca'))
    canvas.setFont('Helvetica', 8)
    canvas.drawString(20 * mm, 12 * mm, 'Cloud-Based Blood Bank Management System')
    canvas.drawRightString(w - 20 * mm, 12 * mm, 'Ghana · 2026')
    canvas.restoreState()


def content_page(canvas, doc):
    """Header + footer for content pages."""
    canvas.saveState()
    w, h = A4
    # Header bar
    canvas.setFillColor(ROSE)
    canvas.rect(0, h - 12 * mm, w, 12 * mm, fill=1, stroke=0)
    canvas.setFillColor(WHITE)
    canvas.setFont('Helvetica-Bold', 9)
    canvas.drawString(15 * mm, h - 8 * mm, 'BBMS GHANA')
    canvas.setFont('Helvetica', 8)
    canvas.drawRightString(w - 15 * mm, h - 8 * mm, 'Blood Bank Management Report')

    # Footer
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(15 * mm, 15 * mm, w - 15 * mm, 15 * mm)
    canvas.setFillColor(MUTED)
    canvas.setFont('Helvetica', 8)
    canvas.drawString(15 * mm, 10 * mm, f'Generated {datetime.now().strftime("%d %B %Y at %H:%M")} · BBMS Ghana')
    canvas.drawRightString(w - 15 * mm, 10 * mm, f'Page {doc.page}')
    canvas.restoreState()


# === CHART BUILDERS ===
def make_blood_group_bar_chart(stock_by_group):
    groups = sorted(stock_by_group.keys())
    available = [stock_by_group[g].get('available', 0) for g in groups]
    expired = [stock_by_group[g].get('expired', 0) for g in groups]
    reserved = [stock_by_group[g].get('reserved', 0) for g in groups]

    drawing = Drawing(440, 210)
    bc = VerticalBarChart()
    bc.x = 45
    bc.y = 30
    bc.height = 140
    bc.width = 370
    bc.data = [available, reserved, expired]
    bc.bars[0].fillColor = EMERALD
    bc.bars[1].fillColor = AMBER
    bc.bars[2].fillColor = ROSE
    bc.barWidth = 6
    bc.groupSpacing = 10
    bc.categoryAxis.categoryNames = groups
    bc.categoryAxis.labels.fontSize = 9
    bc.categoryAxis.labels.fillColor = DARK
    bc.categoryAxis.labels.fontName = 'Helvetica-Bold'
    bc.valueAxis.valueMin = 0
    bc.valueAxis.valueMax = max(max(available), max(reserved), max(expired), 5) + 2
    bc.valueAxis.labels.fontSize = 8
    bc.valueAxis.labels.fillColor = MUTED
    bc.valueAxis.visibleGrid = True
    bc.valueAxis.gridStrokeColor = BORDER
    bc.valueAxis.gridStrokeWidth = 0.25
    bc.valueAxis.gridStrokeDashArray = (2, 2)
    drawing.add(bc)

    # Title
    drawing.add(String(45, 192, 'Units by Blood Group', fontName='Helvetica-Bold', fontSize=11, fillColor=DARK))
    # Legend
    drawing.add(Rect(220, 192, 8, 8, fillColor=EMERALD, strokeColor=None))
    drawing.add(String(231, 193, 'Available', fontName='Helvetica', fontSize=8, fillColor=SLATE))
    drawing.add(Rect(295, 192, 8, 8, fillColor=AMBER, strokeColor=None))
    drawing.add(String(306, 193, 'Reserved', fontName='Helvetica', fontSize=8, fillColor=SLATE))
    drawing.add(Rect(360, 192, 8, 8, fillColor=ROSE, strokeColor=None))
    drawing.add(String(371, 193, 'Expired', fontName='Helvetica', fontSize=8, fillColor=SLATE))
    return drawing


def make_component_pie(component_dist):
    components = list(component_dist.keys())
    values = [component_dist[c] for c in components]
    if not components:
        return None

    drawing = Drawing(440, 200)
    pie = PieChart()
    pie.x = 30
    pie.y = 25
    pie.width = 130
    pie.height = 130
    pie.data = values
    pie.labels = None
    pie.slices.strokeWidth = 1.5
    pie.slices.strokeColor = WHITE
    for i in range(len(values)):
        pie.slices[i].fillColor = COMPONENT_COLORS[i % len(COMPONENT_COLORS)]
    drawing.add(pie)

    # Title
    drawing.add(String(30, 175, 'Available Units by Component Type', fontName='Helvetica-Bold', fontSize=11, fillColor=DARK))

    # Legend with values
    total = sum(values)
    lx = 220
    ly = 155
    for i, comp in enumerate(components):
        y = ly - i * 18
        drawing.add(Rect(lx, y, 9, 9, fillColor=COMPONENT_COLORS[i % len(COMPONENT_COLORS)], strokeColor=None))
        pct = (values[i] / total * 100) if total else 0
        drawing.add(String(lx + 13, y + 1, f'{comp}', fontName='Helvetica-Bold', fontSize=9, fillColor=DARK))
        drawing.add(String(lx + 13 + 130, y + 1, f'{values[i]} units ({pct:.0f}%)', fontName='Helvetica', fontSize=9, fillColor=SLATE))
    return drawing


def make_status_bar_chart(status_dict, title, color=SKY):
    items = sorted(status_dict.items(), key=lambda x: -x[1])
    if not items:
        return None
    labels = [k for k, _ in items]
    values = [v for _, v in items]

    drawing = Drawing(440, 190)
    bc = VerticalBarChart()
    bc.x = 50
    bc.y = 30
    bc.height = 120
    bc.width = 360
    bc.data = [values]
    bc.bars[0].fillColor = color
    bc.barWidth = 18
    bc.groupSpacing = 14
    bc.categoryAxis.categoryNames = labels
    bc.categoryAxis.labels.fontSize = 8
    bc.categoryAxis.labels.fillColor = DARK
    bc.valueAxis.valueMin = 0
    bc.valueAxis.valueMax = max(values) + 1
    bc.valueAxis.labels.fontSize = 8
    bc.valueAxis.labels.fillColor = MUTED
    bc.valueAxis.visibleGrid = True
    bc.valueAxis.gridStrokeColor = BORDER
    bc.valueAxis.gridStrokeWidth = 0.25
    bc.valueAxis.gridStrokeDashArray = (2, 2)
    drawing.add(bc)

    # Value labels on top of bars
    for i, v in enumerate(values):
        x = bc.x + 20 + i * (bc.barWidth + bc.groupSpacing)
        drawing.add(String(x, bc.y + bc.height + 4, str(v), fontName='Helvetica-Bold', fontSize=9, fillColor=DARK, textAnchor='middle'))

    drawing.add(String(50, 170, title, fontName='Helvetica-Bold', fontSize=11, fillColor=DARK))
    return drawing


def make_storage_chart(storage_data):
    """Horizontal bar chart for storage utilization - handles many items cleanly.
    Returns a list of drawings (one per page if many storage units)."""
    if not storage_data:
        return []

    from reportlab.graphics.charts.barcharts import HorizontalBarChart

    drawings = []
    # Split into chunks of 10 per chart page
    chunk_size = 10
    chunks = [storage_data[i:i + chunk_size] for i in range(0, len(storage_data), chunk_size)]

    for chunk_idx, chunk in enumerate(chunks):
        names = [s['name'][:26] for s in chunk]
        used = [s.get('used', 0) for s in chunk]
        capacity = [s.get('capacity', 0) for s in chunk]

        n = len(chunk)
        # Calculate height based on number of items - each item needs ~22px
        bar_area_h = max(120, n * 22)
        chart_h = bar_area_h + 50
        drawing = Drawing(460, chart_h)

        bc = HorizontalBarChart()
        bc.x = 170  # left margin for labels
        bc.y = 20
        bc.height = bar_area_h
        bc.width = 260
        bc.data = [used, capacity]
        bc.bars[0].fillColor = VIOLET
        bc.bars[1].fillColor = BORDER_DARK
        bc.barWidth = 6
        bc.groupSpacing = 8
        bc.categoryAxis.categoryNames = names
        bc.categoryAxis.labels.fontSize = 7
        bc.categoryAxis.labels.fillColor = DARK
        bc.categoryAxis.labels.textAnchor = 'end'
        bc.valueAxis.valueMin = 0
        bc.valueAxis.valueMax = max(max(used), max(capacity), 10) + 5
        bc.valueAxis.labels.fontSize = 8
        bc.valueAxis.labels.fillColor = MUTED
        bc.valueAxis.visibleGrid = True
        bc.valueAxis.gridStrokeColor = BORDER
        bc.valueAxis.gridStrokeWidth = 0.25
        bc.valueAxis.gridStrokeDashArray = (2, 2)
        drawing.add(bc)

        # Title and legend only on first chunk
        if chunk_idx == 0:
            drawing.add(String(10, chart_h - 15, 'Storage Unit Utilization (Used vs Capacity)',
                               fontName='Helvetica-Bold', fontSize=11, fillColor=DARK))
            drawing.add(Rect(280, chart_h - 18, 8, 8, fillColor=VIOLET, strokeColor=None))
            drawing.add(String(291, chart_h - 17, 'Used', fontName='Helvetica', fontSize=8, fillColor=SLATE))
            drawing.add(Rect(335, chart_h - 18, 8, 8, fillColor=BORDER_DARK, strokeColor=None))
            drawing.add(String(346, chart_h - 17, 'Capacity', fontName='Helvetica', fontSize=8, fillColor=SLATE))
        else:
            drawing.add(String(10, chart_h - 15, f'Storage Unit Utilization (continued, {chunk_idx * chunk_size + 1}-{chunk_idx * chunk_size + n})',
                               fontName='Helvetica-Bold', fontSize=10, fillColor=MUTED))

        drawings.append(drawing)

    return drawings


# === TABLE BUILDERS ===
def make_stat_grid(summary):
    cells = [
        ('Total Units', summary.get('totalUnits', 0), DARK),
        ('Available', summary.get('available', 0), EMERALD),
        ('Reserved', summary.get('reserved', 0), AMBER),
        ('Issued', summary.get('issued', 0), SKY),
    ]
    rows = []
    for i in range(0, len(cells), 4):
        row = []
        for j in range(4):
            if i + j < len(cells):
                label, value, color = cells[i + j]
                inner = Table([
                    [Paragraph(f'<font color="#{color.hexval()[2:]}" size="8">{label.upper()}</font>', STYLES['Small'])],
                    [Paragraph(f'<font size="22" color="#{DARK.hexval()[2:]}"><b>{value}</b></font>', STYLES['Small'])],
                ], colWidths=[(A4[0] - 30 * mm) / 4 - 2])
                inner.setStyle(TableStyle([
                    ('LEFTPADDING', (0, 0), (-1, -1), 8),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                    ('TOPPADDING', (0, 0), (-1, -1), 6),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                    ('BACKGROUND', (0, 0), (-1, -1), LIGHTER),
                    ('LINEBELOW', (0, 0), (-1, 0), 0.5, BORDER),
                ]))
                row.append(inner)
            else:
                row.append('')
        rows.append(row)
    col_w = (A4[0] - 30 * mm) / 4
    t = Table(rows, colWidths=[col_w] * 4, rowHeights=[24 * mm] * len(rows))
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 1),
        ('RIGHTPADDING', (0, 0), (-1, -1), 1),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    return t


def make_blood_group_table(stock_by_group):
    header = ['Blood Group', 'Available', 'Total', 'Expired', 'Reserved', 'Issued']
    rows = [header]
    for g in sorted(stock_by_group.keys()):
        v = stock_by_group[g]
        rows.append([g, str(v.get('available', 0)), str(v.get('total', 0)),
                     str(v.get('expired', 0)), str(v.get('reserved', 0)), str(v.get('issued', 0))])
    # Totals row
    totals = ['TOTAL', str(sum(v.get('available', 0) for v in stock_by_group.values())),
              str(sum(v.get('total', 0) for v in stock_by_group.values())),
              str(sum(v.get('expired', 0) for v in stock_by_group.values())),
              str(sum(v.get('reserved', 0) for v in stock_by_group.values())),
              str(sum(v.get('issued', 0) for v in stock_by_group.values()))]
    rows.append(totals)

    col_w = (A4[0] - 30 * mm) / 6
    t = Table(rows, colWidths=[col_w] * 6)
    style = [
        ('BACKGROUND', (0, 0), (-1, 0), DARK),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [WHITE, LIGHTER]),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        # Totals row
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#fef2f2')),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0, -1), (-1, -1), DARK),
        ('LINEABOVE', (0, -1), (-1, -1), 1, ROSE),
    ]
    # Blood group color column
    for i, g in enumerate(sorted(stock_by_group.keys())):
        if g in BLOOD_GROUP_COLORS:
            style.append(('BACKGROUND', (0, i + 1), (0, i + 1), BLOOD_GROUP_COLORS[g]))
            style.append(('TEXTCOLOR', (0, i + 1), (0, i + 1), WHITE))
            style.append(('FONTNAME', (0, i + 1), (0, i + 1), 'Helvetica-Bold'))
    t.setStyle(TableStyle(style))
    return t


def make_storage_table(storage_data):
    if not storage_data:
        return None
    header = ['Storage Unit', 'Category', 'Used', 'Capacity', 'Utilization']
    rows = [header]
    for s in storage_data:
        util = s.get('utilization', 0)
        rows.append([s.get('name', ''), s.get('category', ''), str(s.get('used', 0)),
                     str(s.get('capacity', 0)), f'{util}%'])
    col_w = [(A4[0] - 30 * mm) * x for x in [0.34, 0.26, 0.12, 0.14, 0.14]]
    t = Table(rows, colWidths=col_w)
    style = [
        ('BACKGROUND', (0, 0), (-1, 0), VIOLET),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ALIGN', (2, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, LIGHTER]),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]
    # Color the utilization column
    for i, s in enumerate(storage_data):
        util = s.get('utilization', 0)
        if util > 90:
            style.append(('TEXTCOLOR', (4, i + 1), (4, i + 1), ROSE))
            style.append(('FONTNAME', (4, i + 1), (4, i + 1), 'Helvetica-Bold'))
        elif util > 70:
            style.append(('TEXTCOLOR', (4, i + 1), (4, i + 1), AMBER))
            style.append(('FONTNAME', (4, i + 1), (4, i + 1), 'Helvetica-Bold'))
        else:
            style.append(('TEXTCOLOR', (4, i + 1), (4, i + 1), EMERALD))
            style.append(('FONTNAME', (4, i + 1), (4, i + 1), 'Helvetica-Bold'))
    t.setStyle(TableStyle(style))
    return t


def make_activity_table(activity):
    if not activity:
        return None
    header = ['Timestamp', 'Action', 'Description', 'User']
    rows = [header]
    for a in activity[:12]:
        ts = a.get('createdAt', '')[:16].replace('T', ' ')
        rows.append([ts, a.get('action', ''), a.get('description', '')[:55], a.get('user', '')[:22]])
    col_w = [(A4[0] - 30 * mm) * x for x in [0.18, 0.14, 0.46, 0.22]]
    t = Table(rows, colWidths=col_w)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), DARK),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, LIGHTER]),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    return t


def make_status_table(status_dict, title):
    if not status_dict:
        return None
    items = sorted(status_dict.items(), key=lambda x: -x[1])
    rows = [[title, 'Count']]
    for k, v in items:
        rows.append([k, str(v)])
    total = sum(v for _, v in items)
    rows.append(['Total', str(total)])
    col_w = [(A4[0] - 30 * mm) * x for x in [0.7, 0.3]]
    t = Table(rows, colWidths=col_w)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SLATE),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [WHITE, LIGHTER]),
        ('BACKGROUND', (0, -1), (-1, -1), LIGHTER),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('LINEABOVE', (0, -1), (-1, -1), 1, SLATE),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    return t


# === MAIN ===
def main():
    if len(sys.argv) < 3:
        print('Usage: generate_report_pdf.py <json_file> <output_pdf>', file=sys.stderr)
        sys.exit(1)

    json_file = sys.argv[1]
    output_pdf = sys.argv[2]

    with open(json_file) as f:
        data = json.load(f)

    doc = SimpleDocTemplate(
        output_pdf,
        pagesize=A4,
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
        title='BBMS Ghana - Blood Bank Management Report',
        author='BBMS Ghana',
        subject='Blood Bank Inventory & Activity Report',
        creator='BBMS Ghana System',
    )

    story = []
    summary = data.get('summary', {})
    stock = data.get('stockByGroup', {})
    component = data.get('componentDist', {})
    ir = data.get('internalRequests', {})
    nr = data.get('networkRequests', {})
    storage = data.get('storageUtilization', [])
    activity = data.get('recentActivity', [])
    facility = data.get('facility') or {}
    period = data.get('period') or {}

    facility_name = facility.get('name', 'All Registered Facilities') if isinstance(facility, dict) else 'All Registered Facilities'
    facility_type = facility.get('type', '') if isinstance(facility, dict) else ''
    facility_region = facility.get('region', '') if isinstance(facility, dict) else ''
    period_str = f"{period.get('from', 'Beginning')} to {period.get('to', 'Present')}" if (period.get('from') or period.get('to')) else 'All recorded data'

    # ============= COVER PAGE =============
    # Spacer to push content down on cover
    story.append(Spacer(1, 70 * mm))
    story.append(Paragraph('Blood Bank Management Report', STYLES['CoverTitle']))
    story.append(Paragraph('Comprehensive Inventory &amp; Activity Analysis', STYLES['CoverSubtitle']))
    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph(f'<b>Facility:</b> {facility_name}', STYLES['CoverMeta']))
    if facility_type:
        story.append(Paragraph(f'<b>Type:</b> {facility_type}', STYLES['CoverMeta']))
    if facility_region:
        story.append(Paragraph(f'<b>Region:</b> {facility_region} Region, Ghana', STYLES['CoverMeta']))
    story.append(Paragraph(f'<b>Reporting Period:</b> {period_str}', STYLES['CoverMeta']))
    story.append(Paragraph(f'<b>Generated:</b> {datetime.now().strftime("%d %B %Y at %H:%M")}', STYLES['CoverMeta']))
    story.append(PageBreak())

    # ============= EXECUTIVE SUMMARY =============
    story.append(Paragraph('Executive Summary', STYLES['ReportH1']))
    story.append(Paragraph(
        f'This report presents a comprehensive analysis of blood bank operations at <b>{facility_name}</b> '
        f'for the period <b>{period_str}</b>. The report covers inventory status, blood group distribution, '
        f'component breakdown, internal and network request activity, storage utilization, and a recent '
        f'activity audit trail. The data is intended to support operational decision-making, regulatory '
        f'compliance, and continuous improvement of transfusion services.',
        STYLES['Body']
    ))
    story.append(Spacer(1, 6))

    # Key metrics callout
    story.append(Paragraph('Key Metrics at a Glance', STYLES['ReportH3']))
    story.append(make_stat_grid(summary))
    story.append(Spacer(1, 10))

    # Narrative interpretation
    total = summary.get('totalUnits', 0)
    available = summary.get('available', 0)
    expired = summary.get('expired', 0)
    discarded = summary.get('discarded', 0)
    near_expiry = summary.get('nearExpiry', 0)
    avail_pct = (available / total * 100) if total else 0

    narrative = (
        f'As of this report, the facility holds a total of <b>{total}</b> blood units across all blood groups '
        f'and component types. Of these, <b>{available}</b> units ({avail_pct:.1f}%) are currently available '
        f'for transfusion, while <b>{expired}</b> units have expired and <b>{discarded}</b> have been discarded. '
    )
    if near_expiry > 0:
        narrative += f'A further <b>{near_expiry}</b> units are expiring within the next 5 days and require immediate prioritization for use. '
    if expired > 0:
        narrative += f'The presence of {expired} expired units indicates that expiry monitoring protocols should be reviewed to minimize future wastage. '
    narrative += 'These figures form the baseline for the detailed analysis presented in the following sections.'
    story.append(Paragraph(narrative, STYLES['Body']))
    story.append(PageBreak())

    # ============= SECTION 1: BLOOD GROUP DISTRIBUTION =============
    story.append(Paragraph('1. Blood Group Stock Distribution', STYLES['ReportH2']))
    story.append(Paragraph(
        'The chart below illustrates the current stock levels for each of the eight major blood groups '
        '(A+, A-, B+, B-, AB+, AB-, O+, O-). Each group is broken down by status: <b>Available</b> (ready '
        'for transfusion), <b>Reserved</b> (held for a pending request), and <b>Expired</b> (no longer '
        'safe for use). This visualization enables blood bank officers to quickly identify which blood '
        'groups are well-stocked and which may require urgent replenishment or a network broadcast request.',
        STYLES['Body']
    ))
    story.append(Spacer(1, 4))
    story.append(make_blood_group_bar_chart(stock))
    story.append(Paragraph('Figure 1: Blood group stock distribution by status', STYLES['Caption']))
    story.append(PageBreak())

    # Detailed table
    story.append(Paragraph('Detailed Breakdown by Blood Group', STYLES['ReportH3']))
    story.append(Paragraph(
        'The table below provides exact figures for each blood group, including total units registered, '
        'units currently available, expired units, reserved units, and units already issued for transfusion. '
        'The final row presents the facility-wide totals.',
        STYLES['Body']
    ))
    story.append(Spacer(1, 4))
    story.append(make_blood_group_table(stock))
    story.append(Paragraph('Table 1: Detailed blood group stock breakdown', STYLES['Caption']))

    # Interpretation
    sorted_groups = sorted(stock.items(), key=lambda x: -x[1].get('available', 0))
    if sorted_groups:
        top_group, top_val = sorted_groups[0]
        low_groups = [g for g, v in stock.items() if v.get('available', 0) < 5]
        interp = (
            f'<b>Interpretation:</b> The blood group with the highest available stock is <b>{top_group}</b> '
            f'with {top_val.get("available", 0)} units. '
        )
        if low_groups:
            interp += (
                f'The following blood groups are below the minimum stock threshold of 5 units and may '
                f'require attention: <b>{", ".join(low_groups)}</b>. Consider prioritizing these groups '
                f'for the next donor recruitment drive or initiating a network broadcast request if '
                f'clinical demand is anticipated.'
            )
        else:
            interp += 'All blood groups are currently above the minimum stock threshold of 5 units.'
        story.append(Paragraph(interp, STYLES['Body']))
    story.append(PageBreak())

    # ============= SECTION 2: COMPONENT DISTRIBUTION =============
    story.append(Paragraph('2. Component Type Distribution', STYLES['ReportH2']))
    story.append(Paragraph(
        'Blood is processed into four primary component types, each with specific clinical uses and '
        'shelf lives: <b>Whole Blood</b> (35 days), <b>Red Blood Cells</b> (42 days), <b>Platelets</b> '
        '(5 days), and <b>Fresh Frozen Plasma</b> (1 year). The pie chart below shows the proportional '
        'distribution of currently available units across these component types, helping staff ensure '
        'a balanced inventory that meets diverse clinical needs.',
        STYLES['Body']
    ))
    story.append(Spacer(1, 4))
    pie = make_component_pie(component)
    if pie:
        story.append(pie)
        story.append(Paragraph('Figure 2: Available units by component type', STYLES['Caption']))

        # Interpretation
        total_comp = sum(component.values())
        sorted_comp = sorted(component.items(), key=lambda x: -x[1])
        if sorted_comp:
            top_comp, top_count = sorted_comp[0]
            top_pct = (top_count / total_comp * 100) if total_comp else 0
            interp = (
                f'<b>Interpretation:</b> <b>{top_comp}</b> represents the largest portion of available '
                f'inventory at {top_count} units ({top_pct:.0f}% of available stock). '
            )
            if 'Platelets' in component and component['Platelets'] / max(total_comp, 1) < 0.1:
                interp += 'Platelets represent a small fraction of inventory, which is expected given their short 5-day shelf life. Close monitoring is recommended to avoid shortages.'
            else:
                interp += 'The distribution appears balanced across component types, supporting diverse clinical transfusion needs.'
            story.append(Paragraph(interp, STYLES['Body']))
    else:
        story.append(Paragraph('<i>No available units to display.</i>', STYLES['Body']))
    story.append(PageBreak())

    # ============= SECTION 3: INTERNAL REQUESTS =============
    story.append(Paragraph('3. Internal Blood Requests', STYLES['ReportH2']))
    story.append(Paragraph(
        'Internal blood requests are submitted by nurses and doctors from clinical wards when a patient '
        'requires a transfusion. Each request specifies the blood group, quantity, urgency level, and '
        'patient reference. The Blood Bank Officer reviews each request, identifies a compatible available '
        'unit, and either approves, issues, or rejects the request. The chart below shows the current '
        'distribution of internal requests by their processing status.',
        STYLES['Body']
    ))
    story.append(Spacer(1, 4))
    status_chart = make_status_bar_chart(ir.get('byStatus', {}), 'Internal Requests by Status', SKY)
    if status_chart:
        story.append(status_chart)
        story.append(Paragraph('Figure 3: Internal blood requests by processing status', STYLES['Caption']))

        total_ir = ir.get('total', 0)
        pending = ir.get('byStatus', {}).get('Pending', 0)
        issued = ir.get('byStatus', {}).get('Issued', 0)
        rejected = ir.get('byStatus', {}).get('Rejected', 0)
        fulfil_rate = (issued / total_ir * 100) if total_ir else 0
        interp = (
            f'<b>Interpretation:</b> A total of <b>{total_ir}</b> internal requests were recorded during '
            f'the reporting period. Of these, <b>{issued}</b> were fulfilled (issuance rate: {fulfil_rate:.1f}%), '
            f'<b>{pending}</b> are currently pending review, and <b>{rejected}</b> were rejected. '
        )
        if pending > 0:
            interp += f'The {pending} pending request(s) require immediate attention from the blood bank officer to ensure timely patient care.'
        else:
            interp += 'No requests are currently pending, indicating efficient processing.'
        story.append(Paragraph(interp, STYLES['Body']))
    else:
        story.append(Paragraph('<i>No internal requests recorded during this period.</i>', STYLES['Body']))
    story.append(PageBreak())

    # Internal urgency
    story.append(Paragraph('Internal Requests by Urgency Level', STYLES['ReportH3']))
    story.append(Paragraph(
        'Requests are classified by urgency: <b>Routine</b> (non-urgent, planned transfusions), '
        '<b>Urgent</b> (needed within hours), and <b>Emergency</b> (immediate life-saving need). '
        'The chart below shows how requests are distributed across these urgency levels, which helps '
        'staff understand the acuity of demand and allocate resources accordingly.',
        STYLES['Body']
    ))
    story.append(Spacer(1, 4))
    urgency_chart = make_status_bar_chart(ir.get('byUrgency', {}), 'Internal Requests by Urgency', AMBER)
    if urgency_chart:
        story.append(urgency_chart)
        story.append(Paragraph('Figure 4: Internal requests by urgency level', STYLES['Caption']))
        emergencies = ir.get('byUrgency', {}).get('Emergency', 0)
        if emergencies > 0:
            story.append(Paragraph(
                f'<b>Interpretation:</b> {emergencies} emergency request(s) were recorded, indicating '
                f'critical patient situations that required immediate blood availability. The system\'s '
                f'ability to process these rapidly is essential for patient survival outcomes.',
                STYLES['Body']
            ))
    story.append(PageBreak())

    # ============= SECTION 4: NETWORK REQUESTS =============
    story.append(Paragraph('4. Network Blood Requests (Broadcast)', STYLES['ReportH2']))
    story.append(Paragraph(
        'The network broadcast feature is the flagship capability of the BBMS platform. When a facility '
        'lacks a required blood type, a Blood Bank Officer broadcasts a request to all registered '
        'facilities on the network. Facilities with matching available stock submit responses, and the '
        'requesting facility selects the most suitable response, reserves the unit, and confirms receipt '
        'upon patient arrival. This workflow directly addresses the "blind referral" problem identified '
        'in primary research, where up to 57.1% of surveyed facilities could not rule out a failed '
        'referral having occurred.',
        STYLES['Body']
    ))
    story.append(Spacer(1, 4))
    network_chart = make_status_bar_chart(nr.get('byStatus', {}), 'Network Requests by Status', VIOLET)
    if network_chart:
        story.append(network_chart)
        story.append(Paragraph('Figure 5: Network broadcast requests by status', STYLES['Caption']))

        total_nr = nr.get('total', 0)
        fulfilled = nr.get('byStatus', {}).get('Fulfilled', 0)
        open_reqs = nr.get('byStatus', {}).get('Open', 0) + nr.get('byStatus', {}).get('Partially Responded', 0)
        success_rate = (fulfilled / total_nr * 100) if total_nr else 0
        interp = (
            f'<b>Interpretation:</b> {total_nr} network broadcast request(s) were initiated during the '
            f'reporting period. Of these, <b>{fulfilled}</b> were successfully fulfilled (success rate: '
            f'{success_rate:.1f}%), and <b>{open_reqs}</b> are currently open awaiting responses. '
        )
        if total_nr > 0:
            interp += 'This demonstrates the system\'s ability to connect facilities and facilitate cross-facility blood sharing, reducing the risk of failed referrals and preventable patient deaths.'
        story.append(Paragraph(interp, STYLES['Body']))
    else:
        story.append(Paragraph('<i>No network requests recorded during this period.</i>', STYLES['Body']))
    story.append(PageBreak())

    # Network by blood group
    if nr.get('byGroup'):
        story.append(Paragraph('Network Requests by Blood Group', STYLES['ReportH3']))
        story.append(Paragraph(
            'The chart below shows which blood groups are most frequently requested across the network. '
            'This information helps facility administrators anticipate demand and prioritize donor '
            'recruitment for high-demand groups.',
            STYLES['Body']
        ))
        story.append(Spacer(1, 4))
        network_group_chart = make_status_bar_chart(nr.get('byGroup', {}), 'Network Requests by Blood Group', ROSE)
        if network_group_chart:
            story.append(network_group_chart)
            story.append(Paragraph('Figure 6: Network requests by blood group', STYLES['Caption']))
        story.append(PageBreak())

    # ============= SECTION 5: STORAGE UTILIZATION =============
    story.append(Paragraph('5. Storage Unit Utilization', STYLES['ReportH2']))
    story.append(Paragraph(
        'Proper storage is critical for blood safety. Each storage unit is categorized by temperature: '
        '<b>Refrigerated</b> (1-6°C for Whole Blood and Red Blood Cells), <b>Frozen</b> (-18°C and below '
        'for Fresh Frozen Plasma), and <b>Room Temperature</b> (20-24°C). The chart below compares '
        'current usage against maximum capacity for each storage unit, helping staff identify units '
        'that are nearing capacity and may require load redistribution.',
        STYLES['Body']
    ))
    story.append(Spacer(1, 4))
    storage_charts = make_storage_chart(storage)
    if storage_charts:
        for idx, chart in enumerate(storage_charts):
            story.append(chart)
            if idx == 0:
                story.append(Paragraph(f'Figure 7: Storage unit utilization (used vs capacity){f" — page 1 of {len(storage_charts)}" if len(storage_charts) > 1 else ""}', STYLES['Caption']))
            else:
                story.append(Paragraph(f'Figure 7{chr(97 + idx)}: Storage unit utilization (continued, page {idx + 1} of {len(storage_charts)})', STYLES['Caption']))
            if idx < len(storage_charts) - 1:
                story.append(PageBreak())
    story.append(Spacer(1, 6))
    storage_table = make_storage_table(storage)
    if storage_table:
        story.append(PageBreak())
        story.append(Paragraph('Detailed Storage Utilization Breakdown', STYLES['ReportH3']))
        story.append(Paragraph(
            'The table below provides exact figures for each storage unit, including the current number '
            'of blood units stored, maximum capacity, and utilization percentage. Utilization is '
            'color-coded: green for healthy (below 70%), amber for monitoring (70-90%), and red for '
            'critical (above 90%).',
            STYLES['Body']
        ))
        story.append(storage_table)
        story.append(Paragraph('Table 2: Detailed storage utilization breakdown', STYLES['Caption']))

        # Interpretation
        over_90 = [s for s in storage if s.get('utilization', 0) > 90]
        over_70 = [s for s in storage if 70 < s.get('utilization', 0) <= 90]
        if over_90:
            names = ', '.join(s['name'] for s in over_90)
            story.append(Paragraph(
                f'<b>Interpretation:</b> The following storage unit(s) are above 90% capacity and require '
                f'immediate attention: <b>{names}</b>. Consider redistributing units to other storage '
                f'equipment or processing older units first.',
                STYLES['Body']
            ))
        elif over_70:
            names = ', '.join(s['name'] for s in over_70)
            story.append(Paragraph(
                f'<b>Interpretation:</b> The following storage unit(s) are between 70-90% capacity and '
                f'should be monitored: <b>{names}</b>.',
                STYLES['Body']
            ))
        else:
            story.append(Paragraph(
                '<b>Interpretation:</b> All storage units are operating below 70% capacity, indicating '
                'healthy storage headroom for incoming donations.',
                STYLES['Body']
            ))
    story.append(PageBreak())

    # ============= SECTION 6: RECENT ACTIVITY =============
    story.append(Paragraph('6. Recent Activity (Audit Trail)', STYLES['ReportH2']))
    story.append(Paragraph(
        'The BBMS platform maintains a tamper-resistant audit log of all significant system actions, '
        'including user logins, blood unit registrations, status changes, request processing, and '
        'network request activity. Audit logs are write-once and cannot be modified or deleted by any '
        'user role, ensuring a complete and verifiable record for regulatory compliance under Ghana\'s '
        'Data Protection Act 2012 (Act 843). The table below shows the most recent activity entries.',
        STYLES['Body']
    ))
    story.append(Spacer(1, 4))
    activity_table = make_activity_table(activity)
    if activity_table:
        story.append(activity_table)
        story.append(Paragraph('Table 3: Recent system activity (most recent 12 entries)', STYLES['Caption']))
    else:
        story.append(Paragraph('<i>No recent activity recorded.</i>', STYLES['Body']))
    story.append(Spacer(1, 10))

    # ============= REPORT FOOTER =============
    story.append(Spacer(1, 14))
    story.append(Paragraph('Report Generated', STYLES['ReportH3']))
    story.append(Paragraph(
        f'This report was generated by the BBMS Ghana Cloud-Based Blood Bank Management System on '
        f'{datetime.now().strftime("%d %B %Y at %H:%M")} for {facility_name}. '
        f'The data presented reflects system records as of the generation timestamp. '
        f'For questions or corrections, contact the System Administrator.',
        STYLES['Body']
    ))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        '<b>BBMS Ghana</b> · Cloud-Based Blood Bank Management System · Ghana · 2026',
        STYLES['Caption']
    ))

    # Build with different page templates: cover vs content
    from reportlab.platypus.doctemplate import BaseDocTemplate, PageTemplate
    from reportlab.platypus.frames import Frame

    # We need a custom doc template to have different decorations for cover vs content
    doc = BaseDocTemplate(
        output_pdf,
        pagesize=A4,
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
        title='BBMS Ghana - Blood Bank Management Report',
        author='BBMS Ghana',
        subject='Blood Bank Inventory & Activity Report',
        creator='BBMS Ghana System',
    )

    cover_frame = Frame(15 * mm, 15 * mm, A4[0] - 30 * mm, A4[1] - 30 * mm, id='cover', showBoundary=0,
                        leftPadding=5 * mm, rightPadding=5 * mm, topPadding=0, bottomPadding=0)
    content_frame = Frame(15 * mm, 18 * mm, A4[0] - 30 * mm, A4[1] - 38 * mm, id='content', showBoundary=0,
                          leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)

    doc.addPageTemplates([
        PageTemplate(id='cover', frames=[cover_frame], onPage=cover_page),
        PageTemplate(id='content', frames=[content_frame], onPage=content_page),
    ])

    # Insert a NextPageTemplate to switch from cover to content
    from reportlab.platypus import NextPageTemplate
    # Find the first PageBreak (after cover) and insert template switch before it
    new_story = []
    inserted = False
    for item in story:
        if not inserted and isinstance(item, PageBreak):
            new_story.append(NextPageTemplate('content'))
            new_story.append(item)
            inserted = True
        else:
            new_story.append(item)

    doc.build(new_story)
    print(f'PDF generated: {output_pdf}')


if __name__ == '__main__':
    main()
