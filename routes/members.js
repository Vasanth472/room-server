const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Member = require('../models/Member');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// GET /api/members
// GET /api/members - list active members (authenticated)
router.get('/', verifyToken, async (req, res) => {
  try {
    const members = await Member.find({ isActive: true }).lean();
    const safe = members.map(m => ({ id: m._id.toString(), name: m.name, phone: m.phone, isAdmin: m.isAdmin, addedDate: m.addedDate }));
    res.json(safe);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/members - create member
// POST /api/members - create member (admin only)
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  const { name, phone, password, isAdmin } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Name and phone required' });
  try {
    const existing = await Member.findOne({ phone });
    if (existing) return res.status(400).json({ error: 'Member already exists' });

    const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;
    const member = new Member({ name, phone, passwordHash, isAdmin: !!isAdmin });
    await member.save();
    const safe = { id: member._id.toString(), name: member.name, phone: member.phone, isAdmin: member.isAdmin, addedDate: member.addedDate };
    res.json(safe);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/members/:id - update member (admin only)
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    if (updates.password) {
      updates.passwordHash = await bcrypt.hash(updates.password, 10);
      delete updates.password;
    }
    const member = await Member.findByIdAndUpdate(id, updates, { new: true }).lean();
    if (!member) return res.status(404).json({ error: 'Member not found' });
    const safe = { id: member._id.toString(), name: member.name, phone: member.phone, isAdmin: member.isAdmin, addedDate: member.addedDate };
    res.json(safe);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/members/:id - soft-delete member (admin only)
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const member = await Member.findById(id);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    member.isActive = false; // soft delete
    await member.save();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/members/:id/permanent - permanent delete from database (admin only)
router.delete('/:id/permanent', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const member = await Member.findById(id);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    await Member.deleteOne({ _id: id });
    res.json({ success: true, message: 'Member permanently deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
