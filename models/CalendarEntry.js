const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CommentSchema = new Schema({
  id: { type: String, required: true },
  authorId: { type: String },
  authorName: { type: String },
  authorPhone: { type: String },
  text: { type: String, required: true },
  addedDate: { type: Date, default: Date.now },
  replies: [{
    id: { type: String, required: true },
    adminId: { type: String },
    adminName: { type: String },
    text: { type: String, required: true },
    addedDate: { type: Date, default: Date.now }
  }]
});

const CalendarEntrySchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  date: { type: Date, required: true },
  categoryId: { type: String },
  categoryName: { type: String },
  price: { type: Number, default: 0 },
  createdBy: { type: String, default: 'system' },
  addedDate: { type: Date, default: Date.now },
  comments: [CommentSchema]
});

module.exports = mongoose.model('CalendarEntry', CalendarEntrySchema);
