const payoutService = require("../services/payoutService");

exports.createPayout = async (req, res) => {
  try {
    const newPayout = await payoutService.createPayout(req.body);
    res.status(201).json(newPayout);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
