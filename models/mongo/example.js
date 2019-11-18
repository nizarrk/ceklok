'use strict';

module.exports = function(mongo) {
  if (mongo.models.Example) return mongo.models.Example;

  const ModelSchema = mongo.Schema({
    name: String,
    value: String
  });

  return mongo.model('Example', ModelSchema);
};
