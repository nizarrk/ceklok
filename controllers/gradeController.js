'use strict';

const async = require('async');
const trycatch = require('trycatch');

exports.get = function(APP, req, callback) {
  APP.models.company[req.user.db].mysql.grade
    .findAll()
    .then(rows => {
      return callback(null, {
        code: rows && rows.length > 0 ? 'FOUND' : 'NOT_FOUND',
        data: rows,
        info: {
          dataCount: rows.length
        }
      });
    })
    .catch(err => {
      console.log(err);

      return callback({
        code: 'ERR_DATABASE',
        data: err
      });
    });
};

exports.getById = (APP, req, callback) => {
  let { grade, grade_benefit, benefit } = APP.models.company[req.user.db].mysql;
  grade.hasMany(grade_benefit, {
    sourceKey: 'id',
    foreignKey: 'grade_id'
  });

  grade_benefit.belongsTo(benefit, {
    targetKey: 'id',
    foreignKey: 'benefit_id'
  });

  grade
    .findOne({
      include: [
        {
          model: grade_benefit,
          attributes: ['id'],
          required: false,
          where: {
            status: 1
          },
          include: [
            {
              model: benefit,
              attributes: ['id', 'name', 'description'],
              required: true
            }
          ]
        }
      ],
      where: {
        id: req.body.id
      }
    })
    .then(rows => {
      if (rows === null) {
        return callback({
          code: 'NOT_FOUND'
        });
      }

      callback(null, {
        code: 'FOUND',
        data: rows
      });

      // let len = 0;
      // let benefit = [];
      // let arr = rows.benefit_id.split(',');

      // arr.map(res => {
      //   benefit
      //     .findOne({
      //       where: {
      //         id: res
      //       }
      //     })
      //     .then(result => {
      //       benefit.push(result);
      //       len++;
      //       if (len === arr.length) {
      //         rows.dataValues.benefit = benefit;
      //         callback(null, {
      //           code: 'OK',
      //           data: rows
      //         });
      //       }
      //     })
      //     .catch(err => {
      //       console.log(err);
      //     });
      // });
    })
    .catch(err => {
      console.log(err);
      callback({
        code: 'ERR_DATABASE',
        data: err
      });
    });
};

exports.insert = function(APP, req, callback) {
  async.waterfall(
    [
      function generateCode(callback) {
        let pad = 'G000';
        let kode = '';

        APP.models.company[req.user.db].mysql.grade
          .findAll({
            limit: 1,
            order: [['id', 'DESC']]
          })
          .then(res => {
            if (res.length == 0) {
              console.log('kosong');
              let str = '' + 1;
              kode = pad.substring(0, pad.length - str.length) + str;

              callback(null, kode);
            } else {
              console.log('ada');
              console.log(res[0].code);

              let lastID = res[0].code;
              let replace = lastID.replace('G', '');
              console.log(replace);

              let str = parseInt(replace) + 1;
              kode = pad.substring(0, pad.length - str.toString().length) + str;

              callback(null, kode);
            }
          })
          .catch(err => {
            console.log(err);

            callback({
              code: 'ERR_DATABASE',
              data: err
            });
          });
      },

      function insertGrading(result, callback) {
        APP.models.company[req.user.db].mysql.grade
          .create({
            code: result,
            name: req.body.name,
            description: req.body.desc
          })
          .then(result => {
            let params = 'Insert Success'; //This is only example, Object can also be used
            return callback(null, result.dataValues);
          })
          .catch(err => {
            if (err.original && err.original.code === 'ER_DUP_ENTRY') {
              let params = 'Error! Duplicate Entry'; //This is only example, Object can also be used
              return callback({
                code: 'DUPLICATE',
                data: params
              });
            }

            if (err.original && err.original.code === 'ER_EMPTY_QUERY') {
              let params = 'Error! Empty Query'; //This is only example, Object can also be used
              return callback({
                code: 'UPDATE_NONE',
                data: params
              });
            }

            return callback({
              code: 'ERR_DATABASE',
              data: err
            });
          });
      },

      function insertGradeBenefit(result, callback) {
        if (req.body.benefit === null) {
          callback(null, {
            code: 'UPDATE_SUCCESS',
            message: 'Benefit Grade berhasil diubah!'
          });
        } else {
          let benefit = req.body.benefit.split(',');
          let arr = [];

          benefit.map(id => {
            let obj = {
              grade_id: result.id,
              benefit_id: id,
              status: 1
            };
            arr.push(obj);
          });
          APP.models.company[req.user.db].mysql.grade_benefit
            .bulkCreate(arr)
            .then(res => {
              callback(null, {
                code: 'INSERT_SUCCESS',
                message: 'Grade berhasil ditambahkan!',
                data: res
              });
            })
            .catch(err => {
              console.log('Error function insertGradeBenefit');
              callback({
                code: 'ERR_DATABASE',
                message: 'Error function insertGradeBenefit',
                data: err
              });
            });
        }
      }
    ],
    (err, result) => {
      if (err) {
        return callback(err);
      }
      callback(null, result);
    }
  );
};

