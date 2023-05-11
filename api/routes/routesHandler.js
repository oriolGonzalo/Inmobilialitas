const realtyController = require('../controllers/realtyController');
const authController = require('../controllers/authController');
const passwordController = require('../controllers/passwordController');

const swapMethodAndParamIfNeeded = (req) => {
    if (!isNaN(req.params.method)) {
        const param = req.params.method;

        req.params.method = req.params.param;
        req.params.param = param;
    }
}

const routesHandlerByMethod = async (req, res) => {
    swapMethodAndParamIfNeeded(req);

    const controllerName = req.params.controller;
    const method = req.params.method;

    const controllerAndMethodObject = 'var controllerAndMethod = ' + controllerName + 'Controller' + '.' + method + ';';
    eval(controllerAndMethodObject);

    return await controllerAndMethod(req, res);
}

const routesHandlerByRequestType = async (req, res) => {
    const controllerName = req.params.controller;

    const controllerObject = 'var controller = ' + controllerName + 'Controller;';
    eval(controllerObject);

    const requestType = Object.keys(req.route.methods)[0];
    const requestTypeIsDefined = req.route.methods[requestType];

    if (requestTypeIsDefined) {
        switch (requestType) {
            case 'get':
                return await controller.list(req, res);
            case 'delete':
                return await controller.destroy(req, res);
            case 'post':
                return await controller.create(req, res);
            case 'put':
                return await controller.update(req, res);
        }
    }
}

module.exports = async (req, res) => {
    if (req.params.method) {
        return await routesHandlerByMethod(req, res);
    }
    return await routesHandlerByRequestType(req, res);
}