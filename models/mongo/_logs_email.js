'use strict';

module.exports = function(mongo) {
  if (mongo.models._logs_email) return mongo.models._logs_email;

  const ModelSchema = mongo.Schema({
    feature_id: String,
    subfeature_id: String,
    endpoint: {
      type: String,
      index: true
    },
    request: String,
    response: String,
    data: String,
    status: String,
    ip: String,
    user_id: String,
    level: String,
    company: {
      type: String,
      index: true
    },
    date: Date,
    time: String,
    elapsed_time: String
  });

  return mongo.model('_logs_email', ModelSchema);
};
