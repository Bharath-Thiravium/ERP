# SAP Numbering System and ID Strategy

## Document Numbering Architecture

The SAP system implements a sophisticated, multi-tenant document numbering system that ensures unique document numbers per company while supporting various numbering patterns and financial year management.

### Core Numbering Models

#### 1. Company Auto Code Settings (`authentication.models.CompanyAutoCodeSettings`)

**Purpose**: Basic auto-code generation for simple document types
**Location**: `backend/authentication/models.py`

**Supported Code Types**:
```python
CODE_TYPES = [
    ('employee', 'Employee ID'),
    ('product', 'Product Code'),
    ('invoice', 'Invoice Number'),
    ('purchase_order', 'Purchase Order'),
    ('inventory_purchase_order', 'Inventory Purchase Order'),
    ('quotation', 'Quotation Number'),
    ('customer', 'Customer ID'),
    ('vendor', 'Vendor ID'),
    ('supplier', 'Supplier Code'),
    ('warehouse', 'Warehouse Code'),
    ('category', 'Category Code'),
    ('audit', 'Audit Number'),
    ('asset', 'Asset Code'),
    ('proforma_invoice', 'Proforma Invoice'),
    ('payment', 'Payment Number'),
]
```

**Generation Logic**:
```python
def get_next_code(self):
    """Generate next auto code with company isolation"""
    from django.db import transaction
    with transaction.atomic():
        self.refresh_from_db()  # Ensure latest counter
        self.current_number += 1
        self.save(update_fields=['current_number'])
        
        number_str = str(self.current_number).zfill(self.number_length)
        prefix = code_prefixes.get(self.code_type, self.code_type.upper()[:3])
        return f"{self.company.company_prefix}{prefix}{number_str}"
```

**Example Output**: `ACMEEMP001`, `TECHINV000123`

#### 2. Advanced Document Numbering (`company_dashboard.models.DocumentNumberingConfig`)

**Purpose**: Advanced numbering system with financial year support and custom patterns
**Location**: `backend/company_dashboard/document_numbering_models.py`

**Enhanced Features**:
- Financial year-based numbering
- Custom pattern support
- Service-specific configuration
- Atomic counter management
- Audit trail maintenance

### Numbering System Specifications

#### Basic Numbering Pattern

**Format**: `{COMPANY_PREFIX}{TYPE_CODE}{NUMBER}`

**Components**:
- **Company Prefix**: 2-10 character company identifier (e.g., `ACME`, `TECH`)
- **Type Code**: 2-4 character document type (e.g., `EMP`, `INV`, `QUO`)
- **Number**: Zero-padded sequential number (e.g., `001`, `000123`)

**Examples**:
```
ACMEEMP001    - First employee at ACME company
TECHINV000123 - 123rd invoice at TECH company
BKGEQUO000045 - 45th quotation at BKGE company
```

#### Advanced Numbering Patterns

**Supported Placeholders**:
- `{PREFIX}` - Document type prefix
- `{COMPANY}` - Company prefix
- `{YEAR}` - Year component (various formats)
- `{FY}` - Financial year
- `{NUMBER}` - Sequential number
- `{SEP}` - Separator character

**Year Format Options**:
- `YY` - 2-digit year (25)
- `YYYY` - 4-digit year (2025)
- `FY` - Financial year (2024-25)
- `FY_SHORT` - Short FY (24-25)
- `NONE` - No year component

**Pattern Examples**:
```
{COMPANY}-{PREFIX}-{YEAR}-{NUMBER}     → ACME-INV-25-001
{PREFIX}-{FY}-{NUMBER}                 → QUO-2024-25-001
{COMPANY}{PREFIX}{YEAR}{NUMBER}        → ACMEINV25001
{PREFIX}{SEP}{YEAR}{SEP}{NUMBER}       → INV-2025-000123
```

### Finance Module Numbering System

#### Finance-Specific Numbering (`finance.models.NumberingRule`)

**Purpose**: Per-company, per-module numbering for finance documents
**Location**: `backend/finance/models.py`

**Supported Modules**:
```python
FINANCE_NUMBERING_MODULE_CHOICES = [
    ('quotation', 'Quotation'),
    ('purchase_order', 'Purchase Order'),
    ('proforma_invoice', 'Proforma Invoice'),
    ('invoice', 'Invoice'),
    ('customer_payment', 'Customer Payment'),
    ('purchase_request', 'Purchase Request'),
    ('purchase_payment', 'Purchase Payment'),
    ('vendor_invoice', 'Vendor Invoice'),
]
```

**Reset Scope Options**:
```python
NUMBERING_RESET_SCOPE_CHOICES = [
    ('never', 'Never'),
    ('yearly', 'Yearly'),
    ('monthly', 'Monthly'),
]
```

**Template System**:
```python
# Template supporting placeholders
template = "{PREFIX},{SEP},{YY},{YYYY},{MM},{SEQ}"
# Example: "INV-{YY}-{SEQ}" → "INV-25-001"
```

#### Atomic Counter Management (`finance.models.NumberingCounter`)

**Purpose**: Thread-safe counter management per company/module/scope
**Unique Constraint**: `['company', 'module', 'scope_key']`

**Scope Key Generation**:
- `never`: Empty string
- `yearly`: Year (e.g., "2025")
- `monthly`: Year-Month (e.g., "2025-01")

### ID Strategy & External Mapping

#### Internal ID Strategy

**Primary Keys**: Auto-incrementing integers (`BigAutoField`)
**Business Keys**: Company-scoped unique codes

**Unique Constraints Pattern**:
```python
class Meta:
    unique_together = ['company', 'code']  # Company-scoped uniqueness
```

#### Service User ID Strategy

**Format**: `{COMPANY_PREFIX}_{username}_{sequence}`
**Example**: `ACME_john_001`, `TECH_admin_001`