exports.update = function(APP, req, callback) {
  let { grade, grade_benefit } = APP.models.company[req.user.db].mysql;
  let { name, desc, id, benefit, status } = req.body;
  APP.db.sequelize.transaction().then(t => {
    async.waterfall(
      [
        function checkBody(callback) {
          if (name && desc && id && status) {
            console.log('1');

            if (status == '1' || status == '0') {
              console.log('2');

              callback(null, true);
            } else {
              callback({
                code: 'INVALID_REQUEST',
                message: 'Kesalahan pada parameter status!'
              });
            }
          } else {
            console.log('3');

            callback({
              code: 'INVALID_REQUEST',
              message: 'Kesalahan pada parameter!'
            });
          }
        },

        function updateGrade(data, callback) {
          grade
            .update(
              {
                name: name,
                description: desc,
                status: status,
                updated_at: new Date(),
                action_by: req.user.id
              },
              {
                where: {
                  id: id
                }
                // transaction: t
              }
            )
            .then(result => {
              // if (!result || (result && !result[0])) {
              //   return callback({
              //     code: 'INVALID_REQUEST',
              //     message: 'Grade tidak ditemukan!'
              //   });
              // }

              return callback(null, true);
            })
            .catch(err => {
              console.log('iki error', err);

              if (err.original && err.original.code === 'ER_EMPTY_QUERY') {
                let params = 'Error! Empty Query'; //This is only example, Object can also be used
                return callback({
                  code: 'UPDATE_NONE',
                  data: params
                });
              }

              if (err.original && err.original.code === 'ER_DUP_ENTRY') {
                let params = 'Error! Duplicate Entry'; //This is only example, Object can also be used
                return callback({
                  code: 'DUPLICATE',
                  data: params
                });
              }

              return callback({
                code: 'ERR_DATABASE',
                data: err
              });
            });
        },

        function updateGradeBenefit(data, callback) {
          if (benefit === null) {
            callback(null, {
              code: 'UPDATE_SUCCESS',
              message: 'Benefit Grade berhasil diubah!'
            });
          } else {
            let benefits = benefit.split(','),
              insert = [],
              update = [];

            Promise.all(
              benefits.map((x, index) => {
                return grade_benefit
                  .findOne({
                    where: {
                      grade_id: id,
                      benefit_id: x
                    }
                  })
                  .then(res => {
                    if (res == null) {
                      insert.push({
                        benefit_id: x,
                        grade_id: id
                      });

                      return grade_benefit
                        .create({
                          benefit_id: x,
                          grade_id: id
                        })
                        .then(() => {
                          console.log(`id ${x} inserted`);
                          return true;
                        });
                    }
                    return res
                      .update({
                        status: res.status == 0 ? 1 : 0
                      })
                      .then(updated => {
                        console.log(`id ${x} updated`);
                        update.push(updated);
                        return true;
                      });
                  });
              })
            )
              .then(() => {
                callback(null, {
                  code: 'UPDATE_SUCCESS',
                  message: 'Benefit Grade berhasil diubah!',
                  data: {
                    inserted: insert,
                    updated: update
                  }
                });
              })
              .catch(err => {
                console.log(err);
                callback({
                  code: 'ERR',
                  data: err
                });
              });
          }
        }
      ],
      (err, result) => {
        if (err) {
          t.rollback();
          return callback(err);
        }
        t.commit();
        callback(null, result);
      }
    );
  });
};

// exports.updateGradeBenefit = function(APP, req, callback) {
//   let mysql = APP.models.company[req.user.db].mysql;

