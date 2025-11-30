const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SettingSchema = new Schema({
  key: { type: String, required: true, unique: true },
  value: { type: Schema.Types.Mixed },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Setting', SettingSchema);
