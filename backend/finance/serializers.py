from rest_framework import serializers
from django.utils._os import safe_join
from django.db import transaction
from authentication.models import ServiceUserSession
from finance.numbering import generate_number, NumberingRule
from finance.models import FINANCE_NUMBERING_MODULE_CHOICES
from .models import Customer, CustomerShippingAddress, Product, HSNCode, SACCode, Quotation, QuotationItem, PurchaseOrder, PurchaseOrderItem, ProformaInvoice, ProformaInvoiceItem, Invoice, InvoiceItem, Payment, Vendor, PurchaseRequest, PurchaseRequestItem, VendorInvoice, VendorInvoiceItem, PurchasePayment, TDSDeposit
from .indian_compliance import calculate_gst_for_invoice, calculate_tds_for_payment, get_indian_states
from .security_validators import FinanceSecurityValidator

# ---------------------------------------------------------------------------
# Numbering helpers
# ---------------------------------------------------------------------------
FINANCE_DEFAULT_TEMPLATES = {
    'quotation': {'template': '{PREFIX}-{YY}-{SEQ}', 'prefix': 'QTN'},
    'purchase_order': {'template': '{PREFIX}-{YY}-{SEQ}', 'prefix': 'PO'},
    'proforma_invoice': {'template': '{PREFIX}-{YY}-{SEQ}', 'prefix': 'PRO'},
    'invoice': {'template': '{PREFIX}-{YY}-{SEQ}', 'prefix': 'INV'},
    'customer_payment': {'template': '{PREFIX}-{YY}-{SEQ}', 'prefix': 'PAY'},
    'purchase_request': {'template': '{PREFIX}-{YY}-{SEQ}', 'prefix': 'PR'},
    'purchase_payment': {'template': '{PREFIX}-{YY}-{SEQ}', 'prefix': 'PP'},
    'vendor_invoice': {'template': '{PREFIX}-{YY}-{SEQ}', 'prefix': 'VINV'},
}


def _resolve_company_and_creator(request):
    """Resolve company and creator (service_user if session key provided, else company_user)."""
    if not request:
        return None, None

    session_key = request.headers.get('Authorization', '').replace('Bearer ', '') if hasattr(request, 'headers') else ''
    if not session_key and hasattr(request, 'data'):
        session_key = request.data.get('session_key') or ''
    if not session_key and hasattr(request, 'query_params'):
        session_key = request.query_params.get('session_key') or ''

    if session_key:
        session_key = str(session_key).strip()
        try:
            session = ServiceUserSession.objects.select_related('service_user__company').get(
                session_key=session_key,
                is_active=True
            )
            return session.service_user.company, session.service_user
        except ServiceUserSession.DoesNotExist:
            pass

    user = getattr(request, 'user', None)
    if user and hasattr(user, 'company_user'):
        return user.company_user.company, None

    return None, None


def _ensure_numbering_rule(company, module):
    defaults = FINANCE_DEFAULT_TEMPLATES.get(module, {})
    defaults.setdefault('template', '{PREFIX}-{YY}-{SEQ}')
    defaults.setdefault('prefix', '')
    defaults.setdefault('separator', '-')
    defaults.setdefault('padding', 6)
    defaults.setdefault('reset_scope', 'yearly')
    defaults.setdefault('start_from', 1)
    defaults.setdefault('allow_manual_override', False)
    rule, _ = NumberingRule.objects.get_or_create(
        company=company,
        module=module,
        defaults=defaults,
    )
    return rule


# Maps each module to the date field in validated_data that should drive numbering
_MODULE_DATE_FIELD = {
    'quotation': 'quotation_date',
    'purchase_order': 'po_date',
    'proforma_invoice': 'proforma_date',
    'invoice': 'invoice_date',
    'customer_payment': 'payment_date',
    'purchase_request': 'request_date',
    'purchase_payment': 'payment_date',
    'vendor_invoice': 'invoice_date',
}


def assign_number(validated_data, serializer, module, field_name, model_cls):
    """Assign or validate document number based on numbering rule with uniqueness check."""
    request = serializer.context.get('request')
    company, creator = _resolve_company_and_creator(request)

    if not company:
        company = serializer.context.get('company')

    if not company:
        raise serializers.ValidationError({field_name: ['Company could not be determined for numbering']})

    rule = _ensure_numbering_rule(company, module)

    provided = None
    if hasattr(serializer, 'initial_data'):
        provided = serializer.initial_data.get(field_name)
    if provided in ['', None]:
        provided = None

    if provided:
        if model_cls.objects.filter(company=company, **{field_name: provided}).exists():
            if field_name == 'invoice_number':
                raise serializers.ValidationError({field_name: [f'Invoice number "{provided}" is already used. Please choose a different invoice number.']})
            else:
                raise serializers.ValidationError({field_name: [f'Document number "{provided}" already exists. Please use a different number.']})
        validated_data[field_name] = provided
    else:
        # Use the document's own date so {YY}/{FY} tokens reflect the actual document date
        date_field = _MODULE_DATE_FIELD.get(module)
        doc_date = validated_data.get(date_field) if date_field else None
        validated_data[field_name] = generate_number(company, module, dt=doc_date)

    validated_data['company'] = company
    if creator and 'created_by' in [f.name for f in model_cls._meta.fields]:
        validated_data.setdefault('created_by', creator)


class CustomerShippingAddressSerializer(serializers.ModelSerializer):
    """Serializer for customer shipping addresses"""

    class Meta:
        model = CustomerShippingAddress
        fields = ['id', 'label', 'address_line1', 'address_line2', 'city', 'state', 'pincode', 'country', 'is_default', 'full_address']
        read_only_fields = ['id', 'full_address']


class CustomerListSerializer(serializers.ModelSerializer):
    """Serializer for listing customers"""
    full_billing_address = serializers.ReadOnlyField()
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)

    class Meta:
        model = Customer
        fields = [
            'id', 'customer_code', 'name', 'display_name', 'customer_type',
            'email', 'phone', 'mobile', 'gstin', 'pan_number',
            'full_billing_address', 'project_area', 'credit_limit', 'payment_terms',
            'is_active', 'created_at', 'created_by_name'
        ]


class CustomerDetailSerializer(serializers.ModelSerializer):
    """Serializer for customer details"""
    full_billing_address = serializers.ReadOnlyField()
    full_shipping_address = serializers.ReadOnlyField()
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    shipping_addresses = CustomerShippingAddressSerializer(many=True, read_only=True)

    class Meta:
        model = Customer
        fields = '__all__'
        read_only_fields = ['id', 'customer_code', 'company', 'created_by', 'created_at', 'updated_at']


class CustomerCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating customers"""
    shipping_addresses = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        write_only=True
    )

    class Meta:
        model = Customer
        fields = [
            'id',  # Include id for response
            'customer_type', 'name', 'display_name', 'email', 'phone', 'mobile', 'website',
            'billing_address_line1', 'billing_address_line2', 'billing_city', 'billing_state',
            'billing_pincode', 'billing_country', 'shipping_same_as_billing',
            'shipping_address_line1', 'shipping_address_line2', 'shipping_city',
            'shipping_state', 'shipping_pincode', 'shipping_country',
            'business_type', 'industry', 'gstin', 'pan_number', 'aadhar_number',
            'bank_name', 'bank_account_number', 'bank_ifsc_code', 'bank_branch', 'account_holder_name',
            'credit_limit', 'payment_terms', 'currency', 'project_area', 'notes', 'is_active',
            'opening_balance', 'opening_balance_date', 'shipping_addresses',
            # Indian Compliance Fields
            'state_code', 'is_gst_registered', 'gst_registration_date'
        ]
        read_only_fields = ['id', 'customer_code']
    
    def validate_gstin(self, value):
        """Validate GSTIN format - MANDATORY field"""
        if not value or not value.strip():
            raise serializers.ValidationError("GSTIN is required")
        
        if len(value) != 15:
            raise serializers.ValidationError("GSTIN must be exactly 15 characters long")
        
        # Validate GSTIN pattern
        import re
        gstin_pattern = r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
        if not re.match(gstin_pattern, value):
            raise serializers.ValidationError("Please enter a valid GSTIN format")
        
        return value
    
    def validate_pan_number(self, value):
        """Validate PAN format"""
        if value and len(value) != 10:
            raise serializers.ValidationError("PAN number must be exactly 10 characters long")
        return value
    
    def validate_aadhar_number(self, value):
        """Validate Aadhar format"""
        if value and len(value) != 12:
            raise serializers.ValidationError("Aadhar number must be exactly 12 digits long")
        return value
    
    def validate(self, attrs):
        """Cross-field validation with MANDATORY field checks"""
        # MANDATORY FIELD VALIDATION
        required_fields = {
            'customer_type': 'Customer type is required',
            'name': 'Customer name is required',
            'display_name': 'Display name is required',
            'billing_address_line1': 'Billing address line 1 is required',
            'billing_city': 'Billing city is required',
            'billing_state': 'Billing state is required',
            'billing_pincode': 'Billing PIN code is required',
            'gstin': 'GSTIN is required'
        }
        
        errors = {}
        for field, message in required_fields.items():
            value = attrs.get(field)
            if not value or (isinstance(value, str) and not value.strip()):
                errors[field] = message
        
        if errors:
            raise serializers.ValidationError(errors)
        
        # Shipping address validation logic (only if different from billing)
        shipping_same_as_billing = attrs.get('shipping_same_as_billing', True)
        
        if shipping_same_as_billing is False:
            # When checkbox is unchecked (False), shipping address fields are required
            required_shipping_fields = ['shipping_address_line1', 'shipping_city', 'shipping_state', 'shipping_pincode']
            for field in required_shipping_fields:
                field_value = attrs.get(field, '')
                if isinstance(field_value, str):
                    field_value = field_value.strip()
                if not field_value:
                    field_display = field.replace('shipping_', '').replace('_', ' ').title()
                    errors[field] = f"{field_display} is required when shipping address is different from billing address"
        else:
            # When checkbox is checked (True), clear shipping address fields to avoid confusion
            shipping_fields = ['shipping_address_line1', 'shipping_address_line2', 'shipping_city', 'shipping_state', 'shipping_pincode', 'shipping_country']
            for field in shipping_fields:
                attrs[field] = ''
        
        if errors:
            raise serializers.ValidationError(errors)
        
        return attrs

    def save(self, **kwargs):
        """Override save to handle company and created_by injection from viewset"""
        # Extract company and created_by from kwargs if provided
        company = kwargs.pop('company', None)
        created_by = kwargs.pop('created_by', None)
        
        # Add them to validated_data if provided
        if company:
            self.validated_data['company'] = company
        if created_by:
            self.validated_data['created_by'] = created_by
            
        return super().save(**kwargs)

    def create(self, validated_data):
        shipping_addresses_data = validated_data.pop('shipping_addresses', [])
        
        # Ensure customer_code is not in validated_data (let model generate it)
        validated_data.pop('customer_code', None)
        
        try:
            customer = Customer(**validated_data)
            customer.save()
        except Exception as e:
            # Handle unique constraint errors
            if 'unique' in str(e).lower() or 'duplicate' in str(e).lower():
                # Retry with timestamp-based code
                import time
                timestamp = int(time.time() * 1000) % 1000000
                customer.customer_code = f"CUST-{timestamp:06d}"
                customer.save()
            else:
                raise e

        # Create shipping addresses
        for address_data in shipping_addresses_data:
            CustomerShippingAddress.objects.create(
                customer=customer,
                **address_data
            )

        return customer


class CustomerUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating customers"""
    shipping_addresses = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        write_only=True
    )

    class Meta:
        model = Customer
        fields = [
            'customer_type', 'name', 'display_name', 'email', 'phone', 'mobile', 'website',
            'billing_address_line1', 'billing_address_line2', 'billing_city', 'billing_state',
            'billing_pincode', 'billing_country', 'shipping_same_as_billing',
            'shipping_address_line1', 'shipping_address_line2', 'shipping_city',
            'shipping_state', 'shipping_pincode', 'shipping_country',
            'business_type', 'industry', 'gstin', 'pan_number', 'aadhar_number',
            'bank_name', 'bank_account_number', 'bank_ifsc_code', 'bank_branch', 'account_holder_name',
            'credit_limit', 'payment_terms', 'currency', 'project_area', 'notes', 'is_active',
            'opening_balance', 'opening_balance_date', 'shipping_addresses',
            # Indian Compliance Fields
            'state_code', 'is_gst_registered', 'gst_registration_date'
        ]
        read_only_fields = ['customer_code', 'company', 'created_by', 'created_at']
    
    def validate_gstin(self, value):
        """Validate GSTIN format - MANDATORY field"""
        if not value or not value.strip():
            raise serializers.ValidationError("GSTIN is required")
        
        if len(value) != 15:
            raise serializers.ValidationError("GSTIN must be exactly 15 characters long")
        
        # Validate GSTIN pattern
        import re
        gstin_pattern = r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
        if not re.match(gstin_pattern, value):
            raise serializers.ValidationError("Please enter a valid GSTIN format")
        
        return value
    
    def validate_pan_number(self, value):
        """Validate PAN format"""
        if value and len(value) != 10:
            raise serializers.ValidationError("PAN number must be exactly 10 characters long")
        return value
    
    def validate_aadhar_number(self, value):
        """Validate Aadhar format"""
        if value and len(value) != 12:
            raise serializers.ValidationError("Aadhar number must be exactly 12 digits long")
        return value

    def update(self, instance, validated_data):
        shipping_addresses_data = validated_data.pop('shipping_addresses', [])

        # Update customer fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update shipping addresses - delete existing and create new ones
        instance.shipping_addresses.all().delete()
        for address_data in shipping_addresses_data:
            CustomerShippingAddress.objects.create(
                customer=instance,
                **address_data
            )

        return instance


# HSN Code Serializers
class HSNCodeSerializer(serializers.ModelSerializer):
    """Serializer for HSN codes"""

    class Meta:
        model = HSNCode
        fields = ['id', 'code', 'description', 'gst_rate']


class HSNCodeCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating HSN codes manually"""

    class Meta:
        model = HSNCode
        fields = ['code', 'description', 'gst_rate']

    def validate_code(self, value):
        """Validate HSN code format"""
        if not value or not value.strip():
            raise serializers.ValidationError("HSN code is required")
        
        # Remove spaces and convert to string
        code = str(value).strip().replace(' ', '')
        
        # Check if code already exists
        if HSNCode.objects.filter(code=code).exists():
            raise serializers.ValidationError(f"HSN code {code} already exists")
        
        # Validate format (4-8 digits)
        if not code.isdigit() or len(code) < 4 or len(code) > 8:
            raise serializers.ValidationError("HSN code must be 4-8 digits")
        
        return code

    def validate_gst_rate(self, value):
        """Validate GST rate"""
        if value < 0 or value > 28:
            raise serializers.ValidationError("GST rate must be between 0 and 28")
        return value

    def validate_description(self, value):
        """Validate description"""
        if not value or not value.strip():
            raise serializers.ValidationError("Description is required")
        return value.strip()


# SAC Code Serializers
class SACCodeSerializer(serializers.ModelSerializer):
    """Serializer for SAC codes"""

    class Meta:
        model = SACCode
        fields = ['id', 'code', 'service_name', 'description', 'gst_rate']


class SACCodeCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating SAC codes manually"""

    class Meta:
        model = SACCode
        fields = ['code', 'service_name', 'description', 'gst_rate']

    def validate_code(self, value):
        """Validate SAC code format"""
        if not value or not value.strip():
            raise serializers.ValidationError("SAC code is required")
        
        # Remove spaces and convert to string
        code = str(value).strip().replace(' ', '')
        
        # Check if code already exists
        if SACCode.objects.filter(code=code).exists():
            raise serializers.ValidationError(f"SAC code {code} already exists")
        
        # Validate format (6 digits)
        if not code.isdigit() or len(code) != 6:
            raise serializers.ValidationError("SAC code must be exactly 6 digits")
        
        return code

    def validate_gst_rate(self, value):
        """Validate GST rate"""
        if value < 0 or value > 28:
            raise serializers.ValidationError("GST rate must be between 0 and 28")
        return value

    def validate_service_name(self, value):
        """Validate service name"""
        if not value or not value.strip():
            raise serializers.ValidationError("Service name is required")
        return value.strip()


