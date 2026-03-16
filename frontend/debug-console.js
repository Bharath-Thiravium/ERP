// COPY AND PASTE THIS INTO BROWSER CONSOLE
// This will help identify why the positioning isn't working

console.log('🔍 Element Positioning Debug Script');
console.log('==================================');

// Your XPath
const xpath = '/html/body/div[1]/div/div[1]/main/div/div[2]/div[1]/div[2]/div/div[1]';

// Test 1: Check if element exists
console.log('Test 1: Checking if element exists...');
const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

if (element) {
    console.log('✅ Element found:', element);
    
    // Test 2: Check current styles
    console.log('Test 2: Current element styles...');
    const computedStyle = window.getComputedStyle(element);
    console.log('- Position:', computedStyle.position);
    console.log('- Top:', computedStyle.top);
    console.log('- Right:', computedStyle.right);
    console.log('- Z-index:', computedStyle.zIndex);
    console.log('- Display:', computedStyle.display);
    
    // Test 3: Force positioning with maximum priority
    console.log('Test 3: Applying forced positioning...');
    element.style.cssText = `
        position: fixed !important;
        top: 20px !important;
        right: 20px !important;
        z-index: 999999 !important;
        background: red !important;
        border: 5px solid yellow !important;
        padding: 10px !important;
        color: white !important;
        font-weight: bold !important;
        border-radius: 10px !important;
        box-shadow: 0 0 20px rgba(255,255,0,0.8) !important;
    `;
    
    console.log('✅ Forced positioning applied!');
    console.log('The element should now be visible in the top-right corner with red background and yellow border');
    
} else {
    console.log('❌ Element NOT found with XPath');
    console.log('Let me try to find it using alternative methods...');
    
    // Alternative method 1: Try different XPath variations
    const variations = [
        '/html/body/div[1]/div/div[1]/main/div/div[2]/div[1]/div[2]/div/div[1]',
        '//main//div[contains(@class,"")]',
        '//div[position()=1]/div[position()=1]/div[position()=1]/main//div',
        '//*[@id]//div[last()]'
    ];
    
    variations.forEach((xpath, index) => {
        const el = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        if (el) {
            console.log(`✅ Found with variation ${index + 1}:`, el);
        }
    });
    
    // Alternative method 2: Show DOM structure
    console.log('Current DOM structure:');
    const body = document.body;
    if (body.children[0]) {
        console.log('Body > div[0]:', body.children[0]);
        if (body.children[0].children[0]) {
            console.log('Body > div[0] > div[0]:', body.children[0].children[0]);
            if (body.children[0].children[0].children[0]) {
                console.log('Body > div[0] > div[0] > div[0]:', body.children[0].children[0].children[0]);
            }
        }
    }
    
    // Alternative method 3: Find all divs and highlight them
    console.log('Highlighting all divs for manual identification...');
    const allDivs = document.querySelectorAll('div');
    allDivs.forEach((div, index) => {
        if (index < 20) { // Only first 20 to avoid clutter
            div.style.border = '1px solid blue';
            div.title = `Div ${index}`;
        }
    });
    console.log(`Found ${allDivs.length} div elements (first 20 highlighted in blue)`);
}

// Utility function to position any element by selector
window.positionElement = function(selector) {
    const el = document.querySelector(selector);
    if (el) {
        el.style.cssText = `
            position: fixed !important;
            top: 20px !important;
            right: 20px !important;
            z-index: 999999 !important;
            background: red !important;
            border: 5px solid yellow !important;
            padding: 10px !important;
            color: white !important;
            font-weight: bold !important;
            border-radius: 10px !important;
        `;
        console.log('✅ Positioned element:', el);
    } else {
        console.log('❌ Element not found with selector:', selector);
    }
};

console.log('==================================');
console.log('💡 If element was found, it should now be in top-right corner');
console.log('💡 If not found, check the blue-bordered divs to identify the correct one');
console.log('💡 Use positionElement("your-selector") to position any element manually');
console.log('==================================');