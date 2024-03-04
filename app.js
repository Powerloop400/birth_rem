const express = require('express');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const path = require('path');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const UserModel = require('./db'); 
const app = express();
require('dotenv').config();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
mongoose.connect(process.env.MONGO_URI);

mongoose.connection.on('connected', () => {
    console.log('Connected to MongoDB');
});

app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'views')));


app.get('/', (req, res) => {
    res.render('signup');
});

app.get('/dashboard', async (req, res) => {
    try {
        const today = new Date();
        const users = await UserModel.find({ dob: today.toISOString().slice(0, 10) });
        let username = '';
        let email = '';
        let dob = '';
        let isBirthday = false;

        if (users.length > 0) {
            username = users[0].username;
            email = users[0].email;
            dob = new Date(users[0].dob);
            isBirthday = dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth();
        }

        res.render('dashboard', {
            username: username,
            email: email,
            dob: dob,
            isBirthday: isBirthday
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});



app.set('views', path.join(__dirname, 'views'));

app.post('/user', async (req, res) => {
    try {
        const { username, email, dob } = req.body;

        console.log(req.body);

        const newUser = new UserModel({
            username: username,
            email: email,
            dob: dob
        });
        await newUser.save();
        
        res.status(201);
        res.redirect('dashboard');
    } catch (err) {
        res.status(400).send(err.message);
    }
});



cron.schedule('0 7 * * *', async () => { 
    try {
        console.log('Cron job started at:', new Date());

        const today = new Date();
        const todayIsoString = today.toISOString().slice(0, 10); // Format date for MongoDB query

        // Fetch users with today's birthday
        const users = await UserModel.find({ dob: todayIsoString });

        if (users.length > 0) {
            console.log('Sending birthday emails to', users.length, 'users');

            const birthdayEmailTemplate = `
                Dear \${user.username},\n\n
                Happy Birthday! Wishing you a fantastic day filled with joy and happiness.\n\n
                Best regards,\n
                Your Birthday Reminder Team
            `;

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.GMAIL_EMAIL,
                    pass: process.env.GMAIL_PASSWORD
                }
            });

            for (const user of users) {
                const mailOptions = {
                    from: process.env.GMAIL_EMAIL,
                    to: user.email,
                    subject: 'Happy Birthday!',
                    text: birthdayEmailTemplate.replace('${user.username}', user.username)
                }; 

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.error('Error sending email to', user.email, error);
                    } else {
                        console.log('Email sent:', info.response);
                    }
                });
            }
        } else {
            console.log('No users found with birthdays today');
        }
    } catch (err) {
        console.error('Error in cron job:', err);
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
