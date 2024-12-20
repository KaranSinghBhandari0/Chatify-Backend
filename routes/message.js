const express = require('express');
const router = express.Router();
const {isAuthenticated} = require('../middlewares/auth');
const { getUsers, sendMessage, getMessages, } = require("../controllers/message");

router.get("/users", getUsers);
router.post("/send/:id", isAuthenticated, sendMessage);
router.get("/:id", isAuthenticated, getMessages);

module.exports = router;