// Enhanced debug script to find the correct element
console.log('🔍 Enhanced Element Finder');
console.log('========================');

// First, let's find the parent container and see all its children
const xpath = '/html/body/div[1]/div/div[1]/main/div/div[2]/div[1]/div[2]/div';
const parentElement = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

if (parentElement) {
    console.log('✅ Parent container found:', parentElement);
    console.log('📊 Parent has', parentElement.children.length, 'children:');
    
    // List all children
    Array.from(parentElement.children).forEach((child, index) => {
        console.log(`Child ${index}:`, child);
        console.log(`- Classes: ${child.className}`);
        console.log(`- Content preview: ${child.textContent.substring(0, 100)}...`);
        console.log(`- Visible: ${window.getComputedStyle(child).display !== 'none'}`);
        console.log('---');
        
        // Add colored border to identify each child
        child.style.border = `3px solid hsl(${index * 60}, 70%, 50%)`;
        child.style.boxSizing = 'border-box';
    });
    
    // Look for the actual login form (likely the second child)
    if (parentElement.children.length > 1) {
        const loginForm = parentElement.children[1]; // Usually the second child is the actual form
        console.log('🎯 Likely target (second child):', loginForm);
        
        // Position this element instead
        loginForm.style.cssText = `
            position: fixed !important;
            top: 20px !important;
            right: 20px !important;
            z-index: 999999 !important;
            background: rgba(255, 255, 255, 0.1) !important;
            border: 3px solid lime !important;
            border-radius: 15px !important;
            backdrop-filter: blur(10px) !important;
            box-shadow: 0 0 30px rgba(0, 255, 0, 0.5) !important;
            max-width: 400px !important;
            padding: 20px !important;
        `;
        
        console.log('✅ Login form positioned in top-right corner!');
        
        // Make it draggable for better UX
        loginForm.style.cursor = 'move';
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        
        loginForm.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = parseInt(loginForm.style.right) || 20;
            startTop = parseInt(loginForm.style.top) || 20;
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const newRight = startLeft - (e.clientX - startX);
                const newTop = startTop + (e.clientY - startY);
                loginForm.style.right = Math.max(0, newRight) + 'px';
                loginForm.style.top = Math.max(0, newTop) + 'px';
            }
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        console.log('🎮 Element is now draggable!');
    }
} else {
    console.log('❌ Parent container not found');
}

// Alternative: Find elements by content
console.log('🔍 Looking for login-related elements...');
const loginElements = document.querySelectorAll('[class*="login"], [class*="form"], [class*="auth"]');
loginElements.forEach((el, index) => {
    console.log(`Login element ${index}:`, el);
    el.style.outline = '2px dashed orange';
});

// Find elements with form inputs
const formContainers = document.querySelectorAll('div:has(input), div:has(form)');
console.log(`Found ${formContainers.length} potential form containers`);

// Make utility functions available
window.positionByIndex = function(index) {
    if (parentElement && parentElement.children[index]) {
        const target = parentElement.children[index];
        target.style.cssText = `
            position: fixed !important;
            top: 20px !important;
            right: 20px !important;
            z-index: 999999 !important;
            background: rgba(255, 255, 255, 0.1) !important;
            border: 3px solid lime !important;
            border-radius: 15px !important;
            backdrop-filter: blur(10px) !important;
            max-width: 400px !important;
        `;
        console.log(`✅ Positioned child ${index}:`, target);
    }
};

window.resetAll = function() {
    document.querySelectorAll('*').forEach(el => {
        el.style.border = '';
        el.style.outline = '';
        el.style.position = '';
        el.style.top = '';
        el.style.right = '';
        el.style.zIndex = '';
    });
    console.log('✅ All styles reset');
};

console.log('========================');
console.log('💡 Available commands:');
console.log('- positionByIndex(0) - Position first child');
console.log('- positionByIndex(1) - Position second child');
console.log('- resetAll() - Reset all styles');
console.log('========================');