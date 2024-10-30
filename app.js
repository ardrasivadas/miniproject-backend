const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require('body-parser');
const cors = require("cors");
const app = express();
const bcrypt = require("bcryptjs"); // Import encryption package
const jwt = require("jsonwebtoken"); // Importing token library

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect("mongodb+srv://ardra:ardrac1543@cluster0.tehzzbx.mongodb.net/ruraldb?retryWrites=true&w=majority&appName=Cluster0")
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.error("Failed to connect to MongoDB", err));

const generateHashedpswd = async (password) => {
    try {
        const salt = await bcrypt.genSalt(10); // Salt is a cost factor
        return await bcrypt.hash(password, salt);
    } catch (error) {
        console.error("Error generating hashed password", error);
        throw error;
    }
}

const { ruralmodel } = require("./models/rural");

app.post("/usersignup", async (req, res) => {
    try {
        let input = req.body;
        let hashedpswd = await generateHashedpswd(input.password);
        input.password = hashedpswd; // This is for getting hashed password in db



        let ruralusers = new ruralmodel(input);
        await ruralusers.save();
        res.json({ "status": "SIGNUP" });
    } catch (error) {
        console.error("Error during signup", error);
        res.status(500).json({ "status": "error", "message": "Internal Server Error" });
    }
});

// Login API - here we need async as the password is encrypted



app.post("/userlogin",(req,res)=>{
    let input=req.body;
    ruralmodel.find({"email":req.body.email}).then(
     (response)=>{
         if (response.length>0) {
             let dbpass=response[0].password;
             console.log(dbpass)
             bcrypt.compare(input.password,dbpass,(error,isMatch)=>{


            if (isMatch) {
                // If login success generate token
                jwt.sign({ email: input.emailid }, process.env.JWT_SECRET || "rural-frontend", { expiresIn: "1d" },
                    (error, token) => {
                        if (error) {
                            res.json({ "status": "unable to create token" });
                        } else {
                            res.json({ "status": "success", "userid": response[0]._id, "token": token });
                        }
                    });
            } else {
                res.json({ "status": "incorrect password" });
            }
        })
        } else {
            res.json({ "status": "user not found" });
        }
    }). catch ()
});

app.post("/view", (req, res) => {
    const token = req.headers["token"];
    
    jwt.verify(token, process.env.JWT_SECRET || "rural-frontend", (error, decoded) => {
        if (error) {
            res.json({ "status": "unauthorized access" });
        } else {
            if (decoded) {
                ruralmodel.find().then(
                    (response) => {
                        res.json(response);
                    }
                ).catch(err => {
                    console.error("Error fetching data", err);
                    res.status(500).json({ "status": "error", "message": "Internal Server Error" });
                });
            }
        }
    });
});

app.get("/viewsign", (req, res) => {
    ruralmodel.find().then((data) => {
        res.json(data);
    }).catch((error) => {
        console.error("Error fetching data", error);
        res.status(500).json({ "status": "error", "message": "Internal Server Error" });
    });
});


// Define Sell Schema
const sellSchema = new mongoose.Schema({
    image: { type: String, required: true },
    pname: { type: String, required: true },
    pdescription: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    category: { type: String, required: true },
});

const Sell = mongoose.model("sell", sellSchema);

// Add Product Route
app.post("/add", (req, res) => {
    const input = req.body;
    const newSell = new Sell(input);

    newSell.save()
        .then(() => {
            console.log("Product added:", newSell);
            res.status(200).json({ "status": "success", "message": "Product added successfully" });
        })
        .catch((error) => {
            console.error("Error adding product:", error);
            res.status(400).json({ "status": "error", "message": error.message });
        });
});

// Search Products Route
app.post("/search", (req, res) => {
    const { pname } = req.body; // Use the body to get the search parameter

    // Search the products based on pname
    Sell.find({ pname: { $regex: pname, $options: 'i' } }) // Case-insensitive search
        .then((data) => res.status(200).json(data))
        .catch((error) => res.status(400).json({ "status": "error", "message": error.message }));
});




