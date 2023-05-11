const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const randomString = require('randomstring');
const connection = require('../database/connection');

module.exports = {
    store: new pgSession({
        pool: connection.pool,
        tableName: 'session'
    }),
    name: 'SID',
    secret: randomString.generate({
        length: 14,
        charset: 'alphanumeric'
    }),
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 1000 * 60 * 60 * 2, 
        sameSite: true,
        secure: false 
    }
}