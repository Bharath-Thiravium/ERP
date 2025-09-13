# Product Details - Google Sheets Template for Finance Service

## Sheet Structure

Create a Google Sheet with the following columns and sample data:

### Column Headers (Row 1):
| A | B | C | D | E | F | G | H | I | J | K | L | M | N |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Product Code | Name | Type | Description | HSN Code | SAC Code | Unit | Selling Price | Purchase Price | Track Inventory | Current Stock | Minimum Stock | Active | Notes |

### Sample Data Rows:

#### Products (Goods):
| Product Code | Name | Type | Description | HSN Code | SAC Code | Unit | Selling Price | Purchase Price | Track Inventory | Current Stock | Minimum Stock | Active | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| PRD-000001 | Laptop Computer | product | High-performance business laptop | 8471 | | PCS | 75000.00 | 65000.00 | TRUE | 50 | 10 | TRUE | Dell Inspiron 15 |
| PRD-000002 | Office Chair | product | Ergonomic office chair with lumbar support | 9401 | | PCS | 12000.00 | 8500.00 | TRUE | 25 | 5 | TRUE | Executive chair |
| PRD-000003 | Smartphone | product | Android smartphone 128GB | 8517 | | PCS | 25000.00 | 20000.00 | TRUE | 100 | 20 | TRUE | Samsung Galaxy |
| PRD-000004 | Printer Paper | product | A4 size white printing paper | 4802 | | BOX | 500.00 | 350.00 | TRUE | 200 | 50 | TRUE | 500 sheets per box |
| PRD-000005 | USB Cable | product | USB Type-C charging cable | 8544 | | PCS | 800.00 | 500.00 | TRUE | 150 | 30 | TRUE | 1 meter length |

#### Services:
| Product Code | Name | Type | Description | HSN Code | SAC Code | Unit | Selling Price | Purchase Price | Track Inventory | Current Stock | Minimum Stock | Active | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| SRV-000001 | IT Consulting | service | Information technology consulting services | | 998313 | HOUR | 2500.00 | 0.00 | FALSE | 0 | 0 | TRUE | Technical consultation |
| SRV-000002 | Software Development | service | Custom software development services | | 998313 | HOUR | 3000.00 | 0.00 | FALSE | 0 | 0 | TRUE | Web and mobile apps |
| SRV-000003 | Digital Marketing | service | Online marketing and SEO services | | 998399 | MONTH | 15000.00 | 0.00 | FALSE | 0 | 0 | TRUE | SEO and social media |
| SRV-000004 | Training Services | service | Corporate training and workshops | | 998399 | DAY | 8000.00 | 0.00 | FALSE | 0 | 0 | TRUE | Employee training |
| SRV-000005 | Maintenance Support | service | Equipment maintenance and support | | 998729 | MONTH | 5000.00 | 0.00 | FALSE | 0 | 0 | TRUE | Annual maintenance |

## Common HSN Codes for Products:
- **8471** - Computers and laptops (GST: 18%)
- **9401** - Furniture (chairs, tables) (GST: 18%)
- **8517** - Mobile phones and accessories (GST: 18%)
- **4802** - Paper and stationery (GST: 12%)
- **8544** - Cables and wires (GST: 18%)
- **8443** - Printers and scanners (GST: 18%)
- **9403** - Office furniture (GST: 18%)
- **3926** - Plastic products (GST: 18%)
- **7326** - Metal products (GST: 18%)
- **6109** - T-shirts and clothing (GST: 12%)

## Common SAC Codes for Services:
- **998313** - Information technology consulting (GST: 18%)
- **998314** - Software development (GST: 18%)
- **998399** - Other professional services (GST: 18%)
- **998729** - Maintenance and repair services (GST: 18%)
- **998212** - Accounting and bookkeeping (GST: 18%)
- **998219** - Legal services (GST: 18%)
- **998311** - Engineering services (GST: 18%)
- **998399** - Marketing and advertising (GST: 18%)
- **996511** - Transportation services (GST: 5%)
- **997212** - Catering services (GST: 5%)

## Units Available:
- **PCS** - Pieces
- **KG** - Kilograms
- **LITER** - Liters
- **METER** - Meters
- **BOX** - Box
- **HOUR** - Hours
- **DAY** - Days
- **MONTH** - Months
- **YEAR** - Years

## Data Validation Rules:

### Required Fields:
- Product Code (auto-generated if empty)
- Name
- Type (product/service)
- HSN Code (for products)
- SAC Code (for services)
- Unit
- Selling Price

### Optional Fields:
- Description
- Purchase Price
- Track Inventory (default: TRUE for products, FALSE for services)
- Current Stock (only if Track Inventory is TRUE)
- Minimum Stock (only if Track Inventory is TRUE)
- Active (default: TRUE)

### Data Types:
- **Product Code**: Text (auto-generated format: PRD-XXXXXX or SRV-XXXXXX)
- **Name**: Text (max 255 characters)
- **Type**: Text (product or service)
- **Description**: Text (optional)
- **HSN Code**: Number (4-8 digits)
- **SAC Code**: Number (6 digits)
- **Unit**: Text (from predefined list)
- **Selling Price**: Number (decimal, min 0.01)
- **Purchase Price**: Number (decimal, min 0.00)
- **Track Inventory**: Boolean (TRUE/FALSE)
- **Current Stock**: Number (integer, min 0)
- **Minimum Stock**: Number (integer, min 0)
- **Active**: Boolean (TRUE/FALSE)

## Import Instructions:

1. **Create Google Sheet**: Copy the template structure above
2. **Fill Data**: Add your products and services following the sample format
3. **Validate Data**: Ensure all required fields are filled
4. **Export as CSV**: Download the sheet as CSV format
5. **Import to System**: Use the finance service import feature

## Notes:
- GST rates are automatically calculated based on HSN/SAC codes
- Product codes are auto-generated if left empty
- Services typically don't track inventory
- Prices should be in the base currency (INR)
- HSN codes are for products (goods), SAC codes are for services
- Ensure HSN/SAC codes exist in the system database

## Bulk Import Tips:
- Start with a small batch (10-20 items) to test
- Verify HSN/SAC codes are valid before import
- Check for duplicate product codes
- Ensure all required fields are populated
- Review pricing for accuracy
