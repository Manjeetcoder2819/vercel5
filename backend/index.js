require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const cors = require("cors");
const AuditResult = require("./models/AuditResult");

// Initialize Express app
const app = express();
const PORT = 5000;

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  methods: ["GET", "POST"],
  credentials: true,
}));

app.use(express.json());


// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("MONGO_URI is not defined in environment variables.");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connection successful"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

app.get("/", (req, res) => {
  res.send("API is running...");
});

app.get("/api/status", (req, res) => {
  res.status(200).json({ message: "Backend is running on vercel!" });
});


// Save Audit Result and Send Email
app.post("/api/calculate", async (req, res) => {
  const { name, email, url, results, deviceName } = req.body;


  if (!name || !email || !url || !results || !deviceName) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    // Save result to MongoDB
    const newResult = new AuditResult({
      name,
      email,
      url,
      results,
      deviceName,
    });

    const savedResult = await newResult.save();

    // Generate Explanation based on CO2 emissions
    const explanation = generateExplanation(results.grams);

    // Email content
    const emailContent = `
      <h1>Website Carbon Footprint Analysis</h1>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>URL:</strong> ${url}</p>
      <p><strong>Device:</strong> ${deviceName}</p>
      <p><strong>Page Size:</strong> ${results.MB} MB</p>
      <p><strong>Estimated CO2 Emissions:</strong> ${results.grams} g CO2</p>
      <p><strong>Explanation:</strong></p>
      <p>${explanation}</p>
      <br>
      <p>Thank you for visiting our website! 🌍</p>
    `;

    // Send email to user
    await transporter.sendMail({
      from:process.env.GMAIL_USER,
      to: email, // Receiver email
      subject: "Website Carbon Footprint Analysis",
      html: emailContent,
    });

    res.status(201).json({
      message: "Data saved and email sent successfully",
      explanation,
      savedResult,
    });
  } catch (err) {
    console.error("Error occurred:", err.message);
    res.status(500).json({
      error: "Failed to save data or send email",
      details: err.message,
    });
  }
});

// Save Audit Result
app.post("/api/save", async (req, res) => {
  const { name, email, url, results, deviceName } = req.body;

  if (!name || !email || !url || !results || !deviceName) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const newResult = new AuditResult({
      name,
      email,
      url,
      results,
      deviceName,
    });
    await newResult.save();
    res.status(201).json({ message: "Data saved successfully" });
  } catch (err) {
    console.error("Error occurred:", err.message);
    res
      .status(500)
      .json({ error: "Failed to save data", details: err.message });
  }
});

// Function to generate explanation based on CO2 emissions
const generateExplanation = (co2Value) => {
  if (co2Value <= 0) {
    return "This website has an extremely low carbon footprint.";
  } else if (co2Value <= 0.5) {
    return "This website has a very low carbon footprint.";
  } else if (co2Value <= 1) {
    return "This website's carbon footprint is low. Consider optimization.";
  } else if (co2Value <= 2) {
    return "This website has a moderate carbon footprint. Optimization is recommended.";
  } else {
    return "This website has a high carbon footprint. Strong optimization is advised.";
  }
};

// Start Server
if (process.env.NODE_ENV !== "production") {
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
}
module.exports = app; // Export app for Vercel

