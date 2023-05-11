const connection = require('../connection');


const insertQueries = [
  [
    `INSERT INTO roles (slug)
    VALUES
      ('ADMIN'),
      ('MANAGER'),
      ('PLAIN_USER')
      ;`,
    `INSERT INTO permissions (slug)
    VALUES
      ('CREATE_REALTIES'),
      ('ASSIGN_REALTIES_MANAGERS'),
      ('MANAGE_REALTIES'),
      ('LIST_ALL_REALTIES'),
      ('VALIDATE_MANAGER'),
      ('VALIDATE_PLAIN_USER')
    ;`,
    `INSERT INTO provinces (id, name)
    VALUES
      (2,'Albacete'),
      (3,'Alicante/Alacant'),
      (4,'Almería'),
      (1,'Araba/Álava'),
      (33,'Asturias'),
      (5,'Ávila'),
      (6,'Badajoz'),
      (7,'Balears, Illes'),
      (8,'Barcelona'),
      (48,'Bizkaia'),
      (9,'Burgos'),
      (10,'Cáceres'),
      (11,'Cádiz'),
      (39,'Cantabria'),
      (12,'Castellón/Castelló'),
      (51,'Ceuta'),
      (13,'Ciudad Real'),
      (14,'Córdoba'),
      (15,'Coruña, A'),
      (16,'Cuenca'),
      (20,'Gipuzkoa'),
      (17,'Girona'),
      (18,'Granada'),
      (19,'Guadalajara'),
      (21,'Huelva'),
      (22,'Huesca'),
      (23,'Jaén'),
      (24,'León'),
      (27,'Lugo'),
      (25,'Lleida'),
      (28,'Madrid'),
      (29,'Málaga'),
      (52,'Melilla'),
      (30,'Murcia'),
      (31,'Navarra'),
      (32,'Ourense'),
      (34,'Palencia'),
      (35,'Palmas, Las'),
      (36,'Pontevedra'),
      (26,'Rioja, La'),
      (37,'Salamanca'),
      (38,'Santa Cruz de Tenerife'),
      (40,'Segovia'),
      (41,'Sevilla'),
      (42,'Soria'),
      (43,'Tarragona'),
      (44,'Teruel'),
      (45,'Toledo'),
      (46,'Valencia/València'),
      (47,'Valladolid'),
      (49,'Zamora'),
      (50,'Zaragoza')
    ;`
  ],
  [
    `INSERT INTO roles_permissions (role_id, permission_id)
    VALUES
      (1, 1),
      (1, 2),
      (1, 3),
      (1, 4),
      (1, 5),
      (1, 6),
      (2, 1),
      (2, 3)
    ;`,
    `INSERT INTO realties(reference, street, house_number, city, province_name, postal_code, description, location) 
      VALUES (
        'xkfalksdjf',
        'Gran de Gràcia',
        141,
        'Barcelona',
        'Barcelona',
        08012,
        'Mi primer inmueble.',
        ST_GeomFromText('POINT(41.40243 2.15253)', 4326)
      ) 
    ;`
  ]
];

const insertRecords = async (client, insertQueries) => {
  insertQueries.map(async (subsetOfInsertQueries) => {
    await Promise.all(subsetOfInsertQueries.map(async (query) => {
      await client.query(query);
    }));
  });
}

(async () => {
  const client = await connection.pool.connect();
  try {
    await client.query('BEGIN');
    await insertRecords(client, insertQueries);
    await client.query('COMMIT');
    console.log('\nPopulated the database!\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n Coulnd\'t populate the database!\n');
    throw err;
  } finally {
    client.release();
    connection.pool.end();
  }
})().catch(err => console.error(err.stack));
