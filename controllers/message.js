const User = require("../models/user.js");
const Message = require("../models/message.js");
const {cloudinary} = require("../cloudConfig.js");
const { getReceiverSocketId, io } = require('../socket.js')

// finding all users
const getUsers = async (req, res) => {
    try {
        const allUsers = await User.find().select("-password");

        res.status(200).json(allUsers);
    } catch (error) {
        console.error("Error in finding Users: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

// sending message
const sendMessage = async (req, res) => {
    try {
        const { text, image } = req.body;
        const { id } = req.params;
        const receiverId = id;
        const senderId = req.user._id;

        let imageUrl;
        if(image) {
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image: imageUrl,
        });
        await newMessage.save();

        // real time messaging to receiver
        const receiverSocketId = getReceiverSocketId(receiverId);
        if(receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", newMessage);
        }

        res.status(200).json(newMessage);
    } catch (error) {
        console.log("Error in sending Message", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

// finding all messages related for currUser
const getMessages = async (req, res) => {
    try {
        const { id: userToChatId } = req.params;
        const myId = req.user._id;

        // all messages where i am sender or receiver
        const messages = await Message.find({
            $or: [
            { senderId: myId, receiverId: userToChatId },
            { senderId: userToChatId, receiverId: myId },
        ],
        });

        res.status(200).json(messages);
    } catch (error) {
        console.log("Error in getMessages controller: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = {getUsers, getMessages, sendMessage}