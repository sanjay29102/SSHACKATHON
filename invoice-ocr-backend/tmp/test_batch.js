const fs = require('fs');

async function uploadBatchTest() {
    try {
        const file1 = 'sample_invoice.png';
        const file2 = 'sample_invoice_2.png';

        if (!fs.existsSync(file1) || !fs.existsSync(file2)) {
            console.error('One or more files not found');
            return;
        }

        const formData = new FormData();

        const file1Content = fs.readFileSync(file1);
        const file1Blob = new Blob([file1Content], { type: 'image/png' });
        formData.append('invoices', file1Blob, 'sample_invoice.png');

        const file2Content = fs.readFileSync(file2);
        const file2Blob = new Blob([file2Content], { type: 'image/png' });
        formData.append('invoices', file2Blob, 'sample_invoice_2.png');

        console.log('Uploading 2 invoices as a batch...');

        const response = await fetch('http://localhost:5000/api/invoices/extract', {
            method: 'POST',
            body: formData
        });

        const data = await response.text();
        console.log('Response Status:', response.status);
        fs.writeFileSync('tmp/batch_result.json', data);
        console.log('Wrote output to tmp/batch_result.json');

    } catch (error) {
        console.error('Test Error:', error);
    }
}

uploadBatchTest();
