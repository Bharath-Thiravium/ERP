"""
Quote generation views for CRM
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import serializers
from django.http import HttpResponse
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.html import escape
from datetime import timedelta
import io
import base64
from .quote_models import Quote, QuoteItem, QuoteTemplate, QuoteActivity, QuoteSignature
from .views import CRMBaseViewSet
from .security_utils import CRMSecurityValidator
from .error_handlers import safe_execute

# PDF generation
try:
    import weasyprint
    WEASYPRINT_AVAILABLE = True
except ImportError:
    WEASYPRINT_AVAILABLE = False

try:
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False


def _money(value):
    return f"Rs. {float(value or 0):,.2f}"


def _safe(value):
    return escape(str(value or ''))


def _company_logo_file_uri(company):
    try:
        if company and company.logo and company.logo.name:
            path = company.logo.path
            import os
            if os.path.exists(path):
                return f'file://{path}'
    except Exception:
        return ''
    return ''


class QuoteItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuoteItem
        fields = [
            'id', 'name', 'description', 'quantity', 'unit_price',
            'total_price', 'product_code', 'line_number'
        ]
        read_only_fields = ['id', 'total_price']


class QuoteTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuoteTemplate
        fields = [
            'id', 'name', 'description', 'header_content', 'footer_content',
            'terms_conditions', 'primary_color', 'secondary_color', 'logo_url',
            'is_default', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class QuoteSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.name', read_only=True)
    contact_name = serializers.SerializerMethodField()
    opportunity_name = serializers.CharField(source='opportunity.name', read_only=True)
    items = QuoteItemSerializer(source='quote_items', many=True, read_only=True)

    class Meta:
        model = Quote
        fields = [
            'id', 'quote_number', 'account', 'account_name', 'contact',
            'contact_name', 'opportunity', 'opportunity_name', 'template',
            'title', 'description', 'status', 'quote_date', 'valid_until',
            'sent_date', 'viewed_date', 'accepted_date', 'subtotal',
            'tax_rate', 'tax_amount', 'discount_percentage', 'discount_amount',
            'total_amount', 'notes', 'terms_conditions', 'view_count',
            'public_id', 'created_at', 'updated_at', 'items'
        ]
        read_only_fields = [
            'id', 'quote_number', 'status', 'quote_date', 'sent_date',
            'viewed_date', 'accepted_date', 'subtotal', 'tax_amount',
            'discount_amount', 'total_amount', 'view_count', 'public_id',
            'created_at', 'updated_at'
        ]

    def get_contact_name(self, obj):
        if not obj.contact:
            return ''
        return f"{obj.contact.first_name} {obj.contact.last_name}".strip()

class QuoteTemplateViewSet(CRMBaseViewSet):
    """Quote template management"""
    queryset = QuoteTemplate.objects.all()
    serializer_class = QuoteTemplateSerializer
    
    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return QuoteTemplate.objects.none()
        
        try:
            from authentication.models import ServiceUserSession
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return QuoteTemplate.objects.filter(company=session.service_user.company)
        except ServiceUserSession.DoesNotExist:
            return QuoteTemplate.objects.none()
    
    def create(self, request, *args, **kwargs):
        """Create quote template with validation"""
        return safe_execute(self._create_template, request, *args, **kwargs)
    
    def _create_template(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        session = self._validate_session(session_key)
        
        data = request.data.copy()
        
        # Validate and sanitize input
        required_fields = ['name']
        for field in required_fields:
            if field not in data or not data[field]:
                return Response({'error': f'{field} is required'}, status=status.HTTP_400_BAD_REQUEST)
            data[field] = CRMSecurityValidator.sanitize_input(data[field])
        
        # Optional fields
        optional_fields = ['description', 'header_content', 'footer_content', 'terms_conditions']
        for field in optional_fields:
            if field in data and data[field]:
                data[field] = CRMSecurityValidator.sanitize_input(data[field])
        
        # Create template
        template = QuoteTemplate.objects.create(
            company=session.service_user.company,
            name=data['name'],
            description=data.get('description', ''),
            header_content=data.get('header_content', ''),
            footer_content=data.get('footer_content', ''),
            terms_conditions=data.get('terms_conditions', ''),
            primary_color=data.get('primary_color', '#3B82F6'),
            secondary_color=data.get('secondary_color', '#6B7280'),
            logo_url=data.get('logo_url', ''),
            is_default=data.get('is_default', False),
            created_by=session.service_user
        )
        
        return Response({
            'id': template.id,
            'name': template.name,
            'message': 'Quote template created successfully'
        }, status=status.HTTP_201_CREATED)
    
    def _validate_session(self, session_key):
        """Validate session"""
        if not session_key:
            raise Exception('Session key required')
        
        from authentication.models import ServiceUserSession
        try:
            return ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        except ServiceUserSession.DoesNotExist:
            raise Exception('Invalid session')

class QuoteViewSet(CRMBaseViewSet):
    """Quote management"""
    queryset = Quote.objects.all()
    serializer_class = QuoteSerializer
    
    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return Quote.objects.none()
        
        try:
            from authentication.models import ServiceUserSession
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return Quote.objects.filter(company=session.service_user.company).select_related(
                'account', 'contact', 'opportunity', 'template'
            ).prefetch_related('quote_items')
        except ServiceUserSession.DoesNotExist:
            return Quote.objects.none()
    
    def create(self, request, *args, **kwargs):
        """Create quote with validation"""
        return safe_execute(self._create_quote, request, *args, **kwargs)
    
    def _create_quote(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        session = self._validate_session(session_key)
        
        data = request.data.copy()
        
        # Validate required fields
        required_fields = ['account_id', 'title', 'valid_until']
        for field in required_fields:
            if field not in data or not data[field]:
                return Response({'error': f'{field} is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate account exists
        from .models import Account
        try:
            account = Account.objects.get(id=data['account_id'], company=session.service_user.company)
        except Account.DoesNotExist:
            return Response({'error': 'Invalid account'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Sanitize inputs
        data['title'] = CRMSecurityValidator.sanitize_input(data['title'])
        if 'description' in data:
            data['description'] = CRMSecurityValidator.sanitize_input(data['description'])
        
        # Create quote
        quote = Quote.objects.create(
            company=session.service_user.company,
            account=account,
            contact_id=data.get('contact_id'),
            opportunity_id=data.get('opportunity_id'),
            template_id=data.get('template_id'),
            title=data['title'],
            description=data.get('description', ''),
            valid_until=data['valid_until'],
            tax_rate=data.get('tax_rate', 0),
            discount_percentage=data.get('discount_percentage', 0),
            notes=data.get('notes', ''),
            terms_conditions=data.get('terms_conditions', ''),
            created_by=session.service_user
        )
        
        # Add quote items
        items_data = data.get('items', [])
        for i, item_data in enumerate(items_data, 1):
            if not all(k in item_data for k in ['name', 'quantity', 'unit_price']):
                continue
            
            QuoteItem.objects.create(
                quote=quote,
                name=CRMSecurityValidator.sanitize_input(item_data['name']),
                description=CRMSecurityValidator.sanitize_input(item_data.get('description', '')),
                quantity=item_data['quantity'],
                unit_price=item_data['unit_price'],
                product_code=item_data.get('product_code', ''),
                line_number=i
            )
        
        # Log activity
        QuoteActivity.objects.create(
            quote=quote,
            activity_type='created',
            description=f'Quote created by {session.service_user.username}'
        )
        
        return Response({
            'id': quote.id,
            'quote_number': quote.quote_number,
            'message': 'Quote created successfully'
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def send_quote(self, request, pk=None):
        """Send quote to customer"""
        return safe_execute(self._send_quote, request, pk)
    
    def _send_quote(self, request, pk):
        session_key = self.get_session_key()
        session = self._validate_session(session_key)
        
        quote = self.get_object()
        
        # Update quote status
        quote.status = 'sent'
        quote.sent_date = timezone.now()
        quote.save()
        
        # Log activity
        QuoteActivity.objects.create(
            quote=quote,
            activity_type='sent',
            description=f'Quote sent by {session.service_user.username}',
            ip_address=request.META.get('REMOTE_ADDR')
        )
        
        # Here you would integrate with email service
        # For now, we'll just return success
        
        return Response({
            'message': 'Quote sent successfully',
            'status': quote.status,
            'sent_date': quote.sent_date
        })
    
    @action(detail=True, methods=['get'])
    def generate_pdf(self, request, pk=None):
        """Generate PDF version of quote"""
        if not WEASYPRINT_AVAILABLE and not PDF_AVAILABLE:
            return Response({'error': 'PDF generation not available'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        return safe_execute(self._generate_pdf, request, pk)
    
    def _generate_pdf(self, request, pk):
        quote = self.get_object()
        if WEASYPRINT_AVAILABLE:
            try:
                pdf_data = self._generate_modern_quote_pdf(quote, request)
                if pdf_data:
                    response = HttpResponse(pdf_data, content_type='application/pdf')
                    response['Content-Disposition'] = f'attachment; filename="quote_{quote.quote_number}.pdf"'
                    QuoteActivity.objects.create(
                        quote=quote,
                        activity_type='downloaded',
                        description='Modern PDF generated and downloaded',
                        ip_address=request.META.get('REMOTE_ADDR')
                    )
                    return response
            except Exception as exc:
                print(f"Error generating CRM quote PDF with WeasyPrint: {exc}")
        
        # Create PDF buffer
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        
        # Get styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            textColor=colors.HexColor('#3B82F6')
        )
        
        # Build PDF content
        story = []
        
        # Title
        story.append(Paragraph(f"Quote #{quote.quote_number}", title_style))
        story.append(Spacer(1, 20))
        
        # Quote details
        details_data = [
            ['Quote Date:', quote.quote_date.strftime('%B %d, %Y')],
            ['Valid Until:', quote.valid_until.strftime('%B %d, %Y')],
            ['Account:', quote.account.name],
            ['Status:', quote.get_status_display()],
        ]
        
        if quote.contact:
            details_data.append(['Contact:', f"{quote.contact.first_name} {quote.contact.last_name}"])
        
        details_table = Table(details_data, colWidths=[2*inch, 3*inch])
        details_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        story.append(details_table)
        story.append(Spacer(1, 30))
        
        # Quote items
        if quote.quote_items.exists():
            story.append(Paragraph("Quote Items", styles['Heading2']))
            story.append(Spacer(1, 10))
            
            items_data = [['Item', 'Description', 'Qty', 'Unit Price', 'Total']]
            
            for item in quote.quote_items.all():
                items_data.append([
                    item.name,
                    item.description[:50] + '...' if len(item.description) > 50 else item.description,
                    str(item.quantity),
                    f"${item.unit_price:,.2f}",
                    f"${item.total_price:,.2f}"
                ])
            
            items_table = Table(items_data, colWidths=[1.5*inch, 2*inch, 0.7*inch, 1*inch, 1*inch])
            items_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(items_table)
            story.append(Spacer(1, 20))
        
        # Totals
        totals_data = [
            ['Subtotal:', f"${quote.subtotal:,.2f}"],
        ]
        
        if quote.discount_amount > 0:
            totals_data.append(['Discount:', f"-${quote.discount_amount:,.2f}"])
        
        if quote.tax_amount > 0:
            totals_data.append(['Tax:', f"${quote.tax_amount:,.2f}"])
        
        totals_data.append(['Total:', f"${quote.total_amount:,.2f}"])
        
        totals_table = Table(totals_data, colWidths=[4*inch, 1.5*inch])
        totals_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (-1, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (-1, -1), (-1, -1), 12),
            ('LINEABOVE', (-1, -1), (-1, -1), 2, colors.black),
        ]))
        
        story.append(totals_table)
        
        # Terms and conditions
        if quote.terms_conditions:
            story.append(Spacer(1, 30))
            story.append(Paragraph("Terms and Conditions", styles['Heading3']))
            story.append(Paragraph(quote.terms_conditions, styles['Normal']))
        
        # Build PDF
        doc.build(story)
        
        # Get PDF data
        pdf_data = buffer.getvalue()
        buffer.close()
        
        # Return PDF response
        response = HttpResponse(pdf_data, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="quote_{quote.quote_number}.pdf"'
        
        # Log activity
        QuoteActivity.objects.create(
            quote=quote,
            activity_type='downloaded',
            description='PDF generated and downloaded',
            ip_address=request.META.get('REMOTE_ADDR')
        )
        
        return response

    def _generate_modern_quote_pdf(self, quote, request):
        company = quote.company
        logo_uri = _company_logo_file_uri(company)
        contact_name = ''
        if quote.contact:
            contact_name = f"{quote.contact.first_name} {quote.contact.last_name}".strip()

        company_address = _safe(company.address).replace('\n', '<br>')
        account_address = getattr(quote.account, 'billing_address', '') or getattr(quote.account, 'shipping_address', '')
        account_address = _safe(account_address).replace('\n', '<br>')

        rows = []
        for index, item in enumerate(quote.quote_items.all(), start=1):
            rows.append(f"""
              <tr>
                <td class="muted center">{index}</td>
                <td>
                  <div class="item-name">{_safe(item.name)}</div>
                  <div class="item-desc">{_safe(item.description)}</div>
                </td>
                <td class="center">{item.quantity}</td>
                <td class="right">{_money(item.unit_price)}</td>
                <td class="right strong">{_money(item.total_price)}</td>
              </tr>
            """)

        if not rows:
            rows.append("""
              <tr>
                <td colspan="5" class="empty">No line items added.</td>
              </tr>
            """)

        discount_row = ''
        if quote.discount_amount and quote.discount_amount > 0:
            discount_row = f"""
              <div class="total-row">
                <span>Discount</span>
                <strong>-{_money(quote.discount_amount)}</strong>
              </div>
            """

        tax_row = ''
        if quote.tax_amount and quote.tax_amount > 0:
            tax_row = f"""
              <div class="total-row">
                <span>Tax ({quote.tax_rate}%)</span>
                <strong>{_money(quote.tax_amount)}</strong>
              </div>
            """

        bank_details = ''
        if company.bank_name or company.bank_account_number or company.bank_ifsc_code:
            bank_details = f"""
              <div class="panel">
                <div class="section-title">Payment Details</div>
                <div class="kv"><span>Bank</span><strong>{_safe(company.bank_name)}</strong></div>
                <div class="kv"><span>Account Name</span><strong>{_safe(company.bank_account_holder or company.name)}</strong></div>
                <div class="kv"><span>Account No</span><strong>{_safe(company.bank_account_number)}</strong></div>
                <div class="kv"><span>IFSC</span><strong>{_safe(company.bank_ifsc_code)}</strong></div>
                <div class="kv"><span>Branch</span><strong>{_safe(company.bank_branch)}</strong></div>
              </div>
            """

        logo_block = (
            f'<img class="logo-img" src="{logo_uri}" alt="{_safe(company.name)} logo" />'
            if logo_uri else
            f'<div class="logo-fallback">{_safe((company.name or "C")[:1]).upper()}</div>'
        )

        html = f"""
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page {{
      size: A4;
      margin: 18mm 16mm;
      @bottom-center {{
        content: "Quote {_safe(quote.quote_number)} - Page " counter(page) " of " counter(pages);
        color: #94a3b8;
        font-size: 9px;
      }}
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      color: #0f172a;
      font-family: Inter, Arial, sans-serif;
      font-size: 12px;
      line-height: 1.45;
      background: #fff;
    }}
    .hero {{
      border-radius: 18px;
      padding: 22px 24px;
      color: #fff;
      background: linear-gradient(135deg, #f97316 0%, #dc2626 100%);
      position: relative;
      overflow: hidden;
    }}
    .hero:after {{
      content: "";
      position: absolute;
      right: -55px;
      top: -65px;
      width: 190px;
      height: 190px;
      border-radius: 999px;
      background: rgba(255,255,255,.16);
    }}
    .header-grid {{
      display: grid;
      grid-template-columns: 1fr 220px;
      gap: 24px;
      position: relative;
      z-index: 1;
    }}
    .brand {{
      display: flex;
      gap: 14px;
      align-items: center;
    }}
    .logo-box {{
      width: 64px;
      height: 64px;
      border-radius: 16px;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      box-shadow: 0 14px 35px rgba(15,23,42,.22);
    }}
    .logo-img {{
      width: 100%;
      height: 100%;
      object-fit: contain;
      padding: 7px;
    }}
    .logo-fallback {{
      color: #ea580c;
      font-size: 30px;
      font-weight: 800;
    }}
    .company-name {{
      margin: 0;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 0;
    }}
    .company-meta {{
      margin-top: 5px;
      color: rgba(255,255,255,.88);
      font-size: 11px;
    }}
    .quote-title {{
      text-align: right;
    }}
    .quote-title h1 {{
      margin: 0;
      font-size: 30px;
      line-height: 1;
      letter-spacing: 0;
    }}
    .quote-no {{
      display: inline-block;
      margin-top: 10px;
      border-radius: 999px;
      padding: 6px 11px;
      background: rgba(255,255,255,.18);
      font-weight: 700;
    }}
    .summary {{
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin: 16px 0 18px;
    }}
    .metric {{
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 12px;
      background: #f8fafc;
    }}
    .metric span {{
      display: block;
      color: #64748b;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: .06em;
    }}
    .metric strong {{
      display: block;
      margin-top: 4px;
      font-size: 13px;
      color: #0f172a;
    }}
    .two-col {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 18px;
    }}
    .panel {{
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 14px;
      background: #fff;
      page-break-inside: avoid;
    }}
    .section-title {{
      margin-bottom: 10px;
      color: #ea580c;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .08em;
    }}
    .big-name {{
      font-size: 16px;
      font-weight: 800;
      margin-bottom: 5px;
    }}
    .muted {{ color: #64748b; }}
    .items {{
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      overflow: hidden;
      border-radius: 14px;
    }}
    .items thead tr {{
      background: #111827;
      color: #fff;
    }}
    .items th {{
      padding: 11px 10px;
      text-align: left;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: .06em;
    }}
    .items td {{
      border-bottom: 1px solid #e5e7eb;
      padding: 11px 10px;
      vertical-align: top;
    }}
    .items tbody tr:nth-child(even) {{ background: #f8fafc; }}
    .center {{ text-align: center; }}
    .right {{ text-align: right; }}
    .strong {{ font-weight: 800; }}
    .item-name {{ font-weight: 800; }}
    .item-desc {{ margin-top: 3px; color: #64748b; font-size: 10px; }}
    .empty {{ text-align: center; color: #64748b; padding: 22px; }}
    .totals-wrap {{
      display: grid;
      grid-template-columns: 1fr 260px;
      gap: 18px;
      margin-top: 18px;
      align-items: start;
    }}
    .total-card {{
      border-radius: 16px;
      padding: 15px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
    }}
    .total-row {{
      display: flex;
      justify-content: space-between;
      padding: 7px 0;
      color: #334155;
      border-bottom: 1px solid #e2e8f0;
    }}
    .grand-total {{
      margin-top: 10px;
      border-radius: 14px;
      padding: 13px 14px;
      background: linear-gradient(135deg, #f97316, #dc2626);
      color: #fff;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }}
    .grand-total span {{ font-size: 11px; opacity: .9; text-transform: uppercase; letter-spacing: .06em; }}
    .grand-total strong {{ font-size: 20px; }}
    .kv {{
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 4px 0;
    }}
    .kv span {{ color: #64748b; }}
    .kv strong {{ color: #0f172a; text-align: right; }}
    .terms {{
      margin-top: 18px;
      color: #475569;
      font-size: 11px;
    }}
    .footer-note {{
      margin-top: 24px;
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
      text-align: center;
      color: #64748b;
      font-size: 10px;
    }}
  </style>
</head>
<body>
  <section class="hero">
    <div class="header-grid">
      <div class="brand">
        <div class="logo-box">{logo_block}</div>
        <div>
          <h2 class="company-name">{_safe(company.name)}</h2>
          <div class="company-meta">
            {_safe(company.email)}{(' | ' + _safe(company.phone)) if company.phone else ''}<br>
            {_safe(company.website) if company.website else ''}
          </div>
        </div>
      </div>
      <div class="quote-title">
        <h1>QUOTE</h1>
        <div class="quote-no">{_safe(quote.quote_number)}</div>
      </div>
    </div>
  </section>

  <div class="summary">
    <div class="metric"><span>Quote Date</span><strong>{quote.quote_date.strftime('%d %b %Y')}</strong></div>
    <div class="metric"><span>Valid Until</span><strong>{quote.valid_until.strftime('%d %b %Y')}</strong></div>
    <div class="metric"><span>Status</span><strong>{_safe(quote.get_status_display())}</strong></div>
    <div class="metric"><span>Total</span><strong>{_money(quote.total_amount)}</strong></div>
  </div>

  <div class="two-col">
    <div class="panel">
      <div class="section-title">From</div>
      <div class="big-name">{_safe(company.name)}</div>
      <div class="muted">
        {company_address}<br>
        {_safe(company.email)}<br>
        {_safe(company.phone)}
        {('<br>GSTIN: ' + _safe(company.gst_number)) if company.gst_number else ''}
        {('<br>PAN: ' + _safe(company.pan_number)) if company.pan_number else ''}
      </div>
    </div>
    <div class="panel">
      <div class="section-title">Bill To</div>
      <div class="big-name">{_safe(quote.account.name)}</div>
      <div class="muted">
        {account_address}<br>
        {('Contact: ' + _safe(contact_name) + '<br>') if contact_name else ''}
        {_safe(getattr(quote.account, 'email', '') or '')}<br>
        {_safe(getattr(quote.account, 'phone', '') or '')}
      </div>
    </div>
  </div>

  <div class="panel">
    <div class="section-title">{_safe(quote.title)}</div>
    <div class="muted">{_safe(quote.description)}</div>
    <table class="items">
      <thead>
        <tr>
          <th style="width: 42px;" class="center">#</th>
          <th>Item</th>
          <th style="width: 72px;" class="center">Qty</th>
          <th style="width: 110px;" class="right">Unit Price</th>
          <th style="width: 120px;" class="right">Total</th>
        </tr>
      </thead>
      <tbody>
        {''.join(rows)}
      </tbody>
    </table>
  </div>

  <div class="totals-wrap">
    <div>
      {bank_details}
    </div>
    <div class="total-card">
      <div class="total-row"><span>Subtotal</span><strong>{_money(quote.subtotal)}</strong></div>
      {discount_row}
      {tax_row}
      <div class="grand-total"><span>Grand Total</span><strong>{_money(quote.total_amount)}</strong></div>
    </div>
  </div>

  {f'<div class="panel terms"><div class="section-title">Terms & Conditions</div>{_safe(quote.terms_conditions)}</div>' if quote.terms_conditions else ''}

  <div class="footer-note">
    Thank you for your business. This quote was generated by {_safe(company.name)}.
  </div>
</body>
</html>
        """

        pdf_buffer = io.BytesIO()
        html_doc = weasyprint.HTML(string=html, base_url=request.build_absolute_uri('/'), encoding='utf-8')
        html_doc.write_pdf(pdf_buffer)
        pdf_buffer.seek(0)
        return pdf_buffer.getvalue()
    
    @action(detail=True, methods=['post'])
    def accept_quote(self, request, pk=None):
        """Accept quote (public endpoint)"""
        return safe_execute(self._accept_quote, request, pk)
    
    def _accept_quote(self, request, pk):
        quote = self.get_object()
        
        if quote.status in ['accepted', 'converted']:
            return Response({'error': 'Quote already accepted'}, status=status.HTTP_400_BAD_REQUEST)
        
        if quote.is_expired:
            return Response({'error': 'Quote has expired'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Update quote
        quote.status = 'accepted'
        quote.accepted_date = timezone.now()
        quote.save()
        
        # Log activity
        QuoteActivity.objects.create(
            quote=quote,
            activity_type='accepted',
            description='Quote accepted by customer',
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        # Create signature if provided
        signature_data = request.data.get('signature')
        if signature_data:
            QuoteSignature.objects.create(
                quote=quote,
                signer_name=request.data.get('signer_name', ''),
                signer_email=request.data.get('signer_email', ''),
                signer_title=request.data.get('signer_title', ''),
                signature_data=signature_data,
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
        
        return Response({
            'message': 'Quote accepted successfully',
            'status': quote.status,
            'accepted_date': quote.accepted_date
        })
    
    @action(detail=False)
    def dashboard_stats(self, request):
        """Get quote dashboard statistics"""
        return safe_execute(self._get_dashboard_stats, request)
    
    def _get_dashboard_stats(self, request):
        session_key = self.get_session_key()
        session = self._validate_session(session_key)
        
        quotes = Quote.objects.filter(company=session.service_user.company)
        
        stats = {
            'total_quotes': quotes.count(),
            'draft_quotes': quotes.filter(status='draft').count(),
            'sent_quotes': quotes.filter(status='sent').count(),
            'accepted_quotes': quotes.filter(status='accepted').count(),
            'expired_quotes': quotes.filter(valid_until__lt=timezone.now().date()).count(),
            'total_value': sum(q.total_amount for q in quotes),
            'accepted_value': sum(q.total_amount for q in quotes.filter(status='accepted')),
            'conversion_rate': 0,
        }
        
        if stats['sent_quotes'] > 0:
            stats['conversion_rate'] = (stats['accepted_quotes'] / stats['sent_quotes']) * 100
        
        return Response(stats)
    
    def _validate_session(self, session_key):
        """Validate session"""
        if not session_key:
            raise Exception('Session key required')
        
        from authentication.models import ServiceUserSession
        try:
            return ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        except ServiceUserSession.DoesNotExist:
            raise Exception('Invalid session')
