// Position element in right corner using XPath
function positionElementInRightCorner(customXPath = null, options = {}) {
  const defaultOptions = {
    position: 'top-right', // 'top-right', 'bottom-right', 'top-left', 'bottom-left'
    offset: { top: 20, right: 20, bottom: 20, left: 20 },
    zIndex: 9999,
    addBodyPadding: true,
    preserveOriginalStyles: false
  };
  
  const config = { ...defaultOptions, ...options };
  
  // Default XPath or use custom one
  const xpath = customXPath || '/html/body/div[1]/div/div[1]/main/div/div[2]/div[1]/div[2]/div/div[1]';
  
  const element = document.evaluate(
    xpath,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  ).singleNodeValue;

  if (element) {
    // Store original styles if needed
    if (config.preserveOriginalStyles) {
      element.dataset.originalPosition = element.style.position || '';
      element.dataset.originalTop = element.style.top || '';
      element.dataset.originalRight = element.style.right || '';
      element.dataset.originalBottom = element.style.bottom || '';
      element.dataset.originalLeft = element.style.left || '';
      element.dataset.originalZIndex = element.style.zIndex || '';
    }
    
    // Apply positioning based on config
    element.style.position = 'fixed';
    element.style.zIndex = config.zIndex;
    element.style.pointerEvents = 'auto';
    
    // Reset all position properties first
    element.style.top = 'auto';
    element.style.right = 'auto';
    element.style.bottom = 'auto';
    element.style.left = 'auto';
    
    // Apply specific positioning
    switch (config.position) {
      case 'top-right':
        element.style.top = `${config.offset.top}px`;
        element.style.right = `${config.offset.right}px`;
        break;
      case 'bottom-right':
        element.style.bottom = `${config.offset.bottom}px`;
        element.style.right = `${config.offset.right}px`;
        break;
      case 'top-left':
        element.style.top = `${config.offset.top}px`;
        element.style.left = `${config.offset.left}px`;
        break;
      case 'bottom-left':
        element.style.bottom = `${config.offset.bottom}px`;
        element.style.left = `${config.offset.left}px`;
        break;
    }
    
    // Add body padding to prevent content hiding
    if (config.addBodyPadding) {
      const elementRect = element.getBoundingClientRect();
      const paddingValue = Math.max(elementRect.width + config.offset.right + 10, 80);
      
      if (config.position.includes('right')) {
        document.body.style.paddingRight = `${paddingValue}px`;
      } else if (config.position.includes('left')) {
        document.body.style.paddingLeft = `${paddingValue}px`;
      }
    }
    
    console.log(`Element positioned in ${config.position} corner`);
    return element;
  } else {
    console.log('Element not found with XPath:', xpath);
    return null;
  }
}

// Function to restore original position
function restoreElementPosition(element) {
  if (element && element.dataset.originalPosition !== undefined) {
    element.style.position = element.dataset.originalPosition;
    element.style.top = element.dataset.originalTop;
    element.style.right = element.dataset.originalRight;
    element.style.bottom = element.dataset.originalBottom;
    element.style.left = element.dataset.originalLeft;
    element.style.zIndex = element.dataset.originalZIndex;
    
    // Remove data attributes
    delete element.dataset.originalPosition;
    delete element.dataset.originalTop;
    delete element.dataset.originalRight;
    delete element.dataset.originalBottom;
    delete element.dataset.originalLeft;
    delete element.dataset.originalZIndex;
    
    // Reset body padding
    document.body.style.paddingRight = '';
    document.body.style.paddingLeft = '';
    
    console.log('Element position restored');
  }
}

// Auto-run function with retry mechanism
function autoPositionElement(retries = 5, delay = 1000) {
  let attempts = 0;
  
  const tryPosition = () => {
    const element = positionElementInRightCorner();
    
    if (!element && attempts < retries) {
      attempts++;
      console.log(`Attempt ${attempts}/${retries} - Element not found, retrying in ${delay}ms...`);
      setTimeout(tryPosition, delay);
    } else if (!element) {
      console.log('Failed to find element after all retries');
    }
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryPosition);
  } else {
    tryPosition();
  }
}

// Export functions
export { 
  positionElementInRightCorner, 
  restoreElementPosition, 
  autoPositionElement 
};