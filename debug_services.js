// Debug script to test services API
console.log('🔍 Starting services debug...');

// Test the services API directly
async function testServicesAPI() {
    try {
        // First login
        console.log('🔍 Step 1: Login...');
        const loginResponse = await fetch('http://127.0.0.1:8000/api/auth/master-admin/login/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'ilaiaraja@gmail.com',
                password: 'Masteradmin@123'
            })
        });
        
        if (!loginResponse.ok) {
            throw new Error(`Login failed: ${loginResponse.status}`);
        }
        
        const loginData = await loginResponse.json();
        console.log('✅ Login successful');
        
        // Then fetch services
        console.log('🔍 Step 2: Fetch services...');
        const servicesResponse = await fetch('http://127.0.0.1:8000/api/auth/services/', {
            headers: {
                'Authorization': `Bearer ${loginData.access}`,
                'Content-Type': 'application/json',
            }
        });
        
        if (!servicesResponse.ok) {
            throw new Error(`Services API failed: ${servicesResponse.status}`);
        }
        
        const servicesData = await servicesResponse.json();
        console.log('✅ Services API successful');
        console.log('📊 Services response:', servicesData);
        console.log('📊 Services structure:', Object.keys(servicesData));
        console.log('📊 Has results?', 'results' in servicesData);
        console.log('📊 Results length:', servicesData.results?.length);
        
        if (servicesData.results && servicesData.results.length > 0) {
            console.log('📋 First service:', servicesData.results[0]);
        }
        
        // Test the data processing logic from the frontend
        console.log('🔍 Step 3: Test frontend data processing...');
        const processedServices = servicesData?.results || [];
        console.log('📊 Processed services:', processedServices);
        console.log('📊 Is array?', Array.isArray(processedServices));
        console.log('📊 Length:', processedServices.length);
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Run the test
testServicesAPI();
