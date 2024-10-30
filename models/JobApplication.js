const mongoose = require('mongoose');

const JobApplicationSchema = new mongoose.Schema({
    jobId: {
        type: String,
        required: true,
        ref: 'Job',
    },
    name: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
    appliedAt: {
        type: Date,
        default: Date.now,
    },
    
});

module.exports = mongoose.model('JobApplication', JobApplicationSchema);
