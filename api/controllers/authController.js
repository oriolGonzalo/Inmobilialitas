const passport = require('passport');
const LocalStrategy = require('passport-local');
const crypto = require('crypto');
var sendgrid = require('@sendgrid/mail');
const dbConnectionLib = require('../database/queries/queryExecutor');
const User = require('../utils/UserUtils');
const handle = require('../errors/errorHandling');
const build = require('../database/queries/queryBuilder');

sendgrid.setApiKey(process.env['SENDGRID_API_KEY']);

passport.use(new LocalStrategy(async function verify(username, password, cb) {
    try {
        const getUserByUsernameText = 'SELECT * FROM users WHERE username = $1';
        const getUserByUsernameValue = [username];

        const user = await dbConnectionLib.query(getUserByUsernameText, getUserByUsernameValue);

        if (!user) { return cb(null, false, { message: 'Incorrect username or password.' }); }

        crypto.pbkdf2(password, user.salt, 310000, 32, 'sha256', (err, hashedPassword) => {
            if (err) { return cb(err); }
            if (!crypto.timingSafeEqual(user.hashed_password, hashedPassword)) {
                return cb(null, false, { message: 'Incorrect username or password.' });
            }
            return cb(null, user);
        });
    } catch (err) {
        return cb(err, false);
    }
}));

passport.serializeUser(function (user, cb) {
    process.nextTick(function () {
        cb(null, { id: user.id, username: user.username });
    });
});

passport.deserializeUser(function (user, cb) {
    process.nextTick(function () {
        return cb(null, user);
    });
});

exports.login = async (req, res, next) => {
    passport.authenticate('local', (err, user, message) => {
        if (err) return res.status(500).send(err);

        if (!user && message) return res.status(422).send(message);

        if (user.status === 'Pending') return res.status(401).send('Your account needs to be verified before you\'re allowed to log in.');

        req.session.regenerate((err) => {
            if (err) return next(err);

            req.session.userId = user.id;

            req.session.save((err) => {
                if (err) return next(err);

                res.status(200).send({
                    username: user.username,
                    email: user.email
                });
            });
        });
    })(req, res);
}

exports.list = async (req, res) => {
    const listUsersText = 'SELECT * FROM users';

    try {
        const result = await dbConnectionLib.query(listUsersText);
        res.send(result);
    } catch (err) {
        handle.databaseError(err, res);
    }
}

const generateVerificationToken = async (userId) => {
    try {
        var createConfirmationCodeFields = {
            user_id: userId,
            token: crypto.randomBytes(20).toString('hex')
        };
        const createConfirmatinCodeQuery = build.createQueryFromJson_returnsRecord('confirmation_codes', createConfirmationCodeFields);
        const createdConfirmationCode = await dbConnectionLib.query(createConfirmatinCodeQuery.text, createConfirmatinCodeQuery.values);
        return createdConfirmationCode;
    } catch (err) {
        handle.databaseError(err);
    }
}

const sendEmail = (user, token) => {
    const link = 'http://localhost:9000/api/auth/verify/' + token;
    const msg = {
        to: user.email,
        from: process.env['EMAIL'],
        subject: 'Inmobilialitas account verification',
        text: 'Hello! Click the link below to verify your inmobilialitas account.\r\n\r\n' + link,
        html: '<h3>Hello!</h3><p>Click the link below to verify your inmobilialitas account.</p><p><a href="' + link + '">Inmobilialitas account verification</a></p>',
    };
    return sendgrid.send(msg);
}

const sendVerificationEmail = async (user) => {
    try {
        const createdConfirmationCode = await generateVerificationToken(user.id);
        const sentEmail = await sendEmail(user, createdConfirmationCode.token);
        const sentEmailStatusCode = sentEmail[0].statusCode;

        if (sentEmailStatusCode >= 200 && sentEmailStatusCode <= 299) return true;

        return null;
    } catch (err) {
        return err;
    }
}

exports.create = async (req, res, next) => {
    var salt = crypto.randomBytes(16);
    crypto.pbkdf2(req.body.password, salt, 310000, 32, 'sha256', async (err, hashedPassword) => {
        if (err) { return next(err); }

        try {
            const createUserQuery = build.createQueryFromRequest_returnsRecord('users', req.body, hashedPassword, salt);
            const createdUser = await dbConnectionLib.query(createUserQuery.text, createUserQuery.values);

            const sendEmailResult = await sendVerificationEmail(createdUser);

            if (sendEmailResult) {
                const createUserRoleFields = {
                    user_id: createdUser.id,
                    role_id: req.body.role_id
                };
                const createUserRoleQuery = build.createQueryFromJson_returnsRecord('users_roles', createUserRoleFields);
                const createdUserRole = await dbConnectionLib.query(createUserRoleQuery.text, createUserRoleQuery.values);

                if (createdUserRole) return res.status(200).send('An email with a verification link has been sent to ' + req.body.email);
            }
            return res.status(500).send('There was an error with the signup process.');

        } catch (err) {
            handle.databaseError(err, res);
        }
    });
}

