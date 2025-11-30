require('dotenv').config();
const mongoose = require('mongoose');
const Member = require('./models/Member');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/room_expense';

mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const members = await Member.find({}).lean();
    console.log('Members in database:');
    console.log(JSON.stringify(members, null, 2));
    
    mongoose.disconnect();
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
