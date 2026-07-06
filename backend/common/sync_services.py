from django.db import transaction
from django.utils import timezone

from .models import (
    DataSharingPolicy,
    MasterCustomer,
    MasterProduct,
    ServiceDataLink,
    SyncApprovalRequest,
)


def get_data_sharing_policy(company):
    policy, _ = DataSharingPolicy.objects.get_or_create(company=company)
    return policy


def _link_master_record(company, service_type, obj, master_customer=None, master_product=None):
    ServiceDataLink.objects.update_or_create(
        service_type=service_type,
        object_model=f'{obj._meta.app_label}.{obj.__class__.__name__}',
        object_id=obj.pk,
        defaults={
            'company': company,
            'master_customer': master_customer,
            'master_product': master_product,
            'sync_status': 'linked',
            'last_synced_at': timezone.now(),
        },
    )


def _source_identity(obj):
    return f'{obj._meta.app_label}.{obj.__class__.__name__}', obj.pk


def create_sync_approval_request(
    *,
    company,
    request_type,
    source_service,
    target_service,
    source_obj,
    title,
    summary='',
    suggested_data=None,
):
    source_model, source_object_id = _source_identity(source_obj)
    request, _ = SyncApprovalRequest.objects.get_or_create(
        request_type=request_type,
        source_model=source_model,
        source_object_id=source_object_id,
        status='pending',
        defaults={
            'company': company,
            'source_service': source_service,
            'target_service': target_service,
            'title': title,
            'summary': summary,
            'suggested_data': suggested_data or {},
        },
    )
    return request


def _linked_master_for_object(obj):
    if hasattr(obj, 'master_customer') and obj.master_customer_id:
        return obj.master_customer, None
    if hasattr(obj, 'master_product') and obj.master_product_id:
        return None, obj.master_product
    source_model, source_object_id = _source_identity(obj)
    link = ServiceDataLink.objects.filter(
        object_model=source_model,
        object_id=source_object_id,
    ).select_related('master_customer', 'master_product').first()
    if not link:
        return None, None
    return link.master_customer, link.master_product


def is_shared_record(obj):
    master_customer, master_product = _linked_master_for_object(obj)
    return bool(master_customer or master_product)


def _create_sync_notification(sync_request):
    from company_dashboard.models import CompanyNotification

    CompanyNotification.objects.create(
        company=sync_request.company,
        type='system_alert',
        service_type='data-sharing',
        title=f'Approval needed: {sync_request.title}',
        message=sync_request.summary or 'A cross-service data sharing request needs review.',
        priority='high',
        metadata={
            'navigate_to': 'data-sharing',
            'sync_request_id': sync_request.id,
            'request_type': sync_request.request_type,
        },
    )


def request_shared_delete(obj, reason, requested_by=None):
    if not reason or not str(reason).strip():
        raise ValueError('Delete reason is required for shared records.')

    master_customer, master_product = _linked_master_for_object(obj)
    if not master_customer and not master_product:
        return None

    title = str(obj)
    source_model, source_object_id = _source_identity(obj)
    linked_links = ServiceDataLink.objects.filter(company=obj.company)
    if master_customer:
        linked_links = linked_links.filter(master_customer=master_customer)
    else:
        linked_links = linked_links.filter(master_product=master_product)

    request = create_sync_approval_request(
        company=obj.company,
        request_type='delete_shared_record',
        source_service=obj._meta.app_label,
        target_service='shared',
        source_obj=obj,
        title=title,
        summary=f'Delete request for shared record. Reason: {reason}',
        suggested_data={
            'reason': str(reason).strip(),
            'requested_by': getattr(requested_by, 'username', '') or getattr(requested_by, 'email', ''),
            'source_model': source_model,
            'source_object_id': source_object_id,
            'linked_records': list(linked_links.values('service_type', 'object_model', 'object_id')),
        },
    )
    _create_sync_notification(request)
    return request