# Product Serializers
class ProductListSerializer(serializers.ModelSerializer):
    """Serializer for listing products"""
    hsn_code_display = serializers.CharField(source='hsn_code.code', read_only=True)
    sac_code_display = serializers.CharField(source='sac_code.code', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    unit_ref_code = serializers.CharField(source='unit_ref.code', read_only=True, default='')

    class Meta:
        model = Product
        fields = [
            'id', 'product_code', 'name', 'product_type', 'description',
            'hsn_code_display', 'sac_code_display', 'gst_rate',
            'unit', 'unit_ref_code', 'selling_price', 'purchase_price',
            'track_inventory', 'current_stock', 'minimum_stock',
            'is_active', 'created_at', 'created_by_name'
        ]


class ProductDetailSerializer(serializers.ModelSerializer):
    """Serializer for product details"""
    hsn_code_details = HSNCodeSerializer(source='hsn_code', read_only=True)
    sac_code_details = SACCodeSerializer(source='sac_code', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)

    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ['id', 'product_code', 'company', 'created_by', 'created_at', 'updated_at']


class ProductCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating products"""
    product_code = serializers.CharField(required=False)

    class Meta:
        model = Product
        fields = [
            'product_code', 'name', 'product_type', 'description',
            'hsn_code', 'sac_code', 'gst_rate',
            'unit', 'selling_price', 'purchase_price',
            'track_inventory', 'current_stock', 'minimum_stock',
            'is_active'
        ]

    def validate(self, attrs):
        """Cross-field validation"""
        product_type = attrs.get('product_type')
        hsn_code = attrs.get('hsn_code')
        sac_code = attrs.get('sac_code')

        if product_type == 'product' and not hsn_code:
            raise serializers.ValidationError("HSN code is required for products")

        if product_type == 'service' and not sac_code:
            raise serializers.ValidationError("SAC code is required for services")

        if product_type == 'product' and sac_code:
            raise serializers.ValidationError("Products should use HSN codes, not SAC codes")

        if product_type == 'service' and hsn_code:
            raise serializers.ValidationError("Services should use SAC codes, not HSN codes")

        return attrs

    def create(self, validated_data):
        """Create product and handle manual GST rate overrides"""
        # Auto-generate product_code if not provided
        if 'product_code' not in validated_data or not validated_data['product_code']:
            import uuid
            validated_data['product_code'] = f"PROD-{uuid.uuid4().hex[:8].upper()}"
        
        # Check if GST rate is being manually set
        gst_rate = validated_data.get('gst_rate')
        if gst_rate is not None:
            expected_gst_rate = None
            hsn_code = validated_data.get('hsn_code')
            sac_code = validated_data.get('sac_code')
            product_type = validated_data.get('product_type', 'product')
            
            if product_type == 'product' and hsn_code:
                expected_gst_rate = hsn_code.gst_rate
            elif product_type == 'service' and sac_code:
                expected_gst_rate = sac_code.gst_rate
            
            # If GST rate differs from expected auto-rate, it's a manual override
            if expected_gst_rate is not None and float(gst_rate) != float(expected_gst_rate):
                # Create the product first
                product = super().create(validated_data)
                # Then mark as manual override and save again
                product.manual_gst_override = True
                product.save(update_fields=['manual_gst_override'])
                return product
        
        return super().create(validated_data)


class ProductUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating products"""

    class Meta:
        model = Product
        fields = [
            'name', 'product_type', 'description',
            'hsn_code', 'sac_code', 'gst_rate',
            'unit', 'selling_price', 'purchase_price',
            'track_inventory', 'current_stock', 'minimum_stock',
            'is_active'
        ]
        read_only_fields = ['product_code', 'company', 'created_by', 'created_at']

    def validate(self, attrs):
        """Cross-field validation"""
        product_type = attrs.get('product_type', self.instance.product_type)
        hsn_code = attrs.get('hsn_code', self.instance.hsn_code)
        sac_code = attrs.get('sac_code', self.instance.sac_code)

        if product_type == 'product' and not hsn_code:
            raise serializers.ValidationError("HSN code is required for products")

        if product_type == 'service' and not sac_code:
            raise serializers.ValidationError("SAC code is required for services")

        if product_type == 'product' and sac_code:
            raise serializers.ValidationError("Products should use HSN codes, not SAC codes")

        if product_type == 'service' and hsn_code:
            raise serializers.ValidationError("Services should use SAC codes, not HSN codes")

        return attrs

    def update(self, instance, validated_data):
        """Update product and preserve manual GST rate changes"""
        # Check if GST rate is being manually overridden
        gst_rate = validated_data.get('gst_rate')
        if gst_rate is not None:
            expected_gst_rate = None
            hsn_code = validated_data.get('hsn_code', instance.hsn_code)
            sac_code = validated_data.get('sac_code', instance.sac_code)
            product_type = validated_data.get('product_type', instance.product_type)
            
            if product_type == 'product' and hsn_code:
                expected_gst_rate = hsn_code.gst_rate
            elif product_type == 'service' and sac_code:
                expected_gst_rate = sac_code.gst_rate
            
            # If GST rate differs from expected auto-rate, mark as manual override
            if expected_gst_rate is not None and float(gst_rate) != float(expected_gst_rate):
                instance._manual_gst_override = True
        
        return super().update(instance, validated_data)


# Quotation Serializers
class QuotationItemSerializer(serializers.ModelSerializer):
    """Serializer for quotation line items"""

    class Meta:
        model = QuotationItem
        fields = [
            'id', 'product', 'product_name', 'product_code', 'description',
            'hsn_sac_code', 'quantity', 'unit', 'unit_price', 'line_total',
            'gst_rate', 'line_number'
        ]
        read_only_fields = ['id', 'product_name', 'product_code', 'description', 'hsn_sac_code', 'unit', 'gst_rate', 'line_total']


class QuotationListSerializer(serializers.ModelSerializer):
    """Serializer for listing quotations"""
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_code = serializers.CharField(source='customer.customer_code', read_only=True)
    customer_project_area = serializers.CharField(source='customer.project_area', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    revised_by_name = serializers.CharField(source='revised_by.full_name', read_only=True)
    item_count = serializers.SerializerMethodField()
    quotation_items = serializers.SerializerMethodField()
    available_proforma_percentage = serializers.SerializerMethodField()
    available_invoice_percentage = serializers.SerializerMethodField()
    customer_shipping_addresses = serializers.SerializerMethodField()

    class Meta:
        model = Quotation
        fields = [
            'id', 'quotation_number', 'customer_name', 'customer_code', 'customer_project_area',
            'quotation_date', 'valid_until', 'status', 'gst_type',
            'subtotal', 'total_tax', 'total_amount', 'item_count', 'quotation_items',
            'created_at', 'created_by_name', 'is_revised', 'revision_count', 'revised_at', 'revised_by_name',
            'po_created', 'po_created_at', 'invoice_created', 'invoice_created_at', 'proforma_created', 'is_rejected', 'rejection_reason',
            # Balance tracking fields for quotation-based invoice creation
            'claim_type', 'proforma_claimed_amount', 'invoice_claimed_amount',
            'remaining_proforma_balance', 'remaining_invoice_balance',
            'available_proforma_percentage', 'available_invoice_percentage', 'customer_shipping_addresses'
        ]

    def get_item_count(self, obj):
        return obj.quotation_items.count()

    def get_quotation_items(self, obj):
        """Get simplified quotation items for tooltip"""
        items = obj.quotation_items.all()[:10]  # Limit to first 10 items for performance
        return [
            {
                'product_name': item.product_name,
                'quantity': float(item.quantity),
                'unit': item.unit,
                'unit_price': float(item.unit_price),
                'line_total': float(item.line_total)
            }
            for item in items
        ]
    
    def get_available_proforma_percentage(self, obj):
        """Get available percentage for proforma invoice creation"""
        return float(obj.get_available_proforma_percentage())

    def get_available_invoice_percentage(self, obj):
        """Get available percentage for tax invoice creation"""
        return float(obj.get_available_invoice_percentage())
    
    def get_customer_shipping_addresses(self, obj):
        """Get customer shipping addresses for tooltip - Include both billing and shipping addresses"""
        if not obj.customer:
            return []
        
        addresses = []
        
        # Add billing address as primary address
        if obj.customer.full_billing_address:
            addresses.append({
                'type': 'Billing Address',
                'address': obj.customer.full_billing_address,
                'is_default': True
            })
        
        # Add shipping addresses from CustomerShippingAddress model
        for addr in obj.customer.shipping_addresses.all()[:5]:  # Limit to 5 addresses
            addresses.append({
                'type': f'Shipping - {addr.label}' if addr.label else 'Shipping',
                'address': addr.full_address,
                'is_default': addr.is_default
            })
        
        # If customer has different shipping address in main model, add it
        if not obj.customer.shipping_same_as_billing and obj.customer.full_shipping_address:
            # Only add if it's different from billing address
            if obj.customer.full_shipping_address != obj.customer.full_billing_address:
                addresses.append({
                    'type': 'Primary Shipping Address',
                    'address': obj.customer.full_shipping_address,
                    'is_default': False
                })
        
        # If no addresses exist at all, show a message
        if not addresses:
            addresses.append({
                'type': 'No addresses',
                'address': 'No addresses configured for this customer',
                'is_default': False
            })
        
        return addresses


class QuotationDetailSerializer(serializers.ModelSerializer):
    """Serializer for quotation details"""
    customer_details = CustomerDetailSerializer(source='customer', read_only=True)
    shipping_address_details = CustomerShippingAddressSerializer(source='shipping_address', read_only=True)
    quotation_items = QuotationItemSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    available_proforma_percentage = serializers.SerializerMethodField()
    available_invoice_percentage = serializers.SerializerMethodField()

    class Meta:
        model = Quotation
        fields = '__all__'
        read_only_fields = [
            'id', 'quotation_number', 'company', 'created_by', 'created_at', 'updated_at',
            'subtotal', 'total_tax', 'total_amount', 'cgst_amount', 'sgst_amount', 'igst_amount',
            'gst_type', 'customer_gstin', 'company_gstin'
        ]
    
    def get_available_proforma_percentage(self, obj):
        """Get available percentage for proforma invoice creation"""
        return float(obj.get_available_proforma_percentage())

    def get_available_invoice_percentage(self, obj):
        """Get available percentage for tax invoice creation"""
        return float(obj.get_available_invoice_percentage())


class QuotationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating quotations"""
    quotation_number = serializers.CharField(required=False, allow_blank=True)
    quotation_items = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=True
    )

    class Meta:
        model = Quotation
        fields = [
            'customer', 'quotation_date', 'valid_until', 'reference',
            'shipping_address', 'discount_percentage', 'discount_amount',
            'shipping_charges', 'other_charges', 'notes', 'terms_and_conditions',
            'quotation_items', 'quotation_number'
        ]

    def validate_quotation_items(self, value):
        """Validate quotation items"""
        if not value:
            raise serializers.ValidationError("At least one item is required")

        for item in value:
            required_fields = ['product', 'quantity', 'unit_price']
            for field in required_fields:
                if field not in item:
                    raise serializers.ValidationError(f"'{field}' is required for each item")

        return value

    def create(self, validated_data):
        """Create quotation with items"""
        from decimal import Decimal, InvalidOperation

        quotation_items_data = validated_data.pop('quotation_items')
        # Assign company and quotation number
        assign_number(validated_data, self, 'quotation', 'quotation_number', Quotation)

        # Get customer and company details to save GSTIN
        customer = validated_data['customer']
        company = validated_data['company']

        # Add GSTIN information to validated_data
        validated_data['customer_gstin'] = customer.gstin or ''
        validated_data['company_gstin'] = company.gst_number or ''

        # Determine GST type based on GSTIN
        if customer.gstin and company.gst_number:
            customer_state_code = customer.gstin[:2]
            company_state_code = company.gst_number[:2]
            validated_data['gst_type'] = 'cgst_sgst' if customer_state_code == company_state_code else 'igst'
        else:
            validated_data['gst_type'] = 'exempt'

        # Create quotation
        quotation = Quotation.objects.create(**validated_data)

        # Create quotation items using bulk_create to avoid individual saves
        items_to_create = []
        for i, item_data in enumerate(quotation_items_data, 1):
            # Get the product instance
            product_id = item_data.pop('product')
            product = Product.objects.get(id=product_id)

            # Safely convert decimal fields - handle potential string concatenation issues
            def safe_decimal_convert(value, field_name):
                if value is None:
                    return Decimal('0')

                # Convert to string first
                str_value = str(value).strip()

                # Check for concatenated decimals like "500.00500.00"
                if str_value.count('.') > 1:
                    # Use regex to extract the first valid decimal number
                    import re
                    # Look for pattern: digits, dot, exactly 2 digits, then stop
                    match = re.match(r'^(\d+\.\d{1,2})', str_value)
                    if match:
                        str_value = match.group(1)
                    else:
                        # Fallback: just take everything before the second dot
                        dots = [i for i, char in enumerate(str_value) if char == '.']
                        if len(dots) >= 2:
                            str_value = str_value[:dots[1]]

                try:
                    return Decimal(str_value)
                except (InvalidOperation, ValueError) as e:
                    print(f"⚠️ WARNING: Invalid decimal value for {field_name}: {value} -> using 0")
                    return Decimal('0')

            # Convert decimal fields safely
            quantity = safe_decimal_convert(item_data.get('quantity', 1), 'quantity')
            unit_price = safe_decimal_convert(item_data.get('unit_price', 0), 'unit_price')
            gst_rate = safe_decimal_convert(item_data.get('gst_rate', 0), 'gst_rate')

            # Create the item instance
            item = QuotationItem(
                quotation=quotation,
                product=product,
                line_number=i,
                quantity=quantity,
                unit_price=unit_price,
                gst_rate=gst_rate,
                # Let the model's save method handle other fields
                product_name=product.name,
                product_code=product.product_code,
                description=product.description,
                unit=product.unit,
                hsn_sac_code=product.hsn_code.code if product.hsn_code else (product.sac_code.code if product.sac_code else ''),
                line_total=quantity * unit_price
            )
            items_to_create.append(item)

        # Use bulk_create to avoid individual save() calls
        QuotationItem.objects.bulk_create(items_to_create)

        # Calculate totals once after all items are created
        quotation.calculate_totals()

        return quotation


# Purchase Order Serializers

class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    """Serializer for PO items"""
    claimed_percentage = serializers.SerializerMethodField()
    claimed_amount = serializers.SerializerMethodField()
    rejected_claimed_amount = serializers.SerializerMethodField()
    claimable_amount = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrderItem
        fields = [
            'id', 'product', 'product_name', 'product_code', 'description', 'hsn_sac_code',
            'quantity', 'unit', 'unit_price', 'line_total', 'gst_rate', 'line_number',
            'claimed_percentage', 'claimed_amount', 'rejected_claimed_amount', 'claimable_amount'
        ]
        read_only_fields = [
            'id', 'product_name', 'product_code', 'description', 'hsn_sac_code',
            'line_total', 'gst_rate', 'unit', 'claimed_percentage', 'claimed_amount',
            'rejected_claimed_amount', 'claimable_amount'
        ]

    def _get_item_amounts(self, obj):
        """Return (active_claimed, rejected_claimed) for this PO item."""
        from decimal import Decimal
        active = Decimal('0')
        rejected = Decimal('0')
        for invoice in obj.purchase_order.invoices.all():
            for inv_item in invoice.invoice_items.filter(product=obj.product):
                if invoice.is_rejected:
                    rejected += inv_item.line_total
                else:
                    active += inv_item.line_total
        return active, rejected

    def get_claimed_percentage(self, obj):
        """Claimed % based on active (non-rejected) invoices only."""
        from decimal import Decimal
        if not obj.line_total:
            return 0.0
        active, _ = self._get_item_amounts(obj)
        return float(min((active / obj.line_total) * 100, Decimal('100')))

    def get_claimed_amount(self, obj):
        """Amount claimed via active invoices."""
        active, _ = self._get_item_amounts(obj)
        return float(active)

    def get_rejected_claimed_amount(self, obj):
        """Amount claimed via rejected invoices (freed back up)."""
        _, rejected = self._get_item_amounts(obj)
        return float(rejected)

    def get_claimable_amount(self, obj):
        """Remaining claimable amount (PO item total minus active claimed)."""
        from decimal import Decimal
        active, _ = self._get_item_amounts(obj)
        return float(max(obj.line_total - active, Decimal('0')))


class PurchaseOrderListSerializer(serializers.ModelSerializer):
    """Serializer for listing purchase orders"""
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_code = serializers.CharField(source='customer.customer_code', read_only=True)
    customer_project_area = serializers.CharField(source='customer.project_area', read_only=True)
    customer_email = serializers.CharField(source='customer.email', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    quotation_number = serializers.CharField(source='quotation.quotation_number', read_only=True)
    item_count = serializers.SerializerMethodField()
    po_items = serializers.SerializerMethodField()
    available_proforma_percentage = serializers.SerializerMethodField()
    available_invoice_percentage = serializers.SerializerMethodField()
    customer_shipping_addresses = serializers.SerializerMethodField()
    shipping_address_text = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'internal_po_number', 'po_number', 'po_date', 'customer_name', 'customer_code',
            'customer_project_area', 'customer_email', 'customer_phone', 
            'quotation_number', 'reference', 'shipping_address', 'shipping_address_text', 'status', 'gst_type', 'claim_type',
            'subtotal', 'total_tax', 'total_amount', 'item_count', 'po_items',
            'proforma_claimed_amount', 'remaining_proforma_balance', 'proforma_status',
            'invoice_claimed_amount', 'remaining_invoice_balance', 'invoice_status',
            'available_proforma_percentage', 'available_invoice_percentage',
            'created_at', 'created_by_name', 'customer_shipping_addresses'
        ]

    def get_item_count(self, obj):
        return obj.po_items.count()

    def get_po_items(self, obj):
        """Get simplified PO items for tooltip"""
        items = obj.po_items.all()[:10]  # Limit to first 10 items for performance
        return [
            {
                'product_name': item.product_name,
                'quantity': float(item.quantity),
                'unit': item.unit,
                'unit_price': float(item.unit_price),
                'line_total': float(item.line_total),
                'claimed_percentage': self._get_item_claimed_percentage(item)
            }
            for item in items
        ]
    
    def _get_item_claimed_percentage(self, item):
        """Helper method to calculate claimed percentage for an item from TAX INVOICES ONLY"""
        from decimal import Decimal
        
        total_claimed_percentage = Decimal('0')
        
        # ONLY count tax invoices - proforma invoices don't reduce item availability
        for invoice in item.purchase_order.invoices.filter(is_rejected=False):
            for inv_item in invoice.invoice_items.filter(product=item.product):
                if item.line_total > 0:
                    item_percentage = (inv_item.line_total / item.line_total) * 100
                    total_claimed_percentage += item_percentage
        
        return float(min(total_claimed_percentage, Decimal('100')))

    def get_available_proforma_percentage(self, obj):
        """Get available percentage for proforma invoice creation"""
        return float(obj.get_available_proforma_percentage())

    def get_available_invoice_percentage(self, obj):
        """Get available percentage for tax invoice creation"""
        return float(obj.get_available_invoice_percentage())
    
    def get_shipping_address_text(self, obj):
        """Get the actual shipping address text instead of ID"""
        if obj.shipping_address:
            return obj.shipping_address.full_address
        return None
    
    def get_customer_shipping_addresses(self, obj):
        """Get customer shipping addresses for tooltip - Include both billing and shipping addresses"""
        if not obj.customer:
            return []
        
        addresses = []
        
        # Add billing address as primary address
        if obj.customer.full_billing_address:
            addresses.append({
                'type': 'Billing',
                'address': obj.customer.full_billing_address,
                'is_default': True
            })
        
        # Add shipping addresses from CustomerShippingAddress model
        for addr in obj.customer.shipping_addresses.all()[:5]:  # Limit to 5 addresses
            addresses.append({
                'type': f'Shipping',
                'address': addr.full_address,
                'is_default': addr.is_default
            })
        
        # If customer has different shipping address in main model, add it
        if not obj.customer.shipping_same_as_billing and obj.customer.full_shipping_address:
            # Only add if it's different from billing address
            if obj.customer.full_shipping_address != obj.customer.full_billing_address:
                addresses.append({
                    'type': 'Shipping',
                    'address': obj.customer.full_shipping_address,
                    'is_default': False
                })
        
        # If no addresses exist at all, show a message
        if not addresses:
            addresses.append({
                'type': 'No addresses',
                'address': 'No addresses configured for this customer',
                'is_default': False
            })
        
        return addresses


class PurchaseOrderDetailSerializer(serializers.ModelSerializer):
    """Serializer for PO details"""
    customer_details = CustomerDetailSerializer(source='customer', read_only=True)
    quotation_details = QuotationDetailSerializer(source='quotation', read_only=True)
    shipping_address_details = CustomerShippingAddressSerializer(source='shipping_address', read_only=True)
    po_items = PurchaseOrderItemSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = '__all__'
        read_only_fields = [
            'id', 'internal_po_number', 'company', 'created_by', 'created_at', 'updated_at',
            'subtotal', 'total_tax', 'total_amount', 'cgst_amount', 'sgst_amount', 'igst_amount',
            'gst_type', 'customer_gstin', 'company_gstin'
        ]


class PurchaseOrderCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating purchase orders"""
    po_number = serializers.CharField(required=False, allow_blank=True)
    po_items = serializers.JSONField(
        write_only=True,
        required=True
    )
    quotation = serializers.PrimaryKeyRelatedField(
        queryset=Quotation.objects.all(),
        required=False,
        allow_null=True,
        help_text="Optional quotation for PO creation"
    )
    # Make quotation_date and valid_until optional for direct PO creation
    quotation_date = serializers.DateField(required=False, allow_null=True)
    valid_until = serializers.DateField(required=False, allow_null=True)

    class Meta:
        model = PurchaseOrder
        fields = [
            'quotation', 'po_number', 'po_date', 'po_file', 'customer', 'quotation_date',
            'valid_until', 'reference', 'shipping_address', 'discount_percentage',
            'discount_amount', 'shipping_charges', 'other_charges', 'notes',
            'terms_and_conditions', 'status', 'claim_type', 'po_items'
        ]

    def validate(self, attrs):
        """Validate PO creation data"""
        quotation = attrs.get('quotation')
        customer = attrs.get('customer')
        shipping_address = attrs.get('shipping_address')
        
        # Debug logging for shipping address
        print(f"🔍 PO Validation - shipping_address received: {shipping_address}")
        if shipping_address:
            print(f"🔍 Shipping address ID: {shipping_address.id}, Label: {shipping_address.label}")
        
        # If no quotation is provided (direct PO), customer is required
        if not quotation:
            if not customer:
                raise serializers.ValidationError("Customer is required for direct PO creation")
            # Remove quotation-specific fields for direct PO creation
            attrs.pop('quotation_date', None)
            attrs.pop('valid_until', None)
        else:
            # If quotation is provided, set customer from quotation
            attrs['customer'] = quotation.customer
        
        return attrs

    def create(self, validated_data):
        po_items_data = validated_data.pop('po_items')
        
        # Debug logging for shipping address
        shipping_address = validated_data.get('shipping_address')
        print(f"🔍 PO Create - shipping_address in validated_data: {shipping_address}")
        if shipping_address:
            print(f"🔍 Shipping address details: ID={shipping_address.id}, Label='{shipping_address.label}', Address='{shipping_address.full_address}'")

        # Assign company and PO number
        assign_number(validated_data, self, 'purchase_order', 'po_number', PurchaseOrder)
        # Keep internal_po_number in sync unless provided elsewhere
        validated_data.setdefault('internal_po_number', validated_data['po_number'])

        # Get quotation to copy GST information (if provided)
        quotation = validated_data.get('quotation')
        customer = validated_data.get('customer')

        if quotation:
            # Set customer and GST information from quotation
            validated_data['customer'] = quotation.customer
            validated_data['gst_type'] = quotation.gst_type
            validated_data['customer_gstin'] = quotation.customer_gstin
            validated_data['company_gstin'] = quotation.company_gstin
            # Preserve shipping address from quotation if not provided in PO
            if not validated_data.get('shipping_address') and quotation.shipping_address:
                validated_data['shipping_address'] = quotation.shipping_address
                print(f"🔍 Using shipping address from quotation: {quotation.shipping_address.label}")
        else:
            # For direct PO creation, customer is already validated and GST info will be set in model's save method
            pass

        # Final check before creating PO
        final_shipping_address = validated_data.get('shipping_address')
        print(f"🔍 Final shipping_address before PO creation: {final_shipping_address}")

        # Create the purchase order
        purchase_order = PurchaseOrder.objects.create(**validated_data)
        
        # Verify shipping address was saved
        print(f"🔍 PO created - shipping_address saved: {purchase_order.shipping_address}")
        if purchase_order.shipping_address:
            print(f"🔍 Saved shipping address: ID={purchase_order.shipping_address.id}, Label='{purchase_order.shipping_address.label}'")

        # Create PO items
        items_to_create = []
        for index, item_data in enumerate(po_items_data, 1):
            product_id = item_data.get('product')
            quantity = item_data.get('quantity', 1)
            unit_price = item_data.get('unit_price', 0)

            try:
                product = Product.objects.get(id=product_id)

                # Calculate line total
                from decimal import Decimal
                line_total = Decimal(str(quantity)) * Decimal(str(unit_price))

                # Populate all fields that would normally be set by save()
                hsn_sac_code = ''
                if product.hsn_code:
                    hsn_sac_code = product.hsn_code.code
                elif product.sac_code:
                    hsn_sac_code = product.sac_code.code

                items_to_create.append(PurchaseOrderItem(
                    purchase_order=purchase_order,
                    product=product,
                    product_name=product.name,
                    product_code=product.product_code,
                    description=product.description,
                    hsn_sac_code=hsn_sac_code,
                    quantity=quantity,
                    unit=product.unit,
                    unit_price=unit_price,
                    line_total=line_total,
                    gst_rate=product.gst_rate,
                    line_number=index
                ))
            except Product.DoesNotExist:
                continue

        # Use bulk_create to avoid individual save() calls
        PurchaseOrderItem.objects.bulk_create(items_to_create)

        # Calculate totals once after all items are created
        purchase_order.calculate_totals()

        return purchase_order


class PurchaseOrderUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating purchase orders"""
    po_items = serializers.JSONField(
        write_only=True,
        required=False
    )
    # Make quotation_date and valid_until optional for updates
    quotation_date = serializers.DateField(required=False, allow_null=True)
    valid_until = serializers.DateField(required=False, allow_null=True)
    # Make po_number and po_date optional for status updates
    po_number = serializers.CharField(required=False)
    po_date = serializers.DateField(required=False)

    class Meta:
        model = PurchaseOrder
        fields = [
            'po_number', 'po_date', 'po_file', 'customer', 'quotation_date', 'valid_until',
            'reference', 'shipping_address', 'discount_percentage', 'discount_amount',
            'shipping_charges', 'other_charges', 'notes', 'terms_and_conditions',
            'status', 'po_items'
        ]
        read_only_fields = ['internal_po_number', 'quotation', 'company', 'created_by', 'created_at']
        extra_kwargs = {
            'customer': {'required': False}  # Customer can be updated for direct POs
        }

    def update(self, instance, validated_data):
        po_items_data = validated_data.pop('po_items', None)
        
        # If this is a direct PO (no quotation), remove quotation-specific fields if they're empty
        if not instance.quotation:
            if not validated_data.get('quotation_date'):
                validated_data.pop('quotation_date', None)
            if not validated_data.get('valid_until'):
                validated_data.pop('valid_until', None)
            
            # If customer is being updated for direct PO, recalculate GST information
            if 'customer' in validated_data and validated_data['customer'] != instance.customer:
                customer = validated_data['customer']
                company = instance.company
                
                # Recalculate GST type and GSTIN information
                if customer.gstin and hasattr(company, 'gst_number') and company.gst_number:
                    customer_state_code = customer.gstin[:2]
                    company_state_code = company.gst_number[:2]
                    validated_data['gst_type'] = 'cgst_sgst' if customer_state_code == company_state_code else 'igst'
                else:
                    validated_data['gst_type'] = 'exempt'
                
                validated_data['customer_gstin'] = customer.gstin or ''
                validated_data['company_gstin'] = getattr(company, 'gst_number', '') or ''

        # Update PO fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update PO items if provided
        if po_items_data is not None:
            # Delete existing items
            instance.po_items.all().delete()

            # Create new items
            items_to_create = []
            for index, item_data in enumerate(po_items_data, 1):
                product_id = item_data.get('product')
                quantity = item_data.get('quantity', 1)
                unit_price = item_data.get('unit_price', 0)

                try:
                    product = Product.objects.get(id=product_id)

                    # Calculate line total
                    from decimal import Decimal
                    line_total = Decimal(str(quantity)) * Decimal(str(unit_price))

                    # Populate all fields that would normally be set by save()
                    hsn_sac_code = ''
                    if product.hsn_code:
                        hsn_sac_code = product.hsn_code.code
                    elif product.sac_code:
                        hsn_sac_code = product.sac_code.code

                    items_to_create.append(PurchaseOrderItem(
                        purchase_order=instance,
                        product=product,
                        product_name=product.name,
                        product_code=product.product_code,
                        description=product.description,
                        hsn_sac_code=hsn_sac_code,
                        quantity=quantity,
                        unit=product.unit,
                        unit_price=unit_price,
                        line_total=line_total,
                        gst_rate=product.gst_rate,
                        line_number=index
                    ))
                except Product.DoesNotExist:
                    continue

            # Use bulk_create to avoid individual save() calls
            PurchaseOrderItem.objects.bulk_create(items_to_create)

            # Calculate totals once after all items are created
            instance.calculate_totals()

        return instance


# Proforma Invoice Serializers

class ProformaInvoiceItemSerializer(serializers.ModelSerializer):
    """Serializer for Proforma Invoice items"""

    class Meta:
        model = ProformaInvoiceItem
        fields = [
            'id', 'product', 'product_name', 'product_code', 'description', 'hsn_sac_code',
            'quantity', 'unit', 'unit_price', 'line_total', 'gst_rate', 'line_number'
        ]
        read_only_fields = [
            'id', 'product_name', 'product_code', 'description', 'hsn_sac_code',
            'line_total', 'gst_rate', 'unit'
        ]


class ProformaInvoiceListSerializer(serializers.ModelSerializer):
    """Serializer for listing proforma invoices"""
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_code = serializers.CharField(source='customer.customer_code', read_only=True)
    customer_project_area = serializers.CharField(source='customer.project_area', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    revised_by_name = serializers.CharField(source='revised_by.full_name', read_only=True)
    po_number = serializers.CharField(source='purchase_order.internal_po_number', read_only=True)
    item_count = serializers.SerializerMethodField()
    proforma_items = serializers.SerializerMethodField()
    customer_shipping_addresses = serializers.SerializerMethodField()

    class Meta:
        model = ProformaInvoice
        fields = [
            'id', 'proforma_number', 'proforma_date', 'due_date', 'customer_name', 'customer_code',
            'customer_project_area', 'po_number', 'payment_status', 'paid_amount', 'outstanding_amount', 'gst_type',
            'subtotal', 'total_tax', 'total_amount', 'item_count', 'proforma_items', 'is_rejected', 'rejection_reason',
            'is_revised', 'revision_count', 'revised_at', 'revised_by_name',
            'created_at', 'created_by_name', 'customer_shipping_addresses'
        ]

    def get_item_count(self, obj):
        return obj.proforma_items.count()

    def get_proforma_items(self, obj):
        """Get simplified proforma items for tooltip"""
        items = obj.proforma_items.all()[:10]  # Limit to first 10 items for performance
        return [
            {
                'product_name': item.product_name,
                'quantity': float(item.quantity),
                'unit': item.unit,
                'unit_price': float(item.unit_price),
                'line_total': float(item.line_total)
            }
            for item in items
        ]
    
    def get_customer_shipping_addresses(self, obj):
        """Get customer shipping addresses for tooltip with PO/WO shipping details"""
        if not obj.customer:
            return []
        
        addresses = []
        
        # Add Purchase Order shipping address if available
        if obj.purchase_order and obj.purchase_order.shipping_address:
            addresses.append({
                'type': f'PO Shipping - {obj.purchase_order.shipping_address.label}' if obj.purchase_order.shipping_address.label else 'PO Shipping Address',
                'address': obj.purchase_order.shipping_address.full_address,
                'is_default': False
            })
        
        # Add ONLY shipping addresses (exclude billing address)
        for addr in obj.customer.shipping_addresses.all()[:5]:  # Limit to 5 addresses
            addresses.append({
                'type': f'Customer Shipping - {addr.label}' if addr.label else 'Customer Shipping',
                'address': addr.full_address,
                'is_default': addr.is_default
            })
        
        # If no shipping addresses exist, show a message
        if not addresses:
            addresses.append({
                'type': 'No shipping addresses',
                'address': 'No specific shipping addresses configured for this customer or PO',
                'is_default': False
            })
        
        return addresses


class ProformaInvoiceDetailSerializer(serializers.ModelSerializer):
    """Serializer for Proforma Invoice details"""
    customer_details = CustomerDetailSerializer(source='customer', read_only=True)
    purchase_order_details = PurchaseOrderDetailSerializer(source='purchase_order', read_only=True)
    quotation_details = QuotationDetailSerializer(source='quotation', read_only=True)
    shipping_address_details = CustomerShippingAddressSerializer(source='shipping_address', read_only=True)
    proforma_items = ProformaInvoiceItemSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    effective_shipping_address = serializers.SerializerMethodField()

    class Meta:
        model = ProformaInvoice
        fields = [
            'id', 'proforma_number', 'proforma_date', 'due_date', 'reference',
            'customer_details', 'purchase_order_details', 'quotation_details',
            'shipping_address_details', 'effective_shipping_address',
            'customer_gstin', 'company_gstin', 'gst_type', 'subtotal', 'total_tax', 'total_amount',
            'cgst_amount', 'sgst_amount', 'igst_amount', 'discount_percentage', 'discount_amount',
            'shipping_charges', 'other_charges', 'payment_status', 'paid_amount', 'outstanding_amount',
            'status', 'notes', 'terms_and_conditions', 'proforma_items', 'created_at', 'created_by_name',
            'company', 'created_by', 'updated_at'
        ]
        read_only_fields = [
            'id', 'proforma_number', 'company', 'created_by', 'created_at', 'updated_at',
            'subtotal', 'total_tax', 'total_amount', 'cgst_amount', 'sgst_amount', 'igst_amount',
            'gst_type', 'customer_gstin', 'company_gstin'
        ]
    
    def get_effective_shipping_address(self, obj):
        """Get the effective shipping address with priority: Proforma > PO > Quotation > Customer Default"""
        # Priority 1: Proforma-specific shipping address
        if obj.shipping_address:
            return {
                'source': 'Proforma Invoice',
                'label': obj.shipping_address.label,
                'address': obj.shipping_address.full_address,
                'is_default': obj.shipping_address.is_default
            }
        
        # Priority 2: Purchase Order shipping address
        if obj.purchase_order and obj.purchase_order.shipping_address:
            return {
                'source': 'Purchase Order',
                'label': obj.purchase_order.shipping_address.label,
                'address': obj.purchase_order.shipping_address.full_address,
                'is_default': obj.purchase_order.shipping_address.is_default
            }
        
        # Priority 3: Quotation shipping address
        if obj.quotation and obj.quotation.shipping_address:
            return {
                'source': 'Quotation',
                'label': obj.quotation.shipping_address.label,
                'address': obj.quotation.shipping_address.full_address,
                'is_default': obj.quotation.shipping_address.is_default
            }
        
        # Priority 4: Customer default shipping address
        if obj.customer:
            default_shipping = obj.customer.shipping_addresses.filter(is_default=True).first()
            if default_shipping:
                return {
                    'source': 'Customer Default',
                    'label': default_shipping.label,
                    'address': default_shipping.full_address,
                    'is_default': True
                }
            
            # Fallback: Customer billing address
            if obj.customer.full_billing_address:
                return {
                    'source': 'Customer Billing (Fallback)',
                    'label': 'Billing Address',
                    'address': obj.customer.full_billing_address,
                    'is_default': False
                }
        
        return {
            'source': 'None',
            'label': 'No Address',
            'address': 'No shipping address available',
            'is_default': False
        }


class ProformaInvoiceCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating proforma invoices from Purchase Orders, Quotations, or directly"""
    proforma_number = serializers.CharField(required=False, allow_blank=True)
    proforma_items = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False
    )
    purchase_order = serializers.PrimaryKeyRelatedField(
        queryset=PurchaseOrder.objects.all(),
        required=False,
        allow_null=True
    )
    quotation = serializers.PrimaryKeyRelatedField(
        queryset=Quotation.objects.all(),
        required=False,
        allow_null=True
    )
    claim_type = serializers.CharField(required=False, allow_null=True)
    claim_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)

    class Meta:
        model = ProformaInvoice
        fields = [
            'purchase_order', 'quotation', 'customer', 'proforma_date', 'due_date', 'reference',
            'shipping_address', 'discount_percentage', 'discount_amount',
            'shipping_charges', 'other_charges', 'notes', 'terms_and_conditions', 'status',
            'claim_type', 'claim_percentage', 'is_advance_bill', 'proforma_items', 'proforma_number'
        ]

    def create(self, validated_data):
        from decimal import Decimal

        # Assign company and proforma number
        assign_number(validated_data, self, 'proforma_invoice', 'proforma_number', ProformaInvoice)
        company = validated_data['company']

        # Extract proforma_items_data before creating the invoice
        proforma_items_data = validated_data.pop('proforma_items', None)

        # Get purchase order or quotation to copy information
        purchase_order = validated_data.get('purchase_order')
        quotation = validated_data.get('quotation')
        
        # Quotation-based creation
        if quotation:
            return self._create_from_quotation(validated_data, proforma_items_data)
        
        # PO-based creation
        if purchase_order:
            return self._create_from_po(validated_data, proforma_items_data)
        
        # Direct creation (new functionality)
        return self._create_direct_proforma(validated_data, proforma_items_data)

    def _create_from_po(self, validated_data, proforma_items_data):
        """Create proforma invoice from purchase order"""
        from decimal import Decimal
        
        purchase_order = validated_data.get('purchase_order')
        
        # AUTO-ACTIVATE PO BEFORE PROFORMA CREATION (Business Logic: Proforma invoices can only be created from active POs)
        if purchase_order.status == 'draft':
            purchase_order.status = 'active'
            purchase_order.save(update_fields=['status'])
            # Refresh the instance to get updated status
            purchase_order.refresh_from_db()
        
        # Auto-fix balance tracking if needed
        purchase_order.fix_balance_tracking()
        
        # Update balance tracking to get latest values
        purchase_order.update_balance_tracking()

        # Validate claim against remaining balance
        claim_type = validated_data.get('claim_type', purchase_order.claim_type)
        claim_percentage = validated_data.get('claim_percentage', 0)

        if claim_type == 'percentage':
            # For percentage-based claiming, validate against available percentage
            available_percentage = purchase_order.get_available_proforma_percentage()
            
            # Check if any item percentage exceeds available percentage
            item_percentages = validated_data.get('item_percentages', {})
            if item_percentages:
                max_item_percentage = max(item_percentages.values()) if item_percentages.values() else 0
                if max_item_percentage > available_percentage:
                    raise serializers.ValidationError({
                        'item_percentages': f'Item percentage {max_item_percentage:.1f}% exceeds available proforma percentage {available_percentage:.1f}%. '
                                          f'Tax invoices have reduced the available proforma base.'
                    })
            elif claim_percentage and claim_percentage > available_percentage:
                # Legacy percentage validation
                raise serializers.ValidationError({
                    'claim_percentage': f'Claim percentage {claim_percentage:.1f}% exceeds available proforma percentage {available_percentage:.1f}%. '
                                      f'Tax invoices have reduced the available proforma base.'
                })

        # Set customer, company and GST information from purchase order
        validated_data['company'] = purchase_order.company
        validated_data['customer'] = purchase_order.customer
        validated_data['gst_type'] = purchase_order.gst_type
        validated_data['customer_gstin'] = purchase_order.customer_gstin
        validated_data['company_gstin'] = purchase_order.company_gstin

        # Set claim type from PO if not provided
        if 'claim_type' not in validated_data:
            validated_data['claim_type'] = purchase_order.claim_type

        # Create the proforma invoice
        proforma_invoice = ProformaInvoice.objects.create(**validated_data)
        
        # Update PO claim type if this is the first invoice
        if not purchase_order.claim_type and 'claim_type' in validated_data:
            purchase_order.claim_type = validated_data.get('claim_type')
            purchase_order.save(update_fields=['claim_type'])

        # Use frontend-calculated items if provided, otherwise fallback to PO items
        items_to_create = []
        if proforma_items_data:
            # Use the calculated items from frontend
            for index, item_data in enumerate(proforma_items_data, 1):
                product_id = item_data.get('product')
                try:
                    product = Product.objects.get(id=product_id)
                    
                    # Get HSN/SAC code
                    hsn_sac_code = ''
                    if product.hsn_code:
                        hsn_sac_code = product.hsn_code.code
                    elif product.sac_code:
                        hsn_sac_code = product.sac_code.code
                    
                    items_to_create.append(ProformaInvoiceItem(
                        proforma_invoice=proforma_invoice,
                        product=product,
                        product_name=item_data.get('product_name', product.name),
                        product_code=product.product_code,
                        description=product.description,
                        hsn_sac_code=hsn_sac_code,
                        quantity=Decimal(str(item_data.get('quantity', 0))),
                        unit=item_data.get('unit', product.unit),
                        unit_price=Decimal(str(item_data.get('unit_price', 0))),
                        line_total=Decimal(str(item_data.get('line_total', 0))),
                        gst_rate=product.gst_rate,
                        line_number=index
                    ))
                except Product.DoesNotExist:
                    continue
        else:
            # Fallback: Copy items from purchase order with claim-based adjustments
            for po_item in purchase_order.po_items.all():
                # Populate all fields that would normally be set by save()
                hsn_sac_code = ''
                if po_item.product.hsn_code:
                    hsn_sac_code = po_item.product.hsn_code.code
                elif po_item.product.sac_code:
                    hsn_sac_code = po_item.product.sac_code.code

                # Calculate quantities and amounts based on claim type
                if claim_type == 'percentage' and claim_percentage > 0:
                    # For percentage-based claiming, adjust quantities proportionally
                    claimed_quantity = (po_item.quantity * Decimal(str(claim_percentage))) / Decimal('100')
                    claimed_unit_price = po_item.unit_price
                    claimed_line_total = claimed_quantity * claimed_unit_price
                else:
                    # For quantity-based or full claiming, use original values
                    claimed_quantity = po_item.quantity
                    claimed_unit_price = po_item.unit_price
                    claimed_line_total = po_item.line_total

                items_to_create.append(ProformaInvoiceItem(
                    proforma_invoice=proforma_invoice,
                    product=po_item.product,
                    product_name=po_item.product.name,
                    product_code=po_item.product.product_code,
                    description=po_item.product.description,
                    hsn_sac_code=hsn_sac_code,
                    quantity=claimed_quantity,
                    unit=po_item.product.unit,
                    unit_price=claimed_unit_price,
                    line_total=claimed_line_total,
                    gst_rate=po_item.product.gst_rate,
                    line_number=po_item.line_number
                ))

        # Use bulk_create to avoid individual save() calls
        ProformaInvoiceItem.objects.bulk_create(items_to_create)

        # Calculate totals once after all items are created
        proforma_invoice.calculate_totals()

        # Update PO balance tracking after totals are calculated
        if proforma_invoice.purchase_order:
            proforma_invoice.purchase_order.update_balance_tracking()

        return proforma_invoice
    
    def _create_direct_proforma(self, validated_data, proforma_items_data):
        """Create proforma invoice directly without Purchase Order or Quotation"""
        from decimal import Decimal
        
        customer = validated_data.get('customer')
        if not customer:
            raise serializers.ValidationError("Customer is required for direct proforma creation")
        
        if not proforma_items_data:
            raise serializers.ValidationError("Items are required for direct proforma creation")
        
        company = validated_data['company']
        
        # Set GST information
        if customer.gstin and hasattr(company, 'gst_number') and company.gst_number:
            customer_state_code = customer.gstin[:2]
            company_state_code = company.gst_number[:2]
            validated_data['gst_type'] = 'cgst_sgst' if customer_state_code == company_state_code else 'igst'
        else:
            validated_data['gst_type'] = 'exempt'
        
        validated_data['customer_gstin'] = customer.gstin or ''
        validated_data['company_gstin'] = getattr(company, 'gst_number', '') or ''
        
        # Create the proforma invoice
        proforma_invoice = ProformaInvoice.objects.create(**validated_data)
        
        # Create items
        items_to_create = []
        for index, item_data in enumerate(proforma_items_data, 1):
            product_id = item_data.get('product')
            try:
                product = Product.objects.get(id=product_id)
                
                hsn_sac_code = ''
                if product.hsn_code:
                    hsn_sac_code = product.hsn_code.code
                elif product.sac_code:
                    hsn_sac_code = product.sac_code.code
                
                items_to_create.append(ProformaInvoiceItem(
                    proforma_invoice=proforma_invoice,
                    product=product,
                    product_name=item_data.get('product_name', product.name),
                    product_code=product.product_code,
                    description=product.description,
                    hsn_sac_code=hsn_sac_code,
                    quantity=Decimal(str(item_data.get('quantity', 0))),
                    unit=item_data.get('unit', product.unit),
                    unit_price=Decimal(str(item_data.get('unit_price', 0))),
                    line_total=Decimal(str(item_data.get('line_total', 0))),
                    gst_rate=product.gst_rate,
                    line_number=index
                ))
            except Product.DoesNotExist:
                continue
        
        # Create items
        ProformaInvoiceItem.objects.bulk_create(items_to_create)
        
        # Calculate totals
        proforma_invoice.calculate_totals()
        
        return proforma_invoice
    
    def _create_from_quotation(self, validated_data, proforma_items_data):
        """Create proforma invoice from quotation"""
        from decimal import Decimal
        
        quotation = validated_data.get('quotation')
        claim_type = validated_data.get('claim_type', 'percentage')
        claim_percentage = validated_data.get('claim_percentage', 100)
        
        # Set customer, company and GST information from quotation
        validated_data['company'] = quotation.company
        validated_data['customer'] = quotation.customer
        validated_data['gst_type'] = quotation.gst_type
        validated_data['customer_gstin'] = quotation.customer_gstin
        validated_data['company_gstin'] = quotation.company_gstin
        
        # Set claim type on quotation if not already set
        if not quotation.claim_type:
            quotation.claim_type = claim_type
            quotation.save(update_fields=['claim_type'])
        
        # Create the proforma invoice
        proforma_invoice = ProformaInvoice.objects.create(**validated_data)
        
        # Create items from quotation or provided items
        items_to_create = []
        if proforma_items_data:
            # Use the calculated items from frontend
            for index, item_data in enumerate(proforma_items_data, 1):
                product_id = item_data.get('product')
                try:
                    product = Product.objects.get(id=product_id)
                    
                    hsn_sac_code = ''
                    if product.hsn_code:
                        hsn_sac_code = product.hsn_code.code
                    elif product.sac_code:
                        hsn_sac_code = product.sac_code.code
                    
                    items_to_create.append(ProformaInvoiceItem(
                        proforma_invoice=proforma_invoice,
                        product=product,
                        product_name=item_data.get('product_name', product.name),
                        product_code=product.product_code,
                        description=product.description,
                        hsn_sac_code=hsn_sac_code,
                        quantity=Decimal(str(item_data.get('quantity', 0))),
                        unit=item_data.get('unit', product.unit),
                        unit_price=Decimal(str(item_data.get('unit_price', 0))),
                        line_total=Decimal(str(item_data.get('line_total', 0))),
                        gst_rate=product.gst_rate,
                        line_number=index
                    ))
                except Product.DoesNotExist:
                    continue
        else:
            # Copy items from quotation with claim-based adjustments
            for quotation_item in quotation.quotation_items.all():
                hsn_sac_code = ''
                if quotation_item.product.hsn_code:
                    hsn_sac_code = quotation_item.product.hsn_code.code
                elif quotation_item.product.sac_code:
                    hsn_sac_code = quotation_item.product.sac_code.code
                
                # Calculate quantities and amounts based on claim type
                if claim_type == 'percentage' and claim_percentage > 0:
                    claimed_quantity = (quotation_item.quantity * Decimal(str(claim_percentage))) / Decimal('100')
                    claimed_unit_price = quotation_item.unit_price
                    claimed_line_total = claimed_quantity * claimed_unit_price
                else:
                    claimed_quantity = quotation_item.quantity
                    claimed_unit_price = quotation_item.unit_price
                    claimed_line_total = quotation_item.line_total
                
                items_to_create.append(ProformaInvoiceItem(
                    proforma_invoice=proforma_invoice,
                    product=quotation_item.product,
                    product_name=quotation_item.product.name,
                    product_code=quotation_item.product.product_code,
                    description=quotation_item.product.description,
                    hsn_sac_code=hsn_sac_code,
                    quantity=claimed_quantity,
                    unit=quotation_item.product.unit,
                    unit_price=claimed_unit_price,
                    line_total=claimed_line_total,
                    gst_rate=quotation_item.product.gst_rate,
                    line_number=quotation_item.line_number
                ))
        
        # Create items
        ProformaInvoiceItem.objects.bulk_create(items_to_create)
        
        # Calculate totals
        proforma_invoice.calculate_totals()
        
        # Update quotation balance tracking
        quotation.update_balance_tracking()
        
        return proforma_invoice
    



class ProformaInvoiceUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating proforma invoices"""

    class Meta:
        model = ProformaInvoice
        fields = [
            'proforma_number', 'proforma_date', 'due_date', 'reference', 'shipping_address',
            'discount_percentage', 'discount_amount', 'shipping_charges',
            'other_charges', 'notes', 'terms_and_conditions', 'status'
        ]
        read_only_fields = ['purchase_order', 'customer', 'company', 'created_by', 'created_at']

    def update(self, instance, validated_data):
        # Update proforma fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Recalculate totals
        instance.calculate_totals()

        return instance


class QuotationUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating quotations"""
    quotation_items = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = Quotation
        fields = [
            'customer', 'quotation_date', 'valid_until', 'reference',
            'shipping_address', 'discount_percentage', 'discount_amount',
            'shipping_charges', 'other_charges', 'notes', 'terms_and_conditions',
            'status', 'quotation_items', 'is_revised'
        ]
        read_only_fields = ['quotation_number', 'company', 'created_by', 'created_at', 'revision_count', 'revised_at', 'revised_by']

    def update(self, instance, validated_data):
        """Update quotation and items"""
        quotation_items_data = validated_data.pop('quotation_items', None)

        # Update GSTIN information if customer changed
        if 'customer' in validated_data:
            customer = validated_data['customer']
            company = instance.company

            validated_data['customer_gstin'] = customer.gstin or ''
            validated_data['company_gstin'] = company.gst_number or ''

            # Update GST type
            if customer.gstin and company.gst_number:
                customer_state_code = customer.gstin[:2]
                company_state_code = company.gst_number[:2]
                validated_data['gst_type'] = 'cgst_sgst' if customer_state_code == company_state_code else 'igst'
            else:
                validated_data['gst_type'] = 'exempt'

        # Update quotation fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update quotation items if provided
        if quotation_items_data is not None:
            # Delete existing items
            instance.quotation_items.all().delete()

            # Create new items in bulk to avoid multiple total calculations
            items_to_create = []
            for i, item_data in enumerate(quotation_items_data, 1):
                # Get the product instance
                product_id = item_data.pop('product')
                product = Product.objects.get(id=product_id)

                item = QuotationItem(
                    quotation=instance,
                    product=product,
                    line_number=i,
                    **item_data
                )
                items_to_create.append(item)

            # Save all items with skip_totals_calculation flag
            for item in items_to_create:
                item.save(skip_totals_calculation=True)

            # Calculate totals once after all items are created
            instance.calculate_totals()

        return instance


