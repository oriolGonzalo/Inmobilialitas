const updateQueryFromJsonText = (tableName, fieldsToUpdateAsJson) => {
    var text = `UPDATE ${tableName} SET `;
    var index = 1;

    for (const field in fieldsToUpdateAsJson) {
        text += field + ' = $' + index + ', ';
        index++;
    }
    return text = text.replace(/,\s*$/, "") + ' WHERE id = $' + index + ' RETURNING id';
}

const updateQueryFromJsonValues = (userId, fieldsToUpdateAsJson) => {
    var values = [];
    var index = 0;

    for (const field in fieldsToUpdateAsJson) {
        values.push(fieldsToUpdateAsJson[field]);
        index++;
    }
    values.push(userId);
    return values;
}

exports.updateQueryFromJson = (tableName, userId, fieldsToUpdateAsJson) => {
    return {
        text: updateQueryFromJsonText(tableName, fieldsToUpdateAsJson),
        values: updateQueryFromJsonValues(userId, fieldsToUpdateAsJson)
    }
}

const updateQueryFromRequestText = (tableName, req) => {
    var text = `UPDATE ${tableName} SET `;
    var index = 1;
    
    for (const el in req.body) {
        text += el + ' = $' + index + ', ';
        index++;
    }
    return text = text.replace(/,\s*$/, "") + ' WHERE id = $' + index + ' RETURNING id';
}

const updateQueryFromRequestValues = (req) => {
    const reqId = req.params.param;

    var values = [];
    var index = 0;

    for (const el in req.body) {
        values.push(req.body[el]);
        index++;
    }
    values.push(reqId);
    return values;
}

exports.updateQueryFromRequest = (tableName, req) => {
    return {
        text: updateQueryFromRequestText(tableName, req),
        values: updateQueryFromRequestValues(req)
    }
}

const createQueryFromRequestText = (tableName, reqElements) => {
    var text = `INSERT INTO ${tableName}(`;
    var restOfText = 'VALUES ('
    var index = 1;

    for (const el in reqElements) {
        if (el === 'password') {
            text += 'hashed_password' + ', ' + 'salt' + ', ';
            restOfText += '$' + index + ', ' + '$' + (index + 1) + ', ';
            index += 2
        } else {
            text += el + ', ';
            restOfText += '$' + index + ', ';
            index++;
        }
    }
    text = text.replace(/,\s*$/, ') ');
    restOfText = restOfText.replace(/,\s*$/, ')') + ' RETURNING id';

    return text + restOfText;
}

const createQueryFromRequestValues = (reqElements, hashedPassword, salt) => {
    var values = [];
    var index = 0;

    for (const el in reqElements) {
        if (el === 'password') {
            values.push(hashedPassword, salt);
        } else {
            values.push(reqElements[el]);
        }
        index++;
    }
    return values;
}

exports.createQueryFromRequest = (tableName, req, hashedPassword, salt) => {
    return {
        text: createQueryFromRequestText(tableName, req),
        values: createQueryFromRequestValues(req, hashedPassword, salt)
    }
}

const createQueryFromJsonText = (tableName, tableFieldsAsJson) => {
    var text = `INSERT INTO ${tableName}(`;
    var restOfText = 'VALUES ('
    var index = 1;
    
    for (const field in tableFieldsAsJson) {
        text += field + ', ';
        restOfText += '$' + index + ', ';
        index++;
    }
    text = text.replace(/,\s*$/, ') ');
    restOfText = restOfText.replace(/,\s*$/, ')') + ' RETURNING id';

    return text + restOfText;
}

const createQueryFromJsonValues = (tableFieldsAsJson) => {
    var values = [];
    var index = 0;

    for (const el in tableFieldsAsJson) {
        if (el === 'password') {
            values.push(hashedPassword, salt);
        } else {
            values.push(tableFieldsAsJson[el]);
        }
        index++;
    }
    return values;
}

exports.createQueryFromJson = (tableName, tableFieldsAsJson) => {
    return {
        text: createQueryFromJsonText(tableName, tableFieldsAsJson),
        values: createQueryFromJsonValues(tableFieldsAsJson)
    }
}

const createQueryFromRequestText_returnsRecord = (tableName, reqElements) => {
    var query = `INSERT INTO ${tableName}`;
    var fields = '(';
    var values = 'VALUES ('
    var index = 1;

    for (const field in reqElements) {
        if (field === 'password') {
            fields += 'hashed_password' + ', ' + 'salt' + ', ';
            values += '$' + index + ', ' + '$' + (index + 1) + ', ';
            index += 2
        } else {
            fields += field + ', ';
            values += '$' + index + ', ';
            index++;
        }
    }
    fields = fields.replace(/,\s*$/, ') ');
    const fieldsToReturn = fields.replace(/[{()}]/g, '').replace(/(hashed_password, salt,)/g, ''); // Mai retornarem ni hashed_password ni salt
    values = values.replace(/,\s*$/, ')');

    query += fields + values + ' RETURNING id, ' + fieldsToReturn;

    return query;
}

exports.createQueryFromRequest_returnsRecord = (tableName, req, hashedPassword, salt) => {
    return {
        text: createQueryFromRequestText_returnsRecord(tableName, req),
        values: createQueryFromRequestValues(req, hashedPassword, salt)
    }
}

const createQueryFromJsonText_returnsRecord = (tableName, tableFieldsAsJson) => {
    var query = `INSERT INTO ${tableName} `;
    var fields = '('
    var values = 'VALUES ('
    var index = 1;
    
    for (const field in tableFieldsAsJson) {
        fields += field + ', ';
        values += '$' + index + ', ';
        index++;
    }
    fields = fields.replace(/,\s*$/, ') ');
    const fieldsToReturn = fields.replace(/[{()}]/g, '');
    values = values.replace(/,\s*$/, ')');

    query += fields + values + ' RETURNING id, ' + fieldsToReturn;

    return query;
}

exports.createQueryFromJson_returnsRecord = (tableName, tableFieldsAsJson) => {
    return {
        text: createQueryFromJsonText_returnsRecord(tableName, tableFieldsAsJson),
        values: createQueryFromJsonValues(tableFieldsAsJson)
    }
}

const selectQueryFromJsonText = (tableName, tableFieldsAsJson) => {

}

const selectQueryFromJsonValues = (tableFieldsAsJson) => {

}