const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');

// Load environment variables BEFORE anything else uses them
dotenv.config();

const connectDB = async () => {
    try {
        const mongoose = require('mongoose');
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`MongoDB Error: ${error.message}`);
        // Don't exit — allow server to run without DB for development
        console.warn('Server will continue without MongoDB. Some features may not work.');
    }
};

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