# Invoice Serializers
class InvoiceItemSerializer(serializers.ModelSerializer):
    """Serializer for invoice items"""

    class Meta:
        model = InvoiceItem
        fields = [
            'id', 'product', 'product_name', 'product_code', 'description',
            'hsn_sac_code', 'quantity', 'unit', 'unit_price', 'line_total',
            'gst_rate', 'line_number'
        ]
        read_only_fields = ['id', 'line_total']


class InvoiceListSerializer(serializers.ModelSerializer):
    """Serializer for invoice list view"""
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_code = serializers.CharField(source='customer.customer_code', read_only=True)
    customer_project_area = serializers.CharField(source='customer.project_area', read_only=True)
    customer_email = serializers.CharField(source='customer.email', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    proforma_number = serializers.CharField(source='proforma_invoice.proforma_number', read_only=True)
    purchase_order = serializers.SerializerMethodField()
    quotation = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.user.get_full_name', read_only=True)
    revised_by_name = serializers.CharField(source='revised_by.user.get_full_name', read_only=True)
    customer_shipping_addresses = serializers.SerializerMethodField()
    tds_pending_certificate = serializers.SerializerMethodField()
    tds_cash_outstanding = serializers.SerializerMethodField()
    tds_amount_outstanding = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'invoice_date', 'due_date', 'customer_name',
            'customer_code', 'customer_project_area', 'customer_email', 'customer_phone',
            'proforma_number', 'purchase_order', 'quotation', 'payment_status', 'gst_type', 'subtotal', 'total_tax', 'total_amount',
            'paid_amount', 'outstanding_amount', 'item_count', 'is_rejected', 'rejection_reason',
            'is_work_completed', 'is_revised', 'revision_count', 'revised_at', 'revised_by_name', 'created_at',
            'created_by_name', 'customer_shipping_addresses',
            'gst_payment_status', 'gst_paid_date', 'gst_payment_reference',
            'cgst_amount', 'sgst_amount', 'igst_amount', 'tds_pending_certificate',
            'tds_applicable', 'tds_section', 'tds_rate',
            'tds_cash_outstanding', 'tds_amount_outstanding',
        ]

    def get_purchase_order(self, obj):
        """Get purchase order details if invoice was created from PO"""
        if obj.purchase_order:
            return {
                'internal_po_number': obj.purchase_order.internal_po_number,
                'po_number': obj.purchase_order.po_number,
                'po_date': obj.purchase_order.po_date.isoformat() if obj.purchase_order.po_date else None
            }
        return None
    
    def get_quotation(self, obj):
        """Get quotation details if invoice was created from quotation"""
        if obj.quotation:
            return {
                'quotation_number': obj.quotation.quotation_number,
                'quotation_date': obj.quotation.quotation_date.isoformat() if obj.quotation.quotation_date else None
            }
        return None

    def get_item_count(self, obj):
        return obj.invoice_items.count()
    
    def get_customer_shipping_addresses(self, obj):
        """Return shipping address + reference for tooltip.
        Always returns data so hover is always active on customer name.
        """
        addresses = []

        # 1. Invoice-specific shipping address (highest priority)
        if obj.shipping_address:
            addresses.append({
                'type': 'Shipping Address',
                'address': obj.shipping_address.label
                    + (' — ' + obj.shipping_address.full_address if obj.shipping_address.full_address else ''),
                'is_default': obj.shipping_address.is_default
            })
        elif obj.purchase_order and obj.purchase_order.shipping_address:
            addresses.append({
                'type': 'PO Shipping',
                'address': (obj.purchase_order.shipping_address.label or '') +
                    (' — ' + obj.purchase_order.shipping_address.full_address
                     if obj.purchase_order.shipping_address.full_address else ''),
                'is_default': False
            })
        elif obj.quotation and obj.quotation.shipping_address:
            addresses.append({
                'type': 'Quotation Shipping',
                'address': (obj.quotation.shipping_address.label or '') +
                    (' — ' + obj.quotation.shipping_address.full_address
                     if obj.quotation.shipping_address.full_address else ''),
                'is_default': False
            })
        else:
            # No shipping address on invoice/PO/quotation — show all customer site addresses
            if obj.customer:
                for addr in obj.customer.shipping_addresses.all():
                    addresses.append({
                        'type': addr.label or 'Site Address',
                        'address': addr.full_address,
                        'is_default': addr.is_default
                    })

        # 2. Reference field
        if obj.reference:
            addresses.append({
                'type': 'Reference',
                'address': obj.reference,
                'is_default': False
            })

        # 3. Billing address always shown so tooltip is never empty
        if obj.customer and obj.customer.full_billing_address:
            addresses.append({
                'type': 'Billing Address',
                'address': obj.customer.full_billing_address,
                'is_default': False
            })

        return addresses

    def get_tds_pending_certificate(self, obj):
        """TDS pending cert — capped at invoice-level TDS (subtotal × rate)."""
        from decimal import Decimal
        if not obj.tds_applicable or not obj.tds_rate:
            return '0'
        invoice_tds = (Decimal(str(obj.subtotal or 0)) * Decimal(str(obj.tds_rate)) / 100).quantize(Decimal('0.01'))
        cert_received = Decimal('0')
        for p in obj.payments.filter(status='completed', tds_applicable=True):
            if p.tds_certificate_received and p.tds_amount:
                cert_received += Decimal(str(p.tds_amount))
        cert_received = min(cert_received, invoice_tds)
        return str(max(Decimal('0'), invoice_tds - cert_received))

    def get_tds_cash_outstanding(self, obj):
        """Outstanding for cash portion only (total - tds_portion - cash paid)."""
        from decimal import Decimal
        if not obj.tds_applicable or not obj.tds_rate:
            return str(max(Decimal('0'), Decimal(str(obj.outstanding_amount or 0))))
        invoice_tds = (Decimal(str(obj.subtotal or 0)) * Decimal(str(obj.tds_rate)) / 100).quantize(Decimal('0.01'))
        cash_paid = Decimal('0')
        for p in obj.payments.filter(status='completed'):
            cash_paid += Decimal(str(p.net_amount_received or 0))
        cash_max = Decimal(str(obj.total_amount or 0)) - invoice_tds
        return str(max(Decimal('0'), cash_max - cash_paid))

    def get_tds_amount_outstanding(self, obj):
        """Outstanding TDS portion (invoice-level TDS minus cert-received)."""
        from decimal import Decimal
        if not obj.tds_applicable or not obj.tds_rate:
            return '0'
        invoice_tds = (Decimal(str(obj.subtotal or 0)) * Decimal(str(obj.tds_rate)) / 100).quantize(Decimal('0.01'))
        cert_received = Decimal('0')
        for p in obj.payments.filter(status='completed', tds_applicable=True):
            if p.tds_certificate_received and p.tds_amount:
                cert_received += Decimal(str(p.tds_amount))
        cert_received = min(cert_received, invoice_tds)
        return str(max(Decimal('0'), invoice_tds - cert_received))

