const axios = require("axios").default
require('dotenv').config()

const IAM_CLIENT_URL = process.env.IAM_CLIENT_URL || ''
const IAM_CLIENT_ID = process.env.IAM_CLIENT_ID || ''
const IAM_CLIENT_SECRET = process.env.IAM_CLIENT_SECRET || ''
const EBRAINS_API_URL = process.env.EBRAINS_API_URL || ''

const ADMIN = process.env.ADMIN || ''
const USER1 = process.env.USER1 || ''
const USER2 = process.env.USER2 || ''

const ROOT_GROUP = 'HIP-Projects-testing'
const GROUP_1 = 'HIP-Projects-Epilepsy-101-testing'
const GROUP_2 = 'HIP-Projects-Epilepsy-102-testing'

type Role = 'administrator' | 'member'
type getAuthTokenResponse = {
    data: { access_token: string }
}

interface User {
    id: string
    mitreid: string
    username: string
    firstName: string
    lastName: string
    biography: string
    avatar: string
    active: boolean
}

interface Group {
    name: string
    title: string
    description: string
    acceptMembershipRequest: boolean
}

interface GroupLists {
    users: User[]
    units: any[]
    groups: Group[]
}

type GroupMembership = Group | GroupLists

const wait = async (amount: number) => setTimeout(() => {
    return Promise.resolve()
}, amount * 1000)

const request = (options: any, status: boolean = true) => {
    const { method, url } = options
    // console.log(JSON.stringify({ method, url, data: options.data }, null, 2))
    return axios.request(options).then(function (response: any) {
        if (status)
            return response.status

        return response.data
    }).catch(function (error: any) {
        if (error.response) {
            //response status is an error code
            if (error.response.status > 400) {

                throw error.response.data
            }
        }
        else if (error.request) {
            //response not received though the request was sent
            throw error.request
        }
        else {
            //an error occurred when setting up the request
            throw error.message
        }
    })
}

const getAuthToken = async (): Promise<string> => {
    const headers = { "Content-Type": "application/x-www-form-urlencoded" }
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
    }

    return axios.request(options).then(function (response: getAuthTokenResponse) {
        return response.data.access_token
    }).catch(function (error: any) {
        console.error(error)
    })
}

const getUser = async (token: string, userName: string): Promise<User> => {
    console.log(`getUser: ${userName}`)
    const options = {
        method: 'GET',
        url: `${EBRAINS_API_URL}/identity/users/${userName}`,
        headers: {
            Authorization: `Bearer ${token}`
        }
    }

    return request(options, false)
}

const createGroup = async (token: string, name: string): Promise<number> => {
    console.log(`createGroup: ${name}`)
    // sanitize name
    const sanitized = `${name
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .toLowerCase()}`

    const options = {
        method: 'POST',
        url: `${EBRAINS_API_URL}/identity/groups`,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        data: {
            name: sanitized,
            title: sanitized,
            description: `description ${sanitized}`,
            acceptMembershipRequest: true
        }
    }

    return request(options)
}

const assignGroupToGroup = async (token: string, groupName1: string, role: Role, groupName2: string): Promise<number> => {
    console.log(`assignGroupToGroup: ${groupName1} ${role} ${groupName2}`)
    const options = {
        method: 'PUT',
        url: `${EBRAINS_API_URL}/identity/groups/${groupName1}/${role}/groups/${groupName2}`,
        headers: {
            Authorization: `Bearer ${token}`
        }
    }

    return request(options)

}

const deleteGroup = async (token: string, name: string): Promise<number> => {
    console.log(`deleteGroup: ${name}`)
    const options = {
        method: 'DELETE',
        url: `${EBRAINS_API_URL}/identity/groups/${name}`,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        }
    }

    return request(options)
}

const addUserToGroup = async (token: string, groupName: string, role: Role, memberName: string): Promise<number> => {
    console.log(`addUserToGroup: ${groupName} ${role} ${memberName}`)
    const options = {
        method: 'PUT',
        url: `${EBRAINS_API_URL}/identity/groups/${groupName}/${role}/users/${memberName}`,
        headers: {
            Authorization: `Bearer ${token}`
        }
    }

    return request(options)
}

const removeUserFromGroup = async (token: string, groupName: string, role: Role, memberName: string): Promise<number> => {
    console.log(`removeUserFromGroup: ${groupName} ${role} ${memberName}`)
    const options = {
        method: 'DELETE',
        url: `${EBRAINS_API_URL}/identity/groups/${groupName}/${role}/users/${memberName}`,
        headers: {
            Authorization: `Bearer ${token}`
        }
    }

    return request(options)
}

