"""
GSTR-1 constants derived from the hidden master sheet of
GSTR1_Excel_Workbook_Template_V2.2.xlsx
"""

# ── Place of Supply ──────────────────────────────────────────────────────────
# Format used in the Excel: "NN-State Name"
POS_MAP = {
    '01': '01-Jammu & Kashmir',
    '02': '02-Himachal Pradesh',
    '03': '03-Punjab',
    '04': '04-Chandigarh',
    '05': '05-Uttarakhand',
    '06': '06-Haryana',
    '07': '07-Delhi',
    '08': '08-Rajasthan',
    '09': '09-Uttar Pradesh',
    '10': '10-Bihar',
    '11': '11-Sikkim',
    '12': '12-Arunachal Pradesh',
    '13': '13-Nagaland',
    '14': '14-Manipur',
    '15': '15-Mizoram',
    '16': '16-Tripura',
    '17': '17-Meghalaya',
    '18': '18-Assam',
    '19': '19-West Bengal',
    '20': '20-Jharkhand',
    '21': '21-Odisha',
    '22': '22-Chhattisgarh',
    '23': '23-Madhya Pradesh',
    '24': '24-Gujarat',
    '25': '25-Daman & Diu',
    '26': '26-Dadra & Nagar Haveli & Daman & Diu',
    '27': '27-Maharashtra',
    '29': '29-Karnataka',
    '30': '30-Goa',
    '31': '31-Lakshdweep',
    '32': '32-Kerala',
    '33': '33-Tamil Nadu',
    '34': '34-Puducherry',
    '35': '35-Andaman & Nicobar Islands',
    '36': '36-Telangana',
    '37': '37-Andhra Pradesh',
    '38': '38-Ladakh',
    '97': '97-Other Territory',
    '96': '96-Foreign Country',
}

VALID_STATE_CODES = set(POS_MAP.keys())

# ── UQC master list (from master sheet column A) ─────────────────────────────
VALID_UQC = {
    'BAG', 'BAL', 'BDL', 'BKL', 'BOU', 'BOX', 'BTL', 'BUN', 'CAN',
    'CBM', 'CCM', 'CMS', 'CTN', 'DOZ', 'DRM', 'GGK', 'GMS', 'GRS',
    'GYD', 'KGS', 'KLR', 'KME', 'LTR', 'MLT', 'MTR', 'MTS', 'NOS',
    'PAC', 'PCS', 'PRS', 'QTL', 'ROL', 'SET', 'SQF', 'SQM', 'SQY',
    'TBS', 'TGM', 'THD', 'TON', 'TUB', 'UGS', 'UNT', 'YDS', 'OTH',
}

# Full UQC strings as they appear in the master sheet
UQC_FULL = {
    'BAG': 'BAG-BAGS', 'BAL': 'BAL-BALE', 'BDL': 'BDL-BUNDLES',
    'BKL': 'BKL-BUCKLES', 'BOU': 'BOU-BILLION OF UNITS', 'BOX': 'BOX-BOX',
    'BTL': 'BTL-BOTTLES', 'BUN': 'BUN-BUNCHES', 'CAN': 'CAN-CANS',
    'CBM': 'CBM-CUBIC METERS', 'CCM': 'CCM-CUBIC CENTIMETERS',
    'CMS': 'CMS-CENTIMETERS', 'CTN': 'CTN-CARTONS', 'DOZ': 'DOZ-DOZENS',
    'DRM': 'DRM-DRUMS', 'GGK': 'GGK-GREAT GROSS', 'GMS': 'GMS-GRAMMES',
    'GRS': 'GRS-GROSS', 'GYD': 'GYD-GROSS YARDS', 'KGS': 'KGS-KILOGRAMS',
    'KLR': 'KLR-KILOLITRE', 'KME': 'KME-KILOMETRE', 'LTR': 'LTR-LITRES',
    'MLT': 'MLT-MILILITRE', 'MTR': 'MTR-METERS', 'MTS': 'MTS-METRIC TON',
    'NOS': 'NOS-NUMBERS', 'PAC': 'PAC-PACKS', 'PCS': 'PCS-PIECES',
    'PRS': 'PRS-PAIRS', 'QTL': 'QTL-QUINTAL', 'ROL': 'ROL-ROLLS',
    'SET': 'SET-SETS', 'SQF': 'SQF-SQUARE FEET', 'SQM': 'SQM-SQUARE METERS',
    'SQY': 'SQY-SQUARE YARDS', 'TBS': 'TBS-TABLETS', 'TGM': 'TGM-TEN GROSS',
    'THD': 'THD-THOUSANDS', 'TON': 'TON-TONNES', 'TUB': 'TUB-TUBES',
    'UGS': 'UGS-US GALLONS', 'UNT': 'UNT-UNITS', 'YDS': 'YDS-YARDS',
    'OTH': 'OTH-OTHERS',
}

