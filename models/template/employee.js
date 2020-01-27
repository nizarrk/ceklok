'use strict';

module.exports = function(sequelize, Sequelize) {
  let Model = sequelize.define(
    'employee',
    {
      id: {
        type: Sequelize.INTEGER(11),
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        unique: true
      },
      priviledge_id: {
        type: Sequelize.STRING(100)
      },
      department_id: {
        type: Sequelize.STRING(100)
      },
      department_upload: {
        type: Sequelize.STRING(100)
      },
      job_title_id: {
        type: Sequelize.STRING(100)
      },
      job_title_upload: {
        type: Sequelize.STRING(100)
      },
      role_id: {
        type: Sequelize.STRING(100)
      },
      grade_id: {
        type: Sequelize.STRING(100)
      },
      grade_upload: {
        type: Sequelize.STRING(100)
      },
      benefit_id: {
        type: Sequelize.STRING(100)
      },
      benefit_upload: {
        type: Sequelize.STRING(100)
      },
      employee_code: {
        type: Sequelize.STRING(100)
      },
      nik: {
        type: Sequelize.STRING(100)
      },
      company_code: {
        type: Sequelize.STRING(100)
      },
      user_name: {
        type: Sequelize.STRING(100)
      },
      password: {
        type: Sequelize.STRING(100)
      },
      old_password: {
        type: Sequelize.STRING(100)
      },
      name: {
        type: Sequelize.STRING(100)
      },
      gender: {
        type: Sequelize.INTEGER(11) //1 = Male, 2 = Female, 3 = Other
      },
      pob: {
        type: Sequelize.STRING(100)
      },
      dob: {
        type: Sequelize.DATE
      },
      address: {
        type: Sequelize.STRING(100)
      },
      kelurahan: {
        type: Sequelize.STRING(100)
      },
      kecamatan: {
        type: Sequelize.STRING(100)
      },
      city: {
        type: Sequelize.STRING(100)
      },
      province: {
        type: Sequelize.STRING(100)
      },
      zipcode: {
        type: Sequelize.STRING(100)
      },
      msisdn: {
        type: Sequelize.STRING(100)
      },
      tlp: {
        type: Sequelize.STRING(100)
      },
      email: {
        type: Sequelize.STRING(100)
      },
      status: {
        type: Sequelize.INTEGER(1), //0 = pendding, 1 = approve, 2 = reject, 3 = deleted
        allowNull: false,
        defaultValue: 0
      },
      status_upload: {
        type: Sequelize.STRING(100)
      },
      checklist_id: {
        type: Sequelize.STRING(100)
      },
      total_cuti: {
        type: Sequelize.INTEGER(11)
      },
      status_contract_id: {
        type: Sequelize.INTEGER(100)
      },
      status_contract_upload: {
        type: Sequelize.STRING(100)
      },
      fultime_at: {
        type: Sequelize.DATE
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      action_by: {
        type: Sequelize.INTEGER(10),
        defaultValue: 0,
        allowNull: false
      },
      ip_address: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: '127.0.0.1'
      }
    },
    {}
  );

  // Model.associate = function(models) {};

  return Model;
};
