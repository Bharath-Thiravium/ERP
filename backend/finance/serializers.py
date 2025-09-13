from rest_framework import serializers
from .models import Customer, CustomerShippingAddress, Product, HSNCode, SACCode, Quotation, QuotationItem, PurchaseOrder, PurchaseOrderItem


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
            'bank_name', 'bank_account_number', 'bank_ifsc_code', 'bank_branch',
            'credit_limit', 'payment_terms', 'currency', 'project_area', 'notes', 'is_active',
            'shipping_addresses'
        ]
    
    def validate_gstin(self, value):
        """Validate GSTIN format"""
        if value and len(value) != 15:
            raise serializers.ValidationError("GSTIN must be exactly 15 characters long")
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
        """Cross-field validation"""
        # If customer type is individual, Aadhar is recommended
        if attrs.get('customer_type') == 'individual' and not attrs.get('aadhar_number'):
            # This is just a warning, not an error
            pass
        
        # If customer type is business, GSTIN and PAN are recommended
        if attrs.get('customer_type') == 'business':
            if not attrs.get('gstin') and not attrs.get('pan_number'):
                # This is just a warning, not an error
                pass
        
        # If shipping address is not same as billing, validate shipping fields
        if not attrs.get('shipping_same_as_billing', True):
            required_shipping_fields = ['shipping_address_line1', 'shipping_city', 'shipping_state', 'shipping_pincode']
            for field in required_shipping_fields:
                if not attrs.get(field):
                    raise serializers.ValidationError(f"{field.replace('_', ' ').title()} is required when shipping address is different from billing address")
        
        return attrs

    def create(self, validated_data):
        shipping_addresses_data = validated_data.pop('shipping_addresses', [])
        customer = Customer.objects.create(**validated_data)

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
            'bank_name', 'bank_account_number', 'bank_ifsc_code', 'bank_branch',
            'credit_limit', 'payment_terms', 'currency', 'project_area', 'notes', 'is_active',
            'shipping_addresses'
        ]
        read_only_fields = ['customer_code', 'company', 'created_by', 'created_at']
    
    def validate_gstin(self, value):
        """Validate GSTIN format"""
        if value and len(value) != 15:
            raise serializers.ValidationError("GSTIN must be exactly 15 characters long")
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


# SAC Code Serializers
class SACCodeSerializer(serializers.ModelSerializer):
    """Serializer for SAC codes"""

    class Meta:
        model = SACCode
        fields = ['id', 'code', 'service_name', 'description', 'gst_rate']


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
            'hsn_code', 'sac_code',
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
        """Create product and let the model handle GST rate calculation"""
        # Remove gst_rate from validated_data if it exists (shouldn't be sent from frontend)
        validated_data.pop('gst_rate', None)
        return super().create(validated_data)


class ProductUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating products"""

    class Meta:
        model = Product
        fields = [
            'name', 'product_type', 'description',
            'hsn_code', 'sac_code',
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
        """Update product and let the model handle GST rate calculation"""
        # Remove gst_rate from validated_data if it exists (shouldn't be sent from frontend)
        validated_data.pop('gst_rate', None)
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

    class Meta:
        model = Quotation
        fields = [
            'id', 'quotation_number', 'customer_name', 'customer_code', 'customer_project_area',
            'quotation_date', 'valid_until', 'status', 'gst_type',
            'subtotal', 'total_tax', 'total_amount', 'item_count', 'quotation_items',
            'created_at', 'created_by_name', 'is_revised', 'revision_count', 'revised_at', 'revised_by_name'
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


class QuotationDetailSerializer(serializers.ModelSerializer):
    """Serializer for quotation details"""
    customer_details = CustomerDetailSerializer(source='customer', read_only=True)
    shipping_address_details = CustomerShippingAddressSerializer(source='shipping_address', read_only=True)
    quotation_items = QuotationItemSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)

    class Meta:
        model = Quotation
        fields = '__all__'
        read_only_fields = [
            'id', 'quotation_number', 'company', 'created_by', 'created_at', 'updated_at',
            'subtotal', 'total_tax', 'total_amount', 'cgst_amount', 'sgst_amount', 'igst_amount',
            'gst_type', 'customer_gstin', 'company_gstin'
        ]


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

    class Meta:
        model = PurchaseOrderItem
        fields = [
            'id', 'product', 'product_name', 'product_code', 'description', 'hsn_sac_code',
            'quantity', 'unit', 'unit_price', 'line_total', 'gst_rate', 'line_number'
        ]
        read_only_fields = [
            'id', 'product_name', 'product_code', 'description', 'hsn_sac_code',
            'line_total', 'gst_rate', 'unit'
        ]


class PurchaseOrderListSerializer(serializers.ModelSerializer):
    """Serializer for listing purchase orders"""
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_code = serializers.CharField(source='customer.customer_code', read_only=True)
    customer_project_area = serializers.CharField(source='customer.project_area', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    quotation_number = serializers.CharField(source='quotation.quotation_number', read_only=True)
    item_count = serializers.SerializerMethodField()
    po_items = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'internal_po_number', 'po_number', 'po_date', 'customer_name', 'customer_code',
            'customer_project_area', 'quotation_number', 'status', 'gst_type',
            'subtotal', 'total_tax', 'total_amount', 'item_count', 'po_items',
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
                'line_total': float(item.line_total)
            }
            for item in items
        ]


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

    class Meta:
        model = PurchaseOrder
        fields = [
            'quotation', 'po_number', 'po_date', 'po_file', 'customer', 'quotation_date',
            'valid_until', 'reference', 'shipping_address', 'discount_percentage',
            'discount_amount', 'shipping_charges', 'other_charges', 'notes',
            'terms_and_conditions', 'status', 'po_items'
        ]

    def create(self, validated_data):
        po_items_data = validated_data.pop('po_items')

        # Get quotation to copy GST information
        quotation = validated_data['quotation']

        # Set GST information from quotation
        validated_data['gst_type'] = quotation.gst_type
        validated_data['customer_gstin'] = quotation.customer_gstin
        validated_data['company_gstin'] = quotation.company_gstin

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

                items_to_create.append(PurchaseOrderItem(
                    purchase_order=purchase_order,
                    product=product,
                    quantity=quantity,
                    unit_price=unit_price,
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

    class Meta:
        model = PurchaseOrder
        fields = [
            'po_number', 'po_date', 'po_file', 'customer', 'quotation_date', 'valid_until',
            'reference', 'shipping_address', 'discount_percentage', 'discount_amount',
            'shipping_charges', 'other_charges', 'notes', 'terms_and_conditions',
            'status', 'po_items'
        ]
        read_only_fields = ['internal_po_number', 'quotation', 'company', 'created_by', 'created_at']

    def update(self, instance, validated_data):
        po_items_data = validated_data.pop('po_items', None)

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

                    items_to_create.append(PurchaseOrderItem(
                        purchase_order=instance,
                        product=product,
                        quantity=quantity,
                        unit_price=unit_price,
                        line_number=index
                    ))
                except Product.DoesNotExist:
                    continue

            # Use bulk_create to avoid individual save() calls
            PurchaseOrderItem.objects.bulk_create(items_to_create)

            # Calculate totals once after all items are created
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
