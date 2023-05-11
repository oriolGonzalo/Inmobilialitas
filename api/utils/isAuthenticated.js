const isUserLoggedIn = (session) => {
    return typeof session.userId !== 'undefined' || session.userId === null;
}

const isLoginUnnecessary = (controllerName, method) => {
    if (controllerName === 'auth' || (controllerName === 'password' && method === 'recover')) return true;

    return false;
}

module.exports = (req, res, next) => {
    const userIsLoggedIn = isUserLoggedIn(req.session);
    const loginIsUnnecessary = isLoginUnnecessary(req.params.controller, req.params.method);

    if (userIsLoggedIn || loginIsUnnecessary) return next();

    return res.status(401).send('You are not logged in. Please log in before trying to access this endpoint.');
}