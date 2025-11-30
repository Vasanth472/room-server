const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ExpenseCommentSchema = new Schema({
  id: { type: String, required: true },
  authorId: { type: String },
  authorName: { type: String },
  authorPhone: { type: String },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  date: { type: Date, default: Date.now }
});

const ExpenseSchema = new Schema({
  amount: { type: Number, required: true },
  description: { type: String, default: '' },
  date: { type: Date, required: true },
  categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  categoryName: { type: String },
  memberId: { type: Schema.Types.ObjectId, ref: 'Member' },
  addedDate: { type: Date, default: Date.now },
  addedBy: { type: String },
  comments: [ExpenseCommentSchema]
});

// Optional link to a calendar entry when expense was created from a calendar item
ExpenseSchema.add({ calendarEntryId: { type: Schema.Types.ObjectId, ref: 'CalendarEntry' } });

module.exports = mongoose.model('Expense', ExpenseSchema);
