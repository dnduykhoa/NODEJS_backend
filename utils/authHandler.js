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

module.exports = passport;
