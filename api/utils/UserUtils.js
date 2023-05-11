const dbConnectionLib = require('../database/queries/queryExecutor');

exports.findUserByEmail = async (email) => {
    const findUserText = 'SELECT * FROM users WHERE email = $1';
    const foundUser = await dbConnectionLib.query(findUserText, [email]);

    if (foundUser && Object.keys(foundUser).length > 0) return foundUser;

    return null;
}

exports.findUserByPasswordTokenIfNotExpired = async (resetPasswordToken) => {
    const findUserText = `SELECT * FROM users WHERE reset_password_token = $1 
    AND reset_password_expires > (now() at time zone 'utc') 
    `;
    const foundUser = await dbConnectionLib.query(findUserText, [resetPasswordToken]);

    if (foundUser && Object.keys(foundUser).length > 0) return foundUser;

    return null;
}

exports.findUserById = async (userId) => {
    const findUserText = 'SELECT * FROM users WHERE id = $1';
    const foundUser = await dbConnectionLib.query(findUserText, [userId]);

    if (foundUser && Object.keys(foundUser).length > 0) return foundUser;

    return null;
}

exports.isUserVerified = (user) => {
    if (user.status === 'Active') return true;

    return null;
}