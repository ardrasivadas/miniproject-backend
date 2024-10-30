

// Define the Order Schema
const orderSchema = new mongoose.Schema({
    "productId": { type: mongoose.Schema.Types.ObjectId, ref: 'sell' },
    "pname":{type: String, required:true},
    "address":{type: String, required:true},
    "paymentMethod": {type: String, required:true},
    "email": {type: String, required:true},
    "phone": {type: String, required:true},
    "orderQuantity": {type: Number, required:true},
    "date": { type: Date, default: Date.now }
});

// Create the Order Model
const Ordermodel = mongoose.model("Order", orderSchema);

// Export both models
module.exports = { Ordermodel };
