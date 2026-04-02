const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const userModel = require('../schemas/users');
const config = require('./config');

async function buildUniqueUsername(baseUsername) {
    let normalized = (baseUsername || 'googleuser').toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!normalized) {
        normalized = 'googleuser';
    }

    let candidate = normalized;
    let counter = 1;
    while (await userModel.exists({ username: candidate })) {
        candidate = normalized + counter;
        counter += 1;
    }
    return candidate;
}

// Cấu hình Google Strategy
passport.use(new GoogleStrategy({
    clientID: config.googleClientId,
    clientSecret: config.googleClientSecret,
    callbackURL: config.googleCallbackUrl
},
async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await userModel.findOne({ email: profile.emails[0].value });
        
        if (user) {
            if (user.isDeleted || !user.status) {
                return done(new Error('Account is disabled'), null);
            }
            return done(null, user);
        } else {
            const username = await buildUniqueUsername(profile.emails[0].value.split('@')[0]);
            const newUser = new userModel({
                username: username,
                email: profile.emails[0].value,
                fullName: profile.displayName,
                avatarUrl: profile.photos[0].value,
                googleId: profile.id,
                role: config.defaultRoleId,
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
