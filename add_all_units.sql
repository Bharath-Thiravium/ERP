-- First, check what units already exist
SELECT code, name FROM finance_units ORDER BY code;

-- Add comprehensive list of units (only if they don't exist)
INSERT INTO finance_units (code, name, company_id, created_at, updated_at)
SELECT code, name, 14, NOW(), NOW()
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
    SELECT 1 FROM finance_units WHERE finance_units.code = new_units.code
);

-- Show all units after insertion
SELECT code, name FROM finance_units ORDER BY code;
