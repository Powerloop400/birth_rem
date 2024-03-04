const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    username: String,
    email: String,
    dob: Date
}, { collection: 'new' });

const UserModel = mongoose.model('User', UserSchema);

module.exports = UserModel;
 