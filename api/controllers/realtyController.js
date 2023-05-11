const fs = require('fs');
const formidable = require('formidable');
const fetch = require('node-fetch');
const dbConnectionLib = require('../database/queries/queryExecutor');
const handle = require('../errors/errorHandling');
const build = require('../database/queries/queryBuilder');
const hasPermissionTo = require('../utils/hasPermission');
const userRole = require('../utils/userRole');
require('dotenv').config({ path: __dirname + '/../config/.env' });

const listAllRealties = async (req, res) => {
    const listPropertyText = 'SELECT * FROM realties;';

    try {
        const result = await dbConnectionLib.query(listPropertyText);
        res.send(result);
    } catch (err) {
        handle.databaseError(err, res);
    }
}

const listCreatedAndAssignedRealties = async (req, res) => {
    const listAssignedRealtiesText = `SELECT * FROM vw_user_created_and_assigned_realties WHERE 
    COALESCE (created_user_id = $1, assigned_user_id = $1);`;
    const listAssignedRealtiesValues = [req.session.userId];

    try {
        const result = await dbConnectionLib.query(listAssignedRealtiesText, listAssignedRealtiesValues);
        res.send(result);
    } catch (err) {
        handle.databaseError(err, res);
    }
}

const listCreatedRealties = async (req, res) => {
    const listCreatedRealtiesText = `SELECT * FROM vw_user_created_realties WHERE 
                                        user_id = $1;`;
    const listCreatedRealtiesValues = [req.session.userId];

    try {
        const result = await dbConnectionLib.query(listCreatedRealtiesText, listCreatedRealtiesValues);
        res.send(result);
    } catch (err) {
        handle.databaseError(err, res);
    }
}

const listAssignedRealties = async (req, res) => {
    const listAssignedRealtiesText = `SELECT * FROM vw_user_assigned_realties WHERE 
                                        user_id = $1;`;
    const listAssignedRealtiesValues = [req.session.userId];

    try {
        const result = await dbConnectionLib.query(listAssignedRealtiesText, listAssignedRealtiesValues);
        res.send(result);
    } catch (err) {
        handle.databaseError(err, res);
    }
}

const listPermittedRealties = async (req, res) => {
    const requestingUserRole = await userRole(req.session.userId)

    switch (requestingUserRole) {
        case 'MANAGER':
            return listCreatedAndAssignedRealties(req, res);
        case 'PLAIN_USER':
            return listCreatedRealties(req, res);
    }
    return res.status(500).send('Couldn\'t list realties.');
}

exports.list = async (req, res) => {
    const userCanListAllRealties = await hasPermissionTo('LIST_ALL_REALTIES', req.session.userId);

    if (userCanListAllRealties) {
        return listAllRealties(req, res);
    }
    return listPermittedRealties(req, res);
}

const isRealtyCurrentlyBeingManaged = async (realtyId) => {
    const assignRealtyQueryText = `SELECT * FROM users_assigned_realties WHERE realty_id = $1;`;
    const assignRealtyQueryValue = [realtyId];

    const assignedRealty = await dbConnectionLib.query(assignRealtyQueryText, assignRealtyQueryValue);

    if (assignedRealty && Object.keys(assignedRealty).length > 0) return true;

    return false;
}

const removeCurrentManager = async (realtyId) => {
    const removeCurrentAssignmentQueryText = `DELETE FROM users_assigned_realties WHERE realty_id = $1 RETURNING id;`;
    const removeCurrentAssignmentQueryValue = [realtyId];

    const removedCurrentAssignment = await dbConnectionLib.query(removeCurrentAssignmentQueryText, removeCurrentAssignmentQueryValue);

    if (removedCurrentAssignment && Object.keys(removedCurrentAssignment).length > 0) return true;

    return false;
}

const removeCurrentManagerIfExisting = async (realtyId) => {
    const realtyIsCurrentlyBeingManaged = await isRealtyCurrentlyBeingManaged(realtyId);

    if (realtyIsCurrentlyBeingManaged) {
        const removedCurrentManager = await removeCurrentManager(realtyId);

        if (removedCurrentManager) return true;

        return false;
    }
    return true;
}

const assignRealtyManager = async (targetUserId, realtyId) => {
    const assignRealtyQueryText = `INSERT INTO users_assigned_realties (user_id, realty_id)
                                        VALUES (
                                            $1,
                                            $2
                                        )
                                    RETURNING id;
                                    ;`;
    const assignRealtyQueryValue = [targetUserId, realtyId];

    const assignedRealty = await dbConnectionLib.query(assignRealtyQueryText, assignRealtyQueryValue);

    if (assignedRealty && Object.keys(assignedRealty).length > 0) return true;

    return false;
}

