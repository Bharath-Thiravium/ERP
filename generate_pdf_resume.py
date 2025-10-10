#!/usr/bin/env python3
"""
Enhanced Resume PDF Generator
Converts HTML resume to high-quality PDF optimized for ATS systems
"""

import os
import sys
from pathlib import Path

def install_requirements():
    """Install required packages if not available"""
    try:
        import weasyprint
        print("✓ WeasyPrint is available")
    except ImportError:
        print("Installing WeasyPrint...")
        os.system("pip install weasyprint")
        
    try:
        import pdfkit
        print("✓ pdfkit is available")
    except ImportError:
        print("Installing pdfkit...")
        os.system("pip install pdfkit")

def generate_pdf_weasyprint(html_file, output_file):
    """Generate PDF using WeasyPrint (recommended for better formatting)"""
    try:
        from weasyprint import HTML, CSS
        from weasyprint.text.fonts import FontConfiguration
        
        print("Generating PDF using WeasyPrint...")
        
        # Custom CSS for better PDF output
        pdf_css = CSS(string='''
            @page {
                size: A4;
                margin: 0.5in;
            }
            
            body {
                font-family: 'Arial', 'Helvetica', sans-serif;
                font-size: 11pt;
                line-height: 1.4;
            }
            
            .container {
                max-width: none;
                padding: 0;
            }
            
            .section {
                page-break-inside: avoid;
                margin-bottom: 20px;
            }
            
            .experience-item, .project-item, .education-item {
                page-break-inside: avoid;
                margin-bottom: 15px;
            }
            
            .header {
                page-break-after: avoid;
            }
            
            .skills-grid {
                display: block;
            }
            
            .skill-category {
                display: inline-block;
                width: 48%;
                margin-bottom: 10px;
                vertical-align: top;
            }
            
            .two-column {
                display: block;
            }
            
            .two-column > div {
                display: inline-block;
                width: 48%;
                vertical-align: top;
            }
        ''')
        
        font_config = FontConfiguration()
        html_doc = HTML(filename=html_file)
        
        html_doc.write_pdf(
            output_file,
            stylesheets=[pdf_css],
            font_config=font_config,
            optimize_images=True
        )
        
        print(f"✓ PDF generated successfully: {output_file}")
        return True
        
    except Exception as e:
        print(f"✗ WeasyPrint failed: {e}")
        return False

def generate_pdf_pdfkit(html_file, output_file):
    """Generate PDF using pdfkit (fallback option)"""
    try:
        import pdfkit
        
        print("Generating PDF using pdfkit...")
        
        options = {
            'page-size': 'A4',
            'margin-top': '0.5in',
            'margin-right': '0.5in',
            'margin-bottom': '0.5in',
            'margin-left': '0.5in',
            'encoding': "UTF-8",
            'no-outline': None,
            'enable-local-file-access': None,
            'print-media-type': None,
            'disable-smart-shrinking': None,
        }
        
        pdfkit.from_file(html_file, output_file, options=options)
        print(f"✓ PDF generated successfully: {output_file}")
        return True
        
    except Exception as e:
        print(f"✗ pdfkit failed: {e}")
        return False

def main():
    """Main function to generate PDF resume"""
    current_dir = Path(__file__).parent
    html_file = current_dir / "enhanced_resume.html"
    output_file = current_dir / "R_Ilayaraja_Enhanced_Resume.pdf"
    
    if not html_file.exists():
        print(f"✗ HTML file not found: {html_file}")
        return
    
    print("🚀 Starting PDF generation...")
    print(f"📄 Input: {html_file}")
    print(f"📋 Output: {output_file}")
    
    # Install requirements
    install_requirements()
    
    # Try WeasyPrint first (better quality)
    success = generate_pdf_weasyprint(str(html_file), str(output_file))
    
    # Fallback to pdfkit if WeasyPrint fails
    if not success:
        print("Trying pdfkit as fallback...")
        success = generate_pdf_pdfkit(str(html_file), str(output_file))
    
    if success:
        print(f"\n🎉 Resume PDF generated successfully!")
        print(f"📁 Location: {output_file}")
        print(f"📊 File size: {output_file.stat().st_size / 1024:.1f} KB")
        
        # Verify file exists and has content
        if output_file.exists() and output_file.stat().st_size > 1000:
            print("✅ PDF file is valid and ready for use!")
            print("\n📋 ATS Optimization Features:")
            print("  • Clean, professional layout")
            print("  • ATS-friendly fonts and formatting")
            print("  • Keyword-optimized content")
            print("  • Proper section headers")
            print("  • Contact information clearly visible")
            print("  • Skills section with relevant technologies")
            print("  • Quantified achievements and metrics")
        else:
            print("⚠️  PDF file may be corrupted or empty")
    else:
        print("❌ Failed to generate PDF with both methods")
        print("Please install wkhtmltopdf or check system dependencies")

if __name__ == "__main__":
    main()