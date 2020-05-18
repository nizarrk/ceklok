'use strict';

module.exports = function(mongo) {
  if (mongo.models._logs_email) return mongo.models._logs_email;

  const ModelSchema = mongo.Schema({
    subject: String,
    data: String,
    status: String,
    ip: String,
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
