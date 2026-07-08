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
from datetime import timedelta
import io
import base64
from .quote_models import Quote, QuoteItem, QuoteTemplate, QuoteActivity, QuoteSignature
from .views import CRMBaseViewSet
from .security_utils import CRMSecurityValidator
from .error_handlers import safe_execute

# PDF generation (using reportlab)
try:
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False


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
        if not PDF_AVAILABLE:
            return Response({'error': 'PDF generation not available'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        return safe_execute(self._generate_pdf, request, pk)
    
    def _generate_pdf(self, request, pk):
        quote = self.get_object()
        
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
