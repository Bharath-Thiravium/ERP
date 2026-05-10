-- Add comprehensive list of units with is_active field
INSERT INTO finance_units (code, name, is_active, company_id, created_at, updated_at)
SELECT code, name, true, 14, NOW(), NOW()
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
    
    -- Area
    ('SQM', 'Square Meter'),
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
    ('PAIR', 'Pair'),
    ('DOZEN', 'Dozen'),
    ('GROSS', 'Gross'),
    ('BOX', 'Box'),
    ('PACK', 'Pack'),
    ('BUNDLE', 'Bundle'),
    ('ROLL', 'Roll'),
    ('SHEET', 'Sheet'),
    ('UNIT', 'Unit'),
    
    -- Time
    ('DAY', 'Day'),
    ('WEEK', 'Week'),
    ('YEAR', 'Year'),
    ('HOUR', 'Hour'),
    ('MIN', 'Minute'),
    
    -- Power/Energy
    ('KW', 'Kilowatt'),
    ('KWH', 'Kilowatt Hour'),
    ('MWH', 'Megawatt Hour'),
    ('HP', 'Horsepower'),
    
    -- Others
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
    SELECT 1 FROM finance_units WHERE finance_units.code = new_units.code AND finance_units.company_id = 14
);

-- Show all units after insertion
SELECT code, name FROM finance_units WHERE company_id = 14 ORDER BY code;
