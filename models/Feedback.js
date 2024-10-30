// Feedback Schema
const feedbackSchema = new mongoose.Schema({
    "name": {type: String, required:true},
    "email": {type: String, required:true},
    "message": {type: String, required:true},
    "date": { type: Date, default: Date.now }
});

// Feedback model
const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = { feedbackmodel };