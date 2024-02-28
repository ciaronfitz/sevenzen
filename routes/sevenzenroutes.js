const express = require('express');
const controller = require('./../controllers/szencontrollers');
const { isAuthenticated } = require('../middleware/auth');
const router = express.Router();

router.get('/', controller.getHome);
router.get('/log', isAuthenticated, controller.getLogger);
router.get('/history', isAuthenticated, controller.getMoodHistory);
router.get('/login' , controller.getLoginScreen);
router.get('/logout', controller.logout);
router.get('/register', controller.getRegistrationScreen);
router.get('/select/:id', isAuthenticated, controller.selectLog);
router.get('/delete/:id', isAuthenticated, controller.deleteMoodLog);
router.get('/chart', isAuthenticated, controller.getChart);

router.post('/log', controller.postNewMoodLog);
router.post('/edit/:id', controller.editMoodLog);
router.post('/login', controller.postLogin);
router.post('/register', controller.postregistration);

module.exports = router;