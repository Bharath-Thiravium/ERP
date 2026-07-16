"""
OCR service for PTW document image processing.
Extracts structured field data from scanned/photographed PTW documents.
"""
import re
import logging
from PIL import Image, ImageEnhance, ImageFilter
import pytesseract

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Field extraction patterns
# ---------------------------------------------------------------------------

FIELD_PATTERNS = {
    'permit_number': [
        r'permit\s*(?:no|number|#)[:\s.]*([A-Z0-9\-/]+)',
        r'ptw\s*(?:no|number|#)[:\s.]*([A-Z0-9\-/]+)',
        r'work\s*permit\s*(?:no|number|#)[:\s.]*([A-Z0-9\-/]+)',
        r'(?:^|\n)\s*(?:no|number)[:\s.]*([A-Z0-9\-/]{3,20})',
    ],
    'project_name': [
        r'project\s*(?:name|title)?[:\s.]*([^\n]{3,80})',
        r'site\s*(?:name|project)[:\s.]*([^\n]{3,80})',
    ],
    'work_location': [
        r'(?:work\s*)?location[:\s.]*([^\n]{3,100})',
        r'place\s*of\s*work[:\s.]*([^\n]{3,100})',
        r'work\s*area[:\s.]*([^\n]{3,100})',
        r'site\s*location[:\s.]*([^\n]{3,100})',
    ],
    'contractor_name': [
        r'contractor[:\s.]*([^\n]{3,100})',
        r'sub.?contractor[:\s.]*([^\n]{3,100})',
        r'contractor\s*(?:name|company)[:\s.]*([^\n]{3,100})',
    ],
    'company_name': [
        r'company\s*(?:name)?[:\s.]*([^\n]{3,100})',
        r'organization[:\s.]*([^\n]{3,100})',
        r'employer[:\s.]*([^\n]{3,100})',
    ],
    'work_description': [
        r'(?:description\s*of\s*work|work\s*description|scope\s*of\s*work|nature\s*of\s*work)[:\s.]*([^\n]{5,300})',
        r'work\s*to\s*be\s*(?:performed|done|carried\s*out)[:\s.]*([^\n]{5,300})',
    ],
    'permit_type': [
        r'(?:type\s*of\s*(?:work|permit)|permit\s*type)[:\s.]*([^\n]{3,60})',
        r'(?:hot\s*work|cold\s*work|confined\s*space|electrical|height|excavation)',
    ],
    'start_date': [
        r'(?:start|valid\s*from|from|commencement)\s*date[:\s.]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})',
        r'date\s*(?:of\s*)?(?:start|commencement)[:\s.]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})',
        r'(?:from)[:\s.]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})',
    ],
    'end_date': [
        r'(?:end|expiry|valid\s*(?:till|to|until)|to)\s*date[:\s.]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})',
        r'date\s*(?:of\s*)?(?:expiry|completion)[:\s.]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})',
        r'(?:to|until|till)[:\s.]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})',
    ],
    'start_time': [
        r'(?:start|from|commencement)\s*time[:\s.]*(\d{1,2}[:\s]\d{2}\s*(?:am|pm|hrs?)?)',
        r'time\s*(?:from|start)[:\s.]*(\d{1,2}[:\s]\d{2}\s*(?:am|pm|hrs?)?)',
    ],
    'end_time': [
        r'(?:end|to|completion|expiry)\s*time[:\s.]*(\d{1,2}[:\s]\d{2}\s*(?:am|pm|hrs?)?)',
        r'time\s*(?:to|end)[:\s.]*(\d{1,2}[:\s]\d{2}\s*(?:am|pm|hrs?)?)',
    ],
    'supervisor_name': [
        r'supervisor[:\s.]*([A-Za-z][^\n]{2,60})',
        r'site\s*supervisor[:\s.]*([A-Za-z][^\n]{2,60})',
        r'safety\s*officer[:\s.]*([A-Za-z][^\n]{2,60})',
    ],
    'issuer_name': [
        r'(?:issued\s*by|issuer|permit\s*issuer)[:\s.]*([A-Za-z][^\n]{2,60})',
        r'authorized\s*by[:\s.]*([A-Za-z][^\n]{2,60})',
        r'approved\s*by[:\s.]*([A-Za-z][^\n]{2,60})',
    ],
    'risk_assessment_details': [
        r'risk\s*assessment[:\s.]*([^\n]{5,300})',
        r'hazard[s]?\s*(?:identified)?[:\s.]*([^\n]{5,300})',
    ],
    'ppe_requirements': [
        r'ppe[:\s.]*([^\n]{5,300})',
        r'personal\s*protective\s*equipment[:\s.]*([^\n]{5,300})',
        r'protective\s*equipment[:\s.]*([^\n]{5,300})',
    ],
    'safety_precautions': [
        r'safety\s*precautions?[:\s.]*([^\n]{5,300})',
        r'precautions?[:\s.]*([^\n]{5,300})',
        r'safety\s*measures?[:\s.]*([^\n]{5,300})',
    ],
    'authorized_signatures': [
        r'signature[s]?[:\s.]*([^\n]{3,100})',
        r'signed\s*by[:\s.]*([^\n]{3,100})',
    ],
}

PERMIT_TYPE_KEYWORDS = {
    'hot_work': ['hot work', 'welding', 'cutting', 'grinding', 'flame', 'spark'],
    'cold_work': ['cold work'],
    'confined_space': ['confined space', 'confined area', 'enclosed space'],
    'electrical': ['electrical', 'electric', 'live wire', 'loto', 'lockout'],
    'height': ['height', 'elevated', 'scaffold', 'ladder', 'rooftop', 'aerial'],
    'excavation': ['excavation', 'digging', 'trenching', 'earthwork'],
    'chemical': ['chemical', 'hazardous material', 'hazchem', 'msds'],
}


