from django import template
from decimal import Decimal

register = template.Library()

ONES = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
]
TENS = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty',
    'Sixty', 'Seventy', 'Eighty', 'Ninety',
]


def _below_thousand(n):
    """Convert integer 0-999 to words."""
    if n == 0:
        return ''
    elif n < 20:
        return ONES[n]
    elif n < 100:
        rest = ONES[n % 10]
        return TENS[n // 10] + (' ' + rest if rest else '')
    else:
        rest = _below_thousand(n % 100)
        return ONES[n // 100] + ' Hundred' + (' and ' + rest if rest else '')


def _to_words_indian(n):
    """
    Convert non-negative integer to Indian number system words.
    Handles up to 99,99,99,999 (99 crores).
    """
    if n == 0:
        return 'Zero'

    parts = []

    crore = n // 10_000_000
    n %= 10_000_000
    lakh = n // 100_000
    n %= 100_000
    thousand = n // 1_000
    n %= 1_000
    remainder = n

    if crore:
        parts.append(_below_thousand(crore) + ' Crore')
    if lakh:
        parts.append(_below_thousand(lakh) + ' Lakh')
    if thousand:
        parts.append(_below_thousand(thousand) + ' Thousand')
    if remainder:
        parts.append(_below_thousand(remainder))

    return ' '.join(parts)


@register.filter(name='num_to_words')
def num_to_words(value):
    """
    Convert a numeric value to Indian English words.
    Usage: {{ invoice.total_amount|num_to_words }}
    Output: "Eleven Thousand Eight Hundred Rupees Only"
    """
    try:
        amount = Decimal(str(value))
        rupees = int(amount)
        paise  = round((amount - rupees) * 100)

        words = _to_words_indian(rupees) + ' Rupees'
        if paise:
            words += ' and ' + _to_words_indian(paise) + ' Paise'
        words += ' Only'
        return words
    except Exception:
        return str(value)
