'use strict';

module.exports = function(sequelize, Sequelize) {
    let Model = sequelize.define(
        'payroll',
        {
            id: {
                type: Sequelize.INTEGER(11),
                autoIncrement: true,
                primaryKey: true,
                allowNull: false,
                unique: true
            },
            payroll_period_id: {
                type: Sequelize.INTEGER(11)
            },
            user_id: {
                type: Sequelize.INTEGER(11)
            },
            code: {
                type: Sequelize.STRING(45)
            },
            currency: {
                type: Sequelize.STRING(45)
            },
            nominal: {
                type: Sequelize.INTEGER(11)
            },
            detail: {
                type: Sequelize.STRING
            },
            status: {
                type: Sequelize.INTEGER(1), //0 = pending, 1 = sukses 2 = gagal
                allowNull: false,
                defaultValue: 1
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
            created_by: {
                type: Sequelize.INTEGER(10),
                defaultValue: 0,
                allowNull: false
            },
            updated_by: {
                type: Sequelize.INTEGER(10),
                allowNull: false
            },
            ip_address: {
                type: Sequelize.STRING(45),
                allowNull: false,
                defaultValue: '127.0.0.1'
            }
        },
        {}
    );

    // Model.associate = function(models) {};

    return Model;
};