def request_customer_sync_from_finance(customer):
    master = ensure_master_customer_from_finance_customer(customer)
    return create_sync_approval_request(
        company=customer.company,
        request_type='finance_customer_to_crm_contact',
        source_service='finance',
        target_service='crm',
        source_obj=customer,
        title=customer.display_name or customer.name,
        summary='Create a CRM contact linked to this Finance customer.',
        suggested_data={
            'name': customer.name,
            'first_name': customer.name.split(' ', 1)[0] if customer.name else '',
            'last_name': customer.name.split(' ', 1)[1] if customer.name and ' ' in customer.name else '',
            'account_type': 'customer',
            'industry': customer.industry or 'other',
            'website': customer.website or '',
            'phone': customer.phone or customer.mobile or '',
            'mobile': customer.mobile or '',
            'email': customer.email or '',
            'billing_address': customer.full_billing_address,
            'shipping_address': customer.full_shipping_address,
            'address_line1': customer.billing_address_line1 or '',
            'address_line2': customer.billing_address_line2 or '',
            'city': customer.billing_city or '',
            'state': customer.billing_state or '',
            'postal_code': customer.billing_pincode or '',
            'country': customer.billing_country or 'India',
            'master_customer_id': master.id,
        },
    )


def request_customer_sync_from_crm_account(account):
    master = ensure_master_customer_from_crm_account(account)
    return create_sync_approval_request(
        company=account.company,
        request_type='crm_account_to_finance_customer',
        source_service='crm',
        target_service='finance',
        source_obj=account,
        title=account.name,
        summary='Create a Finance customer linked to this CRM account.',
        suggested_data={
            'customer_type': 'business',
            'name': account.name,
            'display_name': account.name,
            'email': account.email or '',
            'phone': account.phone or '',
            'website': account.website or '',
            'billing_address_line1': account.billing_address or account.name,
            'billing_city': '',
            'billing_state': '',
            'billing_pincode': '',
            'billing_country': 'India',
            'industry': account.industry or '',
            'master_customer_id': master.id,
        },
    )


def request_customer_sync_from_crm_contact(contact):
    master = ensure_master_customer_from_crm_contact(contact)
    name = f'{contact.first_name} {contact.last_name}'.strip()
    return create_sync_approval_request(
        company=contact.company,
        request_type='crm_contact_to_finance_customer',
        source_service='crm',
        target_service='finance',
        source_obj=contact,
        title=name,
        summary='Create a Finance customer linked to this CRM contact.',
        suggested_data={
            'customer_type': 'individual',
            'name': name,
            'display_name': name,
            'email': contact.email or '',
            'phone': contact.phone or contact.mobile or '',
            'mobile': contact.mobile or '',
            'billing_address_line1': contact.address_line1 or name,
            'billing_address_line2': contact.address_line2 or '',
            'billing_city': contact.city or '',
            'billing_state': contact.state or '',
            'billing_pincode': contact.postal_code or '',
            'billing_country': contact.country or 'India',
            'master_customer_id': master.id,
        },
    )


def request_product_sync_from_inventory(product):
    master = ensure_master_product_from_inventory_product(product)
    return create_sync_approval_request(
        company=product.company,
        request_type='inventory_product_to_finance_product',
        source_service='inventory',
        target_service='finance',
        source_obj=product,
        title=product.name,
        summary='Create a Finance product linked to this Inventory product.',
        suggested_data={
            'name': product.name,
            'product_type': 'service' if product.product_type == 'service' else 'product',
            'description': product.description,
            'hsn_code': product.hsn_code or '',
            'gst_rate': str(product.tax_rate),
            'selling_price': str(product.selling_price),
            'purchase_price': str(product.cost_price),
            'track_inventory': True,
            'master_product_id': master.id,
        },
    )


def request_product_sync_from_finance(product):
    master = ensure_master_product_from_finance_product(product)
    code = ''
    if product.hsn_code:
        code = product.hsn_code.code
    elif product.sac_code:
        code = product.sac_code.code
    return create_sync_approval_request(
        company=product.company,
        request_type='finance_product_to_inventory_product',
        source_service='finance',
        target_service='inventory',
        source_obj=product,
        title=product.name,
        summary='Create an Inventory product linked to this Finance product.',
        suggested_data={
            'name': product.name,
            'product_type': 'service' if product.product_type == 'service' else 'finished_good',
            'description': product.description,
            'sku': product.product_code,
            'hsn_code': code,
            'tax_rate': str(product.gst_rate),
            'cost_price': str(product.purchase_price),
            'selling_price': str(product.selling_price),
            'mrp': str(product.selling_price),
            'master_product_id': master.id,
        },
    )