exports.assign_manager = async (req, res) => {
    const requestingUserId = req.session.userId;
    const requestingUserCanAssignManager = await hasPermissionTo('ASSIGN_REALTIES_MANAGERS', requestingUserId);

    if (requestingUserCanAssignManager) {
        const targetManagerId = req.body.userId;
        const targetManagerCanManageRealties = await hasPermissionTo('MANAGE_REALTIES', targetManagerId);

        if (targetManagerCanManageRealties) {
            const realtyId = req.body.realtyId;
            const removedPreviousManagerIfItExisted = await removeCurrentManagerIfExisting(realtyId);

            if (removedPreviousManagerIfItExisted) {
                const assignedRealtyManager = assignRealtyManager(targetManagerId, realtyId);

                if (assignedRealtyManager) return res.status(200).send(assignedRealtyManager);
            }
            return res.status(500).send('Couldn\'t assign realty.');
        }
        return res.status(401).send('The target user doesn\'t exist or doesn\'t have permission to manage realties.');
    }
    return res.status(401).send('You don\'t have permission to assign realties.');
}

const obtainRealtyLocation = async (street, houseNumber, city, postalCode) => {
    try {
        const response = await fetch(`https://geocode.search.hereapi.com/v1/geocode?qq=street=${street};houseNumber=${houseNumber};city=${city};postalCode=${postalCode}&apiKey=${process.env.HERE_WEGO_MAPS_API_KEY}`);
        const data = await response.json();

        if (data) return data.items[0].position;

        return new Error('Couln\'t obtain the realty\'s location.');
    }
    catch (err) {
        console.error(err.stack);
    }
}

exports.create = async (req, res) => {
    const userCanCreateRealty = await hasPermissionTo('CREATE_REALTIES', req.session.userId);

    if (userCanCreateRealty) {
        const location = await obtainRealtyLocation(req.body.street, req.body.house_number, req.body.city, req.body.postal_code);

        const query = `WITH data(reference, street, house_number, city, province_name, postal_code, description, location) AS (
                            VALUES (                           
                                '${req.body.reference}', 
                                '${req.body.street}', 
                                ${req.body.house_number}, 
                                '${req.body.city}', 
                                '${req.body.province}', 
                                ${req.body.postal_code}, 
                                '${req.body.description}', 
                                ST_GeomFromText('POINT(${location.lat} ${location.lng})', 4326)                
                            )
                        )
                        , realties_insert AS (
                            INSERT INTO realties (reference, street, house_number, city, province_name, postal_code, description, location)
                            SELECT reference, street, house_number, city, province_name, postal_code, description, location          -- DISTINCT? see below
                            FROM   data
                            ON     CONFLICT DO NOTHING 
                            RETURNING reference, street, house_number, city, province_name, postal_code, description, location, id AS realty_id
                            )
                        INSERT INTO users_created_realties (user_id, realty_id)
                        SELECT ${req.session.userId}, realties_insert.realty_id
                        FROM   data
                        JOIN   realties_insert USING (reference, street, house_number, city, province_name, postal_code, description, location)
                        RETURNING id AS users_realties_id;`;
        var result;

        try {
            result = await dbConnectionLib.query(query);
        }
        catch (err) {
            console.error(err.stack);
        }
        if (result && Object.keys(result).length > 0) return res.status(200).send(result);

        return res.status(500).send('Couldn\'t upload the realty.');
    }
    return res.status(401).send('You don\'t have permission to upload a realty.');
}

exports.update = async (req, res) => {
    const updatePropertyQuery = build.updateQueryFromRequest('realties', req);

    try {
        const result = await dbConnectionLib.query(updatePropertyQuery.text, updatePropertyQuery.values);
        res.send(result);
    } catch (err) {
        handle.databaseError(err, res);
    }
}

exports.destroy = async (req, res) => {
    const reqId = req.params.param;
    const destroyPropertyText = 'DELETE FROM realties WHERE id = $1 RETURNING id';
    const desctroyPropertyValue = [reqId];

    try {
        const result = await dbConnectionLib.query(destroyPropertyText, desctroyPropertyValue);
        res.send(result);
    } catch (err) {
        handle.databaseError(err, res);
    }
}

exports.image = async (req, res) => {
    const realtyId = req.params.param;
    const filename = req.params.param_1;
    const getImageByFilenameText = 'SELECT * FROM images WHERE realty_id = $1 AND filename = $2';
    const getImageByFilenameValue = [realtyId, filename];

    const image = await dbConnectionLib.query(getImageByFilenameText, getImageByFilenameValue);

    if (image && Object.keys(image).length > 0) {
        if (fs.existsSync(image.filepath)) {
            return res.status(200).type(image.mimetype).sendFile(image.filepath);
        }
    }
    return res.status(500).send('Couldn\'t find the image.');
}

const obtainImagesFilenames = (images) => {
    var filenames = [];

    images.forEach(image => {
        if (fs.existsSync(image.filepath)) filenames.push(image.filename);
    });
    return filenames;
}

