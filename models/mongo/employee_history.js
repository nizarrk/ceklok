'use strict';

module.exports = function(mongo) {
  if (mongo.models.employee_history) return mongo.models.employee_history;

  const ModelSchema = mongo.Schema({
    id: String,
    role: String,
    department: String,
    job_title: String,
    grade: String,
    benefit: String,
    company_code: String,
    employee_code: String,
    username: String,
    password: String,
    name: String,
    gender: String,
    pob: String,
    dob: String,
    address: String,
    kelurahan: String,
    kecamatan: String,
    city: String,
    province: String,
    zipcode: String,
    msisdn: String,
    tlp: String,
    email: String,
    status: String,
    endpoint: String,
    date: Date,
    time: String,
    elapsed_time: String
  });

  return mongo.model('employee_history', ModelSchema);
};