//   let benefit = req.body.benefit.split(','),
//     insert = [],
//     update = [];

//   benefit.map((x, index) => {
//     mysql.grade_benefit
//       .findOne({
//         where: {
//           grade_id: req.body.id,
//           benefit_id: x
//         }
//       })
//       .then(res => {
//         if (res == null) {
//           insert.push({
//             benefit_id: x,
//             grade_id: req.body.id
//           });

//           mysql.grade_benefit.bulkCreate(insert).then(() => {
//             console.log(`id ${x} inserted`);
//           });
//         } else {
//           res
//             .update({
//               status: res.status == 0 ? 1 : 0
//             })
//             .then(updated => {
//               console.log(`id ${x} updated`);
//               update.push(updated);
//             });
//         }
//       });
//     if (benefit.length == index + 1) {
//       return callback(null, {
//         code: 'UPDATE_SUCCESS',
//         message: 'Benefit Grade berhasil diubah!',
//         data: {
//           inserted: insert,
//           updated: update
//         }
//       });
//     }
//   });
// };

exports.updateStatus = function(APP, req, callback) {
  APP.models.company[req.user.db].mysql.grade
    .update(
      {
        status: req.body.status
      },
      {
        where: {
          id: req.body.id
        }
      }
    )
    .then(result => {
      if (!result || (result && !result[0])) {
        let params = 'No data updated'; //This is only example, Object can also be used
        return callback(null, {
          code: 'UPDATE_NONE',
          data: params
        });
      }

      let params = 'Update Success'; //This is only example, Object can also be used
      return callback(null, {
        code: 'UPDATE_SUCCESS',
        data: params,
        message: 'Department berhasil diupdate!'
      });
    })
    .catch(err => {
      console.log('iki error', err);

      if (err.original && err.original.code === 'ER_EMPTY_QUERY') {
        let params = 'Error! Empty Query'; //This is only example, Object can also be used
        return callback({
          code: 'UPDATE_NONE',
          data: params
        });
      }

      if (err.original && err.original.code === 'ER_DUP_ENTRY') {
        let params = 'Error! Duplicate Entry'; //This is only example, Object can also be used
        return callback({
          code: 'DUPLICATE',
          data: params
        });
      }

      return callback({
        code: 'ERR_DATABASE',
        data: err
      });
    });
};

exports.delete = function(APP, req, callback) {
  let { employee, grade, grade_benefit } = APP.models.company[req.user.db].mysql;
  async.waterfall(
    [
      function checkParam(callback) {
        if (req.user.level === 2) {
          if (req.body.id) {
            callback(null, true);
          } else {
            callback({
              code: 'INVALID_REQUEST',
              id: '?',
              message: 'Kesalahan pada parameter id'
            });
          }
        } else {
          callback({
            code: 'INVALID_REQUEST',
            id: '?',
            message: 'Invalid User level'
          });
        }
      },

      function checkEmployeeGrade(data, callback) {
        employee
          .findAll({
            where: {
              grade_id: req.body.id
            }
          })
          .then(res => {
            if (res.length == 0) {
              callback(null, true);
            } else {
              callback({
                code: 'INVALID_REQUEST',
                id: '',
                message: 'Terdapat employee aktif sedang mengunakan grading ini!'
              });
            }
          })
          .catch(err => {
            console.log(err);
            callback({
              code: 'ERR_DATABASE',
              id: '?',
              message: '?',
              data: err
            });
          });
      },

      function deleteGrade(data, callback) {
        grade
          .destroy({
            where: {
              id: req.body.id
            }
          })
          .then(deleted => {
            if (!deleted)
              return callback({
                code: 'INVALID_REQUEST',
                message: 'Grade tidak ditemukan!'
              });

            callback(null, deleted);
          })
          .catch(err => {
            return callback({
              code: 'ERR_DATABASE',
              data: err
            });
          });
      },

      function deleteGradeBenefit(data, callback) {
        grade_benefit
          .destroy({
            where: {
              grade_id: req.body.id
            }
          })
          .then(deleted => {
            callback(null, {
              code: 'DELETE_SUCCESS',
              id: '?',
              message: '',
              data: {
                grade: data,
                grade_benefit: deleted
              }
            });
          });
      }
    ],
    (err, result) => {
      if (err) return callback(err);

      callback(null, result);
    }
  );
};
