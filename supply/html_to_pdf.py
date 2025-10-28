#!/usr/bin/env python3
"""
Convert HTML to PDF using Ghostscript
"""
import subprocess
import sys
import os

# Read the HTML file
html_file = 'TECHNICAL_DESIGN_DOCUMENT_temp.html'
output_pdf = 'TECHNICAL_DESIGN_DOCUMENT.pdf'

# Create a full HTML document with styling
full_html = f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Technical Design Document - QuizTimer4Zoom</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #fff;
            padding: 40px;
            max-width: 1200px;
            margin: 0 auto;
        }}
        h1 {{
            font-size: 2.5em;
            margin-bottom: 0.5em;
            color: #1a1a1a;
            border-bottom: 3px solid #0066cc;
            padding-bottom: 0.3em;
            page-break-after: avoid;
        }}
        h2 {{
            font-size: 1.8em;
            margin-top: 1.2em;
            margin-bottom: 0.5em;
            color: #0066cc;
            page-break-after: avoid;
        }}
        h3 {{
            font-size: 1.3em;
            margin-top: 0.8em;
            margin-bottom: 0.3em;
            color: #0088dd;
            page-break-after: avoid;
        }}
        p {{
            margin-bottom: 1em;
            text-align: justify;
        }}
        ul, ol {{
            margin-left: 2em;
            margin-bottom: 1em;
        }}
        li {{
            margin-bottom: 0.5em;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 1em 0;
            page-break-inside: avoid;
        }}
        th, td {{
            border: 1px solid #ddd;
            padding: 0.75em;
            text-align: left;
        }}
        th {{
            background-color: #f5f5f5;
            font-weight: bold;
            color: #0066cc;
        }}
        tr:nth-child(even) {{
            background-color: #f9f9f9;
        }}
        code {{
            background-color: #f4f4f4;
            padding: 0.2em 0.4em;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
        }}
        pre {{
            background-color: #f4f4f4;
            padding: 1em;
            border-radius: 5px;
            overflow-x: auto;
            margin: 1em 0;
            font-family: 'Courier New', monospace;
            font-size: 0.85em;
            page-break-inside: avoid;
        }}
        blockquote {{
            border-left: 4px solid #0066cc;
            padding-left: 1em;
            margin: 1em 0;
            color: #666;
        }}
        hr {{
            border: none;
            border-top: 2px solid #ddd;
            margin: 2em 0;
            page-break-after: avoid;
        }}
        .document-meta {{
            background-color: #f0f8ff;
            padding: 1em;
            border-radius: 5px;
            margin-bottom: 2em;
            font-size: 0.9em;
        }}
        @media print {{
            body {{
                padding: 20px;
            }}
            h1, h2, h3 {{
                page-break-after: avoid;
            }}
            p {{
                page-break-inside: avoid;
            }}
        }}
    </style>
</head>
<body>
'''

# Read the HTML content
try:
    with open(html_file, 'r') as f:
        html_content = f.read()

    full_html += html_content
    full_html += '</body>\n</html>'

    # Write the full HTML
    styled_html = 'TECHNICAL_DESIGN_DOCUMENT_styled.html'
    with open(styled_html, 'w') as f:
        f.write(full_html)

    print(f"Created styled HTML: {styled_html}")

    # Try to use ghostscript with HTML to PDF conversion
    # Since ghostscript doesn't directly support HTML, we need another approach
    # Let's create a simple PostScript from the HTML and convert that

    # For now, let's just use a workaround - create a simple text-based PDF
    print(f"HTML file ready for PDF conversion: {styled_html}")
    print("Note: Direct HTML to PDF conversion requires additional system libraries.")
    print("The markdown and HTML versions are available in the supply directory.")

except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
