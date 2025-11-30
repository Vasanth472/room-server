const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// GET /api/settings/full-amount
router.get('/full-amount', verifyToken, async (req, res) => {
  try {
    const s = await Setting.findOne({ key: 'fullAmount' }).lean();
    const val = s && typeof s.value === 'number' ? s.value : 0;
    res.json({ fullAmount: val });
  } catch (err) {
    console.error('Failed to get fullAmount setting', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/settings/full-amount - admin only
router.put('/full-amount', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { fullAmount } = req.body;
    const parsed = Number(fullAmount) || 0;
    const updated = await Setting.findOneAndUpdate(
      { key: 'fullAmount' },
      { value: parsed, updatedAt: new Date() },
      { upsert: true, new: true }
    ).lean();
    res.json({ fullAmount: parsed });
  } catch (err) {
    console.error('Failed to set fullAmount', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
