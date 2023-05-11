const connection = require('../connection');

const viewsNames = [
    'vw_user_permissions',
    'vw_user_role',
    'vw_user_created_realties',
    'vw_user_assigned_realties',
    'vw_user_created_and_assigned_realties'
];

const tablesNames = [
    [
        'confirmation_codes',
        'users_roles',
        'users_created_realties',
        'users_assigned_realties',
        'users',
        'roles_permissions',
        'roles',
        'permissions',
        'images',
        'attached_documents',
        'realties',
        'session',
    ],
    [
        'provinces'
    ]
];

const dataTypesNames = [
    'status'
];

const dropViews = async (client, viewsNames) => {
    viewsNames.map(async (viewName) => {
        await client.query('DROP VIEW ' + viewName);
    });
}

const dropTables = async (client, tablesNames) => {
    tablesNames.map(async (subsetOftablesNames) => {
        await Promise.all(subsetOftablesNames.map(async (tableName) => {
            await client.query('DROP TABLE ' + tableName);
        }));
    });
}

const dropDataTypes = async (client, dataTypesNames) => {
    await Promise.all(dataTypesNames.map(async (dataTypeName) => {
        await client.query('DROP TYPE ' + dataTypeName);
    }));
}

const dropSchema = async (client, tablesNames, dataTypesNames) => {
    await dropViews(client, viewsNames);
    await dropTables(client, tablesNames);
    await dropDataTypes(client, dataTypesNames);
}

(async () => {
    const client = await connection.pool.connect();
    try {
        await client.query('BEGIN');
        await dropSchema(client, tablesNames, dataTypesNames);
        await client.query('COMMIT');
        console.log('\nDropped database schema!\n');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('\n Coulnd\'t drop database schema!\n');
        throw err;
    } finally {
        client.release();
        connection.pool.end();
    }
})().catch(e => console.error(e.stack));