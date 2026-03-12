const fs = require('fs');

async function uploadTest() {
    try {
        const filePath = 'C:\\Users\\SANJAY G\\.gemini\\antigravity\\brain\\2d310e8a-2de3-49a9-a3d7-18ed48531b39\\sample_invoice_1_1773318167182.png';
        
        if (!fs.existsSync(filePath)) {
            console.error('File not found:', filePath);
            return;
        }

        const formData = new FormData();
        const fileContent = fs.readFileSync(filePath);
        const fileBlob = new Blob([fileContent], { type: 'image/png' });
        
        formData.append('invoices', fileBlob, 'sample_invoice.png');

        console.log('Uploading sample invoice to http://localhost:5000/api/invoices/extract...');
        
        const response = await fetch('http://localhost:5000/api/invoices/extract', {
            method: 'POST',
            body: formData
        });

        const data = await response.text();
        console.log('Response Status:', response.status);
        fs.writeFileSync('tmp/error.html', data);
        console.log('Wrote output to tmp/error.html');

    } catch (error) {
        console.error('Test Error:', error);
    }
}

uploadTest();
