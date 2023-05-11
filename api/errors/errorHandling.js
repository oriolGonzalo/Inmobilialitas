const InmobilialitasError = require("./InmobilialitasError");
 
// Error generat per la base de dades
exports.databaseError = (err, res) => {
    if (res) {
        if (err.code) {
            switch (err.code) {
                case '42P01': // La taula no existeix
                    console.error('DB error code: ' + err.code + '\n', err.stack);
                    return res.status(501).send(err.stack);
                default:
                    console.error('DB error code: ' + err.code + '\n', err.stack);
                    return res.status(500).send(err.stack);
            }
        } else {
            console.error(err.stack);
            return res.status(500).send(err.stack);
        }
    } else if (err.code) {
        console.error(err.code, err.stack);
    } else {
        console.error(err.stack);
    }
}

// Error creat manualment
exports.inmobilialitasError = (err, res) => {
    if (res) {
        if (err.status && err instanceof InmobilialitasError) {
            console.error(err.status, err.stack);
            return res.status(err.status).send(err.stack);
        } else {
            console.error(err.stack);
            return res.status(500).send(err.stack);
        }
    } else if (err.status && err instanceof InmobilialitasError) {
        console.error(err.status, err.stack);
    } else {
        console.error(err.stack);
    }
}