from rest_framework import serializers
from django.utils._os import safe_join
from .models import Customer, CustomerShippingAddress, Product, HSNCode, SACCode, Quotation, QuotationItem, PurchaseOrder, PurchaseOrderItem, ProformaInvoice, ProformaInvoiceItem, Invoice, InvoiceItem, Payment, Vendor, PurchaseRequest, PurchaseRequestItem, VendorInvoice, VendorInvoiceItem, PurchasePayment
from .indian_compliance import calculate_gst_for_invoice, calculate_tds_for_payment, get_indian_states
from .security_validators import FinanceSecurityValidator


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
        read_only_fields = ['customer_code']
    
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

    def create(self, validated_data):
        shipping_addresses_data = validated_data.pop('shipping_addresses', [])
        
        # Ensure customer_code is not in validated_data (let model generate it)
        validated_data.pop('customer_code', None)
        
        try:
            customer = Customer.objects.create(**validated_data)
        except Exception as e:
            # Handle unique constraint errors
            if 'unique' in str(e).lower() or 'duplicate' in str(e).lower():
                # Retry with timestamp-based code
                import time
                timestamp = int(time.time() * 1000) % 1000000
                validated_data['customer_code'] = f"CUST-{timestamp:06d}"
                customer = Customer.objects.create(**validated_data)
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

    class Meta:
        model = Product
        fields = [
            'id', 'product_code', 'name', 'product_type', 'description',
            'hsn_code_display', 'sac_code_display', 'gst_rate',
            'unit', 'selling_price', 'purchase_price',
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

    class Meta:
        model = Product
        fields = [
            'name', 'product_type', 'description',
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
            'available_proforma_percentage', 'available_invoice_percentage'
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
            'quotation_items'
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

        # Get customer and company details to save GSTIN
        customer = validated_data['customer']
        company = validated_data.get('company') or self.context['request'].user.company

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

    class Meta:
        model = PurchaseOrderItem
        fields = [
            'id', 'product', 'product_name', 'product_code', 'description', 'hsn_sac_code',
            'quantity', 'unit', 'unit_price', 'line_total', 'gst_rate', 'line_number', 'claimed_percentage'
        ]
        read_only_fields = [
            'id', 'product_name', 'product_code', 'description', 'hsn_sac_code',
            'line_total', 'gst_rate', 'unit', 'claimed_percentage'
        ]
    
    def get_claimed_percentage(self, obj):
        """Calculate claimed percentage for this item from TAX INVOICES ONLY"""
        from decimal import Decimal
        
        total_claimed_percentage = Decimal('0')
        
        # ONLY count tax invoices - proforma invoices don't reduce item availability
        for invoice in obj.purchase_order.invoices.all():
            for inv_item in invoice.invoice_items.filter(product=obj.product):
                # Calculate percentage of this item claimed in this tax invoice
                if obj.line_total > 0:
                    item_percentage = (inv_item.line_total / obj.line_total) * 100
                    total_claimed_percentage += item_percentage
        
        return float(min(total_claimed_percentage, Decimal('100')))


class PurchaseOrderListSerializer(serializers.ModelSerializer):
    """Serializer for listing purchase orders"""
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_code = serializers.CharField(source='customer.customer_code', read_only=True)
    customer_project_area = serializers.CharField(source='customer.project_area', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    quotation_number = serializers.CharField(source='quotation.quotation_number', read_only=True)
    item_count = serializers.SerializerMethodField()
    po_items = serializers.SerializerMethodField()
    available_proforma_percentage = serializers.SerializerMethodField()
    available_invoice_percentage = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'internal_po_number', 'po_number', 'po_date', 'customer_name', 'customer_code',
            'customer_project_area', 'quotation_number', 'status', 'gst_type', 'claim_type',
            'subtotal', 'total_tax', 'total_amount', 'item_count', 'po_items',
            'proforma_claimed_amount', 'remaining_proforma_balance', 'proforma_status',
            'invoice_claimed_amount', 'remaining_invoice_balance', 'invoice_status',
            'available_proforma_percentage', 'available_invoice_percentage',
            'created_at', 'created_by_name'
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
        for invoice in item.purchase_order.invoices.all():
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

        # Get quotation to copy GST information (if provided)
        quotation = validated_data.get('quotation')
        customer = validated_data.get('customer')

        if quotation:
            # Set customer and GST information from quotation
            validated_data['customer'] = quotation.customer
            validated_data['gst_type'] = quotation.gst_type
            validated_data['customer_gstin'] = quotation.customer_gstin
            validated_data['company_gstin'] = quotation.company_gstin
        else:
            # For direct PO creation, customer is already validated and GST info will be set in model's save method
            pass

        # Create the purchase order
        purchase_order = PurchaseOrder.objects.create(**validated_data)

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
    po_number = serializers.CharField(source='purchase_order.internal_po_number', read_only=True)
    item_count = serializers.SerializerMethodField()
    proforma_items = serializers.SerializerMethodField()

    class Meta:
        model = ProformaInvoice
        fields = [
            'id', 'proforma_number', 'proforma_date', 'due_date', 'customer_name', 'customer_code',
            'customer_project_area', 'po_number', 'status', 'payment_status', 'paid_amount', 'outstanding_amount', 'gst_type',
            'subtotal', 'total_tax', 'total_amount', 'item_count', 'proforma_items', 'is_rejected', 'rejection_reason',
            'created_at', 'created_by_name'
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


class ProformaInvoiceDetailSerializer(serializers.ModelSerializer):
    """Serializer for Proforma Invoice details"""
    customer_details = CustomerDetailSerializer(source='customer', read_only=True)
    purchase_order_details = PurchaseOrderDetailSerializer(source='purchase_order', read_only=True)
    shipping_address_details = CustomerShippingAddressSerializer(source='shipping_address', read_only=True)
    proforma_items = ProformaInvoiceItemSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)

    class Meta:
        model = ProformaInvoice
        fields = '__all__'
        read_only_fields = [
            'id', 'proforma_number', 'company', 'created_by', 'created_at', 'updated_at',
            'subtotal', 'total_tax', 'total_amount', 'cgst_amount', 'sgst_amount', 'igst_amount',
            'gst_type', 'customer_gstin', 'company_gstin'
        ]


class ProformaInvoiceCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating proforma invoices from Purchase Orders, Quotations, or directly"""
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
            'claim_type', 'claim_percentage', 'is_advance_bill', 'proforma_items'
        ]

    def create(self, validated_data):
        from decimal import Decimal

        # Extract proforma_items_data before creating the invoice
        proforma_items_data = validated_data.pop('proforma_items', None)

        # Get purchase order or quotation to copy information
        purchase_order = validated_data.get('purchase_order')
        quotation = validated_data.get('quotation')
        
        # Quotation-based creation
        if quotation:
            return self._create_from_quotation(validated_data, proforma_items_data)
        
        # Require either PO or Quotation - no direct creation
        if not purchase_order:
            raise serializers.ValidationError("Proforma invoice must be created from either Purchase Order or Quotation")
        
        # PO-based creation (existing logic)

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
            'proforma_date', 'due_date', 'reference', 'shipping_address',
            'discount_percentage', 'discount_amount', 'shipping_charges',
            'other_charges', 'notes', 'terms_and_conditions', 'status'
        ]
        read_only_fields = ['proforma_number', 'purchase_order', 'customer', 'company', 'created_by', 'created_at']

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
    proforma_number = serializers.CharField(source='proforma_invoice.proforma_number', read_only=True)
    item_count = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.user.get_full_name', read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'invoice_date', 'due_date', 'customer_name',
            'customer_code', 'customer_project_area', 'proforma_number', 'status',
            'payment_status', 'gst_type', 'subtotal', 'total_tax', 'total_amount',
            'paid_amount', 'outstanding_amount', 'item_count', 'is_rejected', 'rejection_reason', 'created_at',
            'created_by_name'
        ]

    def get_item_count(self, obj):
        return obj.invoice_items.count()


class InvoiceDetailSerializer(serializers.ModelSerializer):
    """Serializer for invoice detail view"""
    customer_details = CustomerDetailSerializer(source='customer', read_only=True)
    proforma_invoice_details = ProformaInvoiceDetailSerializer(source='proforma_invoice', read_only=True)
    invoice_items = InvoiceItemSerializer(many=True, read_only=True)
    shipping_address_details = CustomerShippingAddressSerializer(source='shipping_address', read_only=True)
    created_by_name = serializers.CharField(source='created_by.user.get_full_name', read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'invoice_date', 'due_date', 'reference',
            'customer_details', 'proforma_invoice_details', 'customer_gstin',
            'company_gstin', 'shipping_address_details', 'gst_type', 'subtotal',
            'total_tax', 'total_amount', 'cgst_amount', 'sgst_amount', 'igst_amount',
            'discount_percentage', 'discount_amount', 'shipping_charges', 'other_charges',
            'payment_status', 'paid_amount', 'outstanding_amount', 'status', 'notes',
            'terms_and_conditions', 'invoice_items', 'created_at', 'created_by_name'
        ]


class InvoiceCreateSerializer(serializers.ModelSerializer):
    """World-Class Invoice Creation - from Purchase Orders, Quotations, or directly"""
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

    class Meta:
        model = Invoice
        fields = [
            'purchase_order', 'quotation', 'customer', 'invoice_date', 'due_date', 'reference',
            'shipping_address', 'discount_percentage', 'discount_amount',
            'shipping_charges', 'other_charges', 'notes', 'terms_and_conditions', 'status',
            'claim_type', 'claim_percentage', 'selected_items', 'item_percentages', 'invoice_items'
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

        # For PO-based creation, automatically set customer from PO BEFORE validation
        if purchase_order:
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
            
            # Get available percentage for tax invoices
            available_percentage = purchase_order.get_available_invoice_percentage()
            
            # If available percentage is 0 but PO has amounts, this might be a new PO
            # Allow 100% claiming for the first invoice on a new PO
            if available_percentage == 0 and purchase_order.total_amount > 0:
                # Check if this is truly the first invoice (no existing invoices)
                existing_invoices = purchase_order.invoices.count()
                if existing_invoices == 0:
                    # This is the first invoice on this PO, allow up to 100%
                    available_percentage = Decimal('100')
                    # Also fix the balance tracking immediately
                    purchase_order.remaining_invoice_balance = purchase_order.total_amount
                    purchase_order.save(update_fields=['remaining_invoice_balance'])
            
            # Check item percentages if provided
            item_percentages = data.get('item_percentages', {})
            if item_percentages:
                max_item_percentage = max(item_percentages.values()) if item_percentages.values() else 0
                if max_item_percentage > available_percentage:
                    raise serializers.ValidationError({
                        'item_percentages': f'Item percentage {max_item_percentage:.1f}% exceeds available tax invoice percentage {available_percentage:.1f}%.'
                    })
            elif claim_percentage and claim_percentage > available_percentage:
                # Legacy percentage validation
                raise serializers.ValidationError({
                    'claim_percentage': f'Claim percentage {claim_percentage:.1f}% exceeds available tax invoice percentage {available_percentage:.1f}%.'
                })

        return data

    def create(self, validated_data):
        """Create invoice from Purchase Order, Quotation, or directly with automatic GST calculation"""
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
                
                # Prepare line items for GST calculation
                line_items = []
                for item in invoice.invoice_items.all():
                    line_items.append({
                        'product_name': item.product_name,
                        'line_total': float(item.line_total),
                        'gst_rate': float(item.gst_rate)
                    })
                
                # Calculate GST
                gst_result = calculate_gst_for_invoice(
                    company_state_code=company_state,
                    customer_gstin=invoice.customer_gstin,
                    customer_state_code=invoice.customer.state_code,
                    line_items=line_items
                )
                
                # Update invoice with GST details
                invoice.gst_transaction_id = f"GST-{invoice.invoice_number}-{invoice.invoice_date.strftime('%Y%m%d')}"
                invoice.place_of_supply = gst_result['place_of_supply']
                invoice.save(update_fields=['gst_transaction_id', 'place_of_supply'])
                
            except Exception as e:
                # Log error but don't fail invoice creation
                print(f"GST calculation failed for invoice {invoice.invoice_number}: {e}")
        
        return invoice
    
    def _create_from_quotation(self, validated_data, quotation):
        """Create invoice from quotation with sophisticated claiming logic"""
        from decimal import Decimal
        
        # Extract claiming parameters
        claim_type = validated_data.pop('claim_type', None)
        claim_percentage = validated_data.pop('claim_percentage', 0)
        selected_items = validated_data.pop('selected_items', {})
        item_percentages = validated_data.pop('item_percentages', {})
        validated_data.pop('invoice_items', None)  # Remove direct items for quotation-based creation
        
        # Set customer and GST information from quotation
        validated_data['customer'] = quotation.customer
        validated_data['gst_type'] = quotation.gst_type
        validated_data['customer_gstin'] = quotation.customer_gstin
        validated_data['company_gstin'] = quotation.company_gstin
        
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
        
        # Update quotation balance tracking
        quotation.update_balance_tracking()
        

        """Create invoice directly without Purchase Order"""
        from decimal import Decimal
        
        invoice_items_data = validated_data.pop('invoice_items', [])
        customer = validated_data['customer']
        company = self.context['company']
        
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
        validated_data.pop('invoice_items', None)  # Remove direct items for PO-based creation

        # Set customer and GST information from purchase order
        validated_data['customer'] = purchase_order.customer
        validated_data['gst_type'] = purchase_order.gst_type
        validated_data['customer_gstin'] = purchase_order.customer_gstin
        validated_data['company_gstin'] = purchase_order.company_gstin

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
        
        if claim_type == 'quantity' and selected_items:
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
    """Serializer for updating invoices"""

    class Meta:
        model = Invoice
        fields = [
            'invoice_date', 'due_date', 'reference', 'shipping_address',
            'discount_percentage', 'discount_amount', 'shipping_charges',
            'other_charges', 'notes', 'terms_and_conditions', 'status'
        ]

    def update(self, instance, validated_data):
        # Update basic fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        # Recalculate totals if financial fields changed
        financial_fields = ['discount_percentage', 'discount_amount', 'shipping_charges', 'other_charges']
        if any(field in validated_data for field in financial_fields):
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
            'bank_name', 'status', 'created_at', 'created_by_name'
        ]


class PaymentDetailSerializer(serializers.ModelSerializer):
    """Serializer for payment detail view"""
    customer_details = CustomerDetailSerializer(source='customer', read_only=True)
    invoice_details = InvoiceDetailSerializer(source='invoice', read_only=True)
    created_by_name = serializers.CharField(source='created_by.user.get_full_name', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'payment_number', 'payment_date', 'amount', 'payment_method',
            'customer_details', 'invoice_details', 'reference_number', 'bank_name',
            'notes', 'status', 'created_at', 'created_by_name'
        ]


class PaymentCreateSerializer(serializers.ModelSerializer):
    """World-Class Payment Creation with TDS Support"""
    
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
            # World-Class TDS Fields
            'tds_amount', 'tds_percentage', 'tds_section', 'net_amount_received',
            'tds_certificate_number', 'tds_certificate_date', 'is_tds_received'
        ]

    def validate_amount(self, value):
        """Validate payment amount"""
        if value <= 0:
            raise serializers.ValidationError("Payment amount must be greater than 0")
        return value

    def to_internal_value(self, data):
        """Override to handle conflicting invoice fields before validation"""
        # Create a mutable copy of the data
        if hasattr(data, '_mutable'):
            data._mutable = True
        
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

        # Debug logging
        print(f"Payment validation - invoice: {invoice}, proforma_invoice: {proforma_invoice}")

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

        # Validate payment amount against outstanding amount
        if invoice and amount:
            if amount > invoice.outstanding_amount:
                raise serializers.ValidationError(
                    f"Payment amount (₹{amount}) cannot exceed outstanding amount (₹{invoice.outstanding_amount})"
                )
        elif proforma_invoice and amount:
            if amount > proforma_invoice.outstanding_amount:
                raise serializers.ValidationError(
                    f"Payment amount (₹{amount}) cannot exceed outstanding amount (₹{proforma_invoice.outstanding_amount})"
                )

        return attrs

    def create(self, validated_data):
        # Set customer from invoice or proforma invoice (validation ensures one exists)
        if validated_data.get('invoice'):
            validated_data['customer'] = validated_data['invoice'].customer
        elif validated_data.get('proforma_invoice'):
            validated_data['customer'] = validated_data['proforma_invoice'].customer
        
        # Apply automatic TDS calculation if payment method requires it
        payment_amount = validated_data.get('amount', 0)
        if payment_amount > 0 and not validated_data.get('tds_amount'):
            try:
                # Default TDS section for payments (can be customized)
                tds_section = validated_data.get('tds_section', '194A')
                
                # Calculate TDS with correct parameter format
                tds_result = calculate_tds_for_payment({
                    'amount': float(payment_amount),
                    'tds_section': tds_section
                })
                
                # Update payment with TDS details if applicable
                if tds_result.get('is_above_threshold'):
                    validated_data['tds_amount'] = tds_result['tds_amount']
                    validated_data['tds_rate_applied'] = tds_result.get('tds_rate', 0)
                    validated_data['tds_section_code'] = tds_section
                    validated_data['net_amount_received'] = tds_result.get('net_amount', payment_amount)
                    
            except Exception as e:
                # Log error but don't fail payment creation
                print(f"TDS calculation failed for payment: {e}")

        return super().create(validated_data)


class PaymentUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating payments"""

    class Meta:
        model = Payment
        fields = [
            'payment_date', 'amount', 'payment_method', 'reference_number',
            'bank_name', 'notes', 'status'
        ]

    def validate_amount(self, value):
        """Validate payment amount"""
        if value <= 0:
            raise serializers.ValidationError("Payment amount must be greater than 0")
        return value


# World-Class Payment Serializers
class WorldClassPaymentCreateSerializer(serializers.ModelSerializer):
    """World-Class Payment Creation - Links payments to specific invoice numbers"""
    
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
            # World-Class TDS Fields
            'tds_amount', 'tds_percentage', 'tds_section', 'net_amount_received',
            'tds_certificate_number', 'tds_certificate_date', 'is_tds_received'
        ]

    def to_internal_value(self, data):
        """Override to handle non-existent invoice IDs before validation"""
        # Create a mutable copy of the data
        if hasattr(data, '_mutable'):
            data._mutable = True
        
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
        if value <= 0:
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
            'tds_amount', 'tds_percentage', 'tds_section', 'net_amount_received',
            'tds_certificate_number', 'tds_certificate_date', 'is_tds_received'
        ]

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
            'other_charges', 'notes', 'terms_and_conditions', 'request_items'
        ]

    def create(self, validated_data):
        from decimal import Decimal
        
        request_items_data = validated_data.pop('request_items')
        vendor = validated_data['vendor']
        company = self.context['company']
        
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
        company = self.context['company']
        
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

    class Meta:
        model = PurchasePayment
        fields = [
            'vendor', 'vendor_invoice', 'payment_date', 'amount', 'payment_method',
            'tds_amount', 'tds_percentage', 'tds_section', 'reference_number',
            'transaction_id', 'bank_name', 'notes', 'status'
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
