const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MemberSchema = new Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  passwordHash: { type: String },
  isAdmin: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  addedDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Member', MemberSchema);