def ensure_master_customer_from_finance_customer(customer):
    with transaction.atomic():
        master = customer.master_customer
        if master is None:
            master = MasterCustomer.objects.create(
                company=customer.company,
                customer_type=customer.customer_type or 'unknown',
                name=customer.name,
                display_name=customer.display_name or customer.name,
                email=customer.email,
                phone=customer.phone,
                mobile=customer.mobile,
                website=customer.website,
                gstin=customer.gstin,
                pan_number=customer.pan_number,
                billing_address_line1=customer.billing_address_line1,
                billing_address_line2=customer.billing_address_line2 or '',
                billing_city=customer.billing_city,
                billing_state=customer.billing_state,
                billing_pincode=customer.billing_pincode,
                billing_country=customer.billing_country or 'India',
                source_module='finance',
                is_active=customer.is_active,
            )
            customer.master_customer = master
            customer.save(update_fields=['master_customer'])
        _link_master_record(customer.company, 'finance', customer, master_customer=master)
        return master


def ensure_master_customer_from_crm_account(account):
    with transaction.atomic():
        master = account.master_customer
        if master is None:
            master = MasterCustomer.objects.create(
                company=account.company,
                customer_type='business' if account.account_type == 'customer' else 'unknown',
                name=account.name,
                display_name=account.name,
                email=account.email,
                phone=account.phone,
                website=account.website,
                billing_address_line1=account.billing_address or '',
                billing_country='India',
                source_module='crm',
                is_active=account.is_active,
            )
            account.master_customer = master
            account.save(update_fields=['master_customer'])
        _link_master_record(account.company, 'crm', account, master_customer=master)
        return master


def ensure_master_customer_from_crm_contact(contact):
    with transaction.atomic():
        master = contact.master_customer
        if master is None:
            name = f'{contact.first_name} {contact.last_name}'.strip()
            master = MasterCustomer.objects.create(
                company=contact.company,
                customer_type='individual',
                name=name,
                display_name=name,
                email=contact.email,
                phone=contact.phone,
                mobile=contact.mobile,
                billing_address_line1=contact.address_line1 or '',
                billing_address_line2=contact.address_line2 or '',
                billing_city=contact.city or '',
                billing_state=contact.state or '',
                billing_pincode=contact.postal_code or '',
                billing_country=contact.country or 'India',
                source_module='crm',
                is_active=contact.is_active,
            )
            contact.master_customer = master
            contact.save(update_fields=['master_customer'])
        _link_master_record(contact.company, 'crm', contact, master_customer=master)
        return master


def ensure_master_product_from_finance_product(product):
    with transaction.atomic():
        master = product.master_product
        if master is None:
            master = MasterProduct.objects.create(
                company=product.company,
                name=product.name,
                product_type=product.product_type,
                description=product.description,
                hsn_code=product.hsn_code.code if product.hsn_code else '',
                sac_code=product.sac_code.code if product.sac_code else '',
                gst_rate=product.gst_rate,
                base_unit=product.unit_ref.code if product.unit_ref else product.unit,
                selling_price=product.selling_price,
                purchase_price=product.purchase_price,
                is_stock_tracked=product.track_inventory,
                source_module='finance',
                is_active=product.is_active,
            )
            product.master_product = master
            product.save(update_fields=['master_product'])
        _link_master_record(product.company, 'finance', product, master_product=master)
        return master


def ensure_master_product_from_inventory_product(product):
    with transaction.atomic():
        master = product.master_product
        if master is None:
            master = MasterProduct.objects.create(
                company=product.company,
                name=product.name,
                product_type=product.product_type,
                description=product.description,
                hsn_code=product.hsn_code,
                gst_rate=product.tax_rate,
                selling_price=product.selling_price,
                purchase_price=product.cost_price,
                is_stock_tracked=True,
                source_module='inventory',
                is_active=product.is_active,
            )
            product.master_product = master
            product.save(update_fields=['master_product'])
        _link_master_record(product.company, 'inventory', product, master_product=master)
        return master


def _merge_approval_data(sync_request, approval_data):
    data = dict(sync_request.suggested_data or {})
    data.update(approval_data or {})
    return data


def _get_source_object(sync_request):
    app_label, model_name = sync_request.source_model.split('.', 1)
    from django.apps import apps
    model = apps.get_model(app_label, model_name)
    return model.objects.get(pk=sync_request.source_object_id, company=sync_request.company)


