const dbConnectionLib = require('../database/queries/queryExecutor');

module.exports = async (permissionSlug, userId) => {
    const hasPermissionText = `
        SELECT 1 FROM vw_user_permissions
        WHERE permission_slug = $1
            AND user_id = $2
    `;
    const hasPermissionValues = [permissionSlug, userId];

    try {
        const hasPermissionResult = await dbConnectionLib.query(hasPermissionText, hasPermissionValues);

        if (hasPermissionResult && Object.keys(hasPermissionResult).length > 0) return true;        
    }
    catch (err) {
        console.error(err);
    }
    return false;
}