# Unit code → UQC mapping (system unit codes → GST UQC)
UNIT_TO_UQC = {
    # Exact matches
    'KGS': 'KGS', 'KG': 'KGS', 'KILO': 'KGS', 'KILOGRAM': 'KGS', 'KILOGRAMS': 'KGS',
    'NOS': 'NOS', 'NO': 'NOS', 'NOS.': 'NOS', 'NUMBER': 'NOS', 'NUMBERS': 'NOS', 'NUM': 'NOS',
    'PCS': 'PCS', 'PC': 'PCS', 'PIECE': 'PCS', 'PIECES': 'PCS',
    'MTR': 'MTR', 'MT': 'MTR', 'METER': 'MTR', 'METERS': 'MTR', 'METRE': 'MTR', 'METRES': 'MTR', 'M': 'MTR',
    'LTR': 'LTR', 'LT': 'LTR', 'LITRE': 'LTR', 'LITRES': 'LTR', 'LITER': 'LTR', 'LITERS': 'LTR', 'L': 'LTR',
    'MTS': 'MTS', 'TON': 'TON', 'TONNE': 'TON', 'TONNES': 'TON', 'TONS': 'TON',
    'BOX': 'BOX', 'BOXES': 'BOX',
    'BTL': 'BTL', 'BOTTLE': 'BTL', 'BOTTLES': 'BTL',
    'CTN': 'CTN', 'CARTON': 'CTN', 'CARTONS': 'CTN',
    'DOZ': 'DOZ', 'DOZEN': 'DOZ', 'DOZENS': 'DOZ',
    'SET': 'SET', 'SETS': 'SET',
    'PAC': 'PAC', 'PACK': 'PAC', 'PACKS': 'PAC', 'PACKET': 'PAC', 'PACKETS': 'PAC',
    'ROL': 'ROL', 'ROLL': 'ROL', 'ROLLS': 'ROL',
    'SQM': 'SQM', 'SQF': 'SQF', 'SQY': 'SQY',
    'GMS': 'GMS', 'GM': 'GMS', 'GRAM': 'GMS', 'GRAMS': 'GMS', 'GRAMME': 'GMS', 'GRAMMES': 'GMS', 'G': 'GMS',
    'MLT': 'MLT', 'ML': 'MLT', 'MILLILITRE': 'MLT', 'MILLILITRES': 'MLT',
    'CMS': 'CMS', 'CM': 'CMS', 'CENTIMETER': 'CMS', 'CENTIMETERS': 'CMS',
    'KME': 'KME', 'KM': 'KME', 'KILOMETER': 'KME', 'KILOMETERS': 'KME',
    'KLR': 'KLR', 'KL': 'KLR', 'KILOLITRE': 'KLR', 'KILOLITRES': 'KLR',
    'CBM': 'CBM', 'CUM': 'CBM',
    'QTL': 'QTL', 'QUINTAL': 'QTL', 'QUINTALS': 'QTL',
    'BAG': 'BAG', 'BAGS': 'BAG',
    'CAN': 'CAN', 'CANS': 'CAN',
    'DRM': 'DRM', 'DRUM': 'DRM', 'DRUMS': 'DRM',
    'TUB': 'TUB', 'TUBE': 'TUB', 'TUBES': 'TUB',
    'UNT': 'UNT', 'UNIT': 'UNT', 'UNITS': 'UNT',
    'YDS': 'YDS', 'YARD': 'YDS', 'YARDS': 'YDS',
    'OTH': 'OTH', 'OTHER': 'OTH', 'OTHERS': 'OTH', 'MISC': 'OTH',
    # Service default
    'SRV': 'OTH', 'SERVICE': 'OTH', 'SERVICES': 'OTH', 'JOB': 'OTH',
    'HRS': 'OTH', 'HR': 'OTH', 'HOUR': 'OTH', 'HOURS': 'OTH',
    'DAY': 'OTH', 'DAYS': 'OTH', 'MONTH': 'OTH', 'MONTHS': 'OTH',
    'YEAR': 'OTH', 'YEARS': 'OTH', 'LS': 'OTH', 'LUMPSUM': 'OTH',
}