**Generation Logic**:
```python
@classmethod
def generate_unique_service_id(cls, company_prefix, username):
    base_id = f"{company_prefix}_{username}"
    existing_count = cls.objects.filter(
        unique_service_id__startswith=base_id
    ).count()
    return f"{base_id}_{str(existing_count + 1).zfill(3)}"
```

#### External Integration ID Mapping

**Pattern**: Models include optional external reference fields
```python
# Common pattern in models
external_id = models.CharField(max_length=100, blank=True)
reference_id = models.CharField(max_length=100, blank=True)
```

**Examples**:
- `Customer.reference` - External customer reference
- `Invoice.reference` - Customer PO number reference
- `Employee.employee_id` - External HR system ID

### Numbering System Implementation

#### Company-Level Isolation

**Database Constraints**:
```sql
-- Ensures company-level uniqueness
CONSTRAINT unique_company_document_type 
UNIQUE (company_id, document_type, financial_year)

-- Atomic counter updates
CONSTRAINT unique_company_module_scope 
UNIQUE (company_id, module, scope_key)
```

**Transaction Safety**:
```python
def get_next_number(self):
    with transaction.atomic():
        # Lock specific company-service-document configuration
        config = DocumentNumberingConfig.objects.select_for_update().filter(
            company=self.company,
            service=self.service,
            document_type=self.document_type,
            financial_year=self.financial_year
        ).first()
        
        config.current_counter += 1
        config.save(update_fields=['current_counter'])
        return config._generate_number()
```

#### Fallback Mechanisms

**Auto-Code Generation Fallback**:
```python
def save(self, *args, **kwargs):
    if not self.document_number:
        try:
            # Try advanced numbering system
            from authentication.utils import generate_auto_code
            self.document_number = generate_auto_code(self.company.id, 'invoice')
        except Exception:
            # Fallback to simple numbering
            self.document_number = self._generate_fallback_number()
```

**Timestamp-Based Fallback**:
```python
# Last resort for uniqueness
import time
timestamp = int(time.time() * 1000) % 1000000
self.document_number = f"INV-FALLBACK-{timestamp:06d}"
```

### Financial Year Management

#### Financial Year Settings (`company_dashboard.models.FinancialYearSettings`)

**Purpose**: Manage financial years per company per service
**Unique Constraint**: `['company', 'service', 'financial_year']`

**Validation**:
```python
def clean(self):
    # Validate financial year format (YYYY-YY)
    years = self.financial_year.split('-')
    if len(years) != 2:
        raise ValidationError('Financial year must be in format YYYY-YY')
    
    start_year = int(years[0])
    end_year = int(years[1])
    if end_year != start_year + 1:
        raise ValidationError('End year must be start year + 1')
```

**Current Year Management**:
```python
def save(self, *args, **kwargs):
    # Ensure only one current financial year per company-service
    if self.is_current:
        FinancialYearSettings.objects.filter(
            company=self.company,
            service=self.service,
            is_current=True
        ).exclude(pk=self.pk).update(is_current=False)
```

### Numbering Audit Trail

#### Document Numbering History (`company_dashboard.models.DocumentNumberingHistory`)

**Purpose**: Track all document number generation and manual overrides

**Tracked Information**:
- Document number generated
- Manual override flag and reason
- User who generated/overrode
- Timestamp of generation

**Manual Override Support**:
```python
class DocumentNumberingConfig(models.Model):
    allow_manual_override = models.BooleanField(default=False)
    
    def create_history_entry(self, document_number, is_manual=False, reason='', user=None):
        DocumentNumberingHistory.objects.create(
            config=self,
            document_number=document_number,
            is_manual_override=is_manual,
            override_reason=reason,
            created_by=user
        )
```

### Service-Specific Numbering

#### Service Document Type Mapping

**Service-Document Mapping**:
```python
SERVICE_DOCUMENT_MAPPING = {
    'finance': [
        'quotation', 'purchase_order', 'invoice', 'proforma_invoice',
        'payment', 'customer', 'vendor', 'product'
    ],
    'hr': [
        'employee', 'department', 'designation', 'attendance', 
        'payroll', 'leave_request', 'recruitment'
    ],
    'inventory': [
        'supplier', 'warehouse', 'category', 'stock_entry',
        'stock_transfer', 'purchase_receipt'
    ],
    'crm': [
        'lead', 'contact', 'account', 'opportunity', 
        'campaign', 'support_ticket'
    ]
}
```

**Default Prefix Mapping**:
```python
def get_default_prefix(document_type):
    prefix_mapping = {
        'quotation': 'QT',
        'invoice': 'INV',
        'employee': 'EMP',
        'customer': 'CUST',
        # ... complete mapping
    }
    return prefix_mapping.get(document_type, document_type.upper()[:3])
```

### Integration with Athens Service

The existing numbering system is designed to easily accommodate new services:

#### Athens Service Integration
1. **Add Athens Document Types**: Extend `SERVICE_DOCUMENT_MAPPING`
2. **Configure Numbering Rules**: Create `DocumentNumberingConfig` entries
3. **Set Default Prefixes**: Add Athens-specific prefixes
4. **Maintain Isolation**: All Athens documents will be company-scoped

**Example Athens Integration**:
```python
# Add to SERVICE_DOCUMENT_MAPPING
'athens': [
    'athens_document', 'athens_transaction', 'athens_report',
    'athens_workflow', 'athens_approval'
]

# Default prefixes
'athens_document': 'ATH',
'athens_transaction': 'ATHT',
'athens_workflow': 'ATHW'
```

This numbering system provides complete isolation between companies while supporting flexible numbering patterns and maintaining audit trails, making it ideal for multi-tenant SaaS deployment.