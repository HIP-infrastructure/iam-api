const axios = require("axios").default;
require('dotenv').config();

const IAM_CLIENT_URL = process.env.IAM_CLIENT_URL || '';
const IAM_CLIENT_ID = process.env.IAM_CLIENT_ID || '';
const IAM_CLIENT_SECRET = process.env.IAM_CLIENT_SECRET || '';
const EBRAINS_API_URL = process.env.EBRAINS_API_URL || '';

const ADMIN = process.env.ADMIN || '';
const USER1 = process.env.USER1 || '';
const USER2 = process.env.USER2 || '';

const ROOT_GROUP = 'HIP-Projects';
const GROUP_1 = 'HIP-Projects-Epilepsy-101';
const GROUP_2 = 'HIP-Projects-Epilepsy-102';

type Role = 'administrator' | 'member';
type getAuthTokenResponse = {
    data: { access_token: string; };
};

interface User {
    id: string;
    mitreid: string;
    username: string;
    firstName: string;
    lastName: string;
    biography: string;
    avatar: string;
    active: boolean;
}

interface Group {
    name: string;
    title: string;
    description: string;
    acceptMembershipRequest: boolean;
}

interface GroupLists {
    users: User[];
    units: any[];
    groups: Group[];
}

type GroupMembership = Group | GroupLists;

const request = (options: any, status: boolean = true) => axios.request(options).then(function (response: any) {
    if (status)
        return response.status;

    return response.data;
}).catch(function (error: any) {
    if (error.response) {
        //response status is an error code
        if (error.response.status > 400) {
            console.log(error.response.data);
        }

        return error.response.status;
    }
    else if (error.request) {
        //response not received though the request was sent
        console.log(error.request);
    }
    else {
        //an error occurred when setting up the request
        console.log(error.message);
    }
});

const getAuthToken = async (): Promise<string> => {
    const headers = { "Content-Type": "application/x-www-form-urlencoded" };
    const options = {
        method: 'POST',
        url: IAM_CLIENT_URL,
        headers,
        data: {
            grant_type: "client_credentials",
            scope: "openid email roles team profile group clb.wiki.read clb.wiki.write",
            client_id: IAM_CLIENT_ID,
            client_secret: IAM_CLIENT_SECRET
        }
    };

    return axios.request(options).then(function (response: getAuthTokenResponse) {
        return response.data.access_token;
    }).catch(function (error: any) {
        console.error(error);
    });
};

const getUser = async (token: string, userName: string): Promise<User> => {
    console.log(`getUser: ${userName}`);
    const options = {
        method: 'GET',
        url: `${EBRAINS_API_URL}/identity/users/${userName}`,
        headers: {
            Authorization: `Bearer ${token}`
        }
    };

    return request(options, false);
};

const createGroup = async (token: string, name: string): Promise<number> => {
    console.log(`createGroup: ${name}`);
    const options = {
        method: 'POST',
        url: `${EBRAINS_API_URL}/identity/groups`,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        data: {
            name,
            title: 'My test group',
            description: 'My test group description',
            acceptMembershipRequest: true
        }
    };

    return request(options);

};

const assignGroupToGroup = async (token: string, groupName1: string, role: Role, groupName2: string): Promise<number> => {
    console.log(`assignGroupToGroup: ${groupName1} ${role} ${groupName2}`);
    const options = {
        method: 'PUT',
        url: `${EBRAINS_API_URL}/identity/groups/${groupName1}/${role}/groups/${groupName2}`,
        headers: {
            Authorization: `Bearer ${token}`
        }
    };

    return request(options);

};

const deleteGroup = async (token: string, name: string): Promise<number> => {
    console.log(`deleteGroup: ${name}`);
    const options = {
        method: 'DELETE',
        url: `${EBRAINS_API_URL}/identity/groups/${name}`,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        }
    };

    return request(options);
};

const addUserToGroup = async (token: string, groupName: string, role: Role, memberName: string): Promise<number> => {
    console.log(`addUserToGroup: ${groupName} ${role} ${memberName}`);
    const options = {
        method: 'PUT',
        url: `${EBRAINS_API_URL}/identity/groups/${groupName}/${role}/users/${memberName}`,
        headers: {
            Authorization: `Bearer ${token}`
        }
    };

    return request(options);
};

const removeUserFromGroup = async (token: string, groupName: string, role: Role, memberName: string): Promise<number> => {
    console.log(`removeUserFromGroup: ${groupName} ${role} ${memberName}`);
    const options = {
        method: 'DELETE',
        url: `${EBRAINS_API_URL}/identity/groups/${groupName}/${role}/users/${memberName}`,
        headers: {
            Authorization: `Bearer ${token}`
        }
    };

    return request(options);
};

const getGroup = async (token: string, groupName: string): Promise<Group> => {
    console.log(`getGroup: ${groupName}`);
    const options = {
        method: 'GET',
        url: `${EBRAINS_API_URL}/identity/groups/${groupName}`,
        headers: {
            Authorization: `Bearer ${token}`
        }
    };

    return request(options, false);
};

const getGroupListsByRole = async (token: string, groupName: string, role: Role): Promise<GroupLists> => {
    console.log(`getGroupListsByRole: ${groupName} ${role}`);
    const options = {
        method: 'GET',
        url: `${EBRAINS_API_URL}/identity/groups/${groupName}/${role}`,
        headers: {
            Authorization: `Bearer ${token}`
        }
    };

    return request(options, false);
};

const getEverythingInGroup = async (token: string, groupName: string): Promise<Group | { members: GroupLists, administrators: GroupLists; }> => {
    const group = await getGroup(token, groupName);
    const groupList = await getGroupListsByRole(token, groupName, 'member');
    const groupListAdmin = await getGroupListsByRole(token, groupName, 'administrator');

    return {
        ...group,
        members: groupList,
        administrators: groupListAdmin
    };
};


const setup = async () => {
    const token = await getAuthToken();

    await Promise.all([ROOT_GROUP, GROUP_1, GROUP_2].map(async (g) => createGroup(token, g)));

    await Promise.all([USER1, USER2].map(async (u) => addUserToGroup(token, ROOT_GROUP, 'member', u)));

    await addUserToGroup(token, ROOT_GROUP, 'administrator', ADMIN);

    await addUserToGroup(token, GROUP_1, 'member', USER1);
    await addUserToGroup(token, GROUP_1, 'member', USER2);
    await addUserToGroup(token, GROUP_1, 'administrator', ADMIN);

    await addUserToGroup(token, GROUP_2, 'administrator', USER1);
    await addUserToGroup(token, GROUP_2, 'member', USER2);

    await assignGroupToGroup(token, ROOT_GROUP, 'member', GROUP_1);
    await assignGroupToGroup(token, ROOT_GROUP, 'member', GROUP_2);
};

const getGroups = async () => {
    const token = await getAuthToken();

    const getRootGroup = await getEverythingInGroup(token, ROOT_GROUP);
    console.log(JSON.stringify(getRootGroup, null, 2));

    const getGroup1 = await getEverythingInGroup(token, GROUP_1);
    console.log(JSON.stringify(getGroup1, null, 2));

    const getGroup2 = await getEverythingInGroup(token, GROUP_2);
    console.log(JSON.stringify(getGroup2, null, 2));
};

const cleanUp = async () => {
    const token = await getAuthToken();

    await deleteGroup(token, ROOT_GROUP);
    await deleteGroup(token, GROUP_1);
    await deleteGroup(token, GROUP_2);
};

const main = async () => {
    await setup();
    await getGroups()
    await cleanUp();
}

main()



