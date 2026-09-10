"""Render the tracked manifesto into the site's shareable PDF."""
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4

ROOT = Path(__file__).resolve().parents[1]
body = ParagraphStyle('Body', fontName='Helvetica', fontSize=11, leading=16, textColor=HexColor('#26362e'), spaceAfter=13)
title = ParagraphStyle('Title', fontName='Helvetica-Bold', fontSize=27, leading=32, textColor=HexColor('#123c2a'), spaceAfter=22)
story = []
for section in (ROOT / 'docs/MANIFESTO.md').read_text(encoding='utf-8').split('\n---\n'):
    if story:
        story.append(PageBreak())
    for paragraph in section.strip().split('\n\n'):
        if paragraph.startswith('# Collaborator'):
            paragraph = paragraph.split('\n', 1)[1]
        heading = paragraph.startswith('## ')
        story.append(Paragraph(escape(paragraph[3:] if heading else paragraph), title if heading else body))

def furniture(canvas, doc):
    canvas.setFillColor(HexColor('#43795b'))
    canvas.setFont('Helvetica-Bold', 9)
    canvas.drawString(48, A4[1]-35, 'COLLABORATOR / THE MANIFESTO')
    canvas.setStrokeColor(HexColor('#b7d5bf'))
    canvas.line(48, 43, A4[0]-48, 43)
    canvas.setFont('Helvetica', 9)
    canvas.drawString(48, 28, 'Help make it exist.  |  Revised 10 September 2026')
    canvas.drawRightString(A4[0]-48, 28, str(doc.page))

SimpleDocTemplate(str(ROOT / 'public/vision.pdf'), pagesize=A4, leftMargin=48, rightMargin=48, topMargin=65, bottomMargin=60, title='Collaborator — Help make it exist', author='Collaborator').build(story, onFirstPage=furniture, onLaterPages=furniture)
