const crypto = require('crypto');
var sendgrid = require('@sendgrid/mail');
const User = require('../utils/UserUtils');
const build = require('../database/queries/queryBuilder');
const dbConnectionLib = require('../database/queries/queryExecutor');

sendgrid.setApiKey(process.env['SENDGRID_API_KEY']);

const generatePasswordReset = async (userId) => {
    const reset_password_token = crypto.randomBytes(20).toString('hex');
    const userToUpdateText = `UPDATE users SET 
    reset_password_token = $1,
    reset_password_expires = ((now() + interval '1 hour') at time zone 'utc') 
    WHERE id = $2
    RETURNING id
    `;
    const updatedUser = await dbConnectionLib.query(userToUpdateText, [reset_password_token, userId]);

    if (updatedUser && Object.keys(updatedUser).length > 0) return reset_password_token;

    return null;
}

const sendPasswordRecoverEmail = async (user, newResetpasswordtoken) => {
    const link = 'http://localhost:9000/api/password/reset/' + newResetpasswordtoken;
    const msg = {
        to: user.email,
        from: process.env['EMAIL'],
        subject: 'Inmobilialitas password recover',
        text: 'Hello! Click the link below to recover the password of your inmobilialitas account.\r\n\r\n' + link,
        html: '<h3>Hello!</h3><p>Click the link below to recover the password of your inmobilialitas account.</p><p><a href="' + link + '">Inmobilialitas password recover</a></p>',
    };

    const sentEmail = await sendgrid.send(msg);
    const sentEmailStatusCode = sentEmail[0].statusCode;

    if (sentEmailStatusCode >= 200 && sentEmailStatusCode <= 299) return true;

    return null;
}

exports.recover = async (req, res) => {
    const foundUser = await User.findUserByEmail(req.body.email);

    if (foundUser) {
        const userIsVerified = User.isUserVerified(foundUser);

        if (userIsVerified) {
            const generatedPasswordReset = await generatePasswordReset(foundUser.id);

            if (generatedPasswordReset) {
                const newResetPasswordToken = generatedPasswordReset;
                const sentPasswordRecoverEmail = await sendPasswordRecoverEmail(foundUser, newResetPasswordToken);

                if (sentPasswordRecoverEmail) return res.status(200).send('A reset email has been sent to ' + foundUser.email + '.');
            }
            return res.status(500).send('Couln\'t process the recover of your password.')
        }
        return res.status(400).send('This account hasn\'t been verified. Please verify your account before attempting to recover your password.');
    }
    return res.status(401).send('The email address ' + req.body.email + ' is not associated with any account. Double-check your email address and try again.');
}

const resetGet = async (req, res) => {
    const reqToken = req.params.param;
    const foundUser = await User.findUserByPasswordTokenIfNotExpired(reqToken);

    if (foundUser) return res.status(200).send('This should be the password reset page.')

    return res.status(401).send('Password reset token is invalid or has expired.');
}

const resetPost = async (req, res) => {
    const reqToken = req.params.param;
    const foundUser = await User.findUserByPasswordTokenIfNotExpired(reqToken);

    if (foundUser) {
        const salt = crypto.randomBytes(16);
        const hashedPassword = crypto.pbkdf2Sync(req.body.password, salt, 310000, 32, 'sha256');

        if (hashedPassword instanceof Buffer) {
            const updatedUserPassword = await updateUserPassword(foundUser.id, hashedPassword, salt);

            if (updatedUserPassword) {
                const deletedPasswordResetFieldsFromUser = deletePasswordResetFieldsFromUser(foundUser.id);

                if (deletedPasswordResetFieldsFromUser) return res.status(200).send('Your password has been updated.');

                const madeResetPasswordTokenExpire = makeResetPasswordTokenExpire(foundUser.id);

                if (madeResetPasswordTokenExpire) return res.status(200).send('Your password has been updated.');
            }
        }
        return res.status(500).send('We were unable to reset your password. Please, try again later.');
    }
    return res.status(401).send('Password reset token is invalid or has expired.');
}

exports.reset = async (req, res) => {
    const requestType = Object.keys(req.route.methods)[0];
    const requestTypeIsDefined = req.route.methods[requestType];

    console.log(requestTypeIsDefined);
    console.log(requestType);

    if (requestTypeIsDefined) {
        switch (requestType) {
            case 'get':
                return await resetGet(req, res);
            case 'post':
                return await resetPost(req, res);
        }
    }
}

const updateUserPassword = async (userId, hashedPassword, salt) => {
    const fieldsToUpdate = {
        hashed_password: hashedPassword,
        salt: salt
    }
    const userToUpdate = build.updateQueryFromJson('users', userId, fieldsToUpdate);
    const updatedUser = await dbConnectionLib.query(userToUpdate.text, userToUpdate.values);

    if (updatedUser && Object.keys(updatedUser).length > 0) return true;

    return null;
}

const deletePasswordResetFieldsFromUser = async (userId) => {
    const PasswordResetFields = {
        reset_password_token: null,
        reset_password_expires: null
    }

    const userToUpdate = build.updateQueryFromJson('users', userId, PasswordResetFields);
    const updatedUser = await dbConnectionLib.query(userToUpdate.text, userToUpdate.values);

    if (updatedUser && Object.keys(updatedUser).length > 0) return true;

    return null;
}

const makeResetPasswordTokenExpire = async (userId) => {
    const makeConfirmationCodeExpireText = `UPDATE users SET 
    reset_password_expires = (now() at time zone 'utc'),
    id = $1
    RETURNING id
    `;
    const makeConfirmationCodeExpire = await dbConnectionLib.query(makeConfirmationCodeExpireText, [userId]);

    if (makeConfirmationCodeExpire && Object.keys(makeConfirmationCodeExpire).length > 0) return makeConfirmationCodeExpire;

    return null;
}