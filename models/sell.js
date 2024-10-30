const mongoose = require("mongoose");

const sellschema = new mongoose.Schema({
    "image": {type:String,required:true},
    "pname": {type:String,required:true},
    "pdescription": {type:String,required:true},
    "price": {type:Number,required:true,min:0},
    "quantity": {type:Number,required:true,min:0},
    "category": {type:String,required:true},
});

const Sell = mongoose.model('sell', sellschema);

module.exports = Sell;



