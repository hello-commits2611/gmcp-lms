const axios = require('axios');

async function diagnose() {
    console.log('🔍 DIAGNOSTIC TEST\n');
    
    const tests = [
        {
            name: 'Test 1: Plain text with tab characters',
            headers: { 'Content-Type': 'text/plain', 'SN': 'CUB7250700545' },
            data: 'PUNCH\t1\t2025-12-19 19:30:00\t0\t1\t0'
        },
        {
            name: 'Test 2: Plain text with actual tab bytes',
            headers: { 'Content-Type': 'text/plain', 'SN': 'CUB7250700545' },
            data: Buffer.from([80,85,78,67,72,9,49,9,50,48,50,53,45,49,50,45,49,57,32,49,57,58,51,48,58,48,48,9,48,9,49,9,48]).toString()
        }
    ];
    
    for (const test of tests) {
        console.log(`\n📊 ${test.name}`);
        console.log(`Headers:`, test.headers);
        console.log(`Data:`, test.data);
        console.log(`Data (hex):`, Buffer.from(test.data).toString('hex'));
        
        try {
            const response = await axios.post(
                'http://localhost:3000/api/biometric/iclock/cdata',
                test.data,
                {
                    headers: test.headers,
                    validateStatus: () => true
                }
            );
            
            console.log(`✅ Response: ${response.data}`);
            
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }
    }
    
    console.log('\n🔍 Check your server logs to see what it received!');
    console.log('Look for lines starting with: 🟢 X2008 Device Data Received\n');
}

diagnose();
