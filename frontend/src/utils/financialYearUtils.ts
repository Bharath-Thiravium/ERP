// Utility functions for Financial Year filtering

/**
 * Extract financial year from invoice/PO/quotation number
 * Examples: 
 * - "TC-INV-2627-001" -> "2627" -> "2026-27"
 * - "BKC/001/2627" -> "2627" -> "2026-27"
 * - "TC-2526-015" -> "2526" -> "2025-26"
 */
export const extractFYFromNumber = (documentNumber: string): string | null => {
  if (!documentNumber) return null
  
  // Match 4-digit year pattern (e.g., 2627, 2526)
  const match = documentNumber.match(/(\d{4})/)
  if (match) {
    const shortYear = match[1]
    const firstYear = shortYear.slice(0, 2)
    const secondYear = shortYear.slice(2, 4)
    const result = `20${firstYear}-${secondYear}`
    console.log(`[FY Filter] Document: ${documentNumber} → Extracted: ${shortYear} → FY: ${result}`)
    return result
  }
  
  console.log(`[FY Filter] Document: ${documentNumber} → No FY found`)
  return null
}

/**
 * Get current financial year
 * Financial year runs from April to March
 * If current month is April-March, FY is current year to next year
 * If current month is Jan-March, FY is previous year to current year
 */
export const getCurrentFY = (): string => {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // 1-12
  
  if (currentMonth >= 4) {
    // April onwards - FY is current year to next year
    const nextYear = currentYear + 1
    return `${currentYear}-${nextYear.toString().slice(-2)}`
  } else {
    // Jan-March - FY is previous year to current year
    const prevYear = currentYear - 1
    return `${prevYear}-${currentYear.toString().slice(-2)}`
  }
}

/**
 * Get date range for a financial year
 * FY 2025-26 means April 1, 2025 to March 31, 2026
 */
export const getFYDateRange = (fy: string): { start: Date; end: Date } | null => {
  if (!fy) return null
  
  const match = fy.match(/(\d{4})-(\d{2})/)
  if (!match) return null
  
  const startYear = parseInt(match[1])
  const endYear = parseInt(`20${match[2]}`)
  
  return {
    start: new Date(startYear, 3, 1), // April 1st (month is 0-indexed)
    end: new Date(endYear, 2, 31, 23, 59, 59) // March 31st
  }
}

/**
 * Filter array of documents by financial year using date range
 */
export const filterByFY = <T extends { 
  invoice_number?: string; 
  quotation_number?: string; 
  internal_po_number?: string; 
  proforma_number?: string;
  invoice_date?: string;
  quotation_date?: string;
  po_date?: string;
  proforma_date?: string;
}>(
  items: T[],
  selectedFY: string
): T[] => {
  if (!selectedFY) {
    console.log('[FY Filter] No FY selected, returning all items:', items.length)
    return items
  }
  
  const dateRange = getFYDateRange(selectedFY)
  if (!dateRange) {
    console.log('[FY Filter] Invalid FY format:', selectedFY)
    return items
  }
  
  console.log(`[FY Filter] Filtering ${items.length} items for FY: ${selectedFY}`)
  console.log(`[FY Filter] Date range: ${dateRange.start.toISOString()} to ${dateRange.end.toISOString()}`)
  
  const filtered = items.filter(item => {
    const dateStr = 
      item.invoice_date || 
      item.quotation_date || 
      item.po_date || 
      item.proforma_date || 
      ''
    
    if (!dateStr) {
      console.log('[FY Filter] No date found for item')
      return false
    }
    
    const itemDate = new Date(dateStr)
    const matches = itemDate >= dateRange.start && itemDate <= dateRange.end
    console.log(`[FY Filter] Date: ${dateStr} → ${itemDate.toISOString()} → Match? ${matches}`)
    return matches
  })
  
  console.log(`[FY Filter] Result: ${filtered.length} items matched`)
  return filtered
}

/**
 * Generate list of financial years (last 5 years + next 2 years)
 */
export const generateFYList = (): string[] => {
  const currentYear = new Date().getFullYear()
  const years: string[] = []
  
  for (let i = -5; i <= 2; i++) {
    const year = currentYear + i
    const nextYear = year + 1
    years.push(`${year}-${nextYear.toString().slice(-2)}`)
  }
  
  return years.reverse()
}