def _default_inventory_category(company):
    from inventory.models import Category
    code = f'SYNC-{company.id}'
    category, _ = Category.objects.get_or_create(
        company=company,
        code=code[:20],
        defaults={
            'name': 'Synced Products',
            'description': 'Products created from cross-service sync approvals.',
        },
    )
    return category


def _finance_code_for_product(data):
    from finance.models import HSNCode, SACCode
    product_type = data.get('product_type', 'product')
    code = (data.get('hsn_code') or data.get('sac_code') or '').strip()
    rate = data.get('gst_rate') or data.get('tax_rate') or 0
    if product_type == 'service':
        if not code:
            code = 'SYNC-SERVICE'
        sac, _ = SACCode.objects.get_or_create(
            code=code,
            defaults={
                'service_name': data.get('name', 'Synced Service'),
                'description': data.get('description', 'Created from sync approval.'),
                'gst_rate': rate,
            },
        )
        return None, sac
    if not code:
        code = 'SYNC-GOODS'
    hsn, _ = HSNCode.objects.get_or_create(
        code=code,
        defaults={
            'description': data.get('description', 'Created from sync approval.'),
            'gst_rate': rate,
        },
    )
    return hsn, None


def approve_sync_request(sync_request, reviewed_by=None, approval_data=None):
    from django.utils import timezone

    if sync_request.status != 'pending':
        raise ValueError('Only pending sync requests can be approved.')

    with transaction.atomic():
        data = _merge_approval_data(sync_request, approval_data)
        source = _get_source_object(sync_request)

        if sync_request.request_type == 'delete_shared_record':
            target = _approve_shared_delete(sync_request)

        elif sync_request.request_type in ['crm_account_to_finance_customer', 'crm_contact_to_finance_customer']:
            from finance.models import Customer
            master = getattr(source, 'master_customer', None)
            customer = Customer.objects.create(
                company=sync_request.company,
                master_customer=master,
                customer_type=data.get('customer_type') or 'unknown',
                name=data.get('name') or sync_request.title,
                display_name=data.get('display_name') or data.get('name') or sync_request.title,
                email=data.get('email') or None,
                phone=data.get('phone') or None,
                mobile=data.get('mobile') or None,
                website=data.get('website') or None,
                billing_address_line1=data.get('billing_address_line1') or sync_request.title,
                billing_address_line2=data.get('billing_address_line2') or '',
                billing_city=data.get('billing_city') or 'Unknown',
                billing_state=data.get('billing_state') or 'Unknown',
                billing_pincode=data.get('billing_pincode') or '000000',
                billing_country=data.get('billing_country') or 'India',
                business_type=data.get('business_type') or None,
                industry=data.get('industry') or None,
                gstin=data.get('gstin') or None,
                pan_number=data.get('pan_number') or None,
                is_active=True,
            )
            _link_master_record(sync_request.company, 'finance', customer, master_customer=master)
            target = customer

        elif sync_request.request_type == 'finance_customer_to_crm_account':
            from crm.models import Account
            master = getattr(source, 'master_customer', None)
            industry = data.get('industry') or 'other'
            valid_industries = {choice[0] for choice in Account.INDUSTRY_CHOICES}
            if industry not in valid_industries:
                industry = 'other'
            account = Account.objects.create(
                company=sync_request.company,
                master_customer=master,
                name=data.get('name') or sync_request.title,
                account_type=data.get('account_type') or 'customer',
                industry=industry,
                website=data.get('website') or '',
                phone=data.get('phone') or '',
                email=data.get('email') or '',
                billing_address=data.get('billing_address') or '',
                shipping_address=data.get('shipping_address') or '',
                created_by=reviewed_by,
            )
            _link_master_record(sync_request.company, 'crm', account, master_customer=master)
            target = account

        elif sync_request.request_type == 'finance_customer_to_crm_contact':
            from crm.models import Contact
            master = getattr(source, 'master_customer', None)
            name = data.get('name') or sync_request.title
            first_name = data.get('first_name') or name.split(' ', 1)[0] or name
            last_name = data.get('last_name')
            if last_name is None:
                last_name = name.split(' ', 1)[1] if ' ' in name else ''
            contact = Contact.objects.create(
                company=sync_request.company,
                master_customer=master,
                first_name=first_name,
                last_name=last_name,
                email=data.get('email') or '',
                phone=data.get('phone') or '',
                mobile=data.get('mobile') or '',
                job_title=data.get('job_title') or '',
                department=data.get('department') or '',
                address_line1=data.get('address_line1') or data.get('billing_address') or '',
                address_line2=data.get('address_line2') or '',
                city=data.get('city') or '',
                state=data.get('state') or '',
                postal_code=data.get('postal_code') or '',
                country=data.get('country') or 'India',
                notes=data.get('notes') or 'Created from Finance customer sync approval.',
                created_by=reviewed_by,
            )
            _link_master_record(sync_request.company, 'crm', contact, master_customer=master)
            target = contact

        elif sync_request.request_type == 'inventory_product_to_finance_product':
            from finance.models import Product
            master = getattr(source, 'master_product', None)
            hsn_code, sac_code = _finance_code_for_product(data)
            product = Product.objects.create(
                company=sync_request.company,
                master_product=master,
                name=data.get('name') or sync_request.title,
                product_type=data.get('product_type') or 'product',
                description=data.get('description') or '',
                hsn_code=hsn_code,
                sac_code=sac_code,
                gst_rate=data.get('gst_rate') or data.get('tax_rate') or 0,
                selling_price=data.get('selling_price') or 0,
                purchase_price=data.get('purchase_price') or data.get('cost_price') or 0,
                track_inventory=bool(data.get('track_inventory', True)),
                is_active=True,
            )
            _link_master_record(sync_request.company, 'finance', product, master_product=master)
            target = product

        elif sync_request.request_type == 'finance_product_to_inventory_product':
            from inventory.models import Product
            master = getattr(source, 'master_product', None)
            category_id = data.get('category_id')
            if category_id:
                from inventory.models import Category
                category = Category.objects.get(pk=category_id, company=sync_request.company)
            else:
                category = _default_inventory_category(sync_request.company)
            product = Product.objects.create(
                company=sync_request.company,
                master_product=master,
                name=data.get('name') or sync_request.title,
                sku=data.get('sku') or getattr(source, 'product_code', ''),
                category=category,
                product_type=data.get('product_type') or 'finished_good',
                description=data.get('description') or '',
                cost_price=data.get('cost_price') or data.get('purchase_price') or 0,
                selling_price=data.get('selling_price') or 0,
                mrp=data.get('mrp') or data.get('selling_price') or 0,
                hsn_code=data.get('hsn_code') or data.get('sac_code') or '',
                tax_rate=data.get('tax_rate') or data.get('gst_rate') or 0,
                is_active=True,
            )
            _link_master_record(sync_request.company, 'inventory', product, master_product=master)
            target = product

        else:
            raise ValueError(f'Unsupported sync request type: {sync_request.request_type}')

        sync_request.status = 'approved'
        sync_request.approval_data = approval_data or {}
        sync_request.target_model = f'{target._meta.app_label}.{target.__class__.__name__}'
        sync_request.target_object_id = target.pk
        sync_request.reviewed_by = reviewed_by
        sync_request.reviewed_at = timezone.now()
        sync_request.error_message = ''
        sync_request.save(update_fields=[
            'status', 'approval_data', 'target_model', 'target_object_id',
            'reviewed_by', 'reviewed_at', 'error_message'
        ])
        return target


def _approve_shared_delete(sync_request):
    source = _get_source_object(sync_request)
    master_customer, master_product = _linked_master_for_object(source)
    if not master_customer and not master_product:
        source.delete()
        return source

    links = ServiceDataLink.objects.filter(company=sync_request.company)
    if master_customer:
        links = links.filter(master_customer=master_customer)
    else:
        links = links.filter(master_product=master_product)

    from django.apps import apps
    linked_records = list(links.values('object_model', 'object_id'))
    for link_data in linked_records:
        app_label, model_name = link_data['object_model'].split('.', 1)
        model = apps.get_model(app_label, model_name)
        model.objects.filter(pk=link_data['object_id'], company=sync_request.company).delete()

    if master_customer:
        master_customer.delete()
    if master_product:
        master_product.delete()

    return source


def reject_sync_request(sync_request, reviewed_by=None, reason=''):
    from django.utils import timezone

    if sync_request.status != 'pending':
        raise ValueError('Only pending sync requests can be rejected.')
    sync_request.status = 'rejected'
    sync_request.reviewed_by = reviewed_by
    sync_request.reviewed_at = timezone.now()
    sync_request.error_message = reason or ''
    sync_request.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'error_message'])
    return sync_request
