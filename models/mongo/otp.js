'use strict';

module.exports = function(mongo) {
  if (mongo.models.OTP) return mongo.models.OTP;

  const ModelSchema = mongo.Schema({
    email: String,
    otp: {
      type: String,
      index: true,
      unique: true // Unique index. If you specify `unique: true`
      // specifying `index: true` is optional if you do `unique: true`
    },
    count: Number,
    endpoint: String,
    date: Date,
    time: String,
    elapsed_time: String
  });

  return mongo.model('OTP', ModelSchema);
};
