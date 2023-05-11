const insertQueryRequiredParams = () => {
    // return true if the required parameters are defined
    // return null otherwise
}

const insertQueryBuilder = (tableName, fields, conditions) => {

}

module.exports = async (instruction, tableName, fields = null, conditions = null) => {
    switch (instruction) {
        case 'INSERT':
            const insertQueryRequiredParams = insertQueryRequiredParams;
            if (insertQueryRequiredParams) return insertQueryBuilder(tableName, fields, conditions);
            return null;
        case 'UPDATE':
            break;
        case 'SELECT':
            break;
    }
}