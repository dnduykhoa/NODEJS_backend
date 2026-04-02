const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const userModel = require('../schemas/users');

// Cấu hình Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || '620629143754-fcghk6uf2mmr8h9offkf4g03i12kb5n9.apps.googleusercontent.com',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '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',
    callbackURL: '/auth/google/callback'
},
async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await userModel.findOne({ email: profile.emails[0].value });
        
        if (user) {
            return done(null, user);
        } else {
            const newUser = new userModel({
                username: profile.emails[0].value.split('@')[0],
                email: profile.emails[0].value,
                fullName: profile.displayName,
                avatarUrl: profile.photos[0].value,
                googleId: profile.id,
                role: '69a67e9e9ee1e4062fe99151',
                status: true,
                loginCount: 1
            });
            await newUser.save();
            return done(null, newUser);
        }
    } catch (err) {
        return done(err, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await userModel.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

let jwt = require('jsonwebtoken')
let userController = require('../controllers/users')

const checkLogin = async function (req, res, next) {
    let token
    if (req.cookies.token) {
        token = req.cookies.token
    } else {
        token = req.headers.authorization;
        if (!token || !token.startsWith("Bearer")) {
            res.status(403).send("ban chua dang nhap")
            return;
        }
        token = token.split(' ')[1];
    }
    let result = jwt.verify(token, 'secret');
    if (result && result.exp * 1000 > Date.now()) {
        req.userId = result.id;
        next();
    } else {
        res.status(403).send("ban chua dang nhap")
    }
}

const checkRole = function (...requiredRole) {
    return async function (req, res, next) {
        let userId = req.userId;
        let user = await userController.FindUserById(userId);
        let currentRole = user.role.name;
        if (requiredRole.includes(currentRole)) {
            next();
        } else {
            res.status(403).send({ message: "ban khong co quyen" });
        }
    }
}

module.exports = {
    passport,
    checkLogin,
    checkRole
}
