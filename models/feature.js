'use strict';

module.exports = function(sequelize, Sequelize) {
    let Model = sequelize.define(
        'feature',
        {
            id: {
                type: Sequelize.INTEGER(11),
                autoIncrement: true,
                primaryKey: true,
                allowNull: false,
                unique: true
            },
            feature_type_id: {
                type: Sequelize.INTEGER(11)
            },
            name: {
                type: Sequelize.STRING(45),
                unique: true
            },
            description: {
                type: Sequelize.STRING(45)
            },
            user_level: {
                type: Sequelize.INTEGER(11)
            },
            status: {
                type: Sequelize.INTEGER(1) //0 = non aktif, 1 = aktif
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
                type: Sequelize.STRING(45),
                allowNull: false,
                defaultValue: '127.0.0.1'
            }
        },
        {
            schema: 'ceklok' // add this line
        }
    );

    // Model.associate = function(models) {};

    return Model;
};