def _preprocess_image(image: Image.Image) -> Image.Image:
    """Enhance image quality for better OCR accuracy."""
    # Convert to grayscale
    img = image.convert('L')
    # Increase contrast
    img = ImageEnhance.Contrast(img).enhance(2.0)
    # Sharpen
    img = img.filter(ImageFilter.SHARPEN)
    return img


def _run_ocr(image: Image.Image) -> tuple[str, float]:
    """Run tesseract OCR and return (text, avg_confidence)."""
    preprocessed = _preprocess_image(image)

    # Get text with confidence data
    data = pytesseract.image_to_data(
        preprocessed,
        output_type=pytesseract.Output.DICT,
        config='--psm 6 --oem 3'
    )

    words = []
    confidences = []
    for i, word in enumerate(data['text']):
        conf = int(data['conf'][i])
        if conf > 0 and word.strip():
            words.append(word)
            confidences.append(conf)

    full_text = pytesseract.image_to_string(preprocessed, config='--psm 6 --oem 3')
    avg_conf = sum(confidences) / len(confidences) if confidences else 0.0

    return full_text, avg_conf


def _extract_field(text: str, field: str) -> tuple[str, float]:
    """
    Try all patterns for a field. Returns (value, confidence).
    Confidence is 1.0 if matched, 0.0 if not.
    """
    patterns = FIELD_PATTERNS.get(field, [])
    text_lower = text.lower()

    for pattern in patterns:
        match = re.search(pattern, text_lower, re.IGNORECASE | re.MULTILINE)
        if match:
            # Return the original-case version from the same position
            start, end = match.span(1) if match.lastindex else match.span()
            value = text[start:end].strip()
            # Clean up common OCR artifacts
            value = re.sub(r'\s+', ' ', value).strip('.,;:')
            if value:
                return value, 1.0

    return '', 0.0


def _detect_permit_type(text: str) -> str:
    """Detect permit type from text keywords."""
    text_lower = text.lower()
    for ptype, keywords in PERMIT_TYPE_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            return ptype
    return 'general'


def _normalize_date(date_str: str) -> str:
    """Normalize date string to YYYY-MM-DD format."""
    if not date_str:
        return ''
    # Try common formats
    for fmt in ('%d/%m/%Y', '%d-%m-%Y', '%d.%m.%Y', '%m/%d/%Y',
                '%d/%m/%y', '%d-%m-%y', '%d.%m.%y'):
        try:
            from datetime import datetime
            dt = datetime.strptime(date_str.strip(), fmt)
            return dt.strftime('%Y-%m-%d')
        except ValueError:
            continue
    return date_str.strip()


def _normalize_time(time_str: str) -> str:
    """Normalize time string to HH:MM format."""
    if not time_str:
        return ''
    time_str = time_str.strip().lower().replace(' ', '')
    # Remove 'hrs' suffix
    time_str = re.sub(r'hrs?$', '', time_str)
    # Handle AM/PM
    ampm_match = re.match(r'(\d{1,2})[:\s]?(\d{2})(am|pm)?', time_str)
    if ampm_match:
        h, m = int(ampm_match.group(1)), int(ampm_match.group(2))
        ampm = ampm_match.group(3)
        if ampm == 'pm' and h != 12:
            h += 12
        elif ampm == 'am' and h == 12:
            h = 0
        return f'{h:02d}:{m:02d}'
    return time_str


def extract_ptw_fields(image_file) -> dict:
    """
    Main entry point. Accepts a Django InMemoryUploadedFile or file-like object.
    Returns dict with extracted fields and confidence scores.
    """
    try:
        image = Image.open(image_file)
        # Handle multi-page (e.g. TIFF)
        if hasattr(image, 'n_frames') and image.n_frames > 1:
            image.seek(0)

        raw_text, ocr_confidence = _run_ocr(image)
        logger.info(f"PTW OCR completed. Avg confidence: {ocr_confidence:.1f}%")

    except Exception as e:
        logger.error(f"PTW OCR failed: {e}")
        return {'error': str(e), 'fields': {}, 'ocr_confidence': 0}

    fields = {}
    field_confidences = {}

    for field in FIELD_PATTERNS:
        value, conf = _extract_field(raw_text, field)
        if value:
            fields[field] = value
            field_confidences[field] = conf

    # Post-process dates and times
    for date_field in ('start_date', 'end_date'):
        if date_field in fields:
            fields[date_field] = _normalize_date(fields[date_field])

    for time_field in ('start_time', 'end_time'):
        if time_field in fields:
            fields[time_field] = _normalize_time(fields[time_field])

    # Detect permit type from full text if not extracted
    if 'permit_type' not in fields or not fields['permit_type']:
        fields['permit_type'] = _detect_permit_type(raw_text)
        field_confidences['permit_type'] = 0.7  # keyword-based, medium confidence

    # Low-confidence fields (below 60% OCR confidence) flagged for review
    low_confidence_fields = [
        f for f, c in field_confidences.items()
        if c < 0.6 or ocr_confidence < 60
    ]

    return {
        'fields': fields,
        'ocr_confidence': round(ocr_confidence, 1),
        'field_confidences': field_confidences,
        'low_confidence_fields': low_confidence_fields,
    }
