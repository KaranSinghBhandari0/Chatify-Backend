require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const connectDB = require('./connectDB');
const cors = require('cors');

const { app, server } = require('./socket');

app.use(
	cors({
	  origin: ['https://chatify-by-karan.vercel.app'],
	  method: ["GET", "POST", "DELETE", "PUT"],
	  credentials: true,
	})
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
	console.log("Listening on port " + PORT);
	connectDB();
});

app.get('/', (req, res) => {
    res.send('this is root');
});

// auth routes
app.use("/auth", require('./routes/auth'));

// message routes
app.use("/messages", require('./routes/message'));