const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const uploadTest = async () => {
    try {
        const filePath = 'C:\\Users\\SANJAY G\\.gemini\\antigravity\\brain\\2d310e8a-2de3-49a9-a3d7-18ed48531b39\\sample_invoice_1_1773318167182.png';
        
        if (!fs.existsSync(filePath)) {
            console.error('File not found:', filePath);
            return;
        }

        const form = new FormData();
        form.append('invoices', fs.createReadStream(filePath));

        console.log('Uploading sample invoice to http://localhost:5000/api/invoices/extract...');
        
        const response = await axios.post('http://localhost:5000/api/invoices/extract', form, {
            headers: {
                ...form.getHeaders(),
            },
        });

        console.log('\n--- SUCCESS ---');
        console.log('Response Status:', response.status);
        console.log('Dashboard Summary:', JSON.stringify(response.data.dashboard, null, 2));
        console.log('\nProcessed Invoice Details (First Invoice):');
        console.log(JSON.stringify(response.data.invoices[0], null, 2));

    } catch (error) {
        console.error('Test Error:', error.response ? error.response.data : error.message);
    }
};

uploadTest();
