const express = require('express');
const router = express.Router();
const {isAuthenticated} = require('../middlewares/auth');
const { getUsers, sendMessage, getMessages, clearChat, searchUser, } = require("../controllers/message");

router.get("/users", getUsers);
router.post("/send/:id", isAuthenticated, sendMessage);
router.get("/:id", isAuthenticated, getMessages);
router.get("/clearChat/:receiverId", isAuthenticated, clearChat);
router.post("/searchUser/", searchUser);

module.exports = router;