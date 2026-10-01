import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  arrayUnion,
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const rulesPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../firestore.rules');
const projectId = 'atlas-gym-partner-rules-test';

let testEnv;

const adminProfile = {
  uid: 'admin-user',
  gymId: 'gym-a',
  rol: 0,
  name: 'Admin',
  email: 'admin@example.com',
  dni: '111111111',
  phone: '88888888',
};

const memberProfile = {
  uid: 'member-user',
  gymId: 'gym-a',
  rol: 1,
  name: 'Member',
  email: 'member@example.com',
  dni: '222222222',
  phone: '77777777',
  until: new Date('2026-12-31'),
};

const superAdminProfile = {
  uid: 'super-admin',
  gymId: 'gym-a',
  rol: 2,
  name: 'Super Admin',
  email: 'super@example.com',
};

const memberReadableCollections = ['gymExercises', 'gymLayouts', 'exercises'];
const memberOwnedCollections = ['stats', 'routine'];
const adminOnlyCollections = ['finances', 'monthlyCashboxes', 'notificados', 'moduleSettings'];

const seedDocument = async (collectionName, documentId, gymId = 'gym-a', extraData = {}) => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), collectionName, documentId), {
      gymId,
      ...extraData,
    });
  });
};

beforeAll(async () => {
  const hasEmulatorEnv = Boolean(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_EMULATOR_HOST);
  if (!hasEmulatorEnv) {
    console.warn('Skipping Firestore rules initialization: emulator host/port not set. Set FIRESTORE_EMULATOR_HOST or run via firebase emulators:exec.');
    testEnv = null;
    return;
  }

  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: fs.readFileSync(rulesPath, 'utf8'),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users/admin-user'), adminProfile);
    await setDoc(doc(db, 'users/member-user'), memberProfile);
    await setDoc(doc(db, 'users/super-admin'), superAdminProfile);
  });
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

const shouldRun = Boolean(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_EMULATOR_HOST);
const maybeDescribe = shouldRun ? describe : describe.skip;

maybeDescribe('users collection rules', () => {
  it('allows admins to read any user profile', async () => {
    const db = testEnv.authenticatedContext('admin-user').firestore();
    await assertSucceeds(getDoc(doc(db, 'users/member-user')));
  });

  it('allows admins to create a member in their gym without an email', async () => {
    const db = testEnv.authenticatedContext('admin-user').firestore();
    await assertSucceeds(setDoc(doc(db, 'users/new-member'), {
      uid: 'new-member',
      name: 'New Member',
      phone: '88888888',
      birthday: new Date('2000-01-01'),
      dni: '',
      until: new Date(),
      gymId: 'gym-a',
      rol: 1,
      createdAt: new Date(),
    }));
  });

  it('blocks admins from creating a member in another gym', async () => {
    const db = testEnv.authenticatedContext('admin-user').firestore();
    await assertFails(setDoc(doc(db, 'users/new-member'), {
      uid: 'new-member',
      name: 'New Member',
      phone: '88888888',
      birthday: new Date('2000-01-01'),
      dni: '',
      until: new Date(),
      gymId: 'gym-b',
      rol: 1,
      createdAt: new Date(),
    }));
  });

  it('allows members to read their own profile', async () => {
    const db = testEnv.authenticatedContext('member-user').firestore();
    await assertSucceeds(getDoc(doc(db, 'users/member-user')));
  });

  it('blocks members from reading other profiles', async () => {
    const db = testEnv.authenticatedContext('member-user').firestore();
    await assertFails(getDoc(doc(db, 'users/admin-user')));
  });

  it('allows members to update only safe profile fields', async () => {
    const db = testEnv.authenticatedContext('member-user').firestore();
    await assertSucceeds(updateDoc(doc(db, 'users/member-user'), {
      name: 'Updated Member',
      phone: '66666666',
    }));
  });

  it('blocks members from updating membership or role fields', async () => {
    const db = testEnv.authenticatedContext('member-user').firestore();
    await assertFails(updateDoc(doc(db, 'users/member-user'), {
      until: new Date('2099-12-31'),
    }));
    await assertFails(updateDoc(doc(db, 'users/member-user'), {
      rol: 0,
    }));
  });

  it('blocks members from changing their gym', async () => {
    const db = testEnv.authenticatedContext('member-user').firestore();
    await assertFails(updateDoc(doc(db, 'users/member-user'), {
      gymId: 'gym-b',
    }));
  });

  it('blocks admins from reading profiles in another gym', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users/other-gym-user'), {
        ...memberProfile,
        uid: 'other-gym-user',
        gymId: 'gym-b',
      });
    });
    const db = testEnv.authenticatedContext('admin-user').firestore();
    await assertFails(getDoc(doc(db, 'users/other-gym-user')));
  });
});

