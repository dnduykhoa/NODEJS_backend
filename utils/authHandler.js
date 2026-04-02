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

module.exports = passport;
