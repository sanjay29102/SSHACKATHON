const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = async () => {
    try {
        const mongoose = require('mongoose');
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

dotenv.config();
connectDB();

const app = express();

const invoiceRoutes = require('./routes/invoice.routes');

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.use('/api/invoices', invoiceRoutes);

app.get('/', (req, res) => {
    res.send('Invoice OCR API is running...');
});

app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err);
    res.status(500).json({ error: err.message, stack: err.stack });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