// Delete Product Route
app.delete("/delete/:id", (req, res) => {
    const productId = req.params.id;

    Sell.findByIdAndDelete(productId)
        .then(() => res.status(200).json({ "status": "success", "message": "Product deleted successfully" }))
        .catch((error) => res.status(400).json({ "status": "error", "message": error.message }));
});

// View All Products Route
app.get("/viewprod", (req, res) => {
    Sell.find()
        .then((data) => res.status(200).json(data))
        .catch((error) => res.status(400).json({ "status": "error", "message": error.message }));
});



// Define Order Schema and Model
// Define Order Schema and Model
const orderSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'sell' },
    pname: String,
    address: String,
    paymentMethod: String,
    email: String,
    phone: String,
    orderQuantity: Number,
    date: { type: Date, default: Date.now }
});
const Order = mongoose.model("Order", orderSchema);

// Buy product route (handling "Buy Now")
app.post("/order", (req, res) => {
    const { productId, pname, address, paymentMethod, email, phone, orderQuantity } = req.body;

    // Find the product by ID
    Sell.findById(productId)
        .then((sell) => {
            if (sell && sell.quantity >= orderQuantity) {
                // Reduce the product quantity by the ordered amount
                sell.quantity -= orderQuantity;

                // Save the updated product quantity
                sell.save()
                    .then(() => {
                        // Create a new order with all the details
                        const newOrder = new Order({
                            productId: sell._id, // Use sell._id instead of product._id
                            pname,
                            address,
                            paymentMethod,
                            email,
                            phone,
                            orderQuantity
                        });

                        // Save the order
                        newOrder.save()
                            .then(() => res.json({ status: "success", message: "Order placed successfully!" }))
                            .catch((error) => res.json({ status: "error", message: error.message }));
                    })
                    .catch((error) => res.json({ status: "error", message: error.message }));
            } else {
                res.json({ status: "error", message: "Product out of stock or insufficient quantity." });
            }
        })
        .catch((error) => res.json({ status: "error", message: error.message }));
});

// Fetch all products
app.get("/viewprod", (req, res) => {
    Sell.find()
        .then((products) => res.json(products))
        .catch((error) => res.json(error));
});

app.get("/vieworders", (req, res) => {
    Order.find()
        .populate('productId') // Populate product details
        .then((orders) => {
            // Return the orders with product details
            const orderDetails = orders.map(order => ({
                orderId: order._id,
                productName: order.productId?.pname, // Use optional chaining to avoid errors if product is not found
                productId: order.productId?._id, // Use optional chaining
                userEmail: order.email,
                userPhone: order.phone,
                address: order.address,
                quantity: order.orderQuantity,
                price: order.productId?.price, // Use optional chaining for price
                paymentMethod: order.paymentMethod,
                date: order.date
            }));
            res.json(orderDetails);
        })
        .catch((error) => {
            console.error("Error fetching orders:", error);
            res.status(500).json({ message: "Error fetching orders", error });
        });
});


app.get("/viewORD13123", (req, res) => {
    const email = req.query.email;
    console.log("User email: ", email);

    // Step 1: Find orders associated with the user email
    Order.find({ email: email })
        .populate('productId')
        .then(orders => {
            if (orders.length === 0) {
                return res.status(404).json({ message: "No orders found for this user." });
            }

            // Step 2: Format the order details
            const orderDetails = orders.map(order => ({
                orderId: order._id,
                productName: order.productId?.pname,
                productId: order.productId?._id,
                userEmail: order.email,
                userPhone: order.phone,
                address: order.address,
                quantity: order.orderQuantity,
                price: order.productId?.price
            }));

            console.log("Order Details: ", orderDetails);
            res.json(orderDetails);
        })
        .catch(error => {
            console.error("Error fetching orders: ", error);
            res.status(500).json({ message: "Error fetching orders", error });
        });
});


// In-memory message storage (for demonstration)
let chatMessages = [];

// Route to get all chat messages
app.get('/messages', (req, res) => {
    res.status(200).json(chatMessages);
});

