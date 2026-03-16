// Ready-to-use script for positioning your element
// Just copy and paste this into browser console or add to your page

(function() {
    // Your specific XPath
    const targetXPath = '/html/body/div[1]/div/div[1]/main/div/div[2]/div[1]/div[2]/div/div[1]';
    
    function positionInRightCorner() {
        const element = document.evaluate(
            targetXPath,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
        ).singleNodeValue;

        if (element) {
            // Store original styles
            element.dataset.originalPosition = element.style.position || '';
            element.dataset.originalTop = element.style.top || '';
            element.dataset.originalRight = element.style.right || '';
            element.dataset.originalZIndex = element.style.zIndex || '';
            
            // Apply right corner positioning
            element.style.position = 'fixed';
            element.style.top = '20px';
            element.style.right = '20px';
            element.style.zIndex = '9999';
            element.style.pointerEvents = 'auto';
            
            // Add smooth transition
            element.style.transition = 'all 0.3s ease';
            
            // Prevent content hiding
            const elementWidth = element.getBoundingClientRect().width;
            document.body.style.paddingRight = `${elementWidth + 40}px`;
            
            console.log('✅ Element positioned in right corner');
            return element;
        } else {
            console.log('❌ Element not found with XPath:', targetXPath);
            return null;
        }
    }
    
    // Try positioning immediately
    let element = positionInRightCorner();
    
    // If not found, retry after DOM loads
    if (!element) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', positionInRightCorner);
        } else {
            // Retry with delay for dynamic content
            setTimeout(positionInRightCorner, 1000);
        }
    }
    
    // Make restore function available globally
    window.restoreElementPosition = function() {
        const element = document.evaluate(
            targetXPath,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
        ).singleNodeValue;
        
        if (element && element.dataset.originalPosition !== undefined) {
            element.style.position = element.dataset.originalPosition;
            element.style.top = element.dataset.originalTop;
            element.style.right = element.dataset.originalRight;
            element.style.zIndex = element.dataset.originalZIndex;
            
            // Remove stored data
            delete element.dataset.originalPosition;
            delete element.dataset.originalTop;
            delete element.dataset.originalRight;
            delete element.dataset.originalZIndex;
            
            // Reset body padding
            document.body.style.paddingRight = '';
            
            console.log('✅ Element position restored');
        }
    };
    
    console.log('🎯 Position utility loaded. Use restoreElementPosition() to restore original position.');
})();