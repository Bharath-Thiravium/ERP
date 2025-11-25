#!/usr/bin/env python3
"""
PDF Template Analyzer for Quotation Templates
Analyzes AS, BKGE, and TC quotation templates to extract structure and styling
"""

import pdfplumber
import os
import json
from pathlib import Path

def analyze_pdf_template(pdf_path, template_name):
    """Analyze a single PDF template and extract structure information"""
    print(f"\n{'='*50}")
    print(f"ANALYZING: {template_name} Template")
    print(f"File: {pdf_path}")
    print(f"{'='*50}")
    
    template_info = {
        'name': template_name,
        'file_path': pdf_path,
        'pages': [],
        'colors': [],
        'fonts': [],
        'layout_structure': {}
    }
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            print(f"Total Pages: {len(pdf.pages)}")
            
            for page_num, page in enumerate(pdf.pages, 1):
                print(f"\n--- PAGE {page_num} ---")
                
                # Get page dimensions
                page_info = {
                    'page_number': page_num,
                    'width': page.width,
                    'height': page.height,
                    'text_elements': [],
                    'tables': [],
                    'images': [],
                    'lines': [],
                    'rectangles': []
                }
                
                print(f"Page Size: {page.width} x {page.height}")
                
                # Extract text with positioning
                chars = page.chars
                if chars:
                    print(f"Total Characters: {len(chars)}")
                    
                    # Group text by approximate lines
                    text_lines = []
                    current_line = []
                    current_y = None
                    
                    for char in chars:
                        if current_y is None or abs(char['y0'] - current_y) < 2:
                            current_line.append(char)
                            current_y = char['y0']
                        else:
                            if current_line:
                                line_text = ''.join([c['text'] for c in current_line])
                                if line_text.strip():
                                    text_lines.append({
                                        'text': line_text.strip(),
                                        'x': current_line[0]['x0'],
                                        'y': current_y,
                                        'font': current_line[0].get('fontname', 'Unknown'),
                                        'size': current_line[0].get('size', 0)
                                    })
                            current_line = [char]
                            current_y = char['y0']
                    
                    # Add last line
                    if current_line:
                        line_text = ''.join([c['text'] for c in current_line])
                        if line_text.strip():
                            text_lines.append({
                                'text': line_text.strip(),
                                'x': current_line[0]['x0'],
                                'y': current_y,
                                'font': current_line[0].get('fontname', 'Unknown'),
                                'size': current_line[0].get('size', 0)
                            })
                    
                    page_info['text_elements'] = text_lines
                    
                    # Print key text elements
                    print("\nKEY TEXT ELEMENTS:")
                    for i, line in enumerate(text_lines[:20]):  # First 20 lines
                        print(f"  {i+1:2d}. [{line['x']:6.1f}, {line['y']:6.1f}] {line['font'][:15]:15s} {line['size']:4.1f}pt: {line['text'][:60]}")
                
                # Extract tables
                tables = page.find_tables()
                if tables:
                    print(f"\nTABLES FOUND: {len(tables)}")
                    for i, table in enumerate(tables):
                        table_info = {
                            'table_number': i + 1,
                            'bbox': table.bbox,
                            'rows': len(table.rows) if table.rows else 0,
                            'cols': len(table.rows[0]) if table.rows and table.rows[0] else 0
                        }
                        page_info['tables'].append(table_info)
                        print(f"  Table {i+1}: {table_info['rows']} rows x {table_info['cols']} cols at {table.bbox}")
                
                # Extract images
                if hasattr(page, 'images'):
                    images = page.images
                    if images:
                        print(f"\nIMAGES FOUND: {len(images)}")
                        for i, img in enumerate(images):
                            img_info = {
                                'image_number': i + 1,
                                'bbox': [img['x0'], img['y0'], img['x1'], img['y1']],
                                'width': img['width'],
                                'height': img['height']
                            }
                            page_info['images'].append(img_info)
                            print(f"  Image {i+1}: {img['width']}x{img['height']} at [{img['x0']}, {img['y0']}, {img['x1']}, {img['y1']}]")
                
                # Extract lines and rectangles
                if hasattr(page, 'lines'):
                    lines = page.lines
                    if lines:
                        print(f"\nLINES FOUND: {len(lines)}")
                        page_info['lines'] = lines[:10]  # First 10 lines
                
                if hasattr(page, 'rects'):
                    rects = page.rects
                    if rects:
                        print(f"RECTANGLES FOUND: {len(rects)}")
                        page_info['rectangles'] = rects[:10]  # First 10 rectangles
                
                template_info['pages'].append(page_info)
                
                # Extract unique fonts
                unique_fonts = set()
                for char in chars:
                    if 'fontname' in char:
                        unique_fonts.add(char['fontname'])
                
                template_info['fonts'] = list(unique_fonts)
                print(f"\nFONTS USED: {', '.join(unique_fonts)}")
    
    except Exception as e:
        print(f"ERROR analyzing {template_name}: {str(e)}")
        template_info['error'] = str(e)
    
    return template_info

def main():
    """Main function to analyze all quotation templates"""
    print("PDF QUOTATION TEMPLATE ANALYZER")
    print("="*60)
    
    # Define template paths
    base_path = Path("/home/athenas/sap project/quotation")
    templates = [
        ("AS", base_path / "AS Quotation Template.pdf"),
        ("BKGE", base_path / "BKGE - Quo.pdf"),
        ("TC", base_path / "TC Quotation.pdf")
    ]
    
    all_templates_info = []
    
    # Analyze each template
    for template_name, pdf_path in templates:
        if pdf_path.exists():
            template_info = analyze_pdf_template(str(pdf_path), template_name)
            all_templates_info.append(template_info)
        else:
            print(f"ERROR: Template file not found: {pdf_path}")
    
    # Save analysis results
    output_file = Path("/home/athenas/sap project/backend/quotation_template_analysis.json")
    with open(output_file, 'w') as f:
        json.dump(all_templates_info, f, indent=2, default=str)
    
    print(f"\n{'='*60}")
    print(f"ANALYSIS COMPLETE!")
    print(f"Results saved to: {output_file}")
    print(f"Total templates analyzed: {len(all_templates_info)}")
    print(f"{'='*60}")
    
    # Print summary comparison
    print("\nTEMPLATE COMPARISON SUMMARY:")
    print("-" * 60)
    for template in all_templates_info:
        if 'error' not in template:
            page = template['pages'][0] if template['pages'] else {}
            print(f"{template['name']:6s}: {len(page.get('text_elements', [])):3d} text elements, "
                  f"{len(page.get('tables', [])):2d} tables, "
                  f"{len(page.get('images', [])):2d} images, "
                  f"{len(template.get('fonts', [])):2d} fonts")

if __name__ == "__main__":
    main()