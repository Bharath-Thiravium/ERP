// Diagnostic script to troubleshoot element positioning
(function() {
    console.log('🔍 Starting element positioning diagnostics...');
    
    const targetXPath = '/html/body/div[1]/div/div[1]/main/div/div[2]/div[1]/div[2]/div/div[1]';
    
    // Function to test XPath and find element
    function diagnoseElement() {
        console.log('📍 Testing XPath:', targetXPath);
        
        // Try to find element using XPath
        const element = document.evaluate(
            targetXPath,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
        ).singleNodeValue;
        
        if (element) {
            console.log('✅ Element found!', element);
            console.log('📊 Element details:');
            console.log('- Tag name:', element.tagName);
            console.log('- Class list:', element.classList.toString());
            console.log('- ID:', element.id);
            console.log('- Current position:', element.style.position || 'static');
            console.log('- Current top:', element.style.top || 'auto');
            console.log('- Current right:', element.style.right || 'auto');
            console.log('- Computed styles:', window.getComputedStyle(element).position);
            
            // Try positioning
            console.log('🎯 Attempting to position element...');
            
            // Force positioning with !important
            element.style.setProperty('position', 'fixed', 'important');
            element.style.setProperty('top', '20px', 'important');
            element.style.setProperty('right', '20px', 'important');
            element.style.setProperty('z-index', '99999', 'important');
            element.style.setProperty('background', 'red', 'important');
            element.style.setProperty('border', '3px solid yellow', 'important');
            
            console.log('✅ Positioning applied with !important');
            console.log('📊 New styles:');
            console.log('- Position:', element.style.position);
            console.log('- Top:', element.style.top);
            console.log('- Right:', element.style.right);
            console.log('- Z-index:', element.style.zIndex);
            
            return element;
        } else {
            console.log('❌ Element NOT found with XPath');
            
            // Try alternative methods to find the element
            console.log('🔍 Trying alternative selectors...');
            
            // Try finding by walking the DOM structure
            const body = document.body;
            const div1 = body.children[0];
            console.log('Body first child:', div1);
            
            if (div1) {
                const div2 = div1.children[0];
                console.log('Second level div:', div2);
                
                if (div2) {
                    const div3 = div2.children[0];
                    console.log('Third level div:', div3);
                    
                    if (div3 && div3.tagName === 'MAIN') {
                        console.log('Found main element:', div3);
                        // Continue walking...
                        const mainChild = div3.children[0];
                        if (mainChild) {
                            console.log('Main child:', mainChild);
                            // Try to find the target element in the structure
                            const allDivs = div3.querySelectorAll('div');
                            console.log('All divs in main:', allDivs.length);
                            
                            // Highlight all potential targets
                            allDivs.forEach((div, index) => {
                                div.style.border = `2px solid blue`;
                                div.title = `Div ${index}`;
                                console.log(`Div ${index}:`, div);
                            });
                        }
                    }
                }
            }
            
            return null;
        }
    }
    
    // Function to list all elements that could match
    function findPossibleElements() {
        console.log('🔍 Searching for possible target elements...');
        
        // Get all divs
        const allDivs = document.querySelectorAll('div');
        console.log(`Found ${allDivs.length} div elements`);
        
        // Look for divs that might be the target
        allDivs.forEach((div, index) => {
            if (div.children.length === 1 && div.children[0].tagName === 'DIV') {
                console.log(`Possible target ${index}:`, div);
                div.style.outline = '2px dashed green';
                div.title = `Possible target ${index}`;
            }
        });
    }
    
    // Run diagnostics
    console.log('🚀 Running diagnostics...');
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                diagnoseElement();
                findPossibleElements();
            }, 1000);
        });
    } else {
        setTimeout(() => {
            diagnoseElement();
            findPossibleElements();
        }, 1000);
    }
    
    // Also try immediately
    diagnoseElement();
    
    // Make functions available globally for manual testing
    window.diagnoseElement = diagnoseElement;
    window.findPossibleElements = findPossibleElements;
    
    // Manual positioning function
    window.manualPosition = function(selector) {
        const element = document.querySelector(selector);
        if (element) {
            element.style.setProperty('position', 'fixed', 'important');
            element.style.setProperty('top', '20px', 'important');
            element.style.setProperty('right', '20px', 'important');
            element.style.setProperty('z-index', '99999', 'important');
            element.style.setProperty('background', 'red', 'important');
            element.style.setProperty('border', '3px solid yellow', 'important');
            console.log('✅ Manual positioning applied to:', element);
        } else {
            console.log('❌ Element not found with selector:', selector);
        }
    };
    
    console.log('🛠️ Diagnostic functions available:');
    console.log('- diagnoseElement() - Test the XPath');
    console.log('- findPossibleElements() - Find all possible targets');
    console.log('- manualPosition("selector") - Manually position any element');
    
})();