class InvoiceDetailSerializer(serializers.ModelSerializer):
    """Serializer for invoice detail view"""
    customer_details = CustomerDetailSerializer(source='customer', read_only=True)
    proforma_invoice_details = ProformaInvoiceDetailSerializer(source='proforma_invoice', read_only=True)
    purchase_order_details = PurchaseOrderDetailSerializer(source='purchase_order', read_only=True)
    quotation_details = QuotationDetailSerializer(source='quotation', read_only=True)
    invoice_items = InvoiceItemSerializer(many=True, read_only=True)
    shipping_address_details = CustomerShippingAddressSerializer(source='shipping_address', read_only=True)
    created_by_name = serializers.CharField(source='created_by.user.get_full_name', read_only=True)
    company_name = serializers.SerializerMethodField()
    company_address = serializers.SerializerMethodField()
    payment_terms = serializers.SerializerMethodField()
    effective_shipping_address = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'invoice_date', 'due_date', 'reference',
            'customer_details', 'proforma_invoice_details', 'purchase_order_details', 'quotation_details',
            'customer_gstin', 'company_gstin', 'company_name', 'company_address', 
            'shipping_address_details', 'effective_shipping_address',
            'gst_type', 'subtotal', 'total_tax', 'total_amount', 'cgst_amount', 'sgst_amount', 
            'igst_amount', 'discount_percentage', 'discount_amount', 'shipping_charges', 
            'other_charges', 'payment_status', 'paid_amount', 'outstanding_amount', 
            'notes', 'terms_and_conditions', 'payment_terms', 'invoice_items', 'is_rejected',
            'is_work_completed', 'created_at', 'created_by_name',
            'gst_payment_status', 'gst_paid_date', 'gst_payment_reference',
            'cgst_amount', 'sgst_amount', 'igst_amount', 'total_tax'
        ]
    
    def get_company_name(self, obj):
        return obj.company.name if obj.company else None
    
    def get_company_address(self, obj):
        if obj.company:
            address_parts = []
            if hasattr(obj.company, 'address_line1') and obj.company.address_line1:
                address_parts.append(obj.company.address_line1)
            if hasattr(obj.company, 'city') and obj.company.city:
                address_parts.append(obj.company.city)
            if hasattr(obj.company, 'state') and obj.company.state:
                address_parts.append(obj.company.state)
            return ', '.join(address_parts) if address_parts else None
        return None
    
    def get_payment_terms(self, obj):
        if obj.customer and hasattr(obj.customer, 'payment_terms'):
            return obj.customer.payment_terms
        return None
    
    def get_effective_shipping_address(self, obj):
        """Get the effective shipping address with priority: Invoice > PO > Quotation > Customer Default"""
        # Priority 1: Invoice-specific shipping address
        if obj.shipping_address:
            return {
                'source': 'Invoice',
                'label': obj.shipping_address.label,
                'address': obj.shipping_address.full_address,
                'is_default': obj.shipping_address.is_default
            }
        
        # Priority 2: Purchase Order shipping address
        if obj.purchase_order and obj.purchase_order.shipping_address:
            return {
                'source': 'Purchase Order',
                'label': obj.purchase_order.shipping_address.label,
                'address': obj.purchase_order.shipping_address.full_address,
                'is_default': obj.purchase_order.shipping_address.is_default
            }
        
        # Priority 3: Quotation shipping address
        if obj.quotation and obj.quotation.shipping_address:
            return {
                'source': 'Quotation',
                'label': obj.quotation.shipping_address.label,
                'address': obj.quotation.shipping_address.full_address,
                'is_default': obj.quotation.shipping_address.is_default
            }
        
        # Priority 4: Customer default shipping address
        if obj.customer:
            default_shipping = obj.customer.shipping_addresses.filter(is_default=True).first()
            if default_shipping:
                return {
                    'source': 'Customer Default',
                    'label': default_shipping.label,
                    'address': default_shipping.full_address,
                    'is_default': True
                }
            
            # Fallback: Customer billing address
            if obj.customer.full_billing_address:
                return {
                    'source': 'Customer Billing (Fallback)',
                    'label': 'Billing Address',
                    'address': obj.customer.full_billing_address,
                    'is_default': False
                }
        
        return {
            'source': 'None',
            'label': 'No Address',
            'address': 'No shipping address available',
            'is_default': False
        }


class InvoiceCreateSerializer(serializers.ModelSerializer):
    """World-Class Invoice Creation - from Purchase Orders, Quotations, or directly"""
    invoice_number = serializers.CharField(required=False, allow_blank=True)
    purchase_order = serializers.PrimaryKeyRelatedField(
        queryset=PurchaseOrder.objects.all(),
        required=False,  # Optional for direct creation
        allow_null=True
    )
    quotation = serializers.PrimaryKeyRelatedField(
        queryset=Quotation.objects.all(),
        required=False,  # Optional for quotation-based creation
        allow_null=True
    )
    invoice_items = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False
    )

    # Add sophisticated claiming fields
    claim_type = serializers.CharField(required=False)
    claim_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, default=0)
    selected_items = serializers.DictField(required=False)
    item_percentages = serializers.DictField(required=False)
    item_claim_methods = serializers.DictField(required=False)

    class Meta:
        model = Invoice
        fields = [
            'purchase_order', 'quotation', 'customer', 'invoice_date', 'due_date', 'reference',
            'shipping_address', 'discount_percentage', 'discount_amount',
            'shipping_charges', 'other_charges', 'notes', 'terms_and_conditions',
            'claim_type', 'claim_percentage', 'selected_items', 'item_percentages', 'item_claim_methods', 'invoice_items',
            'invoice_number'
        ]
        extra_kwargs = {
            'customer': {'required': False}  # Make customer optional since it's populated from PO
        }

    def validate(self, data):
        """World-Class validation - Purchase Order, Quotation, or direct creation"""
        purchase_order = data.get('purchase_order')
        quotation = data.get('quotation')
        customer = data.get('customer')
        invoice_items = data.get('invoice_items')
        claim_type = data.get('claim_type')
        claim_percentage = data.get('claim_percentage', 0)
        invoice_number = data.get('invoice_number')
        
        # Validate invoice number uniqueness (check against proforma invoices too)
        if invoice_number:
            company = self.context['request'].user.company_user.company if hasattr(self.context['request'].user, 'company_user') else None
            if company:
                # Check if invoice number exists in proforma invoices
                if ProformaInvoice.objects.filter(company=company, proforma_number=invoice_number).exists():
                    raise serializers.ValidationError({
                        'invoice_number': f'Invoice number {invoice_number} already exists as a Proforma Invoice number. Please use a different number.'
                    })
                # Check if invoice number exists in other tax invoices (for update)
                if self.instance:
                    if Invoice.objects.filter(company=company, invoice_number=invoice_number).exclude(id=self.instance.id).exists():
                        raise serializers.ValidationError({
                            'invoice_number': f'Invoice number {invoice_number} already exists. Please use a different number.'
                        })
                else:
                    if Invoice.objects.filter(company=company, invoice_number=invoice_number).exists():
                        raise serializers.ValidationError({
                            'invoice_number': f'Invoice number {invoice_number} already exists. Please use a different number.'
                        })

        # For PO-based creation, automatically set customer from PO BEFORE validation
        if purchase_order:
            # AUTO-ACTIVATE PO BEFORE VALIDATION (Business Logic: Invoices can only be created from active POs)
            if purchase_order.status == 'draft':
                purchase_order.status = 'active'
                purchase_order.save(update_fields=['status'])
                # Refresh the instance to get updated status
                purchase_order.refresh_from_db()
            
            data['customer'] = purchase_order.customer
            customer = purchase_order.customer
            
            # For PO-based creation, claim type is required
            if not claim_type:
                raise serializers.ValidationError("Claim type is required for PO-based invoice creation")
        elif quotation:
            # For quotation-based creation, automatically set customer from quotation
            data['customer'] = quotation.customer
            customer = quotation.customer
            
            # For quotation-based creation, claim type is required
            if not claim_type:
                raise serializers.ValidationError("Claim type is required for quotation-based invoice creation")
        else:
            # For direct creation, customer and items are required
            if not customer:
                raise serializers.ValidationError("Customer is required for direct invoice creation")
            if not invoice_items:
                raise serializers.ValidationError("Items are required for direct invoice creation")
            return data

        # Validate percentage-based claiming for PO
        if claim_type == 'percentage' and purchase_order:
            from decimal import Decimal
            
            # Fix balance tracking if needed before validation
            purchase_order.fix_balance_tracking()
            
            # Ensure PO totals are calculated
            if purchase_order.total_amount == 0 and purchase_order.po_items.exists():
                purchase_order.calculate_totals()
                purchase_order.refresh_from_db()
            
            # Check item percentages if provided (ITEM-LEVEL VALIDATION)
            item_percentages = data.get('item_percentages', {})
            if item_percentages:
                # Validate each item's percentage against its individual availability
                for po_item in purchase_order.po_items.all():
                    item_id_str = str(po_item.id)
                    if item_id_str in item_percentages:
                        requested_percentage = Decimal(str(item_percentages[item_id_str]))
                        
                        # Calculate how much of this specific item has already been claimed by TAX INVOICES
                        claimed_percentage = Decimal('0')
                        for invoice in purchase_order.invoices.filter(is_rejected=False):
                            for inv_item in invoice.invoice_items.filter(product=po_item.product):
                                if po_item.line_total > 0:
                                    item_percentage = (inv_item.line_total / po_item.line_total) * 100
                                    claimed_percentage += item_percentage
                        
                        # Calculate available percentage for this specific item
                        available_percentage = max(Decimal('0'), Decimal('100') - claimed_percentage)
                        
                        # Validate requested percentage against available percentage for this item
                        if requested_percentage > available_percentage:
                            product_name = po_item.product.name if po_item.product else f"Item {po_item.id}"
                            raise serializers.ValidationError({
                                'item_percentages': f'Item "{product_name}" percentage {requested_percentage:.1f}% exceeds available percentage {available_percentage:.1f}%. This item has {claimed_percentage:.1f}% already claimed in tax invoices.'
                            })
            else:
                # Legacy overall percentage validation (only if no item-level percentages)
                claim_percentage = data.get('claim_percentage', 0)
                if claim_percentage:
                    # Get available percentage for tax invoices (EXCLUDING rejected invoices)
                    available_percentage = purchase_order.get_available_invoice_percentage()
                    
                    # If available percentage is 0 but PO has amounts, this might be a new PO
                    # Allow 100% claiming for the first invoice on a new PO
                    if available_percentage == 0 and purchase_order.total_amount > 0:
                        # Check if this is truly the first invoice (no existing NON-REJECTED invoices)
                        existing_non_rejected_invoices = purchase_order.invoices.filter(is_rejected=False).count()
                        if existing_non_rejected_invoices == 0:
                            # This is the first non-rejected invoice on this PO, allow up to 100%
                            available_percentage = Decimal('100')
                            # Also fix the balance tracking immediately
                            purchase_order.remaining_invoice_balance = purchase_order.total_amount
                            purchase_order.save(update_fields=['remaining_invoice_balance'])
                    
                    if claim_percentage > available_percentage:
                        raise serializers.ValidationError({
                            'claim_percentage': f'Claim percentage {claim_percentage:.1f}% exceeds available tax invoice percentage {available_percentage:.1f}%.'
                        })

        return data

    def create(self, validated_data):
        """Create invoice from Purchase Order, Quotation, or directly with automatic GST calculation"""
        # Get company from context first, before calling assign_number
        company = self.context.get('company')
        if not company:
            request = self.context.get('request')
            if request and hasattr(request, 'service_user'):
                company = request.service_user.company
        
        if not company:
            raise serializers.ValidationError("Company could not be determined for invoice creation")
        
        # Set company in validated_data before assign_number
        validated_data['company'] = company
        
        assign_number(validated_data, self, 'invoice', 'invoice_number', Invoice)
        purchase_order = validated_data.get('purchase_order')
        quotation = validated_data.get('quotation')
        
        if purchase_order:
            invoice = self._create_from_purchase_order(validated_data, purchase_order)
        elif quotation:
            invoice = self._create_from_quotation(validated_data, quotation)
        else:
            invoice = self._create_direct_invoice(validated_data)
        
        # Apply automatic GST calculation if customer has Indian compliance data
        if invoice.customer.state_code and invoice.customer.is_gst_registered:
            try:
                # Get company state from purchase order or default
                company_state = '27'  # Default to Maharashtra
                if hasattr(purchase_order.company, 'state_code'):
                    company_state = purchase_order.company.state_code
                
                # Prepare invoice data for GST calculation
                invoice_data = {
                    'company_state_code': company_state,
                    'customer_state_code': invoice.customer.state_code,
                    'customer_gstin': invoice.customer_gstin,
                    'subtotal': float(invoice.subtotal),
                    'gst_rate': Decimal('18')  # Default GST rate
                }
                
                # Calculate GST
                gst_result = calculate_gst_for_invoice(invoice_data)
                
                # Update invoice with GST details
                invoice.gst_transaction_id = f"GST-{invoice.invoice_number}-{invoice.invoice_date.strftime('%Y%m%d')}"
                invoice.place_of_supply = invoice.customer.state_code
                invoice.save(update_fields=['gst_transaction_id', 'place_of_supply'])
                
            except Exception as e:
                # Log error but don't fail invoice creation
                print(f"GST calculation failed for invoice {invoice.invoice_number}: {e}")
        
        return invoice
    
    def _create_from_quotation(self, validated_data, quotation):
        """Create invoice from quotation with sophisticated claiming logic"""
        from decimal import Decimal
        
        with transaction.atomic():
            # Lock quotation to prevent concurrent access
            quotation = Quotation.objects.select_for_update().get(id=quotation.id)
            
            # Extract claiming parameters
            claim_type = validated_data.pop('claim_type', None)
            claim_percentage = validated_data.pop('claim_percentage', 0)
            selected_items = validated_data.pop('selected_items', {})
            item_percentages = validated_data.pop('item_percentages', {})
            validated_data.pop('invoice_items', None)  # Remove direct items for quotation-based creation
            
            # Calculate total amount being claimed
            total_claimed_amount = Decimal('0')
            
            if claim_type == 'quantity' and selected_items:
                for quotation_item in quotation.quotation_items.all():
                    item_id_str = str(quotation_item.id)
                    if item_id_str in selected_items and selected_items[item_id_str] > 0:
                        selected_quantity = Decimal(str(selected_items[item_id_str]))
                        total_claimed_amount += selected_quantity * quotation_item.unit_price
            elif claim_type == 'percentage' and item_percentages:
                for quotation_item in quotation.quotation_items.all():
                    item_id_str = str(quotation_item.id)
                    if item_id_str in item_percentages and float(item_percentages[item_id_str]) > 0:
                        item_percentage = Decimal(str(item_percentages[item_id_str]))
                        total_claimed_amount += (quotation_item.line_total * item_percentage) / Decimal('100')
            elif claim_type == 'percentage' and claim_percentage > 0:
                claiming_percentage = Decimal(str(claim_percentage))
                for quotation_item in quotation.quotation_items.all():
                    total_claimed_amount += (quotation_item.line_total * claiming_percentage) / Decimal('100')
            
            # Check if total amount exceeds remaining balance
            if total_claimed_amount > quotation.remaining_invoice_balance:
                raise serializers.ValidationError(
                    f"Total claimed amount {total_claimed_amount} exceeds remaining balance {quotation.remaining_invoice_balance}"
                )
            
            # Update quotation balance first
            quotation.remaining_invoice_balance -= total_claimed_amount
            quotation.invoice_claimed_amount += total_claimed_amount
            quotation.save(update_fields=['remaining_invoice_balance', 'invoice_claimed_amount'])
            
            # Set customer and GST information from quotation
            validated_data['customer'] = quotation.customer
            validated_data['gst_type'] = quotation.gst_type
            validated_data['customer_gstin'] = quotation.customer_gstin
            validated_data['company_gstin'] = quotation.company_gstin
            validated_data['quotation'] = quotation
            
            # Copy shipping address from quotation if not already set
            if not validated_data.get('shipping_address') and quotation.shipping_address:
                validated_data['shipping_address'] = quotation.shipping_address
            
            # Create the invoice
            invoice = Invoice.objects.create(**validated_data)
            
            # Update quotation claim type if this is the first invoice
            if not quotation.claim_type and claim_type:
                quotation.claim_type = claim_type
                quotation.save(update_fields=['claim_type'])
            
            # Create invoice items from quotation
            items_to_create = []
            
            if claim_type == 'quantity' and selected_items:
                # QUANTITY-BASED CLAIMING: Create invoice for selected quantities
                for quotation_item in quotation.quotation_items.all():
                    item_id_str = str(quotation_item.id)
                    if item_id_str in selected_items and selected_items[item_id_str] > 0:
                        selected_quantity = Decimal(str(selected_items[item_id_str]))
                        claim_line_total = selected_quantity * quotation_item.unit_price
                        
                        items_to_create.append(InvoiceItem(
                            invoice=invoice,
                            product=quotation_item.product,
                            product_name=quotation_item.product_name,
                            product_code=quotation_item.product_code,
                            description=quotation_item.description,
                            hsn_sac_code=quotation_item.hsn_sac_code,
                            quantity=selected_quantity,
                            unit=quotation_item.unit,
                            unit_price=quotation_item.unit_price,
                            line_total=claim_line_total,
                            gst_rate=quotation_item.gst_rate,
                            line_number=quotation_item.line_number
                        ))
            elif claim_type == 'percentage' and item_percentages:
                # ITEM-LEVEL PERCENTAGE CLAIMING: Create invoice for item-specific percentages
                for quotation_item in quotation.quotation_items.all():
                    item_id_str = str(quotation_item.id)
                    if item_id_str in item_percentages and float(item_percentages[item_id_str]) > 0:
                        item_percentage = Decimal(str(item_percentages[item_id_str]))
                        claim_line_total = (quotation_item.line_total * item_percentage) / Decimal('100')
                        claim_quantity = (quotation_item.quantity * item_percentage) / Decimal('100')
                        
                        items_to_create.append(InvoiceItem(
                            invoice=invoice,
                            product=quotation_item.product,
                            product_name=quotation_item.product_name,
                            product_code=quotation_item.product_code,
                            description=quotation_item.description,
                            hsn_sac_code=quotation_item.hsn_sac_code,
                            quantity=claim_quantity,
                            unit=quotation_item.unit,
                            unit_price=quotation_item.unit_price,
                            line_total=claim_line_total,
                            gst_rate=quotation_item.gst_rate,
                            line_number=quotation_item.line_number
                        ))
            elif claim_type == 'percentage' and claim_percentage > 0:
                # LEGACY PERCENTAGE-BASED CLAIMING: Create invoice for overall percentage
                claiming_percentage = Decimal(str(claim_percentage))
                
                for quotation_item in quotation.quotation_items.all():
                    claim_line_total = (quotation_item.line_total * claiming_percentage) / Decimal('100')
                    claim_quantity = (quotation_item.quantity * claiming_percentage) / Decimal('100')
                    
                    items_to_create.append(InvoiceItem(
                        invoice=invoice,
                        product=quotation_item.product,
                        product_name=quotation_item.product_name,
                        product_code=quotation_item.product_code,
                        description=quotation_item.description,
                        hsn_sac_code=quotation_item.hsn_sac_code,
                        quantity=claim_quantity,
                        unit=quotation_item.unit,
                        unit_price=quotation_item.unit_price,
                        line_total=claim_line_total,
                        gst_rate=quotation_item.gst_rate,
                        line_number=quotation_item.line_number
                    ))
            else:
                # VALIDATION: Ensure at least some items are selected
                if claim_type == 'percentage':
                    raise serializers.ValidationError("Please select at least one product with a percentage greater than 0")
                elif claim_type == 'quantity':
                    raise serializers.ValidationError("Please select at least one product with a quantity greater than 0")
            
            # Create items
            if items_to_create:
                InvoiceItem.objects.bulk_create(items_to_create)
            
            # Calculate totals
            invoice.calculate_totals()
            
            return invoice
    
    def _create_direct_invoice(self, validated_data):
        """Create invoice directly without Purchase Order"""
        from decimal import Decimal
        
        invoice_items_data = validated_data.pop('invoice_items', [])
        customer = validated_data['customer']
        company = validated_data.get('company') or self.context.get('company')
        
        # Remove PO-specific fields for direct creation
        validated_data.pop('claim_type', None)
        validated_data.pop('claim_percentage', None)
        validated_data.pop('selected_items', None)
        validated_data.pop('item_percentages', None)
        
        # Set GST information
        if customer.gstin and hasattr(company, 'gst_number') and company.gst_number:
            customer_state_code = customer.gstin[:2]
            company_state_code = company.gst_number[:2]
            validated_data['gst_type'] = 'cgst_sgst' if customer_state_code == company_state_code else 'igst'
        else:
            validated_data['gst_type'] = 'exempt'
        
        validated_data['customer_gstin'] = customer.gstin or ''
        validated_data['company_gstin'] = getattr(company, 'gst_number', '') or ''
        
        # Create invoice
        invoice = Invoice.objects.create(**validated_data)
        
        # Create items
        items_to_create = []
        for index, item_data in enumerate(invoice_items_data, 1):
            product_id = item_data.get('product')
            try:
                product = Product.objects.get(id=product_id)
                
                hsn_sac_code = ''
                if product.hsn_code:
                    hsn_sac_code = product.hsn_code.code
                elif product.sac_code:
                    hsn_sac_code = product.sac_code.code
                
                items_to_create.append(InvoiceItem(
                    invoice=invoice,
                    product=product,
                    product_name=item_data.get('product_name', product.name),
                    product_code=product.product_code,
                    description=product.description,
                    hsn_sac_code=hsn_sac_code,
                    quantity=Decimal(str(item_data.get('quantity', 0))),
                    unit=item_data.get('unit', product.unit),
                    unit_price=Decimal(str(item_data.get('unit_price', 0))),
                    line_total=Decimal(str(item_data.get('line_total', 0))),
                    gst_rate=product.gst_rate,
                    line_number=index
                ))
            except Product.DoesNotExist:
                continue
        
        InvoiceItem.objects.bulk_create(items_to_create)
        invoice.calculate_totals()
        
        return invoice

    def _create_from_purchase_order(self, validated_data, purchase_order):
        """World-Class Invoice Creation - Supports item-level percentage and quantity claiming"""
        from decimal import Decimal

        # Extract claiming parameters
        claim_type = validated_data.pop('claim_type', None)
        claim_percentage = validated_data.pop('claim_percentage', 0)
        selected_items = validated_data.pop('selected_items', {})
        item_percentages = validated_data.pop('item_percentages', {})
        item_claim_methods = validated_data.pop('item_claim_methods', {})
        validated_data.pop('invoice_items', None)  # Remove direct items for PO-based creation

        # Set customer and GST information from purchase order
        validated_data['customer'] = purchase_order.customer
        validated_data['gst_type'] = purchase_order.gst_type
        validated_data['customer_gstin'] = purchase_order.customer_gstin
        validated_data['company_gstin'] = purchase_order.company_gstin
        
        # Copy shipping address from purchase order if not already set
        if not validated_data.get('shipping_address') and purchase_order.shipping_address:
            validated_data['shipping_address'] = purchase_order.shipping_address

        # Create the invoice
        invoice = Invoice.objects.create(**validated_data)
        
        # Update balance tracking to get latest values
        purchase_order.update_balance_tracking()
        
        # Update PO claim type if this is the first invoice
        if not purchase_order.claim_type and claim_type:
            purchase_order.claim_type = claim_type
            purchase_order.save(update_fields=['claim_type'])

        # WORLD-CLASS SOPHISTICATED CLAIMING LOGIC
        items_to_create = []
        
        # DYNAMIC CLAIMING: Use item_claim_methods if provided
        if item_claim_methods:
            for po_item in purchase_order.po_items.all():
                item_id_str = str(po_item.id)
                claim_method = item_claim_methods.get(item_id_str, 'quantity')
                
                if claim_method == 'quantity' and item_id_str in selected_items and selected_items[item_id_str] > 0:
                    selected_quantity = Decimal(str(selected_items[item_id_str]))
                    claim_line_total = selected_quantity * po_item.unit_price

                    items_to_create.append(InvoiceItem(
                        invoice=invoice,
                        product=po_item.product,
                        product_name=po_item.product_name,
                        product_code=po_item.product_code,
                        description=po_item.description,
                        hsn_sac_code=po_item.hsn_sac_code,
                        quantity=selected_quantity,
                        unit=po_item.unit,
                        unit_price=po_item.unit_price,
                        line_total=claim_line_total,
                        gst_rate=po_item.gst_rate,
                        line_number=po_item.line_number
                    ))
                elif claim_method == 'percentage' and item_id_str in item_percentages and float(item_percentages[item_id_str]) > 0:
                    item_percentage = Decimal(str(item_percentages[item_id_str]))
                    claim_line_total = (po_item.line_total * item_percentage) / Decimal('100')
                    claim_quantity = (po_item.quantity * item_percentage) / Decimal('100')

                    items_to_create.append(InvoiceItem(
                        invoice=invoice,
                        product=po_item.product,
                        product_name=po_item.product_name,
                        product_code=po_item.product_code,
                        description=po_item.description,
                        hsn_sac_code=po_item.hsn_sac_code,
                        quantity=claim_quantity,
                        unit=po_item.unit,
                        unit_price=po_item.unit_price,
                        line_total=claim_line_total,
                        gst_rate=po_item.gst_rate,
                        line_number=po_item.line_number
                    ))
        elif claim_type == 'quantity' and selected_items:
            # QUANTITY-BASED CLAIMING: Create invoice for selected quantities
            for po_item in purchase_order.po_items.all():
                item_id_str = str(po_item.id)
                if item_id_str in selected_items and selected_items[item_id_str] > 0:
                    selected_quantity = Decimal(str(selected_items[item_id_str]))
                    claim_line_total = selected_quantity * po_item.unit_price

                    items_to_create.append(InvoiceItem(
                        invoice=invoice,
                        product=po_item.product,
                        product_name=po_item.product_name,
                        product_code=po_item.product_code,
                        description=po_item.description,
                        hsn_sac_code=po_item.hsn_sac_code,
                        quantity=selected_quantity,
                        unit=po_item.unit,
                        unit_price=po_item.unit_price,
                        line_total=claim_line_total,
                        gst_rate=po_item.gst_rate,
                        line_number=po_item.line_number
                    ))
        elif claim_type == 'percentage' and item_percentages:
            # ITEM-LEVEL PERCENTAGE CLAIMING: Create invoice for item-specific percentages
            for po_item in purchase_order.po_items.all():
                item_id_str = str(po_item.id)
                if item_id_str in item_percentages and float(item_percentages[item_id_str]) > 0:
                    item_percentage = Decimal(str(item_percentages[item_id_str]))
                    claim_line_total = (po_item.line_total * item_percentage) / Decimal('100')
                    claim_quantity = (po_item.quantity * item_percentage) / Decimal('100')

                    items_to_create.append(InvoiceItem(
                        invoice=invoice,
                        product=po_item.product,
                        product_name=po_item.product_name,
                        product_code=po_item.product_code,
                        description=po_item.description,
                        hsn_sac_code=po_item.hsn_sac_code,
                        quantity=claim_quantity,
                        unit=po_item.unit,
                        unit_price=po_item.unit_price,
                        line_total=claim_line_total,
                        gst_rate=po_item.gst_rate,
                        line_number=po_item.line_number
                    ))
        elif claim_type == 'percentage' and claim_percentage > 0:
            # LEGACY PERCENTAGE-BASED CLAIMING: Create invoice for overall percentage
            claiming_percentage = Decimal(str(claim_percentage))

            for po_item in purchase_order.po_items.all():
                claim_line_total = (po_item.line_total * claiming_percentage) / Decimal('100')
                claim_quantity = (po_item.quantity * claiming_percentage) / Decimal('100')

                items_to_create.append(InvoiceItem(
                    invoice=invoice,
                    product=po_item.product,
                    product_name=po_item.product_name,
                    product_code=po_item.product_code,
                    description=po_item.description,
                    hsn_sac_code=po_item.hsn_sac_code,
                    quantity=claim_quantity,
                    unit=po_item.unit,
                    unit_price=po_item.unit_price,
                    line_total=claim_line_total,
                    gst_rate=po_item.gst_rate,
                    line_number=po_item.line_number
                ))
        else:
            # VALIDATION: Ensure at least some items are selected
            if claim_type == 'percentage':
                raise serializers.ValidationError("Please select at least one product with a percentage greater than 0")
            elif claim_type == 'quantity':
                raise serializers.ValidationError("Please select at least one product with a quantity greater than 0")
            else:
                # FALLBACK: Create invoice for remaining balance (legacy logic)
                remaining_percentage = (purchase_order.remaining_invoice_balance / purchase_order.total_amount) * 100

                if remaining_percentage <= 0:
                    raise serializers.ValidationError("No remaining balance to invoice")

                for po_item in purchase_order.po_items.all():
                    remaining_line_total = (po_item.line_total * remaining_percentage) / Decimal('100')
                    remaining_quantity = (po_item.quantity * remaining_percentage) / Decimal('100')

                    items_to_create.append(InvoiceItem(
                        invoice=invoice,
                        product=po_item.product,
                        product_name=po_item.product_name,
                        product_code=po_item.product_code,
                        description=po_item.description,
                        hsn_sac_code=po_item.hsn_sac_code,
                        quantity=remaining_quantity,
                        unit=po_item.unit,
                        unit_price=po_item.unit_price,
                        line_total=remaining_line_total,
                        gst_rate=po_item.gst_rate,
                        line_number=po_item.line_number
                    ))

        # Use bulk_create to avoid individual save() calls
        if items_to_create:
            InvoiceItem.objects.bulk_create(items_to_create)

        # Calculate totals once after all items are created
        invoice.calculate_totals()

        # Update PO balance tracking after invoice creation
        if invoice.purchase_order:
            invoice.purchase_order.update_balance_tracking()

        return invoice


