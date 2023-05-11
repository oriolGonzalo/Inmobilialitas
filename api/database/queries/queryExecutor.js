const connection = require('../connection');

const hideSensitiveInformation = (values) => {
  values.forEach(value => {
    if (value instanceof Buffer) {
      const indexofValue = values.indexOf(value);
      values[indexofValue] = 'Hidden sensitive information'
    }
  });
}

exports.query = async (text, values) => {
  const start = Date.now();
  const res = await connection.pool.query(text, values);
  var duration = Date.now() - start;
  duration = duration + 'ms';

  if (typeof values === 'undefined') {
    console.log('\nexecuted query', { text, duration, rows: res.rowCount }, '\n');
  } else {
    hideSensitiveInformation(values);
    console.log('\nexecuted query', { text, values, duration, rows: res.rowCount }, '\n');
  }

  if (res.rowCount === 0) {
    return {};
  } else if (res.rowCount === 1) {
    return res.rows[0];
  }
  return res.rows;
}

exports.queryWithErrorHandling = async (text, values) => {
  try {
    const start = Date.now();
    const res = await connection.pool.query(text, values);
    var duration = Date.now() - start;
    duration = duration + 'ms';

    if (typeof values === 'undefined') {
      console.log('\nexecuted query', { text, duration, rows: res.rowCount }, '\n');
    } else {
      hideSensitiveInformation(values);
      console.log('\nexecuted query', { text, values, duration, rows: res.rowCount }, '\n');
    }

    if (res.rowCount === 0) {
      return {};
    } else if (res.rowCount === 1) {
      return res.rows[0];
    }
    return res.rows;
  } catch (err) {
    console.log(err.stack);
    return err;
  }
}
