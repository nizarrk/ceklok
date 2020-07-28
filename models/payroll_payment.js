'use strict';

module.exports = function(sequelize, Sequelize) {
    let Model = sequelize.define(
        'payroll_payment',
        {
            id: {
                type: Sequelize.INTEGER(11),
                autoIncrement: true,
                primaryKey: true,
                allowNull: false,
                unique: true
            },
            code: {
                type: Sequelize.STRING(255)
            },
            icon: {
                type: Sequelize.STRING(255)
            },
            name: {
                type: Sequelize.STRING(255)
            },
            description: {
                type: Sequelize.STRING(255)
            },
            counter: {
                type: Sequelize.INTEGER // counter active company
            },
            status: {
                type: Sequelize.INTEGER(1), //0 = non aktif, 1 = aktif
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
                defaultValue: 0,
                allowNull: false
            },
            ip_address: {
                type: Sequelize.STRING(255),
                allowNull: false,
                defaultValue: '127.0.0.1'
            }
        },
        {}
    );

    // Model.associate = function(models) {};

    return Model;
};