class InvoiceUpdateSerializer(serializers.ModelSerializer):
    """Enhanced Serializer for updating invoices with full item editing support"""
    invoice_items = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False
    )
    # PO-based claiming fields
    selected_items = serializers.DictField(required=False, write_only=True)
    item_percentages = serializers.DictField(required=False, write_only=True)
    item_claim_methods = serializers.DictField(required=False, write_only=True)
    claim_type = serializers.CharField(required=False, write_only=True)

    class Meta:
        model = Invoice
        fields = [
            'customer', 'invoice_number', 'invoice_date', 'due_date', 'reference', 'shipping_address',
            'discount_percentage', 'discount_amount', 'shipping_charges',
            'other_charges', 'notes', 'terms_and_conditions', 'invoice_items',
            'selected_items', 'item_percentages', 'item_claim_methods', 'claim_type'
        ]

    def validate(self, data):
        """Validate invoice number uniqueness during updates"""
        invoice_number = data.get('invoice_number')
        
        if invoice_number:
            # Get company from instance
            company = self.instance.company if self.instance else None
            
            if company:
                # Check if invoice number exists in proforma invoices
                if ProformaInvoice.objects.filter(company=company, proforma_number=invoice_number).exists():
                    raise serializers.ValidationError({
                        'invoice_number': f'Invoice number "{invoice_number}" already exists as a Proforma Invoice number. Please use a different number.'
                    })
                
                # Check if invoice number exists in other tax invoices (exclude current instance)
                if Invoice.objects.filter(company=company, invoice_number=invoice_number).exclude(id=self.instance.id).exists():
                    raise serializers.ValidationError({
                        'invoice_number': f'Invoice number "{invoice_number}" is already used by another invoice. Please choose a different invoice number.'
                    })
        
        return data

    def update(self, instance, validated_data):
        from decimal import Decimal

        # SAFETY: never wipe an existing shipping_address with null.
        # Only update it when the request explicitly provides a non-null value.
        if 'shipping_address' in validated_data and validated_data['shipping_address'] is None:
            if instance.shipping_address_id is not None:
                validated_data.pop('shipping_address')  # keep existing

        # Extract PO-claiming fields
        invoice_items_data = validated_data.pop('invoice_items', None)
        selected_items = validated_data.pop('selected_items', None)
        item_percentages = validated_data.pop('item_percentages', None)
        item_claim_methods = validated_data.pop('item_claim_methods', None)
        validated_data.pop('claim_type', None)

        # Update customer and recalculate GST information if customer changed
        if 'customer' in validated_data:
            customer = validated_data['customer']
            company = instance.company
            if customer.gstin and hasattr(company, 'gst_number') and company.gst_number:
                customer_state_code = customer.gstin[:2]
                company_state_code = company.gst_number[:2]
                validated_data['gst_type'] = 'cgst_sgst' if customer_state_code == company_state_code else 'igst'
            else:
                validated_data['gst_type'] = 'exempt'
            validated_data['customer_gstin'] = customer.gstin or ''
            validated_data['company_gstin'] = getattr(company, 'gst_number', '') or ''

        # Update basic invoice fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # PO-based claiming: rebuild items from PO using claim methods
        if item_claim_methods and instance.purchase_order:
            purchase_order = instance.purchase_order
            instance.invoice_items.all().delete()
            items_to_create = []
            for po_item in purchase_order.po_items.all():
                item_id_str = str(po_item.id)
                claim_method = item_claim_methods.get(item_id_str, 'quantity')

                if claim_method == 'quantity' and selected_items and item_id_str in selected_items:
                    qty = Decimal(str(selected_items[item_id_str]))
                    if qty <= 0:
                        continue
                    line_total = qty * po_item.unit_price
                    items_to_create.append(InvoiceItem(
                        invoice=instance,
                        product=po_item.product,
                        product_name=po_item.product_name,
                        product_code=po_item.product_code,
                        description=po_item.description,
                        hsn_sac_code=po_item.hsn_sac_code,
                        quantity=qty,
                        unit=po_item.unit,
                        unit_price=po_item.unit_price,
                        line_total=line_total,
                        gst_rate=po_item.gst_rate,
                        line_number=po_item.line_number
                    ))
                elif claim_method == 'percentage' and item_percentages and item_id_str in item_percentages:
                    pct = Decimal(str(item_percentages[item_id_str]))
                    if pct <= 0:
                        continue
                    line_total = (po_item.line_total * pct) / Decimal('100')
                    qty = (po_item.quantity * pct) / Decimal('100')
                    items_to_create.append(InvoiceItem(
                        invoice=instance,
                        product=po_item.product,
                        product_name=po_item.product_name,
                        product_code=po_item.product_code,
                        description=po_item.description,
                        hsn_sac_code=po_item.hsn_sac_code,
                        quantity=qty,
                        unit=po_item.unit,
                        unit_price=po_item.unit_price,
                        line_total=line_total,
                        gst_rate=po_item.gst_rate,
                        line_number=po_item.line_number
                    ))
            if items_to_create:
                InvoiceItem.objects.bulk_create(items_to_create)

        # Direct mode: replace items from invoice_items list
        elif invoice_items_data is not None:
            instance.invoice_items.all().delete()
            items_to_create = []
            for index, item_data in enumerate(invoice_items_data, 1):
                product_id = item_data.get('product')
                quantity = item_data.get('quantity', 1)
                unit_price = item_data.get('unit_price', 0)
                try:
                    product = Product.objects.get(id=product_id)
                    line_total = Decimal(str(quantity)) * Decimal(str(unit_price))
                    hsn_sac_code = ''
                    if product.hsn_code:
                        hsn_sac_code = product.hsn_code.code
                    elif product.sac_code:
                        hsn_sac_code = product.sac_code.code
                    items_to_create.append(InvoiceItem(
                        invoice=instance,
                        product=product,
                        product_name=product.name,
                        product_code=product.product_code,
                        description=product.description,
                        hsn_sac_code=hsn_sac_code,
                        quantity=quantity,
                        unit=product.unit,
                        unit_price=unit_price,
                        line_total=line_total,
                        gst_rate=product.gst_rate,
                        line_number=index
                    ))
                except Product.DoesNotExist:
                    continue
            InvoiceItem.objects.bulk_create(items_to_create)

        instance.calculate_totals()
        return instance


