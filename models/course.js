const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    name: { type: String, required: true },
    teacher: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true }
});

module.exports = mongoose.model("Course", courseSchema);
