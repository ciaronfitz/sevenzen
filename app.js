const express = require('express');
const bcrypt = require('bcrypt');
const morgan = require('morgan');
const dotevn = require('dotenv').config({path: './config.env'});
const session = require('express-session');
const router = require('./routes/sevenzenroutes.js');
const path = require('path');

const app = express();

app.use(morgan('tiny'));
app.use(express.static(path.join(__dirname, '/public')));
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
}));
app.use('/', router);
app.set('view engine', 'ejs');

app.listen(process.env.PORT, (err) => {
    if (err) return console.log(err);
    console.log(`Listening on port ${process.env.PORT}`);
});