# Payment Serializers
class PaymentListSerializer(serializers.ModelSerializer):
    """Serializer for payment list view"""
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_code = serializers.CharField(source='customer.customer_code', read_only=True)
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)
    created_by_name = serializers.CharField(source='created_by.user.get_full_name', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'payment_number', 'payment_date', 'amount', 'payment_method',
            'customer_name', 'customer_code', 'invoice_number', 'reference_number',
            'bank_name', 'status', 'created_at', 'created_by_name',
            'gross_payment_amount', 'tds_applicable', 'tds_rate', 'tds_amount',
            'tds_section', 'net_amount_received',
            'tds_deposited', 'tds_certificate_received',
            'form16a_number', 'tds_deposited_date', 'tds_challan_number',
        ]


class PaymentDetailSerializer(serializers.ModelSerializer):
    """Serializer for payment detail view with complete information"""
    customer = CustomerDetailSerializer(read_only=True)
    invoice = InvoiceDetailSerializer(read_only=True)
    proforma_invoice = ProformaInvoiceDetailSerializer(read_only=True)
    created_by_name = serializers.CharField(source='created_by.user.get_full_name', read_only=True)
    invoice_number = serializers.SerializerMethodField()
    invoice_type = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            'id', 'payment_number', 'payment_date', 'amount', 'payment_method',
            'customer', 'invoice', 'proforma_invoice', 
            'invoice_number', 'invoice_type', 'reference_number', 'bank_name',
            'notes', 'status', 'created_at', 'created_by_name',
            # TDS fields
            'tds_amount', 'tds_rate', 'tds_section', 'net_amount_received',
            'tds_certificate_received', 'form16a_number',
            # CA-level TDS tracking fields
            'ca_name', 'ca_firm', 'ca_membership_number', 'submitted_to_ca_date',
            'ca_acknowledgment_number', 'ca_submission_status', 'ca_notes',
            # New CA-level fields
            'gross_payment_amount', 'tds_applicable', 'tds_deposited',
        ]

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret['tds_percentage'] = ret.get('tds_rate', 0)
        return ret

    def get_invoice_number(self, obj):
        """Get invoice number (either tax invoice or proforma)"""
        if obj.invoice:
            return obj.invoice.invoice_number
        elif obj.proforma_invoice:
            return obj.proforma_invoice.proforma_number
        return None

    def get_invoice_type(self, obj):
        """Get invoice type"""
        if obj.invoice:
            return "Tax Invoice"
        elif obj.proforma_invoice:
            return "Proforma Invoice"
        return None


class PaymentCreateSerializer(serializers.ModelSerializer):
    """World-Class Payment Creation with TDS Support"""
    payment_number = serializers.CharField(required=False, allow_blank=True)
    amount = serializers.DecimalField(max_digits=15, decimal_places=2, required=False, allow_null=True)
    ca_name = serializers.CharField(required=False, allow_blank=True, allow_null=True, default='')
    ca_firm = serializers.CharField(required=False, allow_blank=True, allow_null=True, default='')
    ca_membership_number = serializers.CharField(required=False, allow_blank=True, allow_null=True, default='')
    ca_acknowledgment_number = serializers.CharField(required=False, allow_blank=True, allow_null=True, default='')
    ca_notes = serializers.CharField(required=False, allow_blank=True, allow_null=True, default='')

    # Make proforma_invoice optional and handle null values
    proforma_invoice = serializers.PrimaryKeyRelatedField(
        queryset=ProformaInvoice.objects.all(),
        required=False,
        allow_null=True
    )
    
    invoice = serializers.PrimaryKeyRelatedField(
        queryset=Invoice.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = Payment
        fields = [
            'invoice', 'proforma_invoice', 'payment_date', 'amount', 'payment_method',
            'reference_number', 'bank_name', 'notes', 'status',
            # TDS Fields
            'tds_amount', 'tds_rate', 'tds_section', 'net_amount_received',
            'tds_certificate_received', 'form16a_number',
            # CA-level TDS tracking fields
            'ca_name', 'ca_firm', 'ca_membership_number', 'submitted_to_ca_date',
            'ca_acknowledgment_number', 'ca_submission_status', 'ca_notes',
            'payment_number'
        ]

    def validate_amount(self, value):
        """Validate payment amount"""
        if value is not None and value <= 0:
            raise serializers.ValidationError("Payment amount must be greater than 0")
        return value

    def to_internal_value(self, data):
        """Override to handle conflicting invoice fields before validation"""
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"[PaymentCreateSerializer] raw incoming data: {dict(data) if hasattr(data, 'items') else data}")

        try:
            data = data.copy() if hasattr(data, 'copy') else dict(data)
        except Exception:
            data = dict(data)

        # Map gross_payment_amount -> amount for frontend compatibility
        if 'gross_payment_amount' in data and 'amount' not in data:
            data['amount'] = data['gross_payment_amount']

        # Map tds_percentage -> tds_rate for frontend compatibility
        if 'tds_percentage' in data:
            data['tds_rate'] = data.pop('tds_percentage')

        # Strip empty string values for optional numeric/date fields only
        for field in ('tds_amount', 'tds_rate', 'net_amount_received', 'submitted_to_ca_date'):
            if field in data and (data[field] == '' or data[field] is None):
                data.pop(field)

        # Coerce None CA fields to empty string
        for field in ('ca_name', 'ca_firm', 'ca_membership_number', 'ca_acknowledgment_number', 'ca_notes'):
            if data.get(field) is None:
                data[field] = ''

        # Strip unknown frontend-only fields
        for field in ('tds_certificate_number', 'tds_certificate_date', 'is_tds_received', 'invoice_type', 'session_key'):
            data.pop(field, None)

        # Clean up empty or invalid invoice fields
        if 'invoice' in data and (not data['invoice'] or data['invoice'] == '' or data['invoice'] == 'null'):
            data.pop('invoice', None)
            
        if 'proforma_invoice' in data and (not data['proforma_invoice'] or data['proforma_invoice'] == '' or data['proforma_invoice'] == 'null'):
            data.pop('proforma_invoice', None)
        
        return super().to_internal_value(data)

    def validate(self, attrs):
        """Cross-field validation"""
        invoice = attrs.get('invoice')
        proforma_invoice = attrs.get('proforma_invoice')
        amount = attrs.get('amount')

        # Ensure payment is linked to either invoice or proforma invoice
        if not invoice and not proforma_invoice:
            raise serializers.ValidationError(
                "Payment must be linked to either an Invoice or Proforma Invoice in your workflow"
            )

        # Check if both are provided (not allowed)
        if invoice and proforma_invoice:
            raise serializers.ValidationError(
                "Payment cannot be linked to both Invoice and Proforma Invoice"
            )

        import logging
        logging.getLogger(__name__).error(f"[PaymentCreateSerializer.validate] attrs={attrs}")

        # Ensure amount is provided
        if not amount:
            raise serializers.ValidationError({"amount": "Payment amount is required and must be greater than 0"})

        # Validate payment amount against outstanding amount (allow 1 rupee tolerance for rounding)
        if invoice and amount:
            if amount > invoice.outstanding_amount + 1:
                raise serializers.ValidationError(
                    f"Payment amount (₹{amount}) cannot exceed outstanding amount (₹{invoice.outstanding_amount})"
                )
        elif proforma_invoice and amount:
            if amount > proforma_invoice.outstanding_amount + 1:
                raise serializers.ValidationError(
                    f"Payment amount (₹{amount}) cannot exceed outstanding amount (₹{proforma_invoice.outstanding_amount})"
                )

        return attrs

    def create(self, validated_data):
        assign_number(validated_data, self, 'customer_payment', 'payment_number', Payment)
        # Set customer from invoice or proforma invoice (validation ensures one exists)
        if validated_data.get('invoice'):
            validated_data['customer'] = validated_data['invoice'].customer
        elif validated_data.get('proforma_invoice'):
            validated_data['customer'] = validated_data['proforma_invoice'].customer
        
        # Normalize net_amount_received and gross_payment_amount
        payment_amount = validated_data.get('amount', 0)
        if not validated_data.get('tds_applicable'):
            # Non-TDS payment: net received = gross = amount
            validated_data['net_amount_received'] = payment_amount
            validated_data['gross_payment_amount'] = payment_amount
            validated_data['tds_amount'] = 0
            validated_data['tds_rate'] = 0

        return super().create(validated_data)


class PaymentUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating payments - allows TDS updates without amount validation"""

    class Meta:
        model = Payment
        fields = [
            'payment_date', 'amount', 'payment_method', 'reference_number',
            'bank_name', 'notes', 'status',
            'tds_amount', 'tds_rate', 'tds_section', 'net_amount_received',
            'gross_payment_amount', 'tds_applicable',
            'tds_deposited', 'tds_certificate_received', 'form16a_number'
        ]

    def update(self, instance, validated_data):
        """Update payment and recalculate invoice status"""
        # Normalize fields for non-TDS payments
        if not validated_data.get('tds_applicable', instance.tds_applicable):
            amt = validated_data.get('amount', instance.amount)
            validated_data['net_amount_received'] = amt
            validated_data['gross_payment_amount'] = amt
            validated_data['tds_amount'] = 0
            validated_data['tds_rate'] = 0
        payment = super().update(instance, validated_data)
        payment.update_invoice_payment_status()
        return payment


# World-Class Payment Serializers
class WorldClassPaymentCreateSerializer(serializers.ModelSerializer):
    """World-Class Payment Creation - Links payments to specific invoice numbers"""
    amount = serializers.DecimalField(max_digits=15, decimal_places=2, required=False, allow_null=True)
    ca_name = serializers.CharField(required=False, allow_blank=True, allow_null=True, default='')
    ca_firm = serializers.CharField(required=False, allow_blank=True, allow_null=True, default='')
    ca_membership_number = serializers.CharField(required=False, allow_blank=True, allow_null=True, default='')
    ca_acknowledgment_number = serializers.CharField(required=False, allow_blank=True, allow_null=True, default='')
    ca_notes = serializers.CharField(required=False, allow_blank=True, allow_null=True, default='')

    # Make proforma_invoice optional and handle null values
    proforma_invoice = serializers.PrimaryKeyRelatedField(
        queryset=ProformaInvoice.objects.all(),
        required=False,
        allow_null=True
    )
    
    invoice = serializers.PrimaryKeyRelatedField(
        queryset=Invoice.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = Payment
        fields = [
            'customer', 'purchase_order', 'invoice', 'proforma_invoice',
            'payment_date', 'amount', 'payment_method', 'reference_number',
            'transaction_id', 'bank_name', 'notes', 'status',
            # TDS Fields
            'tds_amount', 'tds_rate', 'tds_section', 'net_amount_received',
            'tds_certificate_received', 'form16a_number',
            # CA-level TDS tracking fields
            'ca_name', 'ca_firm', 'ca_membership_number', 'submitted_to_ca_date',
            'ca_acknowledgment_number', 'ca_submission_status', 'ca_notes',
            # New CA-level fields
            'gross_payment_amount', 'tds_applicable', 'tds_deposited',
        ]

    def to_internal_value(self, data):
        """Override to handle non-existent invoice IDs before validation"""
        try:
            data = data.copy() if hasattr(data, 'copy') else dict(data)
        except Exception:
            data = dict(data)

        # Map gross_payment_amount -> amount for frontend compatibility
        if 'gross_payment_amount' in data and 'amount' not in data:
            data['amount'] = data['gross_payment_amount']

        # Map tds_percentage -> tds_rate for frontend compatibility
        if 'tds_percentage' in data:
            data['tds_rate'] = data.pop('tds_percentage')

        # Strip empty string values for optional numeric/date fields only
        for field in ('tds_amount', 'tds_rate', 'net_amount_received', 'submitted_to_ca_date'):
            if field in data and (data[field] == '' or data[field] is None):
                data.pop(field)

        # Coerce None CA fields to empty string
        for field in ('ca_name', 'ca_firm', 'ca_membership_number', 'ca_acknowledgment_number', 'ca_notes'):
            if data.get(field) is None:
                data[field] = ''

        # Strip unknown frontend-only fields
        for field in ('tds_certificate_number', 'tds_certificate_date', 'is_tds_received', 'invoice_type', 'session_key'):
            data.pop(field, None)

        # If proforma_invoice is provided, check if it exists before field validation
        if data.get('proforma_invoice'):
            try:
                ProformaInvoice.objects.get(id=data.get('proforma_invoice'))
            except (ProformaInvoice.DoesNotExist, ValueError, TypeError):
                # Remove invalid proforma_invoice to prevent field validation error
                data.pop('proforma_invoice', None)
        
        # If invoice is provided, check if it exists before field validation
        if data.get('invoice'):
            try:
                Invoice.objects.get(id=data.get('invoice'))
            except (Invoice.DoesNotExist, ValueError, TypeError):
                # Remove invalid invoice to prevent field validation error
                data.pop('invoice', None)
        
        # If both invoice and proforma_invoice are provided, prioritize invoice
        if data.get('invoice') and data.get('proforma_invoice'):
            data.pop('proforma_invoice', None)
        
        return super().to_internal_value(data)

    def validate_proforma_invoice(self, value):
        """Custom validation for proforma_invoice field"""
        # If value is provided, ensure it exists and belongs to the user's company
        if value is not None:
            # Get session from context to validate company access
            request = self.context.get('request')
            if request:
                session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
                if not session_key:
                    session_key = request.data.get('session_key')
                
                if session_key:
                    try:
                        from authentication.models import ServiceUserSession
                        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
                        # Check if proforma belongs to user's company
                        if value.company != session.service_user.company:
                            raise serializers.ValidationError("Proforma invoice not found or access denied")
                    except ServiceUserSession.DoesNotExist:
                        raise serializers.ValidationError("Invalid session")
        return value
    
    def validate_invoice(self, value):
        """Custom validation for invoice field"""
        # If value is provided, ensure it exists and belongs to the user's company
        if value is not None:
            # Get session from context to validate company access
            request = self.context.get('request')
            if request:
                session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
                if not session_key:
                    session_key = request.data.get('session_key')
                
                if session_key:
                    try:
                        from authentication.models import ServiceUserSession
                        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
                        # Check if invoice belongs to user's company
                        if value.company != session.service_user.company:
                            raise serializers.ValidationError("Invoice not found or access denied")
                    except ServiceUserSession.DoesNotExist:
                        raise serializers.ValidationError("Invalid session")
        return value

    def validate(self, data):
        """Validate that payment is linked to either invoice or proforma"""
        invoice = data.get('invoice')
        proforma_invoice = data.get('proforma_invoice')
        
        # Allow payments without invoice links (for general payments)
        # This is more flexible than requiring invoice linkage
        
        # Check if both are provided (not allowed)
        if invoice and proforma_invoice:
            raise serializers.ValidationError("Payment cannot be linked to both Invoice and Proforma Invoice")

        return data

    def validate_amount(self, value):
        """Validate payment amount"""
        if value is not None and value <= 0:
            raise serializers.ValidationError("Payment amount must be greater than 0")
        return value

    def create(self, validated_data):
        """Create payment with automatic status updates"""
        payment = Payment.objects.create(**validated_data)
        return payment


class WorldClassPaymentListSerializer(serializers.ModelSerializer):
    """World-Class Payment List View"""
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_code = serializers.CharField(source='customer.customer_code', read_only=True)
    po_number = serializers.CharField(source='purchase_order.internal_po_number', read_only=True)
    invoice_number = serializers.SerializerMethodField()
    invoice_type = serializers.SerializerMethodField()
    outstanding_before = serializers.SerializerMethodField()
    outstanding_after = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            'id', 'payment_number', 'payment_date', 'amount', 'payment_method',
            'customer_name', 'customer_code', 'po_number', 'invoice_number',
            'invoice_type', 'outstanding_before', 'outstanding_after',
            'reference_number', 'transaction_id', 'bank_name', 'status',
            'created_at',
            # World-Class TDS Fields
            'tds_amount', 'tds_rate', 'tds_section', 'net_amount_received',
            'tds_certificate_received', 'form16a_number'
        ]

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret['tds_percentage'] = ret.get('tds_rate', 0)
        return ret

    def get_invoice_number(self, obj):
        """Get invoice number (either tax invoice or proforma)"""
        if obj.invoice:
            return obj.invoice.invoice_number
        elif obj.proforma_invoice:
            return obj.proforma_invoice.proforma_number
        return None

    def get_invoice_type(self, obj):
        """Get invoice type"""
        if obj.invoice:
            return "Tax Invoice"
        elif obj.proforma_invoice:
            return "Proforma Invoice"
        return None

    def get_outstanding_before(self, obj):
        """Get outstanding amount before this payment"""
        if obj.invoice:
            return obj.invoice.outstanding_amount + obj.amount
        elif obj.proforma_invoice:
            return obj.proforma_invoice.outstanding_amount + obj.amount
        return 0

    def get_outstanding_after(self, obj):
        """Get outstanding amount after this payment"""
        if obj.invoice:
            return obj.invoice.outstanding_amount
        elif obj.proforma_invoice:
            return obj.proforma_invoice.outstanding_amount
        return 0


# ============================================================================
# PURCHASE & EXPENSE MANAGEMENT SERIALIZERS - NEW FUNCTIONALITY
# ============================================================================

# Vendor Serializers
class VendorListSerializer(serializers.ModelSerializer):
    """Serializer for listing vendors"""
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)

    class Meta:
        model = Vendor
        fields = [
            'id', 'vendor_code', 'name', 'vendor_type', 'contact_person',
            'email', 'phone', 'mobile', 'city', 'state', 'gstin', 'pan_number',
            'payment_terms', 'credit_limit', 'is_active', 'created_at', 'created_by_name'
        ]


class VendorDetailSerializer(serializers.ModelSerializer):
    """Serializer for vendor details"""
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)

    class Meta:
        model = Vendor
        fields = '__all__'
        read_only_fields = ['id', 'vendor_code', 'company', 'created_by', 'created_at', 'updated_at']


class VendorCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating vendors"""

    class Meta:
        model = Vendor
        fields = [
            'name', 'vendor_type', 'contact_person', 'email', 'phone', 'mobile', 'website',
            'address_line1', 'address_line2', 'city', 'state', 'pincode', 'country',
            'gstin', 'pan_number', 'bank_name', 'bank_account_number', 'bank_ifsc_code',
            'account_holder_name', 'payment_terms', 'credit_limit', 'notes', 'is_active'
        ]

    def validate_gstin(self, value):
        if value and len(value) != 15:
            raise serializers.ValidationError("GSTIN must be exactly 15 characters long")
        return value

    def validate_pan_number(self, value):
        if value and len(value) != 10:
            raise serializers.ValidationError("PAN number must be exactly 10 characters long")
        return value


class VendorUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating vendors"""

    class Meta:
        model = Vendor
        fields = [
            'name', 'vendor_type', 'contact_person', 'email', 'phone', 'mobile', 'website',
            'address_line1', 'address_line2', 'city', 'state', 'pincode', 'country',
            'gstin', 'pan_number', 'bank_name', 'bank_account_number', 'bank_ifsc_code',
            'account_holder_name', 'payment_terms', 'credit_limit', 'notes', 'is_active'
        ]
        read_only_fields = ['vendor_code', 'company', 'created_by', 'created_at']


# Purchase Request Serializers
class PurchaseRequestItemSerializer(serializers.ModelSerializer):
    """Serializer for purchase request items"""

    class Meta:
        model = PurchaseRequestItem
        fields = [
            'id', 'product', 'product_name', 'product_code', 'description',
            'hsn_sac_code', 'quantity', 'unit', 'unit_price', 'line_total',
            'gst_rate', 'line_number'
        ]
        read_only_fields = ['id', 'product_name', 'product_code', 'description', 'hsn_sac_code', 'unit', 'gst_rate', 'line_total']


class PurchaseRequestListSerializer(serializers.ModelSerializer):
    """Serializer for listing purchase requests"""
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)
    vendor_code = serializers.CharField(source='vendor.vendor_code', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseRequest
        fields = [
            'id', 'request_number', 'vendor_name', 'vendor_code', 'request_date',
            'required_by_date', 'status', 'gst_type', 'subtotal', 'total_tax',
            'total_amount', 'item_count', 'created_at', 'created_by_name'
        ]

    def get_item_count(self, obj):
        return obj.request_items.count()


class PurchaseRequestDetailSerializer(serializers.ModelSerializer):
    """Serializer for purchase request details"""
    vendor_details = VendorDetailSerializer(source='vendor', read_only=True)
    request_items = PurchaseRequestItemSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)

    class Meta:
        model = PurchaseRequest
        fields = '__all__'
        read_only_fields = [
            'id', 'request_number', 'company', 'created_by', 'created_at', 'updated_at',
            'subtotal', 'total_tax', 'total_amount', 'cgst_amount', 'sgst_amount', 'igst_amount',
            'gst_type', 'vendor_gstin', 'company_gstin'
        ]


class PurchaseRequestCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating purchase requests"""
    request_number = serializers.CharField(required=False, allow_blank=True)
    request_items = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=True
    )

    class Meta:
        model = PurchaseRequest
        fields = [
            'vendor', 'request_date', 'required_by_date', 'reference',
            'discount_percentage', 'discount_amount', 'shipping_charges',
            'other_charges', 'notes', 'terms_and_conditions', 'request_items',
            'request_number'
        ]

    def create(self, validated_data):
        from decimal import Decimal
        
        request_items_data = validated_data.pop('request_items')
        vendor = validated_data['vendor']
        assign_number(validated_data, self, 'purchase_request', 'request_number', PurchaseRequest)
        company = validated_data['company']
        
        # Set GST information
        if vendor.gstin and hasattr(company, 'gst_number') and company.gst_number:
            vendor_state_code = vendor.gstin[:2]
            company_state_code = company.gst_number[:2]
            validated_data['gst_type'] = 'cgst_sgst' if vendor_state_code == company_state_code else 'igst'
        else:
            validated_data['gst_type'] = 'exempt'
        
        validated_data['vendor_gstin'] = vendor.gstin or ''
        validated_data['company_gstin'] = getattr(company, 'gst_number', '') or ''
        
        # Create purchase request
        purchase_request = PurchaseRequest.objects.create(**validated_data)
        
        # Create items
        items_to_create = []
        for i, item_data in enumerate(request_items_data, 1):
            product_id = item_data.pop('product')
            product = Product.objects.get(id=product_id)
            
            quantity = Decimal(str(item_data.get('quantity', 1)))
            unit_price = Decimal(str(item_data.get('unit_price', 0)))
            
            items_to_create.append(PurchaseRequestItem(
                purchase_request=purchase_request,
                product=product,
                product_name=product.name,
                product_code=product.product_code,
                description=product.description,
                hsn_sac_code=product.hsn_code.code if product.hsn_code else (product.sac_code.code if product.sac_code else ''),
                quantity=quantity,
                unit=product.unit,
                unit_price=unit_price,
                line_total=quantity * unit_price,
                gst_rate=product.gst_rate,
                line_number=i
            ))
        
        PurchaseRequestItem.objects.bulk_create(items_to_create)
        
        # Calculate totals
        self._calculate_totals(purchase_request)
        
        return purchase_request
    
    def _calculate_totals(self, purchase_request):
        from decimal import Decimal
        
        items = purchase_request.request_items.all()
        subtotal = sum(item.line_total for item in items)
        
        # Apply discount
        if purchase_request.discount_percentage > 0:
            discount_amount = (subtotal * purchase_request.discount_percentage) / Decimal('100')
        else:
            discount_amount = purchase_request.discount_amount or Decimal('0')
        
        subtotal_after_discount = subtotal - discount_amount
        
        # Calculate tax
        total_tax = Decimal('0')
        cgst_amount = Decimal('0')
        sgst_amount = Decimal('0')
        igst_amount = Decimal('0')
        
        if purchase_request.gst_type == 'cgst_sgst':
            for item in items:
                item_tax = (item.line_total * item.gst_rate) / Decimal('100')
                total_tax += item_tax
                cgst_amount += item_tax / Decimal('2')
                sgst_amount += item_tax / Decimal('2')
        elif purchase_request.gst_type == 'igst':
            for item in items:
                item_tax = (item.line_total * item.gst_rate) / Decimal('100')
                total_tax += item_tax
                igst_amount += item_tax
        
        # Calculate final total
        shipping_charges = purchase_request.shipping_charges or Decimal('0')
        other_charges = purchase_request.other_charges or Decimal('0')
        total_amount = subtotal_after_discount + total_tax + shipping_charges + other_charges
        
        # Update purchase request
        purchase_request.subtotal = subtotal_after_discount
        purchase_request.discount_amount = discount_amount
        purchase_request.total_tax = total_tax
        purchase_request.cgst_amount = cgst_amount
        purchase_request.sgst_amount = sgst_amount
        purchase_request.igst_amount = igst_amount
        purchase_request.total_amount = total_amount
        purchase_request.save()


# Vendor Invoice Serializers
class VendorInvoiceItemSerializer(serializers.ModelSerializer):
    """Serializer for vendor invoice items"""

    class Meta:
        model = VendorInvoiceItem
        fields = [
            'id', 'product', 'product_name', 'product_code', 'description',
            'hsn_sac_code', 'quantity', 'unit', 'unit_price', 'line_total',
            'gst_rate', 'line_number'
        ]
        read_only_fields = ['id', 'product_name', 'product_code', 'description', 'hsn_sac_code', 'unit', 'gst_rate', 'line_total']


class VendorInvoiceListSerializer(serializers.ModelSerializer):
    """Serializer for listing vendor invoices"""
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)
    vendor_code = serializers.CharField(source='vendor.vendor_code', read_only=True)
    purchase_request_number = serializers.CharField(source='purchase_request.request_number', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = VendorInvoice
        fields = [
            'id', 'our_reference_number', 'vendor_invoice_number', 'vendor_invoice_date',
            'vendor_name', 'vendor_code', 'purchase_request_number', 'due_date',
            'status', 'payment_status', 'gst_type', 'subtotal', 'total_tax',
            'total_amount', 'paid_amount', 'outstanding_amount', 'item_count',
            'created_at', 'created_by_name'
        ]

    def get_item_count(self, obj):
        return obj.invoice_items.count()


class VendorInvoiceDetailSerializer(serializers.ModelSerializer):
    """Serializer for vendor invoice details"""
    vendor_details = VendorDetailSerializer(source='vendor', read_only=True)
    purchase_request_details = PurchaseRequestDetailSerializer(source='purchase_request', read_only=True)
    invoice_items = VendorInvoiceItemSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)

    class Meta:
        model = VendorInvoice
        fields = '__all__'
        read_only_fields = [
            'id', 'our_reference_number', 'company', 'created_by', 'created_at', 'updated_at',
            'paid_amount', 'outstanding_amount', 'payment_status', 'last_payment_date'
        ]


class VendorInvoiceCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating vendor invoices"""
    vendor_invoice_number = serializers.CharField(required=False, allow_blank=True)
    invoice_items = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=True
    )

    class Meta:
        model = VendorInvoice
        fields = [
            'vendor', 'purchase_request', 'vendor_invoice_number', 'vendor_invoice_date',
            'due_date', 'subtotal', 'total_tax', 'total_amount', 'gst_type',
            'notes', 'invoice_file', 'invoice_items'
        ]

    def create(self, validated_data):
        from decimal import Decimal
        
        invoice_items_data = validated_data.pop('invoice_items')
        vendor = validated_data['vendor']
        assign_number(validated_data, self, 'vendor_invoice', 'vendor_invoice_number', VendorInvoice)
        company = validated_data['company']
        
        # Set GST information
        if vendor.gstin and hasattr(company, 'gst_number') and company.gst_number:
            vendor_state_code = vendor.gstin[:2]
            company_state_code = company.gst_number[:2]
            validated_data['gst_type'] = 'cgst_sgst' if vendor_state_code == company_state_code else 'igst'
        else:
            validated_data['gst_type'] = 'exempt'
        
        # Create vendor invoice
        vendor_invoice = VendorInvoice.objects.create(**validated_data)
        
        # Create items
        items_to_create = []
        for i, item_data in enumerate(invoice_items_data, 1):
            product_id = item_data.get('product')
            if not product_id:
                continue  # Skip items without product
            
            try:
                product = Product.objects.get(id=product_id)
            except Product.DoesNotExist:
                continue  # Skip items with invalid product ID
            
            quantity = Decimal(str(item_data.get('quantity', 1)))
            unit_price = Decimal(str(item_data.get('unit_price', 0)))
            
            items_to_create.append(VendorInvoiceItem(
                vendor_invoice=vendor_invoice,
                product=product,
                product_name=product.name,
                product_code=product.product_code,
                description=product.description,
                hsn_sac_code=product.hsn_code.code if product.hsn_code else (product.sac_code.code if product.sac_code else ''),
                quantity=quantity,
                unit=product.unit,
                unit_price=unit_price,
                line_total=quantity * unit_price,
                gst_rate=product.gst_rate,
                line_number=i
            ))
        
        # Create items first
        VendorInvoiceItem.objects.bulk_create(items_to_create)
        
        # Calculate totals after items are created
        self._calculate_totals(vendor_invoice)
        
        return vendor_invoice
    
    def _calculate_totals(self, vendor_invoice):
        from decimal import Decimal
        
        # Refresh items from database
        vendor_invoice.refresh_from_db()
        items = vendor_invoice.invoice_items.all()
        
        if not items.exists():
            return
        
        subtotal = Decimal('0')
        total_tax = Decimal('0')
        cgst_amount = Decimal('0')
        sgst_amount = Decimal('0')
        igst_amount = Decimal('0')
        
        # Calculate subtotal and tax
        for item in items:
            subtotal += item.line_total
            
            if vendor_invoice.gst_type == 'cgst_sgst':
                item_tax = (item.line_total * item.gst_rate) / Decimal('100')
                total_tax += item_tax
                cgst_amount += item_tax / Decimal('2')
                sgst_amount += item_tax / Decimal('2')
            elif vendor_invoice.gst_type == 'igst':
                item_tax = (item.line_total * item.gst_rate) / Decimal('100')
                total_tax += item_tax
                igst_amount += item_tax
        
        # Calculate final total
        total_amount = subtotal + total_tax
        
        # Update vendor invoice
        vendor_invoice.subtotal = subtotal
        vendor_invoice.total_tax = total_tax
        vendor_invoice.cgst_amount = cgst_amount
        vendor_invoice.sgst_amount = sgst_amount
        vendor_invoice.igst_amount = igst_amount
        vendor_invoice.total_amount = total_amount
        vendor_invoice.outstanding_amount = total_amount
        vendor_invoice.save()


# Purchase Payment Serializers
class PurchasePaymentListSerializer(serializers.ModelSerializer):
    """Serializer for listing purchase payments"""
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)
    vendor_code = serializers.CharField(source='vendor.vendor_code', read_only=True)
    vendor_invoice_number = serializers.CharField(source='vendor_invoice.vendor_invoice_number', read_only=True)
    our_reference_number = serializers.CharField(source='vendor_invoice.our_reference_number', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)

    class Meta:
        model = PurchasePayment
        fields = [
            'id', 'payment_number', 'payment_date', 'amount', 'payment_method',
            'vendor_name', 'vendor_code', 'vendor_invoice_number', 'our_reference_number',
            'tds_amount', 'tds_percentage', 'net_amount_paid', 'reference_number',
            'bank_name', 'status', 'created_at', 'created_by_name'
        ]


class PurchasePaymentDetailSerializer(serializers.ModelSerializer):
    """Serializer for purchase payment details"""
    vendor_details = VendorDetailSerializer(source='vendor', read_only=True)
    vendor_invoice_details = VendorInvoiceDetailSerializer(source='vendor_invoice', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)

    class Meta:
        model = PurchasePayment
        fields = '__all__'
        read_only_fields = ['id', 'payment_number', 'company', 'created_by', 'created_at', 'updated_at', 'net_amount_paid']


class PurchasePaymentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating purchase payments"""
    payment_number = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = PurchasePayment
        fields = [
            'vendor', 'vendor_invoice', 'payment_date', 'amount', 'payment_method',
            'tds_amount', 'tds_percentage', 'tds_section', 'reference_number',
            'transaction_id', 'bank_name', 'notes', 'status', 'payment_number'
        ]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Payment amount must be greater than 0")
        return value

    def validate(self, attrs):
        vendor_invoice = attrs.get('vendor_invoice')
        amount = attrs.get('amount')
        
        if vendor_invoice and amount:
            if amount > vendor_invoice.outstanding_amount:
                raise serializers.ValidationError(
                    f"Payment amount (₹{amount}) cannot exceed outstanding amount (₹{vendor_invoice.outstanding_amount})"
                )
        
        return attrs

    def create(self, validated_data):
        assign_number(validated_data, self, 'purchase_payment', 'payment_number', PurchasePayment)
        return super().create(validated_data)


class NumberingRuleSerializer(serializers.ModelSerializer):
    """Serializer for finance numbering rules"""

    class Meta:
        model = NumberingRule
        fields = [
            'module', 'template', 'prefix', 'separator',
            'padding', 'reset_scope', 'start_from', 'allow_manual_override'
        ]
        read_only_fields = ['module']

    def validate_template(self, value):
        if '{SEQ}' not in value:
            raise serializers.ValidationError("Template must include {SEQ}")
        return value

    def validate_padding(self, value):
        if value < 1:
            raise serializers.ValidationError("Padding must be at least 1")
        return value

    def validate_start_from(self, value):
        if value < 1:
            raise serializers.ValidationError("Start from must be at least 1")
        return value


class TDSPaymentSerializer(serializers.ModelSerializer):
    """Serializer for TDS Payments API"""
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_pan = serializers.CharField(source='customer.pan_number', read_only=True)
    invoice_number = serializers.SerializerMethodField()
    quarter = serializers.SerializerMethodField()
    financial_year = serializers.SerializerMethodField()
    # Map model fields tds_section/tds_rate -> frontend-expected names
    tds_section_code = serializers.CharField(source='tds_section', read_only=True)
    tds_rate_applied = serializers.DecimalField(source='tds_rate', max_digits=5, decimal_places=2, read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'payment_number', 'payment_date', 'amount', 'tds_amount',
            'tds_rate_applied', 'tds_section_code', 'net_amount_received',
            'customer_name', 'customer_pan', 'status', 'payment_method', 'reference_number', 'notes',
            'invoice_number', 'quarter', 'financial_year', 'tds_certificate_issued',
            'tds_deposited_date', 'form16a_number', 'ca_submission_status'
        ]

    def get_invoice_number(self, obj):
        """Get invoice or proforma number"""
        if hasattr(obj, 'invoice') and obj.invoice:
            return obj.invoice.invoice_number
        elif hasattr(obj, 'proforma_invoice') and obj.proforma_invoice:
            return obj.proforma_invoice.proforma_number
        return None

    def get_quarter(self, obj):
        """Get quarter Q1-Q4 based on payment_date"""
        month = obj.payment_date.month
        if 4 <= month <= 6: return 'Q1'
        elif 7 <= month <= 9: return 'Q2'  
        elif 10 <= month <= 12: return 'Q3'
        else: return 'Q4'

    def get_financial_year(self, obj):
        """Get FY based on payment_date (Apr-Mar)"""
        year = obj.payment_date.year
        if obj.payment_date.month >= 4:
            return f"{year}-{year+1}"
        return f"{year-1}-{year}"


class TDSDepositSerializer(serializers.ModelSerializer):
    class Meta:
        model = TDSDeposit
        fields = [
            'id', 'payment', 'deposit_date', 'amount',
            'challan_number', 'form16a_number',
            'certificate_received', 'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'payment', 'created_at', 'updated_at']

    def validate(self, data):
        from decimal import Decimal
        from django.db.models import Sum
        # payment comes from URL (read-only), get it from instance or context
        payment = (
            self.instance.payment if self.instance
            else self.context.get('payment')
        )
        amount = Decimal(str(data.get('amount') or 0))
        if payment and amount:
            # Use invoice-level TDS total (subtotal * rate) as the cap,
            # falling back to payment.tds_amount if invoice data unavailable
            invoice = payment.invoice or payment.proforma_invoice
            if invoice and payment.tds_applicable is False:
                # TDS config is at invoice level — derive tds_total from invoice
                tds_rate = Decimal(str(getattr(invoice, 'tds_rate', 0) or 0))
                subtotal = Decimal(str(getattr(invoice, 'subtotal', 0) or 0))
                tds_total = (subtotal * tds_rate / 100).quantize(Decimal('0.01'))
            else:
                tds_total = Decimal(str(payment.tds_amount or 0))

            if tds_total > 0:
                existing = payment.tds_deposits.exclude(
                    pk=self.instance.pk if self.instance else None
                ).aggregate(t=Sum('amount'))['t'] or Decimal('0')
                if existing + amount > tds_total + Decimal('0.01'):
                    raise serializers.ValidationError(
                        f"Total deposits (₹{existing + amount:.2f}) would exceed TDS amount (₹{tds_total:.2f})"
                    )
        return data