# ── Valid GST rates (from master sheet column F) ─────────────────────────────
VALID_GST_RATES = {0, 0.1, 0.25, 1, 1.5, 3, 5, 6, 7.5, 12, 18, 28, 40}

# ── Invoice types (from master sheet column H) ───────────────────────────────
INVOICE_TYPE_REGULAR = 'Regular B2B'
INVOICE_TYPE_SEZ_WPAY = 'SEZ supplies with payment'
INVOICE_TYPE_SEZ_WOPAY = 'SEZ supplies without payment'
INVOICE_TYPE_DEEMED_EXP = 'Deemed Exp'
INVOICE_TYPE_INTRA_IGST = 'Intra-State supplies attracting IGST'

VALID_INVOICE_TYPES = {
    INVOICE_TYPE_REGULAR,
    INVOICE_TYPE_SEZ_WPAY,
    INVOICE_TYPE_SEZ_WOPAY,
    INVOICE_TYPE_DEEMED_EXP,
    INVOICE_TYPE_INTRA_IGST,
}

# ── Nature of Document (from master sheet column I) ──────────────────────────
DOC_NATURE_OUTWARD = 'Invoices for outward supply'
DOC_NATURE_INWARD_UNREG = 'Invoices for inward supply from unregistered person'
DOC_NATURE_REVISED = 'Revised Invoice'
DOC_NATURE_DEBIT = 'Debit Note'
DOC_NATURE_CREDIT = 'Credit Note'
DOC_NATURE_RECEIPT = 'Receipt Voucher'
DOC_NATURE_PAYMENT = 'Payment Voucher'
DOC_NATURE_REFUND = 'Refund Voucher'
DOC_NATURE_CHALLAN_JW = 'Delivery Challan for job work'
DOC_NATURE_CHALLAN_APPROVAL = 'Delivery Challan for supply on approval'
DOC_NATURE_CHALLAN_LIQUID = 'Delivery Challan in case of liquid gas'
DOC_NATURE_CHALLAN_OTHER = 'Delivery Challan in case other than by way of supply (excluding at S no. 9 to 11)'

VALID_DOC_NATURES = {
    DOC_NATURE_OUTWARD, DOC_NATURE_INWARD_UNREG, DOC_NATURE_REVISED,
    DOC_NATURE_DEBIT, DOC_NATURE_CREDIT, DOC_NATURE_RECEIPT,
    DOC_NATURE_PAYMENT, DOC_NATURE_REFUND, DOC_NATURE_CHALLAN_JW,
    DOC_NATURE_CHALLAN_APPROVAL, DOC_NATURE_CHALLAN_LIQUID, DOC_NATURE_CHALLAN_OTHER,
}

# ── B2CS type ────────────────────────────────────────────────────────────────
B2CS_TYPE_OE = 'OE'

# ── Month names (for file naming) ────────────────────────────────────────────
MONTH_ABBR = {
    1: 'JAN', 2: 'FEB', 3: 'MAR', 4: 'APR', 5: 'MAY', 6: 'JUN',
    7: 'JUL', 8: 'AUG', 9: 'SEP', 10: 'OCT', 11: 'NOV', 12: 'DEC',
}

MONTH_NAMES = {
    'JANUARY': 1, 'FEBRUARY': 2, 'MARCH': 3, 'APRIL': 4,
    'MAY': 5, 'JUNE': 6, 'JULY': 7, 'AUGUST': 8,
    'SEPTEMBER': 9, 'OCTOBER': 10, 'NOVEMBER': 11, 'DECEMBER': 12,
}

# ── Rounding tolerance ───────────────────────────────────────────────────────
ROUNDING_TOLERANCE = 1.00  # ₹1.00

# ── Template path ────────────────────────────────────────────────────────────
import os
TEMPLATE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    'GSTR1_Excel_Workbook_Template_V2.2.xlsx'
)
