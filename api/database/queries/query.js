const buildQuery = require('./newQueryBuilder');
const execQuery = require('./queryExecutor');

module.exports = async (instruction, tableName, fields = null, conditions = null) => {
    const builtQuery = buildQuery(instruction, tableName, fields = null, conditions = null);

    if (builtQuery) {
        const executedQuery = await execQuery.query(builtQuery.text, builtQuery.values); // Should be execQuery instead of execQuery.query

        if (executedQuery && Object.keys(executedQuery).length > 0) return executedQuery;
    }
    return null;
}