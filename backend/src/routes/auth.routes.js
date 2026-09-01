const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

// POST /api/auth/login    { usuario, password }
router.post('/login', authController.login);

// POST /api/auth/logout
router.post('/logout', authController.logout);

// GET /api/auth/me   (requiere sesión)
router.get('/me', requireAuth, authController.me);

module.exports = router;
