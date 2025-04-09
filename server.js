// Import necessary modules
import express from 'express';
import initialize from './app/app.js';

// Create an instance of Express application
const app= express();
const PORT = 3000;

// Initialize the Express application with middleware and routes
initialize(app);

// Start the Express server and listen for incoming requests on specified port
app.listen(PORT,() => console.log(`Server running on port ${PORT}`));
