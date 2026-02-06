const puppeteer = require('puppeteer');

(async () => {
  let passed = 0;
  let failed = 0;
  const results = [];

  function assert(condition, message) {
    if (condition) {
      passed++;
      results.push(`  ✓ ${message}`);
    } else {
      failed++;
      results.push(`  ✗ ${message}`);
    }
  }

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 3000));

    // === Basic Setup ===
    console.log('\n=== Basic Setup ===');

    const hasAPI = await page.evaluate(() => typeof window.rbac === 'object');
    assert(hasAPI, 'rbac API exists on window');

    const hasCard = await page.evaluate(() => !!document.getElementById('rbac-card'));
    assert(hasCard, 'RBAC card rendered');

    const hasTabs = await page.evaluate(() => document.querySelectorAll('.rb-tab').length === 3);
    assert(hasTabs, 'Three tabs exist (Roles, Permissions, Users)');

    const hasStats = await page.evaluate(() => document.querySelectorAll('.rb-stat-card').length === 4);
    assert(hasStats, 'Four stat cards displayed');

    // === AC1: Define user roles ===
    console.log('\n=== AC1: Define user roles ===');

    const roles = await page.evaluate(() => window.rbac.getRoles());
    assert(roles.length >= 4, `${roles.length} roles defined`);

    const first = roles[0];
    assert(first.id !== undefined, 'Role has id');
    assert(first.name !== undefined, 'Role has name');
    assert(first.description !== undefined, 'Role has description');
    assert(first.color !== undefined, 'Role has color');
    assert(first.level > 0, `Role level: ${first.level}`);
    assert(first.permissionCount > 0, `Role has ${first.permissionCount} permissions`);
    assert(first.totalPermissions > 0, `Total permissions: ${first.totalPermissions}`);
    assert(first.isSystem !== undefined, 'Role has isSystem flag');

    // Get specific role
    const adminRole = await page.evaluate(() => window.rbac.getRole('admin'));
    assert(adminRole !== null, 'Can retrieve admin role');
    assert(adminRole.name === 'Administrator', 'Admin role has correct name');
    assert(adminRole.level === 100, 'Admin has highest level');
    assert(adminRole.permissions.length === adminRole.totalPermissions, 'Admin has all permissions');

    const viewerRole = await page.evaluate(() => window.rbac.getRole('viewer'));
    assert(viewerRole !== null, 'Can retrieve viewer role');
    assert(viewerRole.level === 25, 'Viewer has lowest level');
    assert(viewerRole.permissions.length < adminRole.permissions.length, 'Viewer has fewer permissions than admin');

    // Create custom role
    const newRoleId = await page.evaluate(() => {
      return window.rbac.createRole('Tester', 'Can run tests and view results', ['dashboard.view', 'features.view', 'harness.start'], 35);
    });
    assert(newRoleId !== undefined, `Custom role created: ${newRoleId}`);

    const customRole = await page.evaluate((id) => window.rbac.getRole(id), newRoleId);
    assert(customRole.name === 'Tester', 'Custom role has correct name');
    assert(customRole.level === 35, 'Custom role has correct level');
    assert(customRole.permissions.length === 3, 'Custom role has 3 permissions');
    assert(customRole.isSystem === false, 'Custom role is not system role');

    // Update role
    const updated = await page.evaluate((id) => window.rbac.updateRole(id, { name: 'QA Tester', level: 40 }), newRoleId);
    assert(updated === true, 'updateRole returns true');
    const afterUpdate = await page.evaluate((id) => window.rbac.getRole(id), newRoleId);
    assert(afterUpdate.name === 'QA Tester', 'Role name updated');
    assert(afterUpdate.level === 40, 'Role level updated');

    // Delete custom role
    const deleted = await page.evaluate((id) => window.rbac.deleteRole(id), newRoleId);
    assert(deleted === true, 'deleteRole returns true for custom role');

    // Cannot delete system role
    const cantDelete = await page.evaluate(() => window.rbac.deleteRole('admin'));
    assert(cantDelete === false, 'Cannot delete system role');

    // Role grid rendered
    const roleGrid = await page.evaluate(() => !!document.getElementById('rb-role-grid'));
    assert(roleGrid, 'Role grid rendered');

    const roleCards = await page.evaluate(() => document.querySelectorAll('.rb-role-card').length);
    assert(roleCards >= 4, `${roleCards} role cards rendered`);

    // === AC2: Permission levels ===
    console.log('\n=== AC2: Permission levels ===');

    const permissions = await page.evaluate(() => window.rbac.getPermissions());
    assert(permissions.length > 0, `${permissions.length} permissions defined`);

    const firstPerm = permissions[0];
    assert(firstPerm.id !== undefined, 'Permission has id');
    assert(firstPerm.resource !== undefined, `Permission resource: ${firstPerm.resource}`);
    assert(firstPerm.action !== undefined, `Permission action: ${firstPerm.action}`);

    // Permission matrix
    const matrix = await page.evaluate(() => window.rbac.getPermissionMatrix());
    assert(matrix.length > 0, `Matrix has ${matrix.length} rows`);
    assert(matrix[0].permission !== undefined, 'Matrix row has permission');
    assert(matrix[0].admin !== undefined, 'Matrix has admin column');
    assert(matrix[0].viewer !== undefined, 'Matrix has viewer column');

    // Check permission
    const adminCanManage = await page.evaluate(() => window.rbac.checkPermission('admin', 'users.manage'));
    assert(adminCanManage === true, 'Admin can manage users');

    const viewerCanManage = await page.evaluate(() => window.rbac.checkPermission('viewer', 'users.manage'));
    assert(viewerCanManage === false, 'Viewer cannot manage users');

    const devCanStart = await page.evaluate(() => window.rbac.checkPermission('developer', 'harness.start'));
    assert(devCanStart === true, 'Developer can start harness');

    // Switch to permissions tab
    await page.evaluate(() => window.rbac.setTab('permissions'));
    await new Promise(r => setTimeout(r, 300));

    const permTabActive = await page.evaluate(() => {
      return document.querySelector('.rb-tab[data-tab="permissions"]').classList.contains('active');
    });
    assert(permTabActive, 'Permissions tab becomes active');

    const matrixEl = await page.evaluate(() => !!document.getElementById('rb-matrix'));
    assert(matrixEl, 'Permission matrix table rendered');

    const checkMarks = await page.evaluate(() => document.querySelectorAll('.rb-check').length);
    assert(checkMarks > 0, `${checkMarks} granted permissions in matrix`);

    const crossMarks = await page.evaluate(() => document.querySelectorAll('.rb-cross').length);
    assert(crossMarks > 0, `${crossMarks} denied permissions in matrix`);

    // === AC3: Restrict sensitive actions ===
    console.log('\n=== AC3: Restrict sensitive actions ===');

    const restricted = await page.evaluate(() => window.rbac.getRestrictedActions());
    assert(restricted.length > 0, `${restricted.length} restricted actions`);

    const firstRestriction = restricted[0];
    assert(firstRestriction.permission !== undefined, 'Restriction has permission');
    assert(firstRestriction.allowedRoles.length > 0, `${firstRestriction.allowedRoles.length} roles allowed`);
    assert(firstRestriction.restrictedRoles.length > 0, `${firstRestriction.restrictedRoles.length} roles restricted`);

    // Users
    const users = await page.evaluate(() => window.rbac.getUsers());
    assert(users.length > 0, `${users.length} users`);

    const firstUser = users[0];
    assert(firstUser.id !== undefined, 'User has id');
    assert(firstUser.name !== undefined, 'User has name');
    assert(firstUser.email !== undefined, 'User has email');
    assert(firstUser.role !== undefined, 'User has role');
    assert(firstUser.roleName !== undefined, 'User has roleName');
    assert(firstUser.roleColor !== undefined, 'User has roleColor');
    assert(firstUser.roleLevel > 0, `User role level: ${firstUser.roleLevel}`);

    // Get specific user
    const specificUser = await page.evaluate(() => window.rbac.getUser('u-1'));
    assert(specificUser !== null, 'Can retrieve specific user');
    assert(specificUser.permissions.length > 0, 'User has resolved permissions');

    // Can perform action
    const adminCanDeploy = await page.evaluate(() => window.rbac.canPerformAction('u-1', 'deploy.trigger'));
    assert(adminCanDeploy === true, 'Admin user can trigger deploy');

    const viewerCantDeploy = await page.evaluate(() => window.rbac.canPerformAction('u-5', 'deploy.trigger'));
    assert(viewerCantDeploy === false, 'Viewer user cannot trigger deploy');

    // Assign role
    const assigned = await page.evaluate(() => window.rbac.assignRole('u-5', 'developer'));
    assert(assigned === true, 'assignRole returns true');
    const afterAssign = await page.evaluate(() => window.rbac.getUser('u-5'));
    assert(afterAssign.role === 'developer', 'User role updated to developer');

    // Switch to users tab
    await page.evaluate(() => window.rbac.setTab('users'));
    await new Promise(r => setTimeout(r, 300));

    const usersTabActive = await page.evaluate(() => {
      return document.querySelector('.rb-tab[data-tab="users"]').classList.contains('active');
    });
    assert(usersTabActive, 'Users tab becomes active');

    const userList = await page.evaluate(() => !!document.getElementById('rb-user-list'));
    assert(userList, 'User list rendered');

    const userItems = await page.evaluate(() => document.querySelectorAll('.rb-user-item').length);
    assert(userItems > 0, `${userItems} user items rendered`);

    // === State ===
    console.log('\n=== State ===');

    const stateObj = await page.evaluate(() => window.rbac.getState());
    assert(stateObj.activeTab !== undefined, 'State has activeTab');
    assert(stateObj.roleCount >= 4, `State tracks ${stateObj.roleCount} roles`);
    assert(stateObj.userCount > 0, `State tracks ${stateObj.userCount} users`);
    assert(stateObj.permissionCount > 0, `State tracks ${stateObj.permissionCount} permissions`);

    const savedState = await page.evaluate(() => localStorage.getItem('rbac-config') !== null);
    assert(savedState, 'State persisted to localStorage');

  } catch (err) {
    console.error('Test error:', err.message);
    failed++;
    results.push(`  ✗ Test execution error: ${err.message}`);
  }

  await browser.close();

  console.log('\n=======================================================');
  console.log('feat-080: Role-Based Access Control - Test Results');
  console.log('=======================================================');
  results.forEach(r => console.log(r));
  console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : '\n❌ SOME TESTS FAILED');
  process.exit(failed === 0 ? 0 : 1);
})();
