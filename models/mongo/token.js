'use strict';

module.exports = function(mongo) {
  if (mongo.models.Token) return mongo.models.Token;

  const ModelSchema = mongo.Schema({
    id_user: String,
    id_admin: String,
    id_super_admin: String,
    company_code: String,
    platform: String,
    token: String,
    date: Date,
    time: String,
    elapsed_time: String
  });

  return mongo.model('Token', ModelSchema);
};
