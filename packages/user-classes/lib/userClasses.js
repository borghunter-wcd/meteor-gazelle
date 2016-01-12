let userClassesSchema = new SimpleSchema({
  title: {
    type: String
  },
  shortTitle: {
    type: String
  },
  description: {
    type: String
  },
  // The higher the class level the "lower" the class.
  // Level 0 is a primary class, 1 is secondary, so on and so forth.
  level: {
    type: Number,
    defaultValue: 0,
    min: 0
  },
  sort: {
    type: Number,
    defaultValue: 0,
    min: 0
  }
});

userClassesCollection = new Meteor.Collection('userClasses');
userClassesCollection.attachSchema(userClassesSchema);

if (Meteor.isServer) {
  Meteor.publish('user-classes-manage', () => {
    User.checkLoggedIn(this);
    return UserClasses.find();
  });
}

UserClasses = {
  _collection: userClassesCollection
};

UserClasses.methods = {
  createClass: new ValidatedMethod({
    name: 'UserClasses.methods.createClass',
    validate: userClassesSchema.validator(),
    run (doc) {
      User.checkLoggedIn(this);
      UserClasses._collection.insert(doc);
    }
  }),
  updateClass: new ValidatedMethod({
    name: 'UserClasses.methods.updateClass',
    validate: Util.updateValidator(userClassesSchema),
    run (doc) {
      User.checkLoggedIn(this);
      UserClasses._collection.update(doc._id, {
        $set: doc
      });
    }
  }),
  removeClass: new ValidatedMethod({
    name: 'UserClasses.methods.removeClass',
    validate: Util.idValidator(),
    run (id) {
      User.checkLoggedIn(this);
      UserClasses._collection.remove(id);
    }
  })
};