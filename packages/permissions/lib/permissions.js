Permissions = {};

Permissions.methods = {};

const ENABLED_PERMISSIONS_FIELD = 'permissionsEnabled';
const DISABLED_PERMISSIONS_FIELD = 'permissionsDisabled';

Permissions.methods = {
  hasEnabledPermission (group, permissions) {
    return Meteor.call('Permissions.methods.hasEnabledPermission', group, permissions);
  },
  hasDisabledPermission (group, permissions) {
    return Meteor.call('Permissions.methods.hasDisabledPermission', group, permissions);
  },
  addEnabledPermissions (userId, group, permission) {
    return Meteor.call('Permissions.methods.addEnabledPermissions', userId, group, permission);
  },
};

function validate (group, permissions) {
  //TODO(ajax) Need a permission to check that user who is running this method actually has permission to edit permissions
  check(group, String);
  check(permissions, [String]);
}

function findGroupByTitle (group) {
  return PermissionsCollection.findOne({ title: group });
}

function validatePermissionType (type) {
  if (type !== ENABLED_PERMISSIONS_FIELD && type !== DISABLED_PERMISSIONS_FIELD) {
    throw new Meteor.Error('invalid-arguments', 'Invalid permission field name');
  }
}

function validatePermissionExists (group, permissions) {
  const doc = findGroupByTitle(group);
  if (!doc) {
    //TODO(ajax) Find standards for error messages. Expose an Errors key value object for storing them.
    throw new Meteor.Error('invalid-arguments', 'Permission group does not exist');
  }
  if (!doc.permissions || !Array.isArray(doc.permissions)) {
    throw new Meteor.Error('invalid-arguments', 'No permissions in group');
  }
  // Make sure the passed permissions are a proper subset of the registered permissions
  const permissionTitles = doc.permissions.map(value => value.title);
  if (_.difference(permissions, doc.permissions).length > 0) {
    throw new Meteor.Error('invalid-arguments', 'Invalid permission');
  }
}

function userHasPermission (group, permissions, type) {
  validatePermissionType(type);
  validate(group, permissions);
  //validatePermissionExists(group, permissions);

  const user = Meteor.user();
  const denormalizedPermissions = permissions.map((permission) => denormalizeGroupAndPermission(group, permission));

  if (user[type] === undefined) {
    return false;
  }

  const userPermissions = user[type];

  if (_.difference(denormalizedPermissions, userPermissions).length > 0) {
    return true;
  }
}

function addPermissions (userId, group, permissions, type) {
  debugger;
  //TODO(ajax) Any syntatic sugar to avoid passing this? Maybe I'm just being dumb.
  validatePermissionType(type);
  validate(group, permissions);
  validatePermissionExists(group, permissions);

  //TODO(ajax) There may be a mongo way of doing this logic more elegantly
  // Confirm that the provided permissions do not already exist for the user.
  /*
   if (type === ENABLED_PERMISSIONS_FIELD) {
   if (Permissions.hasEnabledPermission(group, permissions)) {
   throw new Meteor.Error('invalid-arguments', 'User already has permission enabled');
   }
   } else {
   if (Permissions.hasDisabledPermission(group, permissions)) {
   throw new Meteor.Error('invalid-arguments', 'User already has permission disabled');
   }
   }
   */

  const query = {
    $addToSet: {}
  };

  const denormalizedPermissions = permissions.map((permission) => denormalizeGroupAndPermission(group, permission));

  query.$addToSet[type] = { $each: denormalizedPermissions };

  // Update the user's permissions
  Meteor.users.update(userId, query);
}

function denormalizeGroupAndPermission (group, permission) {
  //TODO(ajax) Make seperator configurable and potentially a disallowed character
  return group + ":" + permission;
}

Meteor.methods({
  'Permissions.methods.hasEnabledPermission' (group, permissions) {
    //TODO(ajax) How to handle 'private' Meteor methods without redundant User checks? Consider a GazelleMethod a la ValidatedMethod
    User.checkLoggedIn(this);
    return userHasPermission(group, permissions, ENABLED_PERMISSIONS_FIELD);
  },
  'Permissions.methods.hasDisabledPermission' (group, permissions) {
    User.checkLoggedIn(this);
    return userHasPermission(group, permissions, DISABLED_PERMISSIONS_FIELD);
  },
  'Permissions.methods.addEnabledPermissions' (userId, group, permissions) {
    User.checkLoggedIn(this);
    addPermissions(userId, group, permissions, ENABLED_PERMISSIONS_FIELD);
  },
  'Permissions.methods.removeEnabledPermissions' (group, permissions) {
    User.checkLoggedIn(this);
    removePermissions(group, permissions, ENABLED_PERMISSIONS_FIELD);
  },
  'Permissions.methods.addDisabledPermissions' (group, permissions) {
    User.checkLoggedIn(this);
    addPermissions(group, permissions, DISABLED_PERMISSIONS_FIELD);
  },
  'Permissions.methods.removeDisabledPermissions' (group, permissions) {
    User.checkLoggedIn(this);
    removePermissions(group, permissions, DISABLED_PERMISSIONS_FIELD);
  }
});


/*

 Permissions

 Each user carries a set of permissions.
 Users can have permissons that are enable or disabled.
 Lack of a permission does not mean it's in the enabled set.

 Permissions are defined server side by creating PermissionGroups and adding permissions to them.
 On app startup, registered permissions are stored in the database.
 Permissions are broken up into permission groups which collects a group of permissions related to their functionality.

 The Meteor.user document is modified to store the specific user's permissions in enabled, disabled, and class permission sets.

 Permission methods
 register -  Register permissions by writing them to db. - Done
 hasPermission - Check that user has a permission to perform an action.
 hasClassPermission - Check that user has a class permission.
 hasEnabledPermission - Check that user has an enabled permission.
 hasDisabledPermission - Check that user has a disabled permission.
 enablePermissions - Adds an enabled permission.
 disablePermissions - Adds a disabled permission.


 Classes

 Each user carries a set of classes.
 Classes are created by priveleged users through the site.
 Classes carry a set of permissions.
 If a user has a class then they have the class permissions enabled.

 Class permissions need to be stored in its own set on the user document rather than the enabled permissions set.

 Class methods
 CRUD
 getClassesForUser
 addClassToUser
 removeClassFromUser

 Thoughts
 Need to be diligent about changing permission related metadata since changes arent synced to the db.
 Groups are looked up by title. Permission Group and permission titles must be looked after with care.
 Should Meteor.user permissions and classes be published for caching in minimongo?

 */