const formImagesUrls = (realtyId, images) => {
    var filenames = obtainImagesFilenames(images);
    var urls = [];

    if (filenames && Object.keys(filenames).length > 0) {
        filenames.forEach(filename => {
            urls.push(process.env.WEB_ADDRESS + '/api/realty/' + realtyId + '/image' + '/' + filename);
        });
    }
    return urls;
}

exports.images = async (req, res) => {
    const realtyId = req.params.param;
    const getImagesByRealtyIdText = 'SELECT * FROM images WHERE realty_id = $1';
    const getImagesByRealtyIdValue = [realtyId];

    const images = await dbConnectionLib.query(getImagesByRealtyIdText, getImagesByRealtyIdValue);

    if (images && Object.keys(images).length > 0) {
        var imagesUrls = formImagesUrls(realtyId, images);

        if (imagesUrls && Object.keys(imagesUrls).length > 0) return res.status(200).send(imagesUrls);
    }
    return res.status(500).send('Couldn\'t find images related to this realty.');
}

const removeFileFromSystem = async (filepath) => {
    try {
        fs.unlinkSync(filepath);
    }
    catch (err) {
        console.error(err.stack);
    }
}

const storeFileInfoToDb = async (targeDbTable, realtyId, file) => {
    const uploadFileFields = {
        realty_id: realtyId,
        filename: file.newFilename,
        filepath: file.filepath,
        mimetype: file.mimetype,
        size: file.size,
    }
    try {
        const uploadFileQuery = build.createQueryFromJson(targeDbTable, uploadFileFields);
        const storedFileInfoToDb = await dbConnectionLib.query(uploadFileQuery.text, uploadFileQuery.values);

        if (typeof storedFileInfoToDb === 'undefined') return false;

        return true;
    }
    catch (err) {
        console.error(err.stack);
        return false;
    }
}

const isThereOnlyOneFile = (filesByFileType) => {
    return typeof filesByFileType.length === 'undefined';
}

const getFile = (files) => {
    const thereIsOnlyOneFile = isThereOnlyOneFile(files);

    if (thereIsOnlyOneFile) return files;

    return files[i];
}

const storeFilesInfoToDb = async (targeDbTable, realtyId, files) => {
    var storedAllInfoToDb = true;

    for (i = 0; i === 0 || i < files.length; i++) {
        const file = getFile(files);
        const storedDocumentInfoToDb = await storeFileInfoToDb(targeDbTable, realtyId, file);

        if (!storedDocumentInfoToDb) {
            storedAllInfoToDb = false;
            removeFileFromSystem(files[i].filepath);
        }
    }
    return storedAllInfoToDb;
}

const getFilesByFileType = (files, fileTypeAsString) => {
    if (fileTypeAsString === 'documents') {
        documents = fileTypeAsString;

    } else { images = fileTypeAsString; }

    const filesByFileTypeObject = `var filesByFileType = files.${fileTypeAsString};`;
    eval(filesByFileTypeObject);

    return filesByFileType;
}

const getTargetDbTable = (fileTypeAsString) => {
    if (fileTypeAsString === 'documents') return 'attached_documents';

    return 'images';
}

const areThereAnyFiles = (files) => {
    if (files && Object.keys(files).length > 0) return true;

    return false;
}

const getFilesUploadDir = (fileType) => {
    const filesUploadDir = require('path').posix.resolve(__dirname, '..') + '/public/' + fileType;

    if (!fs.existsSync(filesUploadDir)) {
        fs.mkdirSync(filesUploadDir, { recursive: true });
    }
    return filesUploadDir;
}

const fileUploadManager = async (fileTypeAsString, req, res) => {
    const filesUploadDir = getFilesUploadDir(fileTypeAsString);

    const form = formidable({ uploadDir: filesUploadDir, multiples: true });

    form.parse(req, async (err, fields, files) => {
        if (err) {
            next(err);
            return;
        }
        const thereAreSomeFiles = areThereAnyFiles(files);

        if (thereAreSomeFiles) {
            const targeDbTable = getTargetDbTable(fileTypeAsString);
            const realtyId = req.params.param;
            const filesByFileType = getFilesByFileType(files, fileTypeAsString);

            const storedFilesInfoToDb = await storeFilesInfoToDb(targeDbTable, realtyId, filesByFileType);

            if (storedFilesInfoToDb) return res.status(200).send(`The ${fileTypeAsString} have been uploaded!`);

            return res.status(500).send(`Couldn\'t upload the ${fileTypeAsString}.`);
        }
        return res.status(500).send(`No ${fileTypeAsString} were provided.`);
    });
}

exports.upload_images = async (req, res) => {
    fileUploadManager('images', req, res);
}

exports.upload_documents = async (req, res) => {
    fileUploadManager('documents', req, res);
}