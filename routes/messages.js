let express = require('express');
let router = express.Router();
let mongoose = require('mongoose');
let messageModel = require('../schemas/messages');
let userModel = require('../schemas/users');
let { CheckLogin } = require('../utils/authHandler');
let { uploadFile } = require('../utils/uploadHandler');

router.get('/', CheckLogin, async function (req, res, next) {
    let user = req.user;
    let messages = await messageModel.find({
        $or: [
            { from: user._id },
            { to: user._id }
        ]
    }).sort({
        createdAt: -1
    });

    let result = [];
    let listUser = [];

    for (let i = 0; i < messages.length; i++) {
        let currentMessage = messages[i];
        let userId = user._id.toString();
        let otherUser = currentMessage.from.toString() == userId
            ? currentMessage.to.toString()
            : currentMessage.from.toString();

        if (!listUser.includes(otherUser)) {
            listUser.push(otherUser);
            result.push(currentMessage);
        }
    }

    result = await messageModel.populate(result, [
        { path: 'from', select: 'username email fullName avatarUrl' },
        { path: 'to', select: 'username email fullName avatarUrl' }
    ]);

    res.send(result);
});

router.get('/:userID', CheckLogin, async function (req, res, next) {
    let user = req.user;
    let userID = req.params.userID;

    if (!mongoose.Types.ObjectId.isValid(userID)) {
        res.status(400).send({ message: 'user id khong hop le' });
        return;
    }

    let getUser = await userModel.findOne({
        _id: userID,
        isDeleted: false
    });

    if (!getUser) {
        res.status(404).send({ message: 'user not found' });
        return;
    }

    let messages = await messageModel.find({
        $or: [
            {
                from: user._id,
                to: userID
            },
            {
                from: userID,
                to: user._id
            }
        ]
    }).sort({
        createdAt: 1
    }).populate('from').populate('to');

    res.send(messages);
});

router.post('/', CheckLogin, uploadFile.single('file'), async function (req, res, next) {
    let user = req.user;
    let { to, text } = req.body;

    if (!to) {
        res.status(400).send({ message: 'to khong duoc rong' });
        return;
    }

    if (!mongoose.Types.ObjectId.isValid(to)) {
        res.status(400).send({ message: 'user id khong hop le' });
        return;
    }

    let getUser = await userModel.findOne({
        _id: to,
        isDeleted: false
    });

    if (!getUser) {
        res.status(404).send({ message: 'user not found' });
        return;
    }

    let type = 'text';

    if (req.file) {
        type = 'file';
        text = req.file.path;
    }

    if (!text) {
        res.status(400).send({ message: 'noi dung khong duoc rong' });
        return;
    }

    let newMessage = new messageModel({
        from: user._id,
        to: to,
        messageContent: {
            type: type,
            text: text
        }
    });

    newMessage = await newMessage.save();
    newMessage = await newMessage.populate('from');
    newMessage = await newMessage.populate('to');

    res.send(newMessage);
});

module.exports = router;
