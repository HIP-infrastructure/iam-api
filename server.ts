const axios = require("axios").default;
require('dotenv').config();

const IAM_CLIENT_URL = process.env.IAM_CLIENT_URL || '';
const IAM_CLIENT_ID = process.env.IAM_CLIENT_ID || '';
const IAM_CLIENT_SECRET = process.env.IAM_CLIENT_SECRET || '';
const EBRAINS_API_URL = process.env.EBRAINS_API_URL || '';

const ADMIN = process.env.ADMIN || '';
const USER1 = process.env.USER1 || '';
const USER2 = process.env.USER2 || '';

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

const getAuthToken = async (url: string, clientId: string, clientSecret: string): Promise<string> => {
    const headers = { "Content-Type": "application/x-www-form-urlencoded" };
    const options = {
        method: 'POST',
        url,
        headers,
        data: {
            grant_type: "client_credentials",
            scope: "openid email roles team profile group clb.wiki.read clb.wiki.write",
            client_id: clientId,
            client_secret: clientSecret
        }
    };

    return axios.request(options).then(function (response: getAuthTokenResponse) {
        return response.data.access_token;
    }).catch(function (error: any) {
        console.error(error);
    });
};

const getUser = async (apiUrl: string, token: string, userName: string): Promise<User> => {
    console.log(`getUser: ${userName}`);
    const options = {
        method: 'GET',
        url: `${apiUrl}/identity/users/${userName}`,
        headers: {
            Authorization: `Bearer ${token}`
        }
    };

    return request(options, false);
};

const createGroup = async (apiUrl: string, token: string, name: string): Promise<number> => {
    console.log(`createGroup: ${name}`);
    const options = {
        method: 'POST',
        url: `${apiUrl}/identity/groups`,
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

const assignGroupToGroup = async (apiUrl: string, token: string, groupName1: string, role: Role, groupName2: string): Promise<number> => {
    console.log(`assignGroupToGroup: ${groupName1} ${role} ${groupName2}`);
    const options = {
        method: 'PUT',
        url: `${apiUrl}/identity/groups/${groupName1}/${role}/groups/${groupName2}`,
        headers: {
            Authorization: `Bearer ${token}`
        }
    };

    return request(options);

};

const deleteGroup = async (apiUrl: string, token: string, name: string): Promise<number> => {
    console.log(`deleteGroup: ${name}`);
    const options = {
        method: 'DELETE',
        url: `${apiUrl}/identity/groups/${name}`,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        }
    };

    return request(options);
};

const addUserToGroup = async (apiUrl: string, token: string, groupName: string, role: Role, memberName: string): Promise<number> => {
    console.log(`addUserToGroup: ${groupName} ${role} ${memberName}`);
    const options = {
        method: 'PUT',
        url: `${apiUrl}/identity/groups/${groupName}/${role}/users/${memberName}`,
        headers: {
            Authorization: `Bearer ${token}`
        }
    };

    return request(options);
};

const removeUserFromGroup = async (apiUrl: string, token: string, groupName: string, role: Role, memberName: string): Promise<number> => {
    console.log(`removeUserFromGroup: ${groupName} ${role} ${memberName}`);
    const options = {
        method: 'DELETE',
        url: `${apiUrl}/identity/groups/${groupName}/${role}/users/${memberName}`,
        headers: {
            Authorization: `Bearer ${token}`
        }
    };

    return request(options);
};

const getGroup = async (apiUrl: string, token: string, groupName: string): Promise<Group> => {
    console.log(`getGroup: ${groupName}`);
    const options = {
        method: 'GET',
        url: `${apiUrl}/identity/groups/${groupName}`,
        headers: {
            Authorization: `Bearer ${token}`
        }
    };

    return request(options, false);
};

const getGroupListsByRole = async (apiUrl: string, token: string, groupName: string, role: Role): Promise<GroupLists> => {
    console.log(`getGroupListsByRole: ${groupName} ${role}`);
    const options = {
        method: 'GET',
        url: `${apiUrl}/identity/groups/${groupName}/${role}`,
        headers: {
            Authorization: `Bearer ${token}`
        }
    };

    return request(options, false);
};

const getEverythingInGroup = async (apiUrl: string, token: string, groupName: string): Promise<Group | { members: GroupLists, administrators: GroupLists; }> => {
    const group = await getGroup(apiUrl, token, groupName);
    const groupList = await getGroupListsByRole(apiUrl, token, groupName, 'member');
    const groupListAdmin = await getGroupListsByRole(apiUrl, token, groupName, 'administrator');

    return {
        ...group,
        members: groupList,
        administrators: groupListAdmin
    };
};


const setup = async () => {
    const token = await getAuthToken(IAM_CLIENT_URL, IAM_CLIENT_ID, IAM_CLIENT_SECRET);

    await Promise.all([rootGroup, group1, group2].map(async (g) => createGroup(EBRAINS_API_URL, token, g)));

    await Promise.all([USER1, USER2].map(async (u) => addUserToGroup(EBRAINS_API_URL, token, rootGroup, 'member', u)));

    await addUserToGroup(EBRAINS_API_URL, token, rootGroup, 'administrator', ADMIN);

    await addUserToGroup(EBRAINS_API_URL, token, group1, 'member', USER1);
    await addUserToGroup(EBRAINS_API_URL, token, group1, 'member', USER2);
    await addUserToGroup(EBRAINS_API_URL, token, group1, 'administrator', ADMIN);

    await addUserToGroup(EBRAINS_API_URL, token, group2, 'administrator', USER1);
    await addUserToGroup(EBRAINS_API_URL, token, group2, 'member', USER2);

    await assignGroupToGroup(EBRAINS_API_URL, token, rootGroup, 'member', group1);
    await assignGroupToGroup(EBRAINS_API_URL, token, rootGroup, 'member', group2);
};

const getGroups = async () => {
    const token = await getAuthToken(IAM_CLIENT_URL, IAM_CLIENT_ID, IAM_CLIENT_SECRET);

    const getRootGroup = await getEverythingInGroup(EBRAINS_API_URL, token, rootGroup);
    console.log(JSON.stringify(getRootGroup, null, 2));

    const getGroup1 = await getEverythingInGroup(EBRAINS_API_URL, token, group1);
    console.log(JSON.stringify(getGroup1, null, 2));

    const getGroup2 = await getEverythingInGroup(EBRAINS_API_URL, token, group2);
    console.log(JSON.stringify(getGroup2, null, 2));
};

const cleanUp = async () => {
    const token = await getAuthToken(IAM_CLIENT_URL, IAM_CLIENT_ID, IAM_CLIENT_SECRET);

    await deleteGroup(EBRAINS_API_URL, token, rootGroup);
    await deleteGroup(EBRAINS_API_URL, token, group1);
    await deleteGroup(EBRAINS_API_URL, token, group2);
};

const rootGroup = 'HIP-Projects';
const group1 = 'HIP-Projects-Epilepsy-101';
const group2 = 'HIP-Projects-Epilepsy-102';

const main = async () => {
    await setup();
    await getGroups()
    await cleanUp();
}

main()