// Route to send a new message
app.post('/messages', (req, res) => {
    const { sender, text } = req.body;

    if (!sender || !text) {
        return res.status(400).json({ status: 'error', message: 'Sender and text are required' });
    }

    const newMessage = {
        sender,
        text,
        timestamp: new Date().toLocaleTimeString(),
    };

    // Save the new message to the array
    chatMessages.push(newMessage);

    res.status(201).json({ status: 'success', message: 'Message sent', data: newMessage });
});





// Define the schema and model for job applications
const jobApplicationSchema = new mongoose.Schema({
    jobId: String,
    name: String,
    phone: String,
    address: String,
});

const JobApplication = mongoose.model('JobApplication', jobApplicationSchema);

// Define the /apply route to handle form submission
app.post('/apply', async (req, res) => {
    const { jobId, name, phone, address } = req.body;
    
    // Validate the input
    if ( !name || !phone || !address || !jobId) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // Create a new job application
    const newApplication = new JobApplication({
        jobId,
        name,
        phone,
        address,
    });

    try {
        // Save the application to the database
        await newApplication.save();
        res.status(201).json({ message: 'Application submitted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to submit the application. Please try again.' });
    }
});



// Add a route to fetch all job applications or filter by jobId
app.get('/applications', async (req, res) => {
    const { jobId } = req.query; // Optional query parameter to filter by jobId

    try {
        // Fetch all applications or filter by jobId if provided
        const applications = jobId 
            ? await JobApplication.find({ jobId }) 
            : await JobApplication.find();
        res.status(200).json(applications);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch job applications. Please try again.' });
    }
});

// Admin Schema
const adminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const Admin = mongoose.model('Admin', adminSchema);

// Admin Registration (for setting up an admin account)
app.post('/register-admin', async (req, res) => {
    const { username, password } = req.body;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new admin
    const admin = new Admin({
        username,
        password: hashedPassword
    });

    try {
        await admin.save();
        res.status(201).json({ message: 'Admin registered successfully' });
    } catch (error) {
        res.status(400).json({ error: 'Error registering admin' });
    }
});



// Admin Login
app.post('/admin-login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Find admin by username
        const admin = await Admin.findOne({ username });
        if (!admin) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }

        // Generate JWT token
        const token = jwt.sign({ adminId: admin._id }, '15042003', { expiresIn: '1h' });

        res.json({ message: 'Login successful', token });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});



// Protect routes (Middleware to verify token)
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ error: 'Access denied' });

    try {
        const decoded = jwt.verify(token, '15042003');
        req.adminId = decoded.adminId;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Example protected route
app.get('/admin-dashboard', verifyToken, (req, res) => {
    res.json({ message: 'Welcome to the admin dashboard' });
});


// Feedback Schema
const feedbackSchema = new mongoose.Schema({
    name: String,
    email: String,
    message: String,
    date: { type: Date, default: Date.now }
});

// Feedback model
const Feedback = mongoose.model('Feedback', feedbackSchema);

// Route to submit feedback
app.post('/submit-feedback', async (req, res) => {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
        return res.status(400).json({ message: 'Please fill all the fields' });
    }

    try {
        const feedback = new Feedback({ name, email, message });
        await feedback.save();
        res.json({ message: 'Feedback submitted successfully' });
    } catch (error) {
        console.error('Error submitting feedback:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Route to get all feedbacks
app.get('/feedbacks', async (req, res) => {
    try {
        const feedbacks = await Feedback.find();
        res.json(feedbacks);
    } catch (error) {
        console.error('Error fetching feedbacks:', error);
        res.status(500).json({ message: 'Server error' });
    }
});



// Fetch job applications and orders by date
app.get("/getDataByDate", (req, res) => {
    const { date } = req.query;
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1); // Set the end date to the next day to include the entire selected day

    // Find job applications and orders that match the date
    Promise.all([
        JobApplication.find({ date: { $gte: startDate, $lt: endDate } }), // Replace 'JobApplication' with your actual model name
        Order.find({ date: { $gte: startDate, $lt: endDate } })
    ])
    .then(([jobApplications, orders]) => {
        res.json({
            jobApplications,
            orders
        });
    })
    .catch((error) => {
        res.status(500).json({ message: "Error fetching data", error });
    });
});




// Start the server
app.listen(8081, () => {
    console.log("Server started");
});