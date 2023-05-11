const dbConnectionLib = require('../database/queries/queryExecutor');

module.exports = async (userId) => {
    var queryResult;
    const userRoleQueryText = `
        SELECT role_slug FROM vw_user_role
        WHERE user_id = $1
    `;
    const userRoleQueryValues = [userId];

    try {
        queryResult = await dbConnectionLib.query(userRoleQueryText, userRoleQueryValues);
    }
    catch (err) {
        console.error(err);
    }
    if (queryResult && Object.keys(queryResult).length > 0) return queryResult.role_slug;        

    return false;
}