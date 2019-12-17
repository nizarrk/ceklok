'use strict';

module.exports = function(mongo) {
  if (mongo.models.employee_history) return mongo.models.employee_history;

  const ModelSchema = mongo.Schema({
    id: String,
    priviledge: String,
    role: String,
    department: String,
    department_upload: String,
    job_title: String,
    job_title_upload: String,
    grade: String,
    grade_upload: String,
    benefit: String,
    benefit_upload: String,
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
    status_upload: String,
    endpoint: String,
    date: Date,
    time: String,
    elapsed_time: String
  });

  return mongo.model('employee_history', ModelSchema);
};