const getGroup = async (token: string, groupName: string): Promise<Group> => {
    console.log(`getGroup: ${groupName}`)
    const options = {
        method: 'GET',
        url: `${EBRAINS_API_URL}/identity/groups/${groupName}`,
        headers: {
            Authorization: `Bearer ${token}`
        }
    }

    return request(options, false)
}

const getGroupListsByRole = async (token: string, groupName: string, role: Role): Promise<GroupLists> => {
    console.log(`getGroupListsByRole: ${groupName} ${role}`)
    const options = {
        method: 'GET',
        url: `${EBRAINS_API_URL}/identity/groups/${groupName}/${role}`,
        headers: {
            Authorization: `Bearer ${token}`
        }
    }

    return request(options, false)
}

const getUserGroups = async (
    token: string,
    userName: string,
    role: Role = 'member'
): Promise<Group[]> => {
    console.log(`getUserGroups(${userName})`)

    const url = `${EBRAINS_API_URL}/identity/groups?username=${userName}&role=${role}`
    const options = {
        method: 'GET',
        url,
        headers: {
            Authorization: `Bearer ${token}`
        }
    }
    return request(options, false)
}

const getEverythingInGroup = async (token: string, groupName: string): Promise<Group | { members: GroupLists, administrators: GroupLists }> => {
    const group = await getGroup(token, groupName)
    const groupList = await getGroupListsByRole(token, groupName, 'member')
    const groupListAdmin = await getGroupListsByRole(token, groupName, 'administrator')

    return {
        ...group,
        members: groupList,
        administrators: groupListAdmin
    }
}

const hipUseCaseTest = async () => {
    try {
        const token = await getAuthToken()

        await Promise.all([ROOT_GROUP, GROUP_1, GROUP_2].map(async (g) => createGroup(token, g)))

        await Promise.all([USER1, USER2].map(async (u) => addUserToGroup(token, ROOT_GROUP, 'member', u)))

        await addUserToGroup(token, ROOT_GROUP, 'administrator', ADMIN)

        await addUserToGroup(token, GROUP_1, 'member', USER1)
        await addUserToGroup(token, GROUP_1, 'member', USER2)
        await addUserToGroup(token, GROUP_1, 'administrator', ADMIN)

        await addUserToGroup(token, GROUP_2, 'administrator', USER1)
        await addUserToGroup(token, GROUP_2, 'member', USER2)

        await assignGroupToGroup(token, ROOT_GROUP, 'member', GROUP_1)
        await assignGroupToGroup(token, ROOT_GROUP, 'member', GROUP_2)

        const getRootGroup = await getEverythingInGroup(token, ROOT_GROUP)
        console.log(JSON.stringify(getRootGroup, null, 2))

        const getGroup1 = await getEverythingInGroup(token, GROUP_1)
        console.log(JSON.stringify(getGroup1, null, 2))

        const getGroup2 = await getEverythingInGroup(token, GROUP_2)
        console.log(JSON.stringify(getGroup2, null, 2))

        const userGroups = await getUserGroups(token, USER1)
        console.log(JSON.stringify(userGroups, null, 2))

        await deleteGroup(token, ROOT_GROUP)
        await deleteGroup(token, GROUP_1)
        await deleteGroup(token, GROUP_2)

    } catch (error: any) {
        console.error(error)
    }
}

const minimalTest = async () => {
    const waitAmount = 0.5
    const group = `HIP-IAM-API-TEST-GROUP-${Date.now()}`

    try {

        const token = await getAuthToken()

        await wait(waitAmount)

        const a = await createGroup(token, group)
        console.log(JSON.stringify(a, null, 2))

        await wait(waitAmount)

        const b = await addUserToGroup(token, group, 'member', 'nicedexter')
        console.log(JSON.stringify(b, null, 2))

        const c = await addUserToGroup(token, group, 'administrator', 'nicedexter')
        console.log(JSON.stringify(c, null, 2))

        const d = await assignGroupToGroup(token, 'HIP-Projects', 'member', group)
        console.log(JSON.stringify(d, null, 2))

        const getRootGroup = await getEverythingInGroup(token, group)
        console.log(JSON.stringify(getRootGroup, null, 2))
    } catch (error: any) {
        console.error(error)
    }
}

const main = async () => {
    await hipUseCaseTest()
    // await minimalTest()
}

main()



