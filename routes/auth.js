const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Member = require('../models/Member');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_this';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { phone, password } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone required' });

  try {
    const member = await Member.findOne({ phone }).lean();
    if (!member) return res.status(401).json({ error: 'Phone number not registered.', code: 'MEMBER_NOT_FOUND' });

    if (member.passwordHash) {
      const ok = await bcrypt.compare(password || '', member.passwordHash);
      if (!ok) return res.status(401).json({ error: 'Wrong password. Please try again.', code: 'WRONG_PASSWORD' });
    } else {
      // No password set: reject by default (encourage admin to set passwords)
      return res.status(401).json({ error: 'Password not set for this account. Contact admin.', code: 'PASSWORD_NOT_SET' });
    }

    const token = jwt.sign({ id: member._id, phone: member.phone, isAdmin: member.isAdmin }, JWT_SECRET, { expiresIn: '7d' });
    // Do not return passwordHash
    const safe = { id: member._id.toString(), name: member.name, phone: member.phone, isAdmin: member.isAdmin, addedDate: member.addedDate };
    return res.json({ success: true, member: safe, token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