maybeDescribe('module settings rules', () => {
  it('allows gym admins to persist shared microcycle exercise options', async () => {
    const db = testEnv.authenticatedContext('admin-user').firestore();
    const settingsRef = doc(db, 'moduleSettings/gym-a__trainingExerciseOptions');

    await assertSucceeds(setDoc(settingsRef, {
      gymId: 'gym-a',
      moduleName: 'trainingExerciseOptions',
      options: arrayUnion('Trabajo de cuerda'),
    }, { merge: true }));

    const snapshot = await assertSucceeds(getDocs(query(
      collection(db, 'moduleSettings'),
      where('gymId', '==', 'gym-a'),
      where('moduleName', '==', 'trainingExerciseOptions'),
    )));
    expect(snapshot.docs[0].data().options).toEqual(['Trabajo de cuerda']);
  });

  it('blocks gym admins from adding microcycle exercise options to another gym', async () => {
    const db = testEnv.authenticatedContext('admin-user').firestore();
    await assertFails(setDoc(doc(db, 'moduleSettings/gym-b__trainingExerciseOptions'), {
      gymId: 'gym-b',
      moduleName: 'trainingExerciseOptions',
      options: arrayUnion('Trabajo de cuerda'),
    }, { merge: true }));
  });
});

maybeDescribe('tenant-scoped business collection rules', () => {
  it.each(memberReadableCollections)('allows members to read %s in their gym', async (collectionName) => {
    await seedDocument(collectionName, 'gym-a-document');
    const db = testEnv.authenticatedContext('member-user').firestore();

    await assertSucceeds(getDoc(doc(db, collectionName, 'gym-a-document')));
  });

  maybeDescribe('super admin rules', () => {
    it('allows super admins to read users across gyms', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'users/other-gym-user'), {
          ...memberProfile,
          uid: 'other-gym-user',
          gymId: 'gym-b',
        });
      });
      const db = testEnv.authenticatedContext('super-admin').firestore();

      await assertSucceeds(getDoc(doc(db, 'users/other-gym-user')));
    });

    it('allows super admins to assign an admin to a gym', async () => {
      const db = testEnv.authenticatedContext('super-admin').firestore();

      await assertSucceeds(updateDoc(doc(db, 'users/admin-user'), {
        rol: 0,
        gymId: 'gym-b',
      }));
    });

    it('blocks gym admins from changing a member role or gym', async () => {
      const db = testEnv.authenticatedContext('admin-user').firestore();

      await assertFails(updateDoc(doc(db, 'users/member-user'), {
        rol: 0,
        gymId: 'gym-b',
      }));
    });

    it('allows gym admins to approve an unassigned member without changing their role', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'users/unassigned-user'), {
          ...memberProfile,
          uid: 'unassigned-user',
          gymId: null,
        });
      });
      const db = testEnv.authenticatedContext('admin-user').firestore();

      await assertSucceeds(updateDoc(doc(db, 'users/unassigned-user'), {
        gymId: 'gym-a',
        rol: 1,
      }));
    });

    it('allows signed-in users to create gym requests', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'users/unassigned-user'), {
          ...memberProfile,
          uid: 'unassigned-user',
          gymId: null,
        });
      });
      const db = testEnv.authenticatedContext('unassigned-user').firestore();

      await assertSucceeds(setDoc(doc(db, 'gymRequests/request-1'), {
        requestedBy: 'unassigned-user',
        status: 'pending',
        name: 'New Gym',
      }));
    });

    it('allows signed-in users to read active gym names', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'gymTenants/gym-b'), {
          name: 'Gym B',
          status: 'active',
        });
      });
      const db = testEnv.authenticatedContext('member-user').firestore();

      await assertSucceeds(getDoc(doc(db, 'gymTenants/gym-b')));
    });

    it('blocks signed-in users from reading inactive gyms', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'gymTenants/gym-b'), {
          name: 'Gym B',
          status: 'inactive',
        });
      });
      const db = testEnv.authenticatedContext('member-user').firestore();

      await assertFails(getDoc(doc(db, 'gymTenants/gym-b')));
    });

    it('allows super admins to approve gym requests and create tenants', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'gymRequests/request-1'), {
          requestedBy: 'member-user',
          status: 'pending',
          name: 'New Gym',
        });
      });
      const db = testEnv.authenticatedContext('super-admin').firestore();

      await assertSucceeds(setDoc(doc(db, 'gymTenants/gym-b'), {
        name: 'New Gym',
        status: 'active',
      }));
      await assertSucceeds(updateDoc(doc(db, 'gymRequests/request-1'), {
        status: 'approved',
        gymId: 'gym-b',
      }));
    });
  });

  it.each(memberReadableCollections)('blocks members from reading %s in another gym', async (collectionName) => {
    await seedDocument(collectionName, 'gym-b-document', 'gym-b');
    const db = testEnv.authenticatedContext('member-user').firestore();

    await assertFails(getDoc(doc(db, collectionName, 'gym-b-document')));
  });

  it.each(memberOwnedCollections)('allows members to read their own %s', async (collectionName) => {
    await seedDocument(collectionName, 'member-document', 'gym-a', { uid: 'member-user' });
    const db = testEnv.authenticatedContext('member-user').firestore();

    await assertSucceeds(getDoc(doc(db, collectionName, 'member-document')));
  });

  it.each(memberOwnedCollections)("blocks members from reading another user's %s", async (collectionName) => {
    await seedDocument(collectionName, 'other-document', 'gym-a', { uid: 'other-user' });
    const db = testEnv.authenticatedContext('member-user').firestore();

    await assertFails(getDoc(doc(db, collectionName, 'other-document')));
  });

  it.each(adminOnlyCollections)('allows admins to read %s in their gym', async (collectionName) => {
    await seedDocument(collectionName, 'admin-document');
    const db = testEnv.authenticatedContext('admin-user').firestore();

    await assertSucceeds(getDoc(doc(db, collectionName, 'admin-document')));
  });

  it.each(adminOnlyCollections)('blocks admins from reading %s in another gym', async (collectionName) => {
    await seedDocument(collectionName, 'gym-b-document', 'gym-b');
    const db = testEnv.authenticatedContext('admin-user').firestore();

    await assertFails(getDoc(doc(db, collectionName, 'gym-b-document')));
  });

  it.each(adminOnlyCollections)('blocks members from reading %s', async (collectionName) => {
    await seedDocument(collectionName, 'member-denied-document');
    const db = testEnv.authenticatedContext('member-user').firestore();

    await assertFails(getDoc(doc(db, collectionName, 'member-denied-document')));
  });
});

