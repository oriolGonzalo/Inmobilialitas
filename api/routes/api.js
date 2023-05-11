var express = require("express");
var router = express.Router();
const routesHandler = require('./routesHandler');
const isRequestAuthenticated = require('../utils/isAuthenticated');

/* API ROUTES */

/* GET */
router.get('/:controller', isRequestAuthenticated, routesHandler);
router.get('/:controller/:method', isRequestAuthenticated, routesHandler);
router.get('/:controller/:method/:param', isRequestAuthenticated, routesHandler);
router.get('/:controller/:param/:method/:param_1', isRequestAuthenticated, routesHandler);

/* DELETE */
router.delete('/:controller', routesHandler);
router.delete('/:controller/:param', isRequestAuthenticated, routesHandler);

/* CREATE */
router.post('/:controller', isRequestAuthenticated, routesHandler);
router.post('/:controller/:method', isRequestAuthenticated, routesHandler);
router.post('/:controller/:method/:param', isRequestAuthenticated, routesHandler);

/* UPDATE */
router.put('/:controller/:param', isRequestAuthenticated, routesHandler);

module.exports = router;
