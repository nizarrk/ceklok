'use strict';

module.exports = function(sequelize, Sequelize) {
    let Model = sequelize.define(
        'services',
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
            name: {
                type: Sequelize.STRING(255)
            },
            description: {
                type: Sequelize.STRING(255)
            },
            requirement: {
                type: Sequelize.STRING(255),
                get: function() {
                    let param = this.getDataValue('requirement') || '0';
                    let data = param.split('|');
                    let hasil = [];

                    data.map(x => {
                        let data = x
                            .replace('[', '')
                            .replace("'", '')
                            .replace("'", '')
                            .replace(']', '');
                        hasil.push(data);
                    });

                    return hasil;
                }
            },
            step: {
                type: Sequelize.STRING(255),
                get: function() {
                    let param = this.getDataValue('step') || '0';
                    let data = param.split('|');
                    let hasil = [];

                    data.map(x => {
                        let data = x
                            .replace('[', '')
                            .replace("'", '')
                            .replace("'", '')
                            .replace(']', '');
                        hasil.push(data);
                    });

                    return hasil;
                }
            },
            document: {
                type: Sequelize.STRING(255)
            },
            sla: {
                type: Sequelize.INTEGER(11)
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
            action_by: {
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