maybeDescribe('public cycle rules', () => {
  it('allows gym admins to save a weekly worksheet on their cycle', async () => {
    await seedDocument('cycles', 'editable-cycle', 'gym-a', { public: true });
    const db = testEnv.authenticatedContext('admin-user').firestore();

    await assertSucceeds(updateDoc(doc(db, 'cycles/editable-cycle'), {
      'microcyclePlans.1': {
        rows: [{ id: 'row-1', exercise: 'Sombra', cells: { 1: "4x3'x1'" } }],
      },
    }));
  });

  it('allows unauthenticated reads of public cycles and days', async () => {
    await seedDocument('cycles', 'public-cycle', 'gym-a', { public: true });
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'cycles/public-cycle/days/day-1'), {
        name: 'Public day',
      });
    });
    const db = testEnv.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(db, 'cycles/public-cycle')));
    await assertSucceeds(getDoc(doc(db, 'cycles/public-cycle/days/day-1')));
  });

  it('blocks unauthenticated reads of private cycles and days', async () => {
    await seedDocument('cycles', 'private-cycle', 'gym-a', { public: false });
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'cycles/private-cycle/days/day-1'), {
        name: 'Private day',
      });
    });
    const db = testEnv.unauthenticatedContext().firestore();

    await assertFails(getDoc(doc(db, 'cycles/private-cycle')));
    await assertFails(getDoc(doc(db, 'cycles/private-cycle/days/day-1')));
  });
});

maybeDescribe('default deny rule', () => {
  it('blocks access to unknown collections', async () => {
    const db = testEnv.authenticatedContext('admin-user').firestore();
    await assertFails(setDoc(doc(db, 'secrets/doc-1'), { value: true }));
  });
});
