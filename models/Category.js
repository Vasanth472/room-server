const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CategorySchema = new Schema({
  name: { type: String, required: true },
  color: { type: String, default: '#cccccc' },
  iconUrl: { type: String, default: '' },
  icon: { type: String, default: '' }, // Emoji or icon name
  allocatedAmount: { type: Number, default: 0 },
  createdBy: { type: String, default: 'system' },
  createdDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Category', CategorySchema);
