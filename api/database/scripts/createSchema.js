const connection = require('../connection');

const queries = [
    [
        `CREATE TYPE status AS ENUM (
            'Pending', 
            'Active'
        );`
    ],
    [
        `CREATE TABLE IF NOT EXISTS roles
        (
            id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            slug VARCHAR(60) UNIQUE NOT NULL,
            created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE TABLE IF NOT EXISTS permissions
        (
            id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            slug VARCHAR(60) UNIQUE NOT NULL,
            created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE TABLE IF NOT EXISTS session (
            "sid" varchar NOT NULL COLLATE "default",
              "sess" json NOT NULL,
              "expire" timestamp(6) NOT NULL
          )
          WITH (OIDS=FALSE);
          
          ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
          
          CREATE INDEX "IDX_session_expire" ON "session" ("expire")
          ;`,
        `CREATE TABLE IF NOT EXISTS provinces (
            id SMALLINT UNIQUE NOT NULL,
            name VARCHAR(30) UNIQUE NOT NULL,
            CONSTRAINT pk_provinces
                PRIMARY KEY(id) 
        );`
    ],
    [
        `CREATE TABLE IF NOT EXISTS users (
            id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            username VARCHAR(100) UNIQUE NOT NULL,
            hashed_password BYTEA NOT NULL,
            salt BYTEA NOT NULL,
            name VARCHAR(100) NOT NULL, 
            surname VARCHAR(100) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            role_id BIGINT NOT NULL,
            status status NOT NULL DEFAULT 'Pending',
            reset_password_token VARCHAR(100) NULL,
            reset_password_expires TIMESTAMP without time zone NULL,
            CONSTRAINT fk_users_role_id
                FOREIGN KEY (role_id)
                    REFERENCES roles (id) MATCH SIMPLE
                    ON UPDATE NO ACTION
                    ON DELETE CASCADE
        );`,
        `CREATE TABLE IF NOT EXISTS confirmation_codes (
            id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            user_id int NOT NULL,
            token VARCHAR(100) NOT NULL,
            token_expires TIMESTAMP without time zone default ((NOW() + interval '1 hour') at time zone 'utc'),
            CONSTRAINT fk_confirmation_codes_user_id
                FOREIGN KEY (user_id) 
                    REFERENCES users(id)
        );`,
        `CREATE TABLE IF NOT EXISTS users_roles (
            id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            user_id BIGINT NOT NULL,
            role_id BIGINT NOT NULL,
            created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_users_roles_user_id 
                FOREIGN KEY (user_id)
                    REFERENCES users (id) MATCH SIMPLE
                    ON UPDATE NO ACTION
                    ON DELETE CASCADE,
            CONSTRAINT fk_users_roles_role_id 
                FOREIGN KEY (role_id)
                    REFERENCES roles (id) MATCH SIMPLE
                    ON UPDATE NO ACTION
                    ON DELETE CASCADE
        );`,
        `CREATE TABLE IF NOT EXISTS roles_permissions (
            role_id BIGINT NOT NULL,
            permission_id BIGINT NOT NULL,
            updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT pk_role_permissions 
                PRIMARY KEY (role_id, permission_id),
            CONSTRAINT fk_roles_permissions_permission 
                FOREIGN KEY (permission_id)
                    REFERENCES permissions (id) MATCH SIMPLE
                    ON UPDATE NO ACTION
                    ON DELETE CASCADE,
            CONSTRAINT fk_roles_permissions_role 
                FOREIGN KEY (role_id)
                    REFERENCES roles (id) MATCH SIMPLE
                    ON UPDATE NO ACTION
                    ON DELETE CASCADE
       );`,
        `CREATE TABLE IF NOT EXISTS realties (
            id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            reference VARCHAR(100) UNIQUE NOT NULL,
            street VARCHAR(100) NOT NULL,
            house_number SMALLINT NOT NULL,
            city VARCHAR(100) NOT NULL,
            province_name VARCHAR(30) NOT NULL,
            postal_code SMALLINT NOT NULL,
            description VARCHAR(100) NOT NULL,
            CONSTRAINT fk_province
                FOREIGN KEY (province_name) 
                    REFERENCES provinces(name)
        );
        SELECT AddGeometryColumn('realties','location','4326','POINT',2)
        ;`
    ],
    [
        `CREATE TABLE IF NOT EXISTS users_created_realties (
            id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            user_id int NOT NULL,
            realty_id int NOT NULL,
            CONSTRAINT fk_user
                FOREIGN KEY (user_id) 
                    REFERENCES users(id),
            CONSTRAINT fk_realty
                FOREIGN KEY (realty_id) 
                    REFERENCES realties(id)
        );`,
        `CREATE TABLE IF NOT EXISTS users_assigned_realties (
            id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            user_id int NOT NULL,
            realty_id int NOT NULL,
            CONSTRAINT fk_user
                FOREIGN KEY (user_id) 
                    REFERENCES users(id),
            CONSTRAINT fk_realty
                FOREIGN KEY (realty_id) 
                    REFERENCES realties(id)
        );`,
        `CREATE TABLE IF NOT EXISTS images (
            id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            realty_id int NOT NULL,
            filename TEXT UNIQUE NOT NULL,
            filepath TEXT NOT NULL,
            mimetype TEXT NOT NULL,
            size BIGINT NOT NULL,
            CONSTRAINT fk_realty
                FOREIGN KEY (realty_id) 
                    REFERENCES realties(id)
        );`,
        `CREATE TABLE IF NOT EXISTS attached_documents (
            id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            realty_id int NOT NULL,
            filename TEXT UNIQUE NOT NULL,
            filepath TEXT NOT NULL,
            mimetype TEXT NOT NULL,
            size BIGINT NOT NULL,
            CONSTRAINT fk_realty
                FOREIGN KEY (realty_id) 
                    REFERENCES realties(id)
        );`
    ],
    [
        `CREATE VIEW vw_user_permissions AS
            SELECT 
                A.user_id, 
                C.slug as permission_slug
            FROM users_roles AS A
            LEFT JOIN roles_permissions AS B 
            ON A.role_id = B.role_id
            LEFT JOIN permissions AS C 
            ON B.permission_id = C.id
        ;`,
        `CREATE VIEW vw_user_role AS
            SELECT 
                A.user_id,
                B.slug as role_slug
            FROM users_roles AS A
            LEFT JOIN roles AS B 
            ON A.role_id = B.id
        ;`,
        `CREATE VIEW vw_user_created_realties AS
            SELECT 
                A.id, 
                A.reference, 
                A.street, 
                A.house_number, 
                A.city,
                A.province_name,
                A.postal_code,
                A.description,
                A.location,
                B.user_id
            FROM realties AS A
            LEFT JOIN users_created_realties AS B 
            ON A.id = B.realty_id
        ;`,
        `CREATE VIEW vw_user_assigned_realties AS
            SELECT 
                A.id, 
                A.reference, 
                A.street, 
                A.house_number, 
                A.city,
                A.province_name,
                A.postal_code,
                A.description,
                A.location,
                B.user_id
            FROM realties AS A
            LEFT JOIN users_assigned_realties AS B 
            ON A.id = B.realty_id
        ;`,
        `CREATE VIEW vw_user_created_and_assigned_realties AS
            SELECT 
                A.id, 
                A.reference, 
                A.street, 
                A.house_number, 
                A.city,
                A.province_name,
                A.postal_code,
                A.description,
                A.location,
                B.user_id AS created_user_id,
                C.user_id AS assigned_user_id
            FROM realties AS A
            LEFT JOIN users_created_realties AS B 
            ON A.id = B.realty_id
            LEFT JOIN users_assigned_realties AS C 
            ON A.id = C.realty_id
        ;`
    ]
];

const issueQueries = async (client, queries) => {
    queries.map(async (subsetOfQueries) => {
        await Promise.all(subsetOfQueries.map(async (query) => {
            await client.query(query);
        }));
    });
}

(async () => {
    const client = await connection.pool.connect();
    try {
        await client.query('BEGIN');
        await issueQueries(client, queries);
        await client.query('COMMIT');
        console.log('\nCreated database schema!\n');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('\nCouldn\'t create database schema!\n');
        throw err;
    } finally {
        client.release();
        connection.pool.end();
    }
})()