const findConfirmationCodeByTokenIfNotExpired = async (token) => {
    const findConfirmationCodeText = `SELECT * FROM confirmation_codes WHERE token = $1
    AND token_expires > (now() at time zone 'utc')
    `;
    const foundConfirmationCode = await dbConnectionLib.query(findConfirmationCodeText, [token]);

    if (foundConfirmationCode && Object.keys(foundConfirmationCode).length > 0) return foundConfirmationCode;

    return null;
}

const verifyUser = async (userToBeVerifiedId) => {
    const userToUpdate = build.updateQueryFromJson('users', userToBeVerifiedId, { status: 'Active' });
    const updatedUser = await dbConnectionLib.query(userToUpdate.text, userToUpdate.values);

    if (updatedUser && Object.keys(updatedUser).length > 0) return true;

    return null;
}

const deleteConfirmationCodeByToken = async (token) => {
    const deleteConfirmationCodeText = 'DELETE FROM confirmation_codes WHERE token = $1 RETURNING *';
    const deletedConfirmationCode = await dbConnectionLib.query(deleteConfirmationCodeText, [token]);

    if (deletedConfirmationCode && Object.keys(deletedConfirmationCode).length > 0) return deletedConfirmationCode;

    return null;
}

const makeConfirmationCodeExpire = async (token) => {
    const makeConfirmationCodeExpireText = `UPDATE confirmation_codes SET 
    token_expires = (now() at time zone 'utc'),
    token = $1
    RETURNING id
    `;
    const makeConfirmationCodeExpire = await dbConnectionLib.query(makeConfirmationCodeExpireText, [token]);

    if (makeConfirmationCodeExpire && Object.keys(makeConfirmationCodeExpire).length > 0) return makeConfirmationCodeExpire;

    return null;
}

exports.verify = async (req, res) => {
    const reqToken = req.params.param;
    const foundConfirmationCode = await findConfirmationCodeByTokenIfNotExpired(reqToken);

    if (foundConfirmationCode) {
        const foundUser = await User.findUserById(foundConfirmationCode.user_id);

        if (foundUser) {
            const userIsVerified = User.isUserVerified(foundUser);

            if (userIsVerified) return res.status(400).send('This account has already been verified. Please log in.');

            const verifiedUser = await verifyUser(foundConfirmationCode.user_id);

            if (verifiedUser) {
                const deletedConfirmationCode = await deleteConfirmationCodeByToken(reqToken);

                if (deletedConfirmationCode) return res.status(200).send('Verified your account! You can now log in.');

                const madeConfirmationCodeExpire = await makeConfirmationCodeExpire(reqToken);

                if (madeConfirmationCodeExpire) return res.status(200).send('Verified your account! You can now log in.');
            }
            return res.status(500).send('We were unable to process the verification of your account.');
        }
        return res.status(400).send('We were unable to find a registered user for this token.');
    }
    return res.status(400).send('We were unable to find a valid token. Your token may have expired.');
}

const findConfirmationCodeByUserId = async (userId) => {
    const findConfirmationCodeText = 'SELECT * FROM confirmation_codes WHERE user_id = $1';
    const foundConfirmationCode = await dbConnectionLib.query(findConfirmationCodeText, [userId]);

    if (foundConfirmationCode && Object.keys(foundConfirmationCode).length > 0) return foundConfirmationCode;

    return null;
}

const deleteConfirmationCodeByUserId = async (userId) => {
    const deleteConfirmationCodeText = 'DELETE FROM confirmation_codes WHERE user_id = $1 RETURNING *';
    const deletedConfirmationCode = await dbConnectionLib.query(deleteConfirmationCodeText, [userId]);

    if (deletedConfirmationCode && Object.keys(deletedConfirmationCode).length > 0) return deletedConfirmationCode;

    return null;
}

const deleteConfirmationCodeIfExists = async (userId) => {
    const foundConfirmationCode = await findConfirmationCodeByUserId(userId);

    if (foundConfirmationCode) {

        const deletedConfirmationCode = await deleteConfirmationCodeByUserId(userId);

        if (deletedConfirmationCode) return true;

        return null;
    }
}

exports.resend = async (req, res) => {
    try {
        const foundUser = await User.findUserByEmail(req.body.email);

        if (foundUser) {
            const userIsVerified = User.isUserVerified(foundUser);

            if (userIsVerified) return res.status(400).send('This account has already been verified. Please log in.');

            await deleteConfirmationCodeIfExists(foundUser.id);

            const sendEmailResult = await sendVerificationEmail(foundUser)

            if (sendEmailResult) return res.status(401).send('An email with a new verification link has been sent to ' + req.body.email);

            return res.status(200).send('Couln\'t resend the verification email to ' + req.body.email);
        }
        return res.status(401).send('The email address ' + req.body.email + ' is not associated with any account. Double-check your email address and try again.');
    } catch (err) {
        handle.databaseError(err, res);
    }
}

exports.destroy = async (req, res) => {
    if (req.session.userId) {
        req.session.destroy(err => {
            if (err) return res.status(400).send('Unable to log out.');

            return res.send('Logout successful!');
        });
    } else {
        return res.end();
    }
}