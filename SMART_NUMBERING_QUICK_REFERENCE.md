# Smart Auto-Numbering - Quick Reference

## 🎯 What Changed?

### Before
- Auto-numbering started from `start_from` value (default: 1)
- Companies with backlog had to manually set `start_from` to continue numbering
- Manual entry required `allow_manual_override` flag

### After
- ✅ Auto-numbering detects highest existing number and continues
- ✅ No configuration needed for companies with backlog
- ✅ Manual entry always allowed with duplicate validation
- ✅ Numbers can be edited after creation

## 🚀 Key Features

| Feature | Description | Example |
|---------|-------------|---------|
| **Auto-Detection** | Finds highest number automatically | Last: QTN-26-0150 → Next: QTN-26-0151 |
| **Manual Entry** | Enter custom numbers anytime | User enters: QTN-26-0200 |
| **Duplicate Prevention** | Validates uniqueness before saving | Error if number exists |
| **Editable** | Change numbers after creation | Edit QTN-26-0151 → QTN-26-0200 |
| **Yearly Scope** | Resets each year | 2026: QTN-26-0001, 2027: QTN-27-0001 |

## 📝 Usage Examples

### Example 1: Auto-Generate (Default)
```javascript
// Frontend - Leave number field empty
{
  customer: 1,
  quotation_date: "2026-01-15",
  // quotation_number: "" or undefined
}

// Backend automatically generates: QTN-26-0151
```

### Example 2: Manual Entry
```javascript
// Frontend - User enters custom number
{
  customer: 1,
  quotation_date: "2026-01-15",
  quotation_number: "QTN-26-0200"  // Custom number
}

// Backend validates uniqueness and saves
```

### Example 3: Edit After Creation
```javascript
// Frontend - User edits existing document
PATCH /api/finance/quotations/123/
{
  quotation_number: "QTN-26-0250"  // New number
}

// Backend validates and updates
```

## ⚠️ Error Handling

### Duplicate Number Error
```json
{
  "quotation_number": [
    "Document number 'QTN-26-0150' already exists. Please use a different number."
  ]
}
```

**Frontend should:**
1. Show error message to user
2. Highlight the number field
3. Allow user to enter different number
4. Suggest next available number (optional)

## 🔧 Technical Details

### Modified Files
1. **`/var/www/SAP-Python/backend/finance/numbering.py`**
   - Added `_get_highest_sequence_number()` function
   - Modified `generate_number()` to use highest existing number

2. **`/var/www/SAP-Python/backend/finance/serializers.py`**
   - Modified `assign_number()` to validate uniqueness
   - Removed `allow_manual_override` requirement

### Database Query Pattern
```sql
-- Finds all documents matching pattern
SELECT quotation_number 
FROM finance_quotations 
WHERE company_id = ? 
  AND quotation_number LIKE 'QTN-26-%'

-- Extracts highest sequence number
-- QTN-26-0001 → 1
-- QTN-26-0150 → 150
-- Returns: max(150) + 1 = 151
```

## 🎨 Frontend Integration

### Form Field Behavior
```javascript
// Number field should be:
// 1. Optional (can be left empty for auto-generation)
// 2. Editable (user can enter custom number)
// 3. Validated (show error if duplicate)

<input
  type="text"
  name="quotation_number"
  placeholder="Leave empty for auto-generation"
  value={formData.quotation_number || ''}
  onChange={handleChange}
/>

// Show error if duplicate
{errors.quotation_number && (
  <span className="error">{errors.quotation_number}</span>
)}
```

### Suggested UX Flow
1. **Create Mode**: Number field empty by default
2. **User Action**: Can enter custom number or leave empty
3. **Submit**: Backend auto-generates if empty, validates if provided
4. **Edit Mode**: Show current number, allow editing
5. **Error**: Show clear message if duplicate

## 📊 Supported Modules

| Module | Prefix | Format | Example |
|--------|--------|--------|---------|
| Quotation | QTN | QTN-YY-NNNN | QTN-26-0001 |
| Purchase Order | PO | PO-YY-NNNN | PO-26-0001 |
| Proforma Invoice | PRO | PRO-YY-NNNN | PRO-26-0001 |
| Invoice | INV | INV-YY-NNNN | INV-26-0001 |
| Customer Payment | PAY | PAY-YY-NNNN | PAY-26-0001 |
| Purchase Request | PR | PR-YY-NNNN | PR-26-0001 |
| Purchase Payment | PP | PP-YY-NNNN | PP-26-0001 |
| Vendor Invoice | VINV | VINV-YY-NNNN | VINV-26-0001 |

## 🧪 Testing Checklist

- [ ] Create document with auto-generated number
- [ ] Create document with manual number
- [ ] Try to create document with duplicate number (should fail)
- [ ] Edit document number after creation
- [ ] Verify yearly reset (create in different years)
- [ ] Test with company having backlog documents
- [ ] Test with fresh company (no existing documents)

## 🚨 Important Notes

1. **No Configuration Needed**: System works out-of-the-box
2. **Backward Compatible**: Existing documents unaffected
3. **Per Company**: Each company has independent numbering
4. **Yearly Reset**: Numbers reset each year automatically
5. **Always Editable**: Numbers can be changed anytime

## 📞 Support

If you encounter issues:
1. Check error message for details
2. Verify number format matches pattern
3. Ensure number is unique for company
4. Check yearly scope (2026 vs 2027)

## 🎉 Benefits

✅ **Zero Configuration** - Works automatically  
✅ **Handles Backlog** - Detects existing numbers  
✅ **User Friendly** - Manual entry when needed  
✅ **Data Integrity** - Prevents duplicates  
✅ **Flexible** - Edit anytime  
✅ **Efficient** - Fast database queries  

---

**Version**: 1.0  
**Last Updated**: 2026-01-15  
**Status**: Production Ready ✅
