-- Add comprehensive units for ALL companies
-- This will add units for companies: 11, 13, 14, 15, 16, 17, 21, 40, 41, 42, 44

DO $$
DECLARE
    company_rec RECORD;
BEGIN
    FOR company_rec IN SELECT id FROM authentication_company LOOP
        -- Insert all units for each company
        INSERT INTO finance_units (code, name, is_active, company_id, created_at, updated_at)
        SELECT code, name, true, company_rec.id, NOW(), NOW()
        FROM (VALUES
            -- Length/Distance
            ('MTRS', 'Meters'),
            ('MTR', 'Meter'),
            ('KM', 'Kilometer'),
            ('CM', 'Centimeter'),
            ('MM', 'Millimeter'),
            ('FT', 'Feet'),
            ('INCH', 'Inch'),
            ('YD', 'Yard'),
            ('RM', 'Running Meter'),
            
            -- Area
            ('SQM', 'Square Meter'),
            ('SQFT', 'Square Feet'),
            ('SQYD', 'Square Yard'),
            ('ACRE', 'Acre'),
            ('HECTARE', 'Hectare'),
            
            -- Volume
            ('LTR', 'Liter'),
            ('ML', 'Milliliter'),
            ('GAL', 'Gallon'),
            ('CBM', 'Cubic Meter'),
            ('CBFT', 'Cubic Feet'),
            
            -- Weight
            ('KG', 'Kilogram'),
            ('GM', 'Gram'),
            ('MG', 'Milligram'),
            ('TON', 'Ton'),
            ('MT', 'Metric Ton'),
            ('LBS', 'Pounds'),
            ('QTL', 'Quintal'),
            
            -- Quantity
            ('NOS', 'Numbers'),
            ('PCS', 'Pieces'),
            ('SET', 'Set'),
            ('SETS', 'Sets'),
            ('PAIR', 'Pair'),
            ('DOZEN', 'Dozen'),
            ('GROSS', 'Gross'),
            ('BOX', 'Box'),
            ('PACK', 'Pack'),
            ('BUNDLE', 'Bundle'),
            ('ROLL', 'Roll'),
            ('SHEET', 'Sheet'),
            ('UNIT', 'Unit'),
            ('LOT', 'Lot'),
            ('LS', 'Lump Sum'),
            ('JOB', 'Job'),
            
            -- Time
            ('DAY', 'Day'),
            ('WEEK', 'Week'),
            ('MONTH', 'Month'),
            ('YEAR', 'Year'),
            ('HOUR', 'Hour'),
            ('MIN', 'Minute'),
            
            -- Power/Energy
            ('KW', 'Kilowatt'),
            ('MW', 'Megawatt'),
            ('KWH', 'Kilowatt Hour'),
            ('MWH', 'Megawatt Hour'),
            ('HP', 'Horsepower'),
            
            -- Others
            ('PERCENTAGE', 'Percentage'),
            ('BAG', 'Bag'),
            ('BOTTLE', 'Bottle'),
            ('CAN', 'Can'),
            ('CARTON', 'Carton'),
            ('DRUM', 'Drum'),
            ('JAR', 'Jar'),
            ('PACKET', 'Packet'),
            ('REAM', 'Ream'),
            ('TIN', 'Tin'),
            ('TUBE', 'Tube'),
            ('VIAL', 'Vial')
        ) AS new_units(code, name)
        WHERE NOT EXISTS (
            SELECT 1 FROM finance_units 
            WHERE finance_units.code = new_units.code 
            AND finance_units.company_id = company_rec.id
        );
    END LOOP;
END $$;

-- Show summary of units per company
SELECT 
    c.id,
    c.name as company_name,
    COUNT(u.id) as total_units
FROM authentication_company c
LEFT JOIN finance_units u ON c.id = u.company_id AND u.is_active = true
GROUP BY c.id, c.name
ORDER BY c.id;
