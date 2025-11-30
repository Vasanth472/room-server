require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Member = require('./models/Member');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/room_expense';

mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('Connected to MongoDB');
    
    try {
      // Clear existing members
      await Member.deleteMany({});
      console.log('Cleared existing members');
      
      const adminPassword = await bcrypt.hash('admin123', 10);
      const userPassword = await bcrypt.hash('user123', 10);
      
      const members = [
        {
          name: 'Admin User',
          phone: '9000000001',
          passwordHash: adminPassword,
          isAdmin: true,
          isActive: true,
          addedDate: new Date()
        },
        {
          name: 'Test User 1',
          phone: '9000000002',
          passwordHash: userPassword,
          isAdmin: false,
          isActive: true,
          addedDate: new Date()
        },
        {
          name: 'Test User 2',
          phone: '9000000003',
          passwordHash: userPassword,
          isAdmin: false,
          isActive: true,
          addedDate: new Date()
        }
      ];
      
      await Member.insertMany(members);
      console.log('Test members created successfully');
      console.log('\nTest credentials:');
      console.log('  Admin: phone=9000000001, password=admin123');
      console.log('  User 1: phone=9000000002, password=user123');
      console.log('  User 2: phone=9000000003, password=user123');
      
      mongoose.disconnect();
      process.exit(0);
    } catch (err) {
      console.error('Error seeding members:', err);
      mongoose.disconnect();
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('MongoDB connection error', err);
    process.exit(1);
